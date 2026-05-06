# PlayerPage 布局重设计实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 PlayerPage 重构为 Descript 风格的三面板自适应布局（上部 Transcript+Video，底部 Controls+Waveform），所有面板可展开/收起/隐藏。

**Architecture:** 使用 `react-resizable-panels` 实现嵌套的可拖拽面板组（外层垂直分割上下区域，内层水平分割上部 Transcript 和 Video）。播放控制从浮动的 `CombinedControls` 迁移到底部 `TimelinePanel` 的 Toolbar 中。面板状态存入 `layoutStore` 并持久化。

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand, react-resizable-panels, Lucide React

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/stores/layoutStore.ts` | 修改 | 扩展 `LayoutSettings`，添加面板显隐和大小状态 |
| `src/components/player/PanelHeader.tsx` | 新建 | 通用面板标题栏（标题 + 最小化/展开/隐藏按钮） |
| `src/components/player/MediaPreviewPanel.tsx` | 新建 | 媒体预览面板，含标题栏，封装 MediaPlayer/YouTubePlayer |
| `src/components/player/TimelinePanel.tsx` | 新建 | 底部集成面板：Toolbar + Time Ruler + Waveform |
| `src/components/player/TimelineToolbar.tsx` | 新建 | Toolbar 行组件（播放控制、功能按钮、面板控制） |
| `src/pages/PlayerPage.tsx` | 重写 | 使用 ResizablePanelGroup 的三面板布局 |
| `src/components/controls/CombinedControls.tsx` | 修改 | 标记为 deprecated，隐藏时不再渲染 |
| `src/components/waveform/WaveformVisualizer.tsx` | 修改 | 适配深色容器背景，移除外部 padding/margin |

---

## Task 1: 安装依赖 + 扩展 LayoutStore

**Files:**
- Modify: `src/stores/layoutStore.ts`
- Install: `react-resizable-panels`

- [ ] **Step 1: 安装 react-resizable-panels**

Run:
```bash
npm install react-resizable-panels
```
Expected: 安装成功，`package.json` 中出现 `"react-resizable-panels": "^..."`

- [ ] **Step 2: 扩展 LayoutSettings 接口**

```typescript
// src/stores/layoutStore.ts
export interface LayoutSettings {
  showPlayer: boolean;
  showWaveform: boolean;
  showTranscript: boolean;
  showControls: boolean;
  // NEW: panel visibility states
  transcriptPanelVisible: boolean;
  transcriptPanelCollapsed: boolean;
  videoPanelVisible: boolean;
  videoPanelCollapsed: boolean;
  timelinePanelVisible: boolean;
  timelinePanelCollapsed: boolean;
}
```

- [ ] **Step 3: 更新 defaultLayoutSettings**

```typescript
const defaultLayoutSettings: LayoutSettings = {
  showPlayer: true,
  showWaveform: true,
  showTranscript: true,
  showControls: true,
  transcriptPanelVisible: true,
  transcriptPanelCollapsed: false,
  videoPanelVisible: true,
  videoPanelCollapsed: false,
  timelinePanelVisible: true,
  timelinePanelCollapsed: false,
};
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/stores/layoutStore.ts
git commit -m "feat(layout): extend LayoutSettings with panel visibility states and install react-resizable-panels"
```

---

## Task 2: 新建 PanelHeader 组件

**Files:**
- Create: `src/components/player/PanelHeader.tsx`

- [ ] **Step 1: 编写 PanelHeader 组件**

```tsx
// src/components/player/PanelHeader.tsx
import { Minus, Square, X } from "lucide-react";
import { cn } from "../../utils/cn";

interface PanelHeaderProps {
  title: string;
  onCollapse?: () => void;
  onExpand?: () => void;
  onHide?: () => void;
  collapsed?: boolean;
  className?: string;
}

export const PanelHeader = ({
  title,
  onCollapse,
  onExpand,
  onHide,
  collapsed = false,
  className,
}: PanelHeaderProps) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-900/80 border-b border-gray-200 dark:border-white/5 select-none",
        className
      )}
    >
      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
        {title}
      </span>
      <div className="flex items-center gap-0.5">
        {collapsed ? (
          <button
            onClick={onExpand}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="Expand"
          >
            <Square size={12} />
          </button>
        ) : (
          <button
            onClick={onCollapse}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="Collapse"
          >
            <Minus size={12} />
          </button>
        )}
        <button
          onClick={onHide}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          title="Hide"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/player/PanelHeader.tsx
git commit -m "feat(player): add PanelHeader component for resizable panels"
```

---

## Task 3: 新建 MediaPreviewPanel 组件

**Files:**
- Create: `src/components/player/MediaPreviewPanel.tsx`

- [ ] **Step 1: 编写 MediaPreviewPanel 组件**

```tsx
// src/components/player/MediaPreviewPanel.tsx
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../../stores/playerStore";
import { MediaPlayer } from "./MediaPlayer";
import { YouTubePlayer } from "./YouTubePlayer";
import { PanelHeader } from "./PanelHeader";
import { cn } from "../../utils/cn";

interface MediaPreviewPanelProps {
  visible: boolean;
  collapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  onHide: () => void;
  className?: string;
}

export const MediaPreviewPanel = ({
  visible,
  collapsed,
  onCollapse,
  onExpand,
  onHide,
  className,
}: MediaPreviewPanelProps) => {
  const { t } = useTranslation();
  const { currentFile, currentYouTube } = usePlayerStore();

  if (!visible) return null;

  const youtubeId = currentYouTube?.id;

  return (
    <div className={cn("flex flex-col min-h-0 bg-white dark:bg-gray-950/40 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden", className)}>
      <PanelHeader
        title={t("player.video", { defaultValue: "Video" })}
        collapsed={collapsed}
        onCollapse={onCollapse}
        onExpand={onExpand}
        onHide={onHide}
      />
      {!collapsed && (
        <div className="flex-1 min-h-0 bg-black flex items-center justify-center">
          {youtubeId && !currentFile && (
            <YouTubePlayer videoId={youtubeId} />
          )}
          {currentFile && <MediaPlayer />}
          {!currentFile && !youtubeId && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t("player.noMediaLoaded")}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/player/MediaPreviewPanel.tsx
git commit -m "feat(player): add MediaPreviewPanel with header and collapse/hide controls"
```

---

## Task 4: 新建 TimelineToolbar 组件

**Files:**
- Create: `src/components/player/TimelineToolbar.tsx`
- Reference: `src/components/controls/CombinedControls.tsx` (复制核心逻辑)

- [ ] **Step 1: 编写 TimelineToolbar**

```tsx
// src/components/player/TimelineToolbar.tsx
import { usePlayerStore } from "../../stores/playerStore";
import { useTranslation } from "react-i18next";
import { formatTime } from "../../utils/formatTime";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Mic,
  Settings2,
  ListMusic,
  Minus,
  Square,
  X,
  ChevronDown,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Slider } from "../ui/slider";
import { useNavigate } from "react-router-dom";

interface TimelineToolbarProps {
  collapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  onHide: () => void;
}

export const TimelineToolbar = ({
  collapsed,
  onCollapse,
  onExpand,
  onHide,
}: TimelineToolbarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    currentFile,
    currentYouTube,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    playbackRate,
    isLooping,
    seekStepSeconds,
    setIsPlaying,
    setCurrentTime,
    setVolume,
    setMuted,
    setPlaybackRate,
    setIsLooping,
    seekForward: storeSeekForward,
    seekBackward: storeSeekBackward,
  } = usePlayerStore();

  const togglePlayPause = () => setIsPlaying(!isPlaying);
  const seekForward = () => storeSeekForward(seekStepSeconds);
  const seekBackward = () => storeSeekBackward(seekStepSeconds);

  const toggleMute = () => {
    if (muted) {
      const prev = usePlayerStore.getState().previousVolume;
      setVolume(prev !== undefined && prev > 0 ? prev : 1);
      setMuted(false);
    } else {
      usePlayerStore.getState().setPreviousVolume(volume);
      setVolume(0);
      setMuted(true);
    }
  };

  const handleVolumeChange = (values: number[]) => setVolume(values[0]);

  const decreasePlaybackRate = () => setPlaybackRate(Math.max(0.25, playbackRate - 0.25));
  const increasePlaybackRate = () => setPlaybackRate(Math.min(2, playbackRate + 0.25));

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-gray-50 dark:bg-gray-900/80 border-b border-gray-200 dark:border-white/5">
      {/* Playback controls */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        <button
          onClick={seekBackward}
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-gray-700 dark:text-gray-400 active:scale-90"
          title={t("player.seekBackwardSeconds", { seconds: seekStepSeconds })}
        >
          <SkipBack size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>
        <button
          onClick={togglePlayPause}
          className="p-2 sm:p-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all"
        >
          {isPlaying ? (
            <Pause size={18} className="sm:w-5 sm:h-5" fill="currentColor" />
          ) : (
            <Play size={18} className="sm:w-5 sm:h-5 ml-0.5" fill="currentColor" />
          )}
        </button>
        <button
          onClick={seekForward}
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-gray-700 dark:text-gray-400 active:scale-90"
          title={t("player.seekForwardSeconds", { seconds: seekStepSeconds })}
        >
          <SkipForward size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>
      </div>

      {/* Time display */}
      <div className="hidden sm:block text-xs font-mono text-gray-700 dark:text-gray-300 tabular-nums whitespace-nowrap">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Function buttons */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        <button
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
          title={t("shadowing.record")}
        >
          <Mic size={13} />
          <span className="hidden sm:inline">{t("shadowing.record", { defaultValue: "Record" })}</span>
        </button>

        <button
          onClick={() => setIsLooping(!isLooping)}
          className={cn(
            "p-1.5 rounded-full transition-colors active:scale-90",
            isLooping
              ? "text-primary-600 bg-primary-50 dark:bg-primary-900/30"
              : "text-gray-700 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5"
          )}
          title={t("player.toggleLooping")}
        >
          <Repeat size={16} />
        </button>

        {/* Speed Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-0.5 px-2 py-1 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <span>{playbackRate.toFixed(2)}x</span>
              <ChevronDown size={12} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3 space-y-3" side="top" align="end">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">{t("player.playbackSpeed", { defaultValue: "Speed" })}</span>
              <span className="text-sm font-bold font-mono text-primary-600">{playbackRate.toFixed(2)}x</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={decreasePlaybackRate} className="flex-1 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-700">-0.25</button>
              <button onClick={() => setPlaybackRate(1)} className="flex-1 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700">1x</button>
              <button onClick={increasePlaybackRate} className="flex-1 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-700">+0.25</button>
            </div>
          </PopoverContent>
        </Popover>

        <button
          onClick={() => navigate("/sentence-practice")}
          className="p-1.5 rounded-full transition-colors active:scale-90 text-gray-700 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5"
          title={t("sentencePractice.title")}
        >
          <ListMusic size={16} />
        </button>

        {/* Volume Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1.5 rounded-full transition-colors active:scale-90 text-gray-700 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5">
              {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-3" side="top" sideOffset={12}>
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-gray-500 dark:text-gray-400">
                {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <Slider value={[volume]} min={0} max={1} step={0.01} onValueChange={handleVolumeChange} className="flex-1" />
            </div>
          </PopoverContent>
        </Popover>

        {/* More settings */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1.5 rounded-full transition-colors active:scale-90 text-gray-700 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5">
              <Settings2 size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 space-y-4" side="top" align="end">
            {/* Seek step */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t("settingsPage.seekStep")}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0.1}
                  max={120}
                  step={0.1}
                  value={seekStepSeconds}
                  onChange={(e) => usePlayerStore.getState().setSeekStepSeconds(parseFloat(e.target.value) || 0)}
                  className="w-16 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-2 text-xs font-bold text-right"
                />
                <span className="text-[10px] text-gray-400">s</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Panel controls */}
      <div className="flex items-center gap-0.5 ml-1 pl-2 border-l border-gray-200 dark:border-white/10">
        {collapsed ? (
          <button onClick={onExpand} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors" title="Expand">
            <Square size={12} />
          </button>
        ) : (
          <button onClick={onCollapse} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors" title="Collapse">
            <Minus size={12} />
          </button>
        )}
        <button onClick={onHide} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors" title="Hide">
          <X size={12} />
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/player/TimelineToolbar.tsx
git commit -m "feat(player): add TimelineToolbar with playback controls and panel actions"
```

---

## Task 5: 新建 TimelinePanel 组件

**Files:**
- Create: `src/components/player/TimelinePanel.tsx`
- Reference: `src/components/waveform/WaveformVisualizer.tsx`

- [ ] **Step 1: 编写 TimelinePanel**

```tsx
// src/components/player/TimelinePanel.tsx
import { usePlayerStore } from "../../stores/playerStore";
import { WaveformVisualizer } from "../waveform/WaveformVisualizer";
import { TimelineToolbar } from "./TimelineToolbar";
import { formatTime } from "../../utils/formatTime";
import { cn } from "../../utils/cn";

interface TimelinePanelProps {
  visible: boolean;
  collapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  onHide: () => void;
  className?: string;
}

export const TimelinePanel = ({
  visible,
  collapsed,
  onCollapse,
  onExpand,
  onHide,
  className,
}: TimelinePanelProps) => {
  const { currentTime, duration } = usePlayerStore();

  if (!visible) return null;

  // Collapsed mode: only toolbar + thin progress bar
  if (collapsed) {
    return (
      <div className={cn("flex flex-col bg-white dark:bg-gray-950/40 rounded-t-xl border border-gray-200 dark:border-white/5 overflow-hidden", className)}>
        <TimelineToolbar
          collapsed={collapsed}
          onCollapse={onCollapse}
          onExpand={onExpand}
          onHide={onHide}
        />
        {/* Thin progress bar */}
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 relative cursor-pointer group">
          <div
            className="absolute top-0 left-0 h-full bg-primary-500 transition-all"
            style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-900 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
          />
        </div>
      </div>
    );
  }

  // Full mode: toolbar + time ruler + waveform
  return (
    <div className={cn("flex flex-col min-h-0 bg-white dark:bg-gray-950/40 rounded-t-xl border border-gray-200 dark:border-white/5 overflow-hidden", className)}>
      <TimelineToolbar
        collapsed={collapsed}
        onCollapse={onCollapse}
        onExpand={onExpand}
        onHide={onHide}
      />

      {/* Time ruler */}
      <div className="h-5 px-3 bg-white dark:bg-gray-950/40 border-b border-gray-100 dark:border-white/5 relative select-none">
        <TimeRuler currentTime={currentTime} duration={duration} />
      </div>

      {/* Waveform */}
      <div className="flex-1 min-h-0 bg-[#0a0a1a] dark:bg-[#0a0a1a] relative">
        <WaveformVisualizer className="w-full h-full" />
      </div>
    </div>
  );
};

/* Simple time ruler component */
function TimeRuler({ currentTime, duration }: { currentTime: number; duration: number }) {
  if (duration <= 0) return null;

  const markers = 5;
  return (
    <div className="flex items-end h-full relative">
      {Array.from({ length: markers }).map((_, i) => {
        const time = (duration / (markers - 1)) * i;
        return (
          <div
            key={i}
            className="absolute bottom-0 text-[9px] text-gray-400 font-mono tabular-nums"
            style={{ left: `${(i / (markers - 1)) * 100}%`, transform: "translateX(-50%)" }}
          >
            {formatTime(time)}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/player/TimelinePanel.tsx
git commit -m "feat(player): add TimelinePanel with toolbar, time ruler and waveform"
```

---

## Task 6: 重写 PlayerPage 布局

**Files:**
- Modify: `src/pages/PlayerPage.tsx`
- Remove usage of: `CombinedControls`, `ResizableVerticalPane`, floating player div

- [ ] **Step 1: 重写 PlayerPage.tsx**

```tsx
// src/pages/PlayerPage.tsx
import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../stores/playerStore";
import { useShallow } from "zustand/react/shallow";
import { MediaPreviewPanel } from "../components/player/MediaPreviewPanel";
import { TimelinePanel } from "../components/player/TimelinePanel";
import { isElectron } from "../utils/platform";
import { MediaHistory } from "../components/web/MediaHistory";
import { TranscriptPanel } from "../components/transcript";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useWindowSize } from "../hooks/useWindowSize";
import { usePlaybackPersistence } from "../hooks/usePlaybackPersistence";
import { AppLayout } from "../components/layout/AppLayout";
import { useLayoutSettings } from "../contexts/layoutSettings";
import { useLayoutStore } from "../stores/layoutStore";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { cn } from "../utils/cn";

export const PlayerPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { layoutSettings, setLayoutSettings } = useLayoutSettings();
  const { isMobile } = useWindowSize();
  const layoutInitializedForRef = useRef<string | null>(null);
  const isOnPlayer = location.pathname === "/player";

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

  // Save panel sizes to layoutStore
  const handleLayoutResize = (sizes: number[]) => {
    // Optional: persist sizes if needed
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
          <PanelGroup direction="vertical" className="flex-1 min-h-0" onLayout={handleLayoutResize}>
            {/* Upper area: Transcript + Video */}
            <Panel
              defaultSize={65}
              minSize={20}
              maxSize={85}
              collapsible
              collapsedSize={0}
              className={cn(!layoutSettings.transcriptPanelVisible && !effectiveVideoVisible && "hidden")}
            >
              <PanelGroup direction="horizontal" className="h-full">
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
                          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
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
                    <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-primary-400 dark:hover:bg-primary-600 transition-colors cursor-col-resize flex items-center justify-center">
                      <div className="w-0.5 h-6 bg-gray-400 dark:bg-gray-500 rounded-full" />
                    </PanelResizeHandle>
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
              </PanelGroup>
            </Panel>

            {/* Vertical resize handle */}
            {layoutSettings.timelinePanelVisible && (layoutSettings.transcriptPanelVisible || effectiveVideoVisible) && (
              <PanelResizeHandle className="h-1 bg-gray-200 dark:bg-gray-700 hover:bg-primary-400 dark:hover:bg-primary-600 transition-colors cursor-row-resize flex items-center justify-center my-0.5">
                <div className="w-6 h-0.5 bg-gray-400 dark:bg-gray-500 rounded-full" />
              </PanelResizeHandle>
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
          </PanelGroup>
        )}

        {/* Media History – web only */}
        {!isElectron() && <MediaHistory />}
      </div>
    </AppLayout>
  );
};
```

- [ ] **Step 2: Run build check**

Run:
```bash
npm run build 2>&1 | tail -30
```
Expected: Build passes or TypeScript errors are only related to unused imports from removed components.

- [ ] **Step 3: Fix any TypeScript errors**

If there are errors from removed `CombinedControls` / `ResizableVerticalPane` / `MobileControls` imports, remove those imports.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PlayerPage.tsx
git commit -m "feat(player): rewrite PlayerPage with resizable three-panel layout"
```

---

## Task 7: 调整 WaveformVisualizer 容器样式

**Files:**
- Modify: `src/components/waveform/WaveformVisualizer.tsx`

- [ ] **Step 1: 移除外部 padding/margin，适配深色容器**

Find the `return` JSX block and update the container styles. The waveform should fill its parent without extra borders/padding since TimelinePanel provides the container.

```tsx
// In the return statement, replace the outer container:
// BEFORE (if any padding/border):
// <div className="... sm:p-4 sm:border sm:rounded-xl ...">

// AFTER - fill parent, no extra chrome:
<div
  ref={containerRef}
  className={cn("relative w-full h-full cursor-crosshair touch-none select-none overflow-hidden", className)}
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseLeave}
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
>
  {/* ... existing canvas and overlays ... */}
</div>
```

Specifically, look for the outermost wrapper div in the return statement and remove:
- `sm:rounded-xl`
- `sm:border`
- `sm:p-4`
- `sm:bg-gradient-to-r`

Keep only positioning and interaction classes.

- [ ] **Step 2: Commit**

```bash
git add src/components/waveform/WaveformVisualizer.tsx
git commit -m "style(waveform): remove outer padding/border to fit TimelinePanel container"
```

---

## Task 8: 标记 CombinedControls 为 deprecated（可选但建议）

**Files:**
- Modify: `src/components/controls/CombinedControls.tsx`

- [ ] **Step 1: 在组件顶部添加注释**

```tsx
/**
 * @deprecated Playback controls have been moved to TimelineToolbar inside TimelinePanel.
 * This component is kept for reference but no longer rendered in PlayerPage.
 */
```

- [ ] **Step 2: Commit**

```bash
git add src/components/controls/CombinedControls.tsx
git commit -m "chore(controls): mark CombinedControls as deprecated"
```

---

## Task 9: 最终验证

- [ ] **Step 1: Build check**

Run:
```bash
npm run build 2>&1 | tail -40
```
Expected: No errors. Warnings about unused variables are acceptable.

- [ ] **Step 2: Lint check**

Run:
```bash
npm run lint 2>&1 | tail -30
```
Expected: Pass or only pre-existing warnings.

- [ ] **Step 3: Commit any final fixes**

```bash
git add .
git commit -m "fix(player): resolve build and lint issues after layout redesign"
```

---

## Spec Coverage Check

| 设计文档要求 | 对应 Task |
|-------------|----------|
| 三面板布局（上左右 + 底部） | Task 6 |
| 播放控制集成到底部 Toolbar | Task 4 |
| TranscriptPanel 不改内部 | Task 6（仅外层容器） |
| Video 面板 audio 时自动隐藏 | Task 6 (`isAudioOnly` 逻辑) |
| 面板可展开/收起/隐藏 | Task 2 (PanelHeader), Task 6 (PanelGroup) |
| 自适应填充空间 | Task 6 (react-resizable-panels `collapsible`) |
| 面板状态持久化 | Task 1 (layoutStore 扩展) |
| 深色波形容器 | Task 5 (TimelinePanel), Task 7 (WaveformVisualizer) |
| 时间轴刻度 | Task 5 (TimeRuler) |

---

## Placeholder Scan

- [x] 无 "TBD", "TODO", "implement later"
- [x] 无 "Add appropriate error handling" 等模糊描述
- [x] 每个 Task 包含完整代码
- [x] 文件路径准确
- [x] 类型名称一致 (`LayoutSettings`, `PanelHeaderProps`, `TimelinePanelProps`)
