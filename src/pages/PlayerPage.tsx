// src/pages/PlayerPage.tsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../stores/playerStore";
import { useShallow } from "zustand/react/shallow";
import { MediaPreviewPanel } from "../components/player/MediaPreviewPanel";
import { TimelinePanel } from "../components/player/TimelinePanel";
import { isElectron } from "../utils/platform";
import { MediaHistory } from "../components/web/MediaHistory";
import { TranscriptPanel } from "../components/transcript";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { usePlaybackPersistence } from "../hooks/usePlaybackPersistence";
import { AppLayout } from "../components/layout/AppLayout";
import { useLayoutSettings } from "../contexts/layoutSettings";
import { Panel, Group, Separator } from "react-resizable-panels";
import { cn } from "../utils/cn";

export const PlayerPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { layoutSettings, setLayoutSettings } = useLayoutSettings();
  const layoutInitializedForRef = useRef<string | null>(null);

  const { currentFile, currentYouTube, isLoadingMedia } = usePlayerStore(
    useShallow((state) => ({
      currentFile: state.currentFile,
      currentYouTube: state.currentYouTube,
      isLoadingMedia: state.isLoadingMedia,
    }))
  );

  useKeyboardShortcuts();
  usePlaybackPersistence();

  // Redirect to home if no media
  useEffect(() => {
    if (!currentFile && !currentYouTube && !isLoadingMedia) {
      navigate("/");
    }
  }, [currentFile, currentYouTube, isLoadingMedia, navigate]);

  // Auto-default player visibility based on media type
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

  // Auto-hide video panel for audio files
  const isAudioOnly = currentFile?.type.includes("audio") && !currentFile?.type.includes("video");
  const effectiveVideoVisible = layoutSettings.videoPanelVisible && !isAudioOnly;

  const hasMedia = !!(currentFile || currentYouTube?.id);

  // Panel toggle helpers
  const togglePanel = (panel: "transcript" | "video" | "timeline") => {
    const key = `${panel}PanelVisible` as const;
    setLayoutSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const collapsePanel = (panel: "transcript" | "video" | "timeline", collapsed: boolean) => {
    const key = `${panel}PanelCollapsed` as const;
    setLayoutSettings((prev) => ({ ...prev, [key]: collapsed }));
  };

  return (
    <AppLayout layoutSettings={layoutSettings} setLayoutSettings={setLayoutSettings} bottomPaddingClassName="pb-0">
      <div className="flex flex-1 min-h-0 flex-col h-full overflow-hidden">
        {/* Loading / no media states */}
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
          <Group orientation="vertical" className="flex-1 min-h-0">
            {/* Upper area: Transcript + Video */}
            <Panel
              defaultSize={65}
              minSize={20}
              maxSize={85}
              collapsible
              collapsedSize={0}
              className={cn(!layoutSettings.transcriptPanelVisible && !effectiveVideoVisible && "hidden")}
            >
              <Group orientation="horizontal" className="h-full">
                {/* Transcript Panel */}
                {layoutSettings.transcriptPanelVisible && (
                  <>
                    <Panel
                      defaultSize={60}
                      minSize={25}
                      maxSize={80}
                      collapsible
                      collapsedSize={5}
                      className="min-w-0"
                    >
                      <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-950/40 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mr-1">
                        {/* Transcript header */}
                        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-900/80 border-b border-gray-200 dark:border-white/5 select-none">
                          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 tracking-wider truncate">
                            {t("transcript.title")}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {layoutSettings.transcriptPanelCollapsed ? (
                              <button
                                onClick={() => collapsePanel("transcript", false)}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
                              </button>
                            ) : (
                              <button
                                onClick={() => collapsePanel("transcript", true)}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              </button>
                            )}
                            <button
                              onClick={() => togglePanel("transcript")}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        </div>
                        {!layoutSettings.transcriptPanelCollapsed && (
                          <div className="flex-1 min-h-0 overflow-hidden">
                            <TranscriptPanel />
                          </div>
                        )}
                      </div>
                    </Panel>
                    <Separator className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-primary-400 dark:hover:bg-primary-600 transition-colors cursor-col-resize flex items-center justify-center">
                      <div className="w-0.5 h-6 bg-gray-400 dark:bg-gray-500 rounded-full" />
                    </Separator>
                  </>
                )}

                {/* Video Panel */}
                {effectiveVideoVisible && (
                  <Panel
                    defaultSize={40}
                    minSize={20}
                    maxSize={75}
                    collapsible
                    collapsedSize={5}
                    className="min-w-0"
                  >
                    <MediaPreviewPanel
                      visible={true}
                      collapsed={layoutSettings.videoPanelCollapsed}
                      onCollapse={() => collapsePanel("video", true)}
                      onExpand={() => collapsePanel("video", false)}
                      onHide={() => togglePanel("video")}
                      className="h-full ml-1"
                    />
                  </Panel>
                )}
              </Group>
            </Panel>

            {/* Vertical resize handle */}
            {layoutSettings.timelinePanelVisible && (layoutSettings.transcriptPanelVisible || effectiveVideoVisible) && (
              <Separator className="h-1 bg-gray-200 dark:bg-gray-700 hover:bg-primary-400 dark:hover:bg-primary-600 transition-colors cursor-row-resize flex items-center justify-center my-0.5">
                <div className="w-6 h-0.5 bg-gray-400 dark:bg-gray-500 rounded-full" />
              </Separator>
            )}

            {/* Bottom: Timeline Panel */}
            {layoutSettings.timelinePanelVisible && (
              <Panel
                defaultSize={35}
                minSize={10}
                maxSize={60}
                collapsible
                collapsedSize={6}
                className="min-h-0"
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
        )}

        {/* Media History – web only */}
        {!isElectron() && <MediaHistory />}
      </div>
    </AppLayout>
  );
};
