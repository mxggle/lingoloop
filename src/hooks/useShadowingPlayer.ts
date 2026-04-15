import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useShadowingStore } from "../stores/shadowingStore";
import { retrieveMediaFile } from "../utils/mediaStorage";
import { useShallow } from "zustand/react/shallow";

type ShadowingSegmentView = {
    id: string;
    startTime: number;
    duration: number;
    storageId: string;
    fileOffset?: number;
};

type AudioContextWindow = Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
};

// Stable empty array to avoid creating new [] on every render
const EMPTY_SEGMENTS: readonly ShadowingSegmentView[] = Object.freeze([]);

// Web Audio API context standardizer
const AudioContextClass =
    window.AudioContext || (window as AudioContextWindow).webkitAudioContext;

export const useShadowingPlayer = () => {
    const {
        isPlaying,
        currentTime,
        playbackRate,
        masterVolume,
        masterMuted,
        mediaId,
    } = usePlayerStore(
        useShallow((state) => ({
            isPlaying: state.isPlaying,
            currentTime: state.currentTime,
            playbackRate: state.playbackRate,
            masterVolume: state.volume,
            masterMuted: state.muted,
            mediaId: state.getCurrentMediaId(),
        }))
    );

    const {
        volume,
        muted,
    } = useShadowingStore(
        useShallow((state) => ({
            volume: state.volume,
            muted: state.muted,
        }))
    );

    const audioContextRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const activeNodesRef = useRef<AudioBufferSourceNode[]>([]);
    const segmentsRef = useRef<{ start: number; duration: number; fileOffset: number; buffer: AudioBuffer }[]>([]);
    const playbackRateRef = useRef(playbackRate);
    const currentTimeRef = useRef(currentTime);

    // Track loaded state to preventing trying to play before ready
    const [isLoaded, setIsLoaded] = useState(false);
    const segments = useShadowingStore((state) => {
        if (!mediaId) return EMPTY_SEGMENTS;
        return state.sessions[mediaId]?.segments || EMPTY_SEGMENTS;
    });
    const segmentsLoadKey = useMemo(
        () =>
            segments
                .map((seg) => `${seg.id}:${seg.storageId}:${seg.startTime}:${seg.duration}:${seg.fileOffset || 0}`)
                .join("|"),
        [segments]
    );

    useEffect(() => {
        playbackRateRef.current = playbackRate;
    }, [playbackRate]);

    useEffect(() => {
        currentTimeRef.current = currentTime;
    }, [currentTime]);

    // Initialize AudioContext
    useEffect(() => {
        if (!audioContextRef.current) {
            const ctx = new AudioContextClass();
            const gain = ctx.createGain();
            gain.connect(ctx.destination);

            audioContextRef.current = ctx;
            gainNodeRef.current = gain;
        }

        return () => {
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(console.error);
                audioContextRef.current = null;
            }
        };
    }, [mediaId]); // Re-init on media change

    // Load segments when media changes OR when segments are added/removed
    useEffect(() => {
        if (!mediaId || !audioContextRef.current) {
            segmentsRef.current = [];
            setIsLoaded(false);
            return;
        }

        if (segments.length === 0) {
            segmentsRef.current = [];
            setIsLoaded(true);
            return;
        }

        let active = true;
        setIsLoaded(false);

        const loadAudio = async () => {
            const loaded = await Promise.all(
                segments.map(async (seg, index) => {
                    try {
                        const file = await retrieveMediaFile(seg.storageId);
                        if (!file) {
                            console.warn(`[ShadowingPlayer] No file found for segment ${index}`);
                            return null;
                        }

                        const arrayBuffer = await file.arrayBuffer();

                        if (!audioContextRef.current) {
                            return null;
                        }

                        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

                        return {
                            start: seg.startTime,
                            duration: seg.duration,
                            fileOffset: seg.fileOffset || 0,
                            buffer: audioBuffer
                        };
                    } catch (e) {
                        console.error(`[ShadowingPlayer] Failed to load segment ${index}:`, e);
                        return null;
                    }
                })
            );

            if (active) {
                const validSegments = loaded.filter((s): s is NonNullable<typeof s> => s !== null);
                segmentsRef.current = validSegments;
                setIsLoaded(true);
            }
        };

        loadAudio();
        return () => { active = false; };
    }, [mediaId, segments, segmentsLoadKey]);

    // Handle Playback
    const stopAll = useCallback(() => {
        activeNodesRef.current.forEach(node => {
            try {
                node.stop();
                node.disconnect();
            } catch (e) {
                // Ignore errors if already stopped
            }
        });
        activeNodesRef.current = [];
    }, []);

    const playAt = useCallback(async (time: number) => {
        if (!audioContextRef.current || !gainNodeRef.current || !isLoaded) {
            return;
        }

        // Ensure context is running (browsers suspend it by default)
        if (audioContextRef.current.state === "suspended") {
            try {
                await audioContextRef.current.resume();
            } catch (err) {
                console.error("[ShadowingPlayer] Failed to resume AudioContext:", err);
                return;
            }
        }

        stopAll();

        const ctx = audioContextRef.current;
        const activePlaybackRate = playbackRateRef.current;

        segmentsRef.current.forEach((seg) => {
            const playDuration = seg.duration || seg.buffer.duration;
            const segEnd = seg.start + playDuration;

            if (segEnd < time) {
                return;
            }

            const source = ctx.createBufferSource();
            source.buffer = seg.buffer;
            source.playbackRate.value = activePlaybackRate;

            source.connect(gainNodeRef.current!);

            const fileOffset = seg.fileOffset || 0;

            if (seg.start >= time) {
                const delay = (seg.start - time) / activePlaybackRate;
                source.start(ctx.currentTime + delay, fileOffset, playDuration);
            } else {
                const seekInSegment = (time - seg.start);
                const bufferOffset = fileOffset + seekInSegment;
                const timeRemaining = playDuration - seekInSegment;

                if (timeRemaining > 0) {
                    source.start(ctx.currentTime, bufferOffset, timeRemaining);
                }
            }

            activeNodesRef.current.push(source);

            source.onended = () => {
                const nodeIndex = activeNodesRef.current.indexOf(source);
                if (nodeIndex > -1) {
                    activeNodesRef.current.splice(nodeIndex, 1);
                }
            };
        });
    }, [isLoaded, stopAll]);

    // Respond to Play/Pause/Seek
    useEffect(() => {
        if (isPlaying) {
            playAt(currentTimeRef.current);
        } else {
            stopAll();
        }
    }, [isPlaying, playAt, stopAll]); // currentTime dependency removed to avoid restart on every tick

    // Handle Seeking (when currentTime changes significantly while playing)
    const lastTimeRef = useRef(currentTime);
    useEffect(() => {
        if (!isPlaying) {
            lastTimeRef.current = currentTime;
            return;
        }

        const diff = Math.abs(currentTime - lastTimeRef.current);
        // If we moved more than 1 second unexpectedly (assuming update interval is small), it's a seek
        if (diff > 1.5) {
            playAt(currentTime);
        }
        lastTimeRef.current = currentTime;
    }, [currentTime, isPlaying, playAt]);


    // Update Volume / Mute - combine master volume with track volume
    useEffect(() => {
        if (gainNodeRef.current) {
            const finalGain = (masterMuted || muted) ? 0 : (masterVolume * volume);
            gainNodeRef.current.gain.value = finalGain;
        }
    }, [volume, muted, masterVolume, masterMuted]);

    useEffect(() => {
        if (audioContextRef.current) {
            activeNodesRef.current.forEach(node => {
                try {
                    node.playbackRate.setValueAtTime(playbackRate, audioContextRef.current!.currentTime);
                } catch (e) {
                    // Ignore nodes that are already finished or disconnected.
                }
            });

            if (isPlaying) {
                playAt(currentTimeRef.current);
            }
        }
    }, [playbackRate, isPlaying, playAt]);
};
