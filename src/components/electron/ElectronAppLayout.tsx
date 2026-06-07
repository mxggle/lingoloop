import { useState, useCallback, useEffect, useRef, Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../../stores/playerStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useShallow } from "zustand/react/shallow";
import {
  Search,
  X,
  ArrowDownAZ,
  ArrowUpAZ,
  PanelLeftOpen,
  PanelLeftClose,
  Home,
  Moon,
  Sun,
  Settings,
  BookOpen,
} from "lucide-react";
import { AppLayoutBase } from "../layout/AppLayoutBase";
import { KeyboardShortcutsDialog } from "../layout/KeyboardShortcutsDialog";
import { FolderBrowser } from "./FolderBrowser";
import type {
  LibraryScope,
  LibrarySortBy,
  LibrarySortOrder,
} from "./librarySidebar";
import {
  onSettingsOpenIntent,
  type SettingsOpenIntentDetail,
} from "../../utils/settingsIntents";

/* ── Icon rail (VS Code style activity bar) ─────────────────────── */
const RAIL_WIDTH = 56;
const railButtonClass =
  "flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100 [-webkit-app-region:no-drag]";

/* ── Static library section label ───────────────────────────────── */
const LibrarySectionLabel = ({ title }: { title: string }) => (
  <div className="flex items-center h-8 select-none mt-2 px-4">
    <span className="text-[10px] font-bold tracking-[0.1em] text-gray-500/70 dark:text-gray-300/60 truncate uppercase">
      {title}
    </span>
  </div>
);

/* ── Layout settings ────────────────────────────────────────────── */
import { LayoutSettings } from "../../stores/layoutStore";

interface ElectronAppLayoutProps {
  children: React.ReactNode;
  layoutSettings?: LayoutSettings;
  setLayoutSettings?: Dispatch<SetStateAction<LayoutSettings>>;
  bottomPaddingClassName?: string;
}

/* ── Main component ─────────────────────────────────────────────── */
export const ElectronAppLayout = ({
  children,
  layoutSettings,
  setLayoutSettings,
  bottomPaddingClassName,
}: ElectronAppLayoutProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isResizing, setIsResizing] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryScope, setLibraryScope] = useState<LibraryScope>("recent");
  const [librarySortBy, setLibrarySortBy] = useState<LibrarySortBy>("recent");
  const [librarySortOrder, setLibrarySortOrder] = useState<LibrarySortOrder>("desc");
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMac = typeof window !== "undefined" && navigator.userAgent.includes("Mac OS X");

  const {
    isSidebarOpen,
    sidebarWidth,
    setIsSidebarOpen,
    setSidebarWidth,
    addSourceFolder,
  } = usePlayerStore(
    useShallow((state) => ({
      isSidebarOpen: state.isSidebarOpen,
      sidebarWidth: state.sidebarWidth,
      setIsSidebarOpen: state.setIsSidebarOpen,
      setSidebarWidth: state.setSidebarWidth,
      addSourceFolder: state.addSourceFolder,
    }))
  );

  const { theme, setTheme } = useSettingsStore();

  /* ── Resize logic ──────────────────────────────────────────────── */
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX - RAIL_WIDTH;
        if (newWidth >= 200 && newWidth <= 450) setSidebarWidth(newWidth);
      }
    },
    [isResizing, setSidebarWidth]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  /* ── Handlers ──────────────────────────────────────────────────── */
  const navigateToHome = () => {
    const { setCurrentFile, setCurrentYouTube } = usePlayerStore.getState();
    setCurrentFile(null);
    setCurrentYouTube(null);
    navigate("/");
  };

  const handleAddFolder = useCallback(async () => {
    const selected = await window.electronAPI!.openFolder();
    if (!selected) return;
    addSourceFolder(selected);
  }, [addSourceFolder]);

  const toggleSortOrder = useCallback(() => {
    setLibrarySortOrder((order) => (order === "asc" ? "desc" : "asc"));
  }, []);

  const handleOpenSettings = useCallback(
    async (detail: SettingsOpenIntentDetail = {}) => {
      await window.electronAPI?.openSettingsWindow(detail.tab, detail.section);
    },
    []
  );

  const handleOpenGlossary = useCallback(() => {
    if (window.electronAPI?.openGlossaryWindow) {
      void window.electronAPI.openGlossaryWindow();
    } else {
      navigate("/glossary");
    }
  }, [navigate]);

  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme]
  );

  useEffect(() => {
    return onSettingsOpenIntent((detail) => {
      void handleOpenSettings(detail);
    });
  }, [handleOpenSettings]);

  useEffect(() => {
    if (!window.electronAPI?.onNavigate) return;
    return window.electronAPI.onNavigate(async ({ route, entryId }) => {
      if (!entryId) {
        navigate(route);
        return;
      }

      const playerStore = usePlayerStore.getState();
      const entry = playerStore.glossaryEntries.find((e) => e.id === entryId);
      if (!entry) return;

      if (playerStore.playGlossaryEntryContext(entryId)) {
        navigate(route);
        return;
      }

      const historyItem = playerStore.mediaHistory.find((h) => {
        if (h.type === "youtube" && h.youtubeData?.youtubeId) {
          return `youtube-${h.youtubeData.youtubeId}` === entry.mediaId;
        }
        if (h.type === "file") {
          return (h.storageId || `file-${h.name}-${h.fileData?.size}`) === entry.mediaId;
        }
        return false;
      });

      if (!historyItem) return;

      await playerStore.loadFromHistory(historyItem.id);

      if (playerStore.playGlossaryEntryContext(entryId)) {
        navigate(route);
      }
    });
  }, [navigate]);

  useEffect(() => {
    import("../../utils/migrationBridge").then(({ runMigrationIfNeeded }) => {
      void runMigrationIfNeeded();
    });
  }, []);

  /* ── Icon rail (always visible activity bar) ───────────────────── */
  const iconRail = (
    <nav
      aria-label={t("sidebar.navigation", "Navigation")}
      style={{ width: RAIL_WIDTH }}
      className="fixed left-0 top-0 bottom-0 z-[61] flex flex-col items-center border-r border-black/5 dark:border-white/5 bg-white/70 dark:bg-gray-950/70 backdrop-blur-3xl shrink-0 [-webkit-app-region:drag]"
    >
      {/* Draggable top region (window move + macOS traffic-light clearance) */}
      <div className="h-[52px] w-full shrink-0 sm:h-[56px]" />

      {/* Primary navigation */}
      <div className="flex flex-col items-center gap-1 pt-1">
        <button
          onClick={navigateToHome}
          className={`${railButtonClass} text-primary-600 hover:text-primary-700 dark:text-primary-400`}
          title={t("common.home", "Home")}
          aria-label={t("common.home", "Home")}
        >
          <Home className="h-5 w-5" />
        </button>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={railButtonClass}
          aria-expanded={isSidebarOpen}
          title={
            isSidebarOpen
              ? t("layout.hideSidebar", "Hide Sidebar")
              : t("layout.showSidebar", "Show Sidebar")
          }
          aria-label={
            isSidebarOpen
              ? t("layout.hideSidebar", "Hide Sidebar")
              : t("layout.showSidebar", "Show Sidebar")
          }
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </button>
        <button
          onClick={handleOpenGlossary}
          className={railButtonClass}
          title={t("glossary.openGlossary", "Glossary")}
          aria-label={t("glossary.openGlossary", "Glossary")}
        >
          <BookOpen className="h-5 w-5" />
        </button>
      </div>

      {/* Secondary actions pinned to the bottom */}
      <div className="mt-auto flex flex-col items-center gap-1 pb-3">
        <KeyboardShortcutsDialog triggerClassName={railButtonClass} />
        <button
          onClick={() => void handleOpenSettings()}
          className={railButtonClass}
          title={t("layout.openSettings", "Open Settings")}
          aria-label={t("layout.openSettings", "Open Settings")}
        >
          <Settings className="h-5 w-5" />
        </button>
        <button
          onClick={toggleTheme}
          className={railButtonClass}
          title={
            theme === "dark"
              ? t("layout.switchToLightTheme", "Light Theme")
              : t("layout.switchToDarkTheme", "Dark Theme")
          }
          aria-label={
            theme === "dark"
              ? t("layout.switchToLightTheme", "Light Theme")
              : t("layout.switchToDarkTheme", "Dark Theme")
          }
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
    </nav>
  );

  /* ── Sidebar ───────────────────────────────────────────────────── */
  const sidebar = (
    <>
      {iconRail}
      <aside
        ref={sidebarRef}
        style={{ left: RAIL_WIDTH, width: isSidebarOpen ? sidebarWidth : 0 }}
        aria-label={t("sidebar.explorer", "Explorer")}
      className={`fixed top-0 bottom-0 border-r border-black/5 dark:border-white/5 bg-white/60 dark:bg-gray-950/60 backdrop-blur-3xl flex flex-col z-[60] shrink-0 ${
        !isSidebarOpen ? "border-none overflow-hidden" : "shadow-2xl dark:shadow-black/40"
      } transition-[width] duration-300 ease-in-out`}
    >
      {isSidebarOpen && (
        <>
          {/* Title bar spacer (macOS draggable region) */}
          <div
            className={`w-full shrink-0 h-[52px] sm:h-[56px] ${
              isMac ? "[-webkit-app-region:drag]" : ""
            }`}
          />

          {/* ─── Library section ─────────────────────────────────── */}
          <LibrarySectionLabel title={t("sidebar.library", "LIBRARY")} />
          <div className="flex-1 min-h-0 flex flex-col">
              <div className="px-2 pb-2 space-y-2 shrink-0">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={libraryQuery}
                    onChange={(event) => setLibraryQuery(event.target.value)}
                    placeholder={t("sidebar.searchPlaceholder", "Search files")}
                    aria-label={t("sidebar.searchPlaceholder", "Search files")}
                    className="h-9 w-full rounded-xl border border-transparent bg-black/[0.04] pl-9 pr-8 text-xs text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-primary-400/50 focus:bg-white focus:ring-2 focus:ring-primary-500/15 dark:bg-white/[0.05] dark:text-gray-100 dark:focus:border-primary-400/40 dark:focus:bg-gray-900"
                  />
                  {libraryQuery && (
                    <button
                      type="button"
                      onClick={() => setLibraryQuery("")}
                      title={t("sidebar.clearSearch", "Clear search")}
                      aria-label={t("sidebar.clearSearch", "Clear search")}
                      className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-black/5 hover:text-gray-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 dark:hover:bg-white/5 dark:hover:text-gray-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div
                  className="grid grid-cols-2 rounded-xl bg-black/[0.04] p-1 dark:bg-white/[0.05]"
                  role="tablist"
                  aria-label={t("sidebar.scopeLabel", "Library scope")}
                >
                  {(["recent", "folders"] as const).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setLibraryScope(scope)}
                      aria-selected={libraryScope === scope}
                      className={`h-7 rounded-lg text-[11px] font-medium transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 ${
                        libraryScope === scope
                          ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100"
                          : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
                      }`}
                    >
                      {scope === "recent"
                        ? t("sidebar.scopeRecent", "Recent")
                        : t("sidebar.scopeFolders", "Folders")}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <select
                    value={librarySortBy}
                    onChange={(event) => setLibrarySortBy(event.target.value as LibrarySortBy)}
                    aria-label={t("sidebar.sortLabel", "Sort files")}
                    className="h-8 min-w-0 flex-1 rounded-lg border border-transparent bg-black/[0.04] px-2.5 text-xs text-gray-600 outline-none transition-colors hover:bg-black/[0.06] focus:border-primary-400/50 focus:ring-2 focus:ring-primary-500/15 dark:bg-white/[0.05] dark:text-gray-300 dark:hover:bg-white/[0.08]"
                  >
                    <option value="recent">{t("sidebar.sortRecent", "Last played")}</option>
                    <option value="name">{t("sidebar.sortName", "Name")}</option>
                    <option value="type">{t("sidebar.sortType", "Type")}</option>
                    <option value="source">{t("sidebar.sortSource", "Source")}</option>
                  </select>
                  <button
                    type="button"
                    onClick={toggleSortOrder}
                    title={
                      librarySortOrder === "asc"
                        ? t("sidebar.sortDescending", "Sort descending")
                        : t("sidebar.sortAscending", "Sort ascending")
                    }
                    aria-label={
                      librarySortOrder === "asc"
                        ? t("sidebar.sortDescending", "Sort descending")
                        : t("sidebar.sortAscending", "Sort ascending")
                    }
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent bg-black/[0.04] text-gray-500 transition-colors hover:bg-black/[0.06] hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/15 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:hover:text-gray-100"
                  >
                    {librarySortOrder === "asc" ? (
                      <ArrowDownAZ className="h-4 w-4" />
                    ) : (
                      <ArrowUpAZ className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain custom-scrollbar">
                <FolderBrowser
                  onAddFolder={handleAddFolder}
                  query={libraryQuery}
                  scope={libraryScope}
                  sortBy={librarySortBy}
                  sortOrder={librarySortOrder}
                />
              </div>
            </div>

          {/* ─── Resize handle ───────────────────────────────────── */}
          <div
            onMouseDown={startResizing}
            className={`absolute top-0 right-0 w-[1px] h-full cursor-col-resize hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-[70] ${
              isResizing ? "bg-black/20 dark:bg-white/20 w-1" : ""
            }`}
          />
        </>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 10px;
          transition: background 0.3s ease;
        }
        .custom-scrollbar.is-scrolling::-webkit-scrollbar-thumb,
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(156,163,175,0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156,163,175,0.7);
        }
      `}</style>
      </aside>
    </>
  );

  const contentLeft = RAIL_WIDTH + (isSidebarOpen ? sidebarWidth : 0);

  return (
    <AppLayoutBase
      layoutSettings={layoutSettings}
      setLayoutSettings={setLayoutSettings}
      bottomPaddingClassName={bottomPaddingClassName}
      sidebar={sidebar}
      contentPaddingLeft={contentLeft}
      headerOffsetLeft={contentLeft}
      desktopMode={true}
      hideThemeToggle={true}
      hideSettings={true}
      hideGlossary={true}
      hideHelp={true}
      onOpenSettings={() => void handleOpenSettings()}
    >
      {children}
    </AppLayoutBase>
  );
};
