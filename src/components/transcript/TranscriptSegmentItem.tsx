import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { Bookmark, Brain, Pause, Play, Repeat } from "lucide-react";
import {
  LoopBookmark,
  TranscriptSegment as TranscriptSegmentType,
  usePlayerStore,
} from "../../stores/playerStore";
import type {
  SegmentTranscriptStudy,
  TranscriptStudyLevel,
  TranscriptSelectionState,
} from "../../types/transcriptStudy";
import { useSegmentState } from "../../hooks/useSegmentState";
import { ExplanationDrawer } from "./ExplanationDrawer";
import { TranscriptSelectionPopover } from "./TranscriptSelectionPopover";
import { TranscriptTextRenderer } from "./TranscriptTextRenderer";

interface TranscriptSegmentItemProps {
  segment: TranscriptSegmentType;
  bookmarks: LoopBookmark[];
  study: SegmentTranscriptStudy | undefined;
  highlightsEnabled: boolean;
  activeLevels: Set<TranscriptStudyLevel> | null;
  activeSelection: TranscriptSelectionState | null;
  selectionEnabled: boolean;
  onSelectionChange: (selection: TranscriptSelectionState | null) => void;
  onClearSelection: () => void;
}

export const TranscriptSegmentItem = memo(
  ({
    segment,
    bookmarks,
    study,
    highlightsEnabled,
    activeLevels,
    activeSelection,
    selectionEnabled,
    onSelectionChange,
    onClearSelection,
  }: TranscriptSegmentItemProps) => {
    const { t } = useTranslation();
    const [showExplanation, setShowExplanation] = useState(false);

    const {
      setCurrentTime,
      createBookmarkFromTranscript,
      setIsPlaying,
      setIsLooping,
      setLoopPoints,
    } = usePlayerStore(
      useShallow((state) => ({
        setCurrentTime: state.setCurrentTime,
        createBookmarkFromTranscript: state.createBookmarkFromTranscript,
        setIsPlaying: state.setIsPlaying,
        setIsLooping: state.setIsLooping,
        setLoopPoints: state.setLoopPoints,
      }))
    );

    const { isActive, isPlaying, isCurrentlyLooping } = useSegmentState(segment);

    const isBookmarked = useMemo(
      () =>
        bookmarks.some(
          (bookmark) =>
            Math.abs(bookmark.start - segment.startTime) < 0.5 &&
            Math.abs(bookmark.end - segment.endTime) < 0.5
        ),
      [bookmarks, segment.endTime, segment.startTime]
    );

    const shouldShowPauseButton = isActive && isPlaying;

    const handleJumpToTime = () => {
      onClearSelection();
      setIsLooping(false);
      const startTime = Math.max(0, segment.startTime - 0.15);
      setCurrentTime(startTime);
      setIsPlaying(true);
    };

    const handlePausePlayback = () => {
      onClearSelection();
      setIsPlaying(false);
    };

    const handleToggleLoop = () => {
      onClearSelection();
      if (isCurrentlyLooping) {
        setIsLooping(false);
      } else {
        const loopStartTime = Math.max(0, segment.startTime - 0.15);
        setLoopPoints(loopStartTime, segment.endTime);
        setIsLooping(true);
        setCurrentTime(loopStartTime);
        setIsPlaying(true);
      }
    };

    const handleToggleBookmark = () => {
      onClearSelection();
      if (isBookmarked) {
        const bookmarkToDelete = bookmarks.find(
          (bookmark) =>
            Math.abs(bookmark.start - segment.startTime) < 0.5 &&
            Math.abs(bookmark.end - segment.endTime) < 0.5
        );
        if (bookmarkToDelete) {
          usePlayerStore.getState().deleteBookmark(bookmarkToDelete.id);
        }
      } else {
        createBookmarkFromTranscript(segment.id);
      }
    };

    const handleExplain = () => {
      onClearSelection();
      setShowExplanation((previous) => !previous);
    };

    return (
      <>
        <div
          data-transcript-row
          className={`group relative py-6 px-4 transition-[opacity,background-color] duration-500 rounded-xl ${
            isActive
              ? "opacity-100 bg-white/5 dark:bg-white/5"
              : "opacity-40 hover:opacity-100 dark:text-gray-400"
          }`}
        >
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-500 font-mono">
                {formatSegmentTime(segment.startTime)}
              </span>

              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity">
                <button
                  onClick={shouldShowPauseButton ? handlePausePlayback : handleJumpToTime}
                  className={`p-1.5 rounded-full transition-colors ${
                    isActive
                      ? "text-primary-600 dark:text-primary-400 bg-primary-100/50 dark:bg-primary-900/30"
                      : "text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  title={t(
                    shouldShowPauseButton
                      ? "transcript.pausePlayback"
                      : "transcript.playSegment"
                  )}
                >
                  {shouldShowPauseButton ? (
                    <Pause size={16} fill="currentColor" />
                  ) : (
                    <Play size={16} fill={isActive ? "currentColor" : "none"} />
                  )}
                </button>

                <button
                  onClick={handleToggleLoop}
                  className={`p-1.5 rounded-full transition-colors ${
                    isCurrentlyLooping
                      ? "text-primary-600 dark:text-primary-400 bg-primary-100/50 dark:bg-primary-900/30"
                      : "text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  title={t(
                    isCurrentlyLooping
                      ? "transcript.stopLoopingSegment"
                      : "transcript.loopSegment"
                  )}
                >
                  <Repeat
                    size={16}
                    fill={isCurrentlyLooping ? "currentColor" : "none"}
                  />
                </button>

                <button
                  onClick={handleToggleBookmark}
                  className={`p-1.5 rounded-full transition-colors ${
                    isBookmarked
                      ? "text-primary-600 dark:text-primary-400 bg-primary-100/50 dark:bg-primary-900/30"
                      : "text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  title={t(
                    isBookmarked
                      ? "transcript.removeBookmark"
                      : "transcript.createBookmark"
                  )}
                >
                  <Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} />
                </button>

                <button
                  onClick={handleExplain}
                  className={`p-1.5 rounded-full transition-colors ${
                    showExplanation
                      ? "text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/30"
                      : "text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  title={t("transcript.explainWithAI")}
                >
                  <Brain size={16} />
                </button>
              </div>
            </div>

            <div className={`transition-transform duration-500 ${isActive ? "translate-x-1" : "translate-x-0"}`}>
              <TranscriptTextRenderer
                segmentId={segment.id}
                text={segment.text}
                study={study}
                highlightsEnabled={highlightsEnabled}
                activeLevels={activeLevels}
                selectionEnabled={selectionEnabled}
                onSelectionChange={onSelectionChange}
                isActive={isActive}
              />
            </div>
          </div>
        </div>

        {showExplanation && (
          <ExplanationDrawer
            isOpen={showExplanation}
            onClose={() => setShowExplanation(false)}
            text={segment.text}
          />
        )}

        {selectionEnabled && activeSelection && (
          <TranscriptSelectionPopover
            selection={activeSelection}
            segmentText={segment.text}
            onClose={onClearSelection}
          />
        )}
      </>
    );
  }
);

TranscriptSegmentItem.displayName = "TranscriptSegmentItem";

function formatSegmentTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
