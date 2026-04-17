import { useState, useCallback, useEffect, useRef, Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../../stores/playerStore";
import { useShallow } from "zustand/react/shallow";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Trash2,
  PanelLeftOpen,
  PanelLeftClose,
  Home,
  Moon,
  Sun,
  Settings,
} from "lucide-react";
import { AppLayoutBase } from "../layout/AppLayoutBase";
import { PlayHistory } from "./PlayHistory";
import { FolderBrowser } from "./FolderBrowser";

/* ── Section header (VS Code style) ─────────────────────────────── */
interface SectionHeaderProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  actions?: React.ReactNode;
}

const SectionHeader = ({ title, isOpen, onToggle, actions }: SectionHeaderProps) => (
  <div className="flex items-center h-8 select-none group mt-2 px-2">
    <button
      onClick={onToggle}
      className="flex-1 flex items-center min-w-0 h-7 px-2 gap-1.5 text-left focus:outline-none hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
    >
      {isOpen ? (
        <ChevronDown className="w-3 h-3 shrink-0 text-gray-400 dark:text-gray-500" />
      ) : (
        <ChevronRight className="w-3 h-3 shrink-0 text-gray-400 dark:text-gray-500" />
      )}
      <span className="text-[10px] font-bold tracking-[0.1em] text-gray-500/70 dark:text-gray-300/60 truncate uppercase">
        {title}
      </span>
    </button>
    {actions && (
      <div className="flex items-center mr-1 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {actions}
      </div>
    )}
  </div>
);

/* ── Tiny icon button for section header actions ────────────────── */
const HeaderAction = ({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    title={title}
    className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
  >
    {children}
  </button>
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
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMac = typeof window !== "undefined" && navigator.userAgent.includes("Mac OS X");

  const {
    isSidebarOpen,
    sidebarWidth,
    setIsSidebarOpen,
    setSidebarWidth,
    theme,
    setTheme,
    sidebarSections,
    toggleSidebarSection,
    addSourceFolder,
    clearMediaHistory,
  } = usePlayerStore(
    useShallow((state) => ({
      isSidebarOpen: state.isSidebarOpen,
      sidebarWidth: state.sidebarWidth,
      setIsSidebarOpen: state.setIsSidebarOpen,
      setSidebarWidth: state.setSidebarWidth,
      theme: state.theme,
      setTheme: state.setTheme,
      sidebarSections: state.sidebarSections,
      toggleSidebarSection: state.toggleSidebarSection,
      addSourceFolder: state.addSourceFolder,
      clearMediaHistory: state.clearMediaHistory,
    }))
  );

  /* ── Resize logic ──────────────────────────────────────────────── */
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
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

  const handleClearHistory = useCallback(async () => {
    await clearMediaHistory();
  }, [clearMediaHistory]);

  /* ── Sidebar ───────────────────────────────────────────────────── */
  const sidebar = (
    <aside
      ref={sidebarRef}
      style={{ width: isSidebarOpen ? sidebarWidth : 0 }}
      className={`fixed left-0 top-0 bottom-0 border-r border-black/5 dark:border-white/5 bg-white/75 dark:bg-gray-900/75 backdrop-blur-3xl flex flex-col z-[60] shrink-0 ${
        !isSidebarOpen ? "border-none overflow-hidden" : "shadow-xl dark:shadow-black/20"
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

          {/* ─── EXPLORER section ─────────────────────────────────── */}
          <SectionHeader
            title={t("sidebar.explorer", "EXPLORER")}
            isOpen={sidebarSections.explorer}
            onToggle={() => toggleSidebarSection("explorer")}
            actions={
              <HeaderAction onClick={handleAddFolder} title={t("sidebar.addFolder", "Add folder")}>
                <FolderPlus className="w-3.5 h-3.5" />
              </HeaderAction>
            }
          />
          {sidebarSections.explorer && (
            <div className={`overflow-y-auto overflow-x-hidden overscroll-contain custom-scrollbar ${
              sidebarSections.recent ? "flex-shrink-0 max-h-[45%]" : "flex-1 min-h-0"
            }`}>
              <FolderBrowser onAddFolder={handleAddFolder} />
            </div>
          )}

          {/* ─── RECENT section ──────────────────────────────────── */}
          <SectionHeader
            title={t("sidebar.recent", "RECENT")}
            isOpen={sidebarSections.recent}
            onToggle={() => toggleSidebarSection("recent")}
            actions={
              <HeaderAction
                onClick={handleClearHistory}
                title={t("sidebar.clearHistory", "Clear history")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </HeaderAction>
            }
          />
          {sidebarSections.recent && (
            <div className="overflow-y-auto overflow-x-hidden overscroll-contain custom-scrollbar flex-1 min-h-0">
              <PlayHistory />
            </div>
          )}

          {/* ─── Bottom bar (Integrated) ─────────────────────────── */}
          <div className="mx-2 mb-2 p-1.5 flex items-center justify-around shrink-0 border-t border-black/5 dark:border-white/5">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 transition-colors"
              title={
                theme === "dark"
                  ? t("layout.switchToLightTheme", "Light Theme")
                  : t("layout.switchToDarkTheme", "Dark Theme")
              }
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 transition-colors"
              title={t("layout.openSettings", "Open Settings")}
            >
              <Settings className="w-4 h-4" />
            </button>
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
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156,163,175,0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156,163,175,0.4);
        }
      `}</style>
    </aside>
  );

  /* ── Header leading slot (Home + toggle) ───────────────────────── */
  const headerLeadingSlot = (
    <div className="flex items-center gap-0.5 mr-2 shrink-0">
      <button
        onClick={navigateToHome}
        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-primary-600 transition-colors"
        title={t("common.home", "Home")}
      >
        <Home className="w-4 h-4" />
      </button>
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
        title={
          isSidebarOpen
            ? t("layout.hideSidebar", "Hide Sidebar")
            : t("layout.showSidebar", "Show Sidebar")
        }
      >
        {isSidebarOpen ? (
          <PanelLeftClose className="w-5 h-5" />
        ) : (
          <PanelLeftOpen className="w-5 h-5" />
        )}
      </button>
    </div>
  );

  return (
    <AppLayoutBase
      layoutSettings={layoutSettings}
      setLayoutSettings={setLayoutSettings}
      bottomPaddingClassName={bottomPaddingClassName}
      headerLeadingSlot={headerLeadingSlot}
      sidebar={sidebar}
      contentPaddingLeft={isSidebarOpen ? sidebarWidth : 0}
      headerOffsetLeft={isSidebarOpen ? sidebarWidth : 0}
      desktopMode={true}
      hideThemeToggle={true}
      hideSettings={true}
    >
      {children}
    </AppLayoutBase>
  );
};
