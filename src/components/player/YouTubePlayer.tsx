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
        elementId: string,
        options: {
          videoId: string;
          playerVars?: {
            autoplay?: number;
            controls?: number;
            disablekb?: number;
            enablejsapi?: number;
            modestbranding?: number;
            rel?: number;
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

export const YouTubePlayer = ({
  videoId,
  hiddenMode = false,
}: YouTubePlayerProps) => {
  const [player, setPlayer] = useState<YTPlayer | null>(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
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
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";

      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setApiLoaded(true);
      };
    } else {
      setApiLoaded(true);
    }

    return () => {
      window.onYouTubeIframeAPIReady = () => { };
    };
  }, []);

  // Initialize YouTube player
  useEffect(() => {
    if (!apiLoaded || !playerRef.current || !videoId) return;

    const newPlayer = new window.YT.Player("youtube-player", {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        disablekb: 1,
        enablejsapi: 1,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: (event) => {
          setPlayer(event.target);
          setDuration(event.target.getDuration());
        },
        onStateChange: (event) => {
          if (usePlayerStore.getState().isTransitioning) return;

          if (event.data === window.YT.PlayerState.PLAYING) {
            if (!usePlayerStore.getState().isPlaying) {
              setIsPlaying(true);
            }
            // User may have used YouTube controls to seek
            const currentTime = event.target.getCurrentTime();
            setCurrentTime(currentTime);
            lastSeekTime.current = Date.now();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            if (usePlayerStore.getState().isPlaying) {
              setIsPlaying(false);
            }
            // User may have paused to seek
            setIsSeeking(true);
            // Get the current time to update our UI
            const currentTime = event.target.getCurrentTime();
            setCurrentTime(currentTime);
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

    return () => {
      if (newPlayer) {
        newPlayer.destroy();
      }
    };
  }, [apiLoaded, videoId, setDuration, setIsPlaying, setCurrentTime, t]);

  // Handle initial seek when player is ready
  const hasPerformedInitialSeek = useRef(false);
  useEffect(() => {
    if (player && !hasPerformedInitialSeek.current) {
      hasPerformedInitialSeek.current = true;
      if (currentTime > 0) {
        player.seekTo(currentTime, true);
      }
    }
  }, [player]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle play/pause
  useEffect(() => {
    if (!player) return;

    if (isPlaying) {
      if (player.getPlayerState() !== window.YT.PlayerState.PLAYING) {
        setIsTransitioning(true);
        player.playVideo();
        // YouTube API doesn't have a reliable callback for when play starts,
        // but it's usually fast enough.
        setTimeout(() => setIsTransitioning(false), 100);
      }
      // Reset seeking state when playback resumes
      setIsSeeking(false);
    } else {
      if (player.getPlayerState() !== window.YT.PlayerState.PAUSED) {
        setIsTransitioning(true);
        player.pauseVideo();
        setIsTransitioning(false);
      }
    }
  }, [isPlaying, player, setIsTransitioning]);

  // Handle volume changes
  useEffect(() => {
    if (!player) return;

    // Calculate effective volume (0-100 for YouTube)
    const effectiveVolume = masterMuted ? 0 : (masterVolume * mediaVolume);
    player.setVolume(effectiveVolume * 100);
  }, [masterVolume, mediaVolume, masterMuted, player]);

  // Handle playback rate changes
  useEffect(() => {
    if (!player) return;

    player.setPlaybackRate(playbackRate);
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
      player.seekTo(currentTime, true);

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
      const playerTime = player.getCurrentTime();

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
          player.seekTo(loopStart, true);
          console.log(
            `YouTube Loop: Audio reached ${playerTime.toFixed(
              3
            )}s, end was ${loopEnd.toFixed(
              3
            )}s, jumping back to ${loopStart.toFixed(3)}s`
          );
        } else if (playerTime < loopStart - startBuffer && playerTime > 0) {
          // If somehow we're before the start point (e.g., user dragged the slider)
          player.seekTo(loopStart, true);
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
        <div id="youtube-player"></div>
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
          id="youtube-player"
          ref={playerRef}
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>
    </div>
  );
};
