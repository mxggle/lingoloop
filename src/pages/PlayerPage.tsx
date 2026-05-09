// src/pages/PlayerPage.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../stores/playerStore";
import { useShallow } from "zustand/react/shallow";
import { MediaPreviewPanel } from "../components/player/MediaPreviewPanel";
import { TimelinePanel } from "../components/player/TimelinePanel";
import { PanelHeader, CollapsedHorizontalStrip, CollapsedVerticalStrip } from "../components/player/PanelHeader";
import { TranscriptPanel } from "../components/transcript";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { usePlaybackPersistence } from "../hooks/usePlaybackPersistence";
import { AppLayout } from "../components/layout/AppLayout";
import { useLayoutSettings } from "../contexts/layoutSettings";
import { Panel, Group, Separator, PanelImperativeHandle, usePanelCallbackRef } from "react-resizable-panels";
import { cn } from "../utils/cn";
import { MediaPlayer } from "../components/player/MediaPlayer";
import { PlayerWorkspace } from "../player/PlayerWorkspace";
import { bumpRender } from "../utils/perfMonitor";

type PanelKey = "transcript" | "video" | "timeline" | "outer";
const DEFAULT_SIZES: Record<PanelKey, number> = { transcript: 60, video: 40, timeline: 30, outer: 70 };
const MIN_RESTORE_SIZE: Record<PanelKey, number> = { transcript: 30, video: 25, timeline: 20, outer: 30 };

export const PlayerPage = () => {
  bumpRender("PlayerPage");
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { layoutSettings, setLayoutSettings } = useLayoutSettings();
  const layoutInitializedForRef = useRef<string | null>(null);
  const [activeResizeAxis, setActiveResizeAxis] = useState<"horizontal" | "vertical" | null>(null);

  // Panel imperative handles for programmatic collapse/expand
  const [upperAreaHandle, upperAreaCallbackRef] = usePanelCallbackRef();
  const [transcriptPanelHandle, transcriptPanelCallbackRef] = usePanelCallbackRef();
  const [videoPanelHandle, videoPanelCallbackRef] = usePanelCallbackRef();
  const [timelinePanelHandle, timelinePanelCallbackRef] = usePanelCallbackRef();

  // Sizes saved just before each panel collapses — used to restore to pre-collapse position
  const [savedSizes, setSavedSizes] = useState({ ...DEFAULT_SIZES });

  const { currentFile, currentYouTube, isLoadingMedia } = usePlayerStore(
    useShallow((state) => ({
      currentFile: state.currentFile,
      currentYouTube: state.currentYouTube,
      isLoadingMedia: state.isLoadingMedia,
    }))
  );

  useKeyboardShortcuts();
  usePlaybackPersistence();

  useEffect(() => {
    if (!currentFile && !currentYouTube && !isLoadingMedia) {
      navigate("/");
    }
  }, [currentFile, currentYouTube, isLoadingMedia, navigate]);

  useEffect(() => {
    if (currentFile) {
      const mediaKey = currentFile.storageId || currentFile.id || currentFile.name;
      if (layoutInitializedForRef.current !== mediaKey) {
        layoutInitializedForRef.current = mediaKey;
        const isAudio = currentFile.type.includes("audio");
        setLayoutSettings((prev) => ({ ...prev, showPlayer: !isAudio }));
      }
    }
  }, [currentFile, setLayoutSettings]);

  useEffect(() => {
    if (currentYouTube?.id && !currentFile) {
      setLayoutSettings((prev) => ({ ...prev, showPlayer: true }));
    }
  }, [currentYouTube, currentFile, setLayoutSettings]);

  useEffect(() => {
    if (!activeResizeAxis) return;
    const stopResizing = () => setActiveResizeAxis(null);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);
    window.addEventListener("blur", stopResizing);
    return () => {
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
      window.removeEventListener("blur", stopResizing);
    };
  }, [activeResizeAxis]);

  const isAudioOnly = currentFile?.type.includes("audio") && !currentFile?.type.includes("video");
  const effectiveVideoVisible = layoutSettings.videoPanelVisible && !isAudioOnly;
  const hasMedia = !!(currentFile || currentYouTube?.id);

  // When only one panel occupies the upper area, collapse the outer vertical panel
  // so the freed vertical space goes to the timeline (instead of leaving a blank area).
  const transcriptIsAlone = layoutSettings.transcriptPanelVisible && !effectiveVideoVisible;
  const videoIsAlone = effectiveVideoVisible && !layoutSettings.transcriptPanelVisible;
  const upperAreaCollapsed =
    (layoutSettings.transcriptPanelCollapsed && transcriptIsAlone) ||
    (layoutSettings.videoPanelCollapsed && videoIsAlone);

  const togglePanel = (panel: "transcript" | "video" | "timeline") => {
    setLayoutSettings((prev) => ({ ...prev, [`${panel}PanelVisible`]: !prev[`${panel}PanelVisible`] }));
  };

  const collapsePanel = (panel: "transcript" | "video" | "timeline", collapsed: boolean) => {
    setLayoutSettings((prev) => ({ ...prev, [`${panel}PanelCollapsed`]: collapsed }));

    const innerHandles: Record<typeof panel, PanelImperativeHandle | null> = {
      transcript: transcriptPanelHandle,
      video: videoPanelHandle,
      timeline: timelinePanelHandle,
    };

    if (collapsed) {
      // Capture current size before collapsing for accurate restoration
      const currentSize = innerHandles[panel]?.getSize().asPercentage;
      if (currentSize !== undefined && currentSize > 10) {
        setSavedSizes((prev) => ({ ...prev, [panel]: currentSize }));
      }

      if ((panel === "transcript" && transcriptIsAlone) || (panel === "video" && videoIsAlone)) {
        // Alone in the upper area: collapse the outer vertical panel so the timeline can grow
        const outerSize = upperAreaHandle?.getSize().asPercentage;
        if (outerSize !== undefined && outerSize > 10) {
          setSavedSizes((prev) => ({ ...prev, outer: outerSize }));
        }
        upperAreaHandle?.collapse();
      } else {
        innerHandles[panel]?.collapse();
      }
    } else {
      // Restore to pre-collapse size (not just expand(), which may restore to a too-small size)
      if ((panel === "transcript" && transcriptIsAlone) || (panel === "video" && videoIsAlone)) {
        upperAreaHandle?.resize(`${Math.max(savedSizes.outer, MIN_RESTORE_SIZE.outer)}%`);
      } else {
        const target = Math.max(savedSizes[panel], MIN_RESTORE_SIZE[panel]);
        innerHandles[panel]?.resize(`${target}%`);
      }
    }
  };

  // Restore collapsed state when panels remount (e.g. after navigation)
  useEffect(() => {
    if (upperAreaHandle && upperAreaCollapsed) upperAreaHandle.collapse();
  }, [upperAreaHandle, upperAreaCollapsed]);

  useEffect(() => {
    if (transcriptPanelHandle && layoutSettings.transcriptPanelCollapsed && !transcriptIsAlone) {
      transcriptPanelHandle.collapse();
    }
  }, [transcriptPanelHandle, layoutSettings.transcriptPanelCollapsed, transcriptIsAlone]);

  useEffect(() => {
    if (videoPanelHandle && layoutSettings.videoPanelCollapsed && !videoIsAlone) {
      videoPanelHandle.collapse();
    }
  }, [videoPanelHandle, layoutSettings.videoPanelCollapsed, videoIsAlone]);

  useEffect(() => {
    if (timelinePanelHandle && layoutSettings.timelinePanelCollapsed) {
      timelinePanelHandle.collapse();
    }
  }, [timelinePanelHandle, layoutSettings.timelinePanelCollapsed]);

  return (
    <AppLayout layoutSettings={layoutSettings} setLayoutSettings={setLayoutSettings} bottomPaddingClassName="pb-0">
      <div className="relative flex flex-1 min-h-0 flex-col h-full overflow-hidden overflow-x-hidden">
        {activeResizeAxis && (
          <div
            className={cn(
              "absolute inset-0 z-[80] bg-transparent",
              activeResizeAxis === "horizontal" ? "cursor-col-resize" : "cursor-row-resize"
            )}
            aria-hidden="true"
          />
        )}

        {isLoadingMedia && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
              <p className="text-lg text-gray-600 dark:text-gray-300">{t("common.loading")}</p>
            </div>
          </div>
        )}
        {!currentFile && !currentYouTube && !isLoadingMedia && (
          <div className="flex items-center justify-center py-12">
            <p className="text-lg text-gray-600 dark:text-gray-300">{t("player.noMediaLoaded")}</p>
          </div>
        )}

        {hasMedia && (
          <PlayerWorkspace>
            {isAudioOnly && (
              <div className="sr-only" aria-hidden="true">
                <MediaPlayer hiddenMode={true} />
              </div>
            )}
            <Group orientation="vertical" className="flex-1 min-h-0 overflow-hidden">

              {/* Upper area: Transcript + Video */}
              <Panel
                id="player-main-panel"
                defaultSize="70%"
                minSize="20%"
                maxSize="88%"
                collapsible
                collapsedSize="36px"
                className={cn(!layoutSettings.transcriptPanelVisible && !effectiveVideoVisible && "hidden")}
                panelRef={upperAreaCallbackRef}
              >
                {upperAreaCollapsed ? (
                  // Collapsed strip for the whole upper area (transcript-alone or video-alone)
                  <CollapsedHorizontalStrip
                    title={
                      layoutSettings.transcriptPanelCollapsed && transcriptIsAlone
                        ? t("transcript.title")
                        : t("player.video", { defaultValue: "Video" })
                    }
                    onExpand={() =>
                      collapsePanel(
                        layoutSettings.transcriptPanelCollapsed && transcriptIsAlone ? "transcript" : "video",
                        false
                      )
                    }
                    onHide={() =>
                      togglePanel(
                        layoutSettings.transcriptPanelCollapsed && transcriptIsAlone ? "transcript" : "video"
                      )
                    }
                    className="h-full bg-white dark:bg-gray-950/40 border border-gray-200 dark:border-gray-700 rounded-lg"
                  />
                ) : (
                  <Group id="player-upper-layout" orientation="horizontal" className="h-full">
                    {/* Transcript Panel */}
                    {layoutSettings.transcriptPanelVisible && (
                      <Panel
                        id="player-transcript-panel"
                        defaultSize="60%"
                        minSize="25%"
                        maxSize="80%"
                        collapsible
                        collapsedSize="40px"
                        className="min-w-0"
                        panelRef={transcriptPanelCallbackRef}
                      >
                        <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-950/40 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                          {layoutSettings.transcriptPanelCollapsed ? (
                            <CollapsedVerticalStrip
                              title={t("transcript.title")}
                              onExpand={() => collapsePanel("transcript", false)}
                              onHide={() => togglePanel("transcript")}
                            />
                          ) : (
                            <>
                              <PanelHeader
                                title={t("transcript.title")}
                                onCollapse={() => collapsePanel("transcript", true)}
                                onHide={() => togglePanel("transcript")}
                              />
                              <div className="flex-1 min-h-0 overflow-hidden overflow-x-hidden">
                                <TranscriptPanel />
                              </div>
                            </>
                          )}
                        </div>
                      </Panel>
                    )}

                    {/* Horizontal resize handle (hidden when both panels are collapsed strips) */}
                    {layoutSettings.transcriptPanelVisible && effectiveVideoVisible &&
                      !layoutSettings.transcriptPanelCollapsed && !layoutSettings.videoPanelCollapsed && (
                        <Separator
                          id="player-transcript-video-resize"
                          className="w-3 bg-gray-200 dark:bg-gray-700 hover:bg-primary-400 dark:hover:bg-primary-600 transition-colors cursor-col-resize flex items-center justify-center mx-[-4px]"
                          onPointerDownCapture={() => setActiveResizeAxis("horizontal")}
                        >
                          <div className="w-0.5 h-6 bg-gray-400 dark:bg-gray-500 rounded-full pointer-events-none" />
                        </Separator>
                    )}

                    {/* Video Panel */}
                    {effectiveVideoVisible && (
                      <Panel
                        id="player-video-panel"
                        defaultSize="40%"
                        minSize="20%"
                        maxSize="75%"
                        collapsible
                        collapsedSize="40px"
                        className="min-w-0"
                        panelRef={videoPanelCallbackRef}
                      >
                        <MediaPreviewPanel
                          visible={true}
                          collapsed={layoutSettings.videoPanelCollapsed}
                          onCollapse={() => collapsePanel("video", true)}
                          onExpand={() => collapsePanel("video", false)}
                          onHide={() => togglePanel("video")}
                          className="h-full overflow-hidden"
                        />
                      </Panel>
                    )}
                  </Group>
                )}
              </Panel>

              {/* Vertical resize handle */}
              {layoutSettings.timelinePanelVisible && (layoutSettings.transcriptPanelVisible || effectiveVideoVisible) && (
                <Separator
                  id="player-main-timeline-resize"
                  className="h-3 bg-gray-200 dark:bg-gray-700 hover:bg-primary-400 dark:hover:bg-primary-600 transition-colors cursor-row-resize flex items-center justify-center my-[-2px]"
                  onPointerDownCapture={() => setActiveResizeAxis("vertical")}
                >
                  <div className="w-6 h-0.5 bg-gray-400 dark:bg-gray-500 rounded-full pointer-events-none" />
                </Separator>
              )}

              {/* Bottom: Timeline Panel */}
              {layoutSettings.timelinePanelVisible && (
                <Panel
                  id="player-timeline-panel"
                  defaultSize="30%"
                  minSize="12%"
                  maxSize={upperAreaCollapsed ? "88%" : "38%"}
                  collapsible
                  collapsedSize="6%"
                  className="min-h-0 overflow-hidden"
                  panelRef={timelinePanelCallbackRef}
                >
                  <TimelinePanel
                    visible={true}
                    collapsed={layoutSettings.timelinePanelCollapsed}
                    onCollapse={() => collapsePanel("timeline", true)}
                    onExpand={() => collapsePanel("timeline", false)}
                    onHide={() => togglePanel("timeline")}
                    className="h-full"
                  />
                </Panel>
              )}

            </Group>
          </PlayerWorkspace>
        )}
      </div>
    </AppLayout>
  );
};
