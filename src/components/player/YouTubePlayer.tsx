import { useState, useEffect, useRef } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import { setCurrentTime as setCurrentTimeExternal } from "../../stores/currentTimeStore";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";

// Define YouTube player interface
interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  getPlayerState: () => number;
  destroy: () => void;
}

interface YTEvent {
  target: YTPlayer;
  data?: number;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        element: string | HTMLElement,
        options: {
          videoId: string;
          playerVars?: {
            autoplay?: number;
            controls?: number;
            disablekb?: number;
            enablejsapi?: number;
            modestbranding?: number;
            rel?: number;
            origin?: string;
          };
          events?: {
            onReady?: (event: YTEvent) => void;
            onStateChange?: (event: YTEvent) => void;
            onError?: (event: YTEvent) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  hiddenMode?: boolean;
}

let youtubeApiPromise: Promise<void> | null = null;
let youtubePlayerSequence = 0;

// The YouTube iframe API can throw internally (e.g. "this.g.src" errors) when a
// method is called while its iframe is mid-navigation, even on an otherwise
// valid, non-destroyed player. Guard every call so a transient API hiccup logs
// a warning instead of crashing the component tree.
const callPlayerSafely = <T,>(fn: () => T): T | undefined => {
  try {
    return fn();
  } catch (error) {
    console.warn("YouTube player call failed:", error);
    return undefined;
  }
};

const loadYouTubeIframeApi = (): Promise<void> => {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<void>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve();
    };

    const existingScript = document.getElementById("youtube-iframe-api");
    if (existingScript) return;

    const script = document.createElement("script");
    script.id = "youtube-iframe-api";
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      youtubeApiPromise = null;
      reject(new Error("YouTube iframe API failed to load"));
    };
    document.head.appendChild(script);
  });

  return youtubeApiPromise;
};

export const YouTubePlayer = ({
  videoId,
  hiddenMode = false,
}: YouTubePlayerProps) => {
  const [player, setPlayer] = useState<YTPlayer | null>(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const playerHostRef = useRef<HTMLDivElement>(null);
  const [playerTargetId] = useState(() => `youtube-player-${++youtubePlayerSequence}`);
  const lastSeekTime = useRef<number>(0);
  const playbackSyncFrameRef = useRef<number | null>(null);
  const lastReportedTimeRef = useRef(0);
  const lastZustandWriteRef = useRef(0);

  const {
    isPlaying,
    volume: masterVolume,
    mediaVolume,
    muted: masterMuted,
    playbackRate,
    loopStart,
    loopEnd,
    isLooping,
    currentTime,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setIsTransitioning,
  } = usePlayerStore(
    useShallow((state) => ({
      isPlaying: state.isPlaying,
      volume: state.volume,
      mediaVolume: state.mediaVolume,
      muted: state.muted,
      playbackRate: state.playbackRate,
      loopStart: state.loopStart,
      loopEnd: state.loopEnd,
      isLooping: state.isLooping,
      currentTime: state.currentTime,
      setCurrentTime: state.setCurrentTime,
      setDuration: state.setDuration,
      setIsPlaying: state.setIsPlaying,
      setIsTransitioning: state.setIsTransitioning,
    }))
  );
  const { t } = useTranslation();

  // Load YouTube API
  useEffect(() => {
    let active = true;
    void loadYouTubeIframeApi()
      .then(() => {
        if (active) setApiLoaded(true);
      })
      .catch((error) => {
        if (active) {
          console.error(error);
          toast.error(t("youtube.errorLoadingVideo"));
        }
      });

    return () => {
      active = false;
    };
  }, [t]);

  // Initialize YouTube player
  useEffect(() => {
    const host = playerHostRef.current;
    if (!apiLoaded || !host || !videoId) return;

    // The iframe API replaces its target node. Creating that node inside a
    // stable React-owned host avoids StrictMode teardown reusing a detached iframe.
    let active = true;
    let newPlayer: YTPlayer | null = null;
    const initializeTimer = window.setTimeout(() => {
      if (!active || !playerHostRef.current) return;
      const target = document.createElement("div");
      target.id = playerTargetId;
      target.className = "h-full w-full";
      host.replaceChildren(target);
      setPlayer(null);

      newPlayer = new window.YT.Player(target, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        disablekb: 1,
        enablejsapi: 1,
        modestbranding: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: (event) => {
          if (!active) {
            return;
          }
          setPlayer(event.target);
          const duration = callPlayerSafely(() => event.target.getDuration());
          if (duration !== undefined) setDuration(duration);
        },
        onStateChange: (event) => {
          if (!active) return;
          if (usePlayerStore.getState().isTransitioning) return;

          if (event.data === window.YT.PlayerState.PLAYING) {
            if (!usePlayerStore.getState().isPlaying) {
              setIsPlaying(true);
            }
            // User may have used YouTube controls to seek
            const currentTime = callPlayerSafely(() => event.target.getCurrentTime());
            if (currentTime !== undefined) setCurrentTime(currentTime);
            lastSeekTime.current = Date.now();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            if (usePlayerStore.getState().isPlaying) {
              setIsPlaying(false);
            }
            // User may have paused to seek
            setIsSeeking(true);
            // Get the current time to update our UI
            const currentTime = callPlayerSafely(() => event.target.getCurrentTime());
            if (currentTime !== undefined) setCurrentTime(currentTime);
          } else if (event.data === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            setCurrentTime(0);
          }
        },
        onError: () => {
          toast.error(t("youtube.errorLoadingVideo"));
        },
      },
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(initializeTimer);
      if (newPlayer) {
        callPlayerSafely(() => newPlayer!.destroy());
      }
      host.replaceChildren();
      setPlayer(null);
    };
  }, [apiLoaded, playerTargetId, videoId, setDuration, setIsPlaying, setCurrentTime, t]);

  // Handle initial seek when player is ready
  const hasPerformedInitialSeek = useRef(false);
  useEffect(() => {
    if (player && !hasPerformedInitialSeek.current) {
      hasPerformedInitialSeek.current = true;
      if (currentTime > 0) {
        callPlayerSafely(() => player.seekTo(currentTime, true));
      }
    }
  }, [player]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle play/pause
  useEffect(() => {
    if (!player) return;

    const state = callPlayerSafely(() => player.getPlayerState());
    if (state === undefined) return;

    if (isPlaying) {
      if (state !== window.YT.PlayerState.PLAYING) {
        setIsTransitioning(true);
        callPlayerSafely(() => player.playVideo());
        // YouTube API doesn't have a reliable callback for when play starts,
        // but it's usually fast enough.
        setTimeout(() => setIsTransitioning(false), 100);
      }
      // Reset seeking state when playback resumes
      setIsSeeking(false);
    } else {
      if (state !== window.YT.PlayerState.PAUSED) {
        setIsTransitioning(true);
        callPlayerSafely(() => player.pauseVideo());
        setIsTransitioning(false);
      }
    }
  }, [isPlaying, player, setIsTransitioning]);

  // Handle volume changes
  useEffect(() => {
    if (!player) return;

    // Calculate effective volume (0-100 for YouTube)
    const effectiveVolume = masterMuted ? 0 : (masterVolume * mediaVolume);
    callPlayerSafely(() => player.setVolume(effectiveVolume * 100));
  }, [masterVolume, mediaVolume, masterMuted, player]);

  // Handle playback rate changes
  useEffect(() => {
    if (!player) return;

    callPlayerSafely(() => player.setPlaybackRate(playbackRate));
  }, [playbackRate, player]);

  // Handle custom timeline slider changes and seeking operations (rewind/fast forward)
  // This effect responds to when the user drags the custom timeline slider or uses seek buttons
  const previousTimeRef = useRef(currentTime);
  useEffect(() => {
    if (!player) return;

    // Only seek if the time change is significant (user interaction, not just small updates)
    const timeDifference = Math.abs(currentTime - previousTimeRef.current);
    if (timeDifference > 0.5 && !isSeeking) {
      // Mark that we're doing a seek and record the time
      setIsSeeking(true);
      lastSeekTime.current = Date.now();

      // Seek to the new time
      callPlayerSafely(() => player.seekTo(currentTime, true));

      // After a short delay, reset the seeking state
      setTimeout(() => {
        setIsSeeking(false);
      }, 500);
    }

    // Update our reference for the next comparison
    previousTimeRef.current = currentTime;
  }, [currentTime, player, isSeeking]);

  // Smooth current time updates and handle A-B loop checks while playing
  useEffect(() => {
    if (!player) return;

    const stopSync = () => {
      if (playbackSyncFrameRef.current !== null) {
        window.cancelAnimationFrame(playbackSyncFrameRef.current);
        playbackSyncFrameRef.current = null;
      }
    };

    if (!isPlaying && !isLooping) {
      stopSync();
      return stopSync;
    }

    const syncTime = () => {
      const playerTime = callPlayerSafely(() => player.getCurrentTime());
      if (playerTime === undefined) {
        playbackSyncFrameRef.current = window.requestAnimationFrame(syncTime);
        return;
      }

      // Update store time only if we're not currently seeking
      // This prevents overwriting the optimistic store update with the old player time
      if (!isSeeking && Math.abs(playerTime - lastReportedTimeRef.current) >= 1 / 30) {
        lastReportedTimeRef.current = playerTime;
        // Always push to lightweight external store at full rAF rate
        setCurrentTimeExternal(playerTime);
        // Throttle Zustand writes to ~4Hz
        const now = performance.now();
        if (now - lastZustandWriteRef.current >= 250) {
          lastZustandWriteRef.current = now;
          setCurrentTime(playerTime);
        }
      }

      // Don't enforce loop boundaries if user is currently seeking
      // or has recently seeked (within the last 500ms)
      const timeSinceLastSeek = Date.now() - lastSeekTime.current;
      const seekingCooldown = 500; // ms

      // Handle A-B looping only if not in seeking cooldown
      if (
        isLooping &&
        !isSeeking &&
        timeSinceLastSeek > seekingCooldown &&
        loopStart !== null &&
        loopEnd !== null
      ) {
        const startBuffer = 0.02; // 20ms buffer for start boundary only

        // Only jump back when we reach or exceed the end time
        // Use a small tolerance to account for timing precision
        if (playerTime >= loopEnd + 0.005) {
          callPlayerSafely(() => player.seekTo(loopStart, true));
          console.log(
            `YouTube Loop: Audio reached ${playerTime.toFixed(
              3
            )}s, end was ${loopEnd.toFixed(
              3
            )}s, jumping back to ${loopStart.toFixed(3)}s`
          );
        } else if (playerTime < loopStart - startBuffer && playerTime > 0) {
          // If somehow we're before the start point (e.g., user dragged the slider)
          callPlayerSafely(() => player.seekTo(loopStart, true));
          console.log("YouTube Loop: Jumping to start point", loopStart);
        }
      }

      playbackSyncFrameRef.current = window.requestAnimationFrame(syncTime);
    };

    playbackSyncFrameRef.current = window.requestAnimationFrame(syncTime);

    return stopSync;
  }, [player, isPlaying, isLooping, isSeeking, loopStart, loopEnd, setCurrentTime]);

  // For hidden mode, render a minimal container but still initialize the player
  if (hiddenMode) {
    return (
      <div className="sr-only" aria-hidden="true">
        <div ref={playerHostRef}></div>
      </div>
    );
  }

  // Normal visible mode
  return (
    <div className="relative rounded-lg overflow-hidden w-full">
      {/* Use a container with padding-top to maintain aspect ratio */}
      <div
        style={{
          paddingTop: "56.25%", // 16:9 aspect ratio by default
          position: "relative",
          maxHeight: "calc(100vh - 180px)", // Adjust based on available space
          width: "100%",
          // Media queries handled via CSS custom properties that update with window.matchMedia in a useEffect
          // This makes the player more responsive on different devices
          ...(window.innerWidth < 640 ? { paddingTop: "60%" } : {}),
        }}
      >
        <div
          ref={playerHostRef}
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>
    </div>
  );
};
