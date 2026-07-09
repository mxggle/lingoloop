import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Mic, Play, Repeat, Square, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useShadowingStore, type ShadowingSegment } from "../../stores/shadowingStore";
import { useTranscriptStore } from "../../stores/transcriptStore";
import { usePlayerStore } from "../../stores/playerStore";
import { retrieveMediaFile } from "../../utils/mediaStorage";
import { formatTime } from "../../utils/formatTime";
import { cn } from "../../utils/cn";

const EMPTY_SEGMENTS: ShadowingSegment[] = [];

interface TakesDrawerProps {
  mediaId: string | null;
}

/**
 * Review surface for shadowing takes: list every take for the current media,
 * play the take, replay the matching original range (A/B compare), or delete.
 * The waveform overlay stays the visual layer; this is the management layer.
 */
export const TakesDrawer = ({ mediaId }: TakesDrawerProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [playingTakeId, setPlayingTakeId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const takes = useShadowingStore((state) =>
    mediaId ? state.sessions[mediaId]?.segments ?? EMPTY_SEGMENTS : EMPTY_SEGMENTS
  );
  const removeSegment = useShadowingStore((state) => state.removeSegment);
  const transcriptSegments = useTranscriptStore((state) =>
    mediaId ? state.mediaTranscripts[mediaId] : undefined
  );

  const sortedTakes = useMemo(
    () => [...takes].sort((a, b) => a.startTime - b.startTime),
    [takes]
  );

  const sentenceTextFor = (take: ShadowingSegment): string | null => {
    if (!take.segmentId || !transcriptSegments) return null;
    return transcriptSegments.find((s) => s.id === take.segmentId)?.text ?? null;
  };

  const stopTakePlayback = () => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    audioRef.current?.pause();
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPlayingTakeId(null);
  };

  useEffect(() => stopTakePlayback, []);
  // Media switch invalidates any take playback.
  useEffect(() => {
    stopTakePlayback();
  }, [mediaId]);

  const handlePlayTake = async (take: ShadowingSegment) => {
    if (playingTakeId === take.id) {
      stopTakePlayback();
      return;
    }
    stopTakePlayback();
    // Pause the original so the take is heard alone.
    usePlayerStore.getState().setIsPlaying(false);

    try {
      const file = await retrieveMediaFile(take.storageId);
      if (!file) {
        toast.error(t("shadowing.takes.missingAudio"));
        return;
      }
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = url;
      const offset = take.fileOffset ?? 0;
      audio.currentTime = offset;
      audio.onended = stopTakePlayback;
      await audio.play();
      setPlayingTakeId(take.id);
      if (take.duration > 0) {
        stopTimerRef.current = setTimeout(stopTakePlayback, (take.duration + 0.1) * 1000);
      }
    } catch (error) {
      console.error("[TakesDrawer] Failed to play take:", error);
      toast.error(t("shadowing.takes.playbackFailed"));
      stopTakePlayback();
    }
  };

  const handlePlayOriginal = (take: ShadowingSegment) => {
    stopTakePlayback();
    const end = take.startTime + Math.max(take.duration, 0.5);
    usePlayerStore.setState({
      currentTime: take.startTime,
      loopStart: take.startTime,
      loopEnd: end,
      isLooping: false,
      isPlaying: true,
    });
  };

  const handleDelete = async (take: ShadowingSegment) => {
    if (!mediaId) return;
    if (playingTakeId === take.id) stopTakePlayback();
    await removeSegment(mediaId, take.id);
    toast.success(t("shadowing.takes.deleted"));
  };

  if (!mediaId || takes.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-gray-950/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
        aria-expanded={open}
      >
        <Mic size={12} className="shrink-0 text-rose-400" />
        <span className="flex-1">
          {t("shadowing.takes.title", { count: takes.length })}
        </span>
        {open ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
      </button>

      {open && (
        <ul className="max-h-40 overflow-y-auto overscroll-contain px-2 pb-2">
          {sortedTakes.map((take, index) => {
            const sentence = sentenceTextFor(take);
            const isPlayingThis = playingTakeId === take.id;
            return (
              <li
                key={take.id}
                className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
              >
                <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-gray-700 dark:text-gray-200">
                    {sentence ?? t("shadowing.takes.freeTake")}
                  </span>
                  <span className="block text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                    {formatTime(take.startTime)} – {formatTime(take.startTime + take.duration)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handlePlayTake(take)}
                  title={isPlayingThis ? t("shadowing.takes.stopTake") : t("shadowing.takes.playTake")}
                  className={cn(
                    "rounded p-1 transition-colors",
                    isPlayingThis
                      ? "bg-rose-500/10 text-rose-500"
                      : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
                  )}
                >
                  {isPlayingThis ? <Square size={13} /> : <Play size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => handlePlayOriginal(take)}
                  title={t("shadowing.takes.playOriginal")}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
                >
                  <Repeat size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(take)}
                  title={t("shadowing.takes.deleteTake")}
                  className="rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
