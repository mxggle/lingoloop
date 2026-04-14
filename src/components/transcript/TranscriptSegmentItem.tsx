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
          className={`p-2 rounded-md ${
            isActive
              ? "bg-purple-50 dark:bg-purple-900/20 border-l-2 border-purple-500"
              : "bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-800/50"
          } transition-colors`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {formatSegmentTime(segment.startTime)} - {formatSegmentTime(segment.endTime)}
            </span>

            <div className="flex space-x-1">
              <button
                onClick={shouldShowPauseButton ? handlePausePlayback : handleJumpToTime}
                className={`p-1 rounded transition-colors ${
                  isActive
                    ? "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30"
                    : "text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                }`}
                title={t(
                  shouldShowPauseButton
                    ? "transcript.pausePlayback"
                    : "transcript.playSegment"
                )}
              >
                {shouldShowPauseButton ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill={isActive ? "currentColor" : "none"} />
                )}
              </button>

              <button
                onClick={handleToggleLoop}
                className={`p-1 rounded transition-colors ${
                  isCurrentlyLooping
                    ? "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30"
                    : "text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                }`}
                title={t(
                  isCurrentlyLooping
                    ? "transcript.stopLoopingSegment"
                    : "transcript.loopSegment"
                )}
              >
                <Repeat
                  size={18}
                  fill={isCurrentlyLooping ? "currentColor" : "none"}
                />
              </button>

              <button
                onClick={handleToggleBookmark}
                className={`p-1 rounded transition-colors ${
                  isBookmarked
                    ? "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30"
                    : "text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                }`}
                title={t(
                  isBookmarked
                    ? "transcript.removeBookmark"
                    : "transcript.createBookmark"
                )}
              >
                <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
              </button>

              <button
                onClick={handleExplain}
                className={`p-1 rounded transition-colors ${
                  showExplanation
                    ? "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30"
                    : "text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                }`}
                title={t("transcript.explainWithAI")}
              >
                <Brain size={18} />
              </button>
            </div>
          </div>

          <TranscriptTextRenderer
            segmentId={segment.id}
            text={segment.text}
            study={study}
            highlightsEnabled={highlightsEnabled}
            activeLevels={activeLevels}
            selectionEnabled={selectionEnabled}
            onSelectionChange={onSelectionChange}
          />
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
