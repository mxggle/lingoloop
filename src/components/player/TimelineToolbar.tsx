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
  ChevronsRight,
  AlignStartHorizontal,
  AlignEndHorizontal,
  BookmarkPlus,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Slider } from "../ui/slider";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

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
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    playbackRate,
    isLooping,
    loopStart,
    loopEnd,
    autoAdvanceBookmarks,
    currentFile,
    seekStepSeconds,
    setIsPlaying,
    setVolume,
    setMuted,
    setPlaybackRate,
    setIsLooping,
    setLoopPoints,
    setAutoAdvanceBookmarks,
    addBookmark,
    getCurrentMediaBookmarks,
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

  const setLoopStartAtCurrentTime = () => {
    const end = loopEnd !== null ? loopEnd : duration;
    if (currentTime < end) {
      setLoopPoints(currentTime, end);
      if (!isLooping) setIsLooping(true);
    }
  };

  const setLoopEndAtCurrentTime = () => {
    const start = loopStart !== null ? loopStart : 0;
    if (currentTime > start) {
      setLoopPoints(start, currentTime);
      if (!isLooping) setIsLooping(true);
    }
  };

  const handleQuickBookmark = () => {
    const bookmarks = getCurrentMediaBookmarks();
    const bookmarkCount = bookmarks.length + 1;
    
    // Use loop range if active, otherwise current point (instant clip)
    const start = loopStart !== null ? loopStart : Math.max(0, currentTime - 1);
    const end = loopEnd !== null ? loopEnd : Math.min(duration, currentTime + 1);

    const added = addBookmark({
      name: t("bookmarks.defaultClipName", { count: bookmarkCount }),
      start,
      end,
      playbackRate,
      mediaName: currentFile?.name,
      mediaType: currentFile?.type,
      annotation: "",
    });

    if (added) {
      toast.success(t("bookmarks.bookmarkAdded"));
    }
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-[#0a0a1a] border-b border-white/5 shadow-2xl relative z-20">
      {/* Playback controls */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        <button
          onClick={seekBackward}
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-400 active:scale-90"
          title={t("player.seekBackwardSeconds", { seconds: seekStepSeconds })}
        >
          <SkipBack size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>
        <button
          onClick={togglePlayPause}
          className="p-2 sm:p-2.5 bg-white text-gray-900 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all"
        >
          {isPlaying ? (
            <Pause size={18} className="sm:w-5 sm:h-5" fill="currentColor" />
          ) : (
            <Play size={18} className="sm:w-5 sm:h-5 ml-0.5" fill="currentColor" />
          )}
        </button>
        <button
          onClick={seekForward}
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-400 active:scale-90"
          title={t("player.seekForwardSeconds", { seconds: seekStepSeconds })}
        >
          <SkipForward size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>
      </div>

      {/* Time display */}
      <div className="hidden sm:block text-xs font-mono text-gray-300 tabular-nums whitespace-nowrap">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      <div className="flex-1" />

      {/* Function buttons */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        <button
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          title={t("shadowing.record")}
        >
          <Mic size={13} />
          <span className="hidden sm:inline">{t("shadowing.record", { defaultValue: "Record" })}</span>
        </button>

        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        <button
          onClick={() => setIsLooping(!isLooping)}
          className={cn(
            "p-1.5 rounded-full transition-colors active:scale-90",
            isLooping
              ? "text-primary-400 bg-primary-500/20"
              : "text-gray-400 hover:bg-white/10"
          )}
          title={t("player.toggleLooping")}
        >
          <Repeat size={16} />
        </button>

        <button
          onClick={setLoopStartAtCurrentTime}
          className="p-1.5 rounded-full transition-colors active:scale-90 text-gray-400 hover:bg-white/10"
          title={t("loop.setStart")}
        >
          <AlignStartHorizontal size={16} />
        </button>

        <button
          onClick={setLoopEndAtCurrentTime}
          className="p-1.5 rounded-full transition-colors active:scale-90 text-gray-400 hover:bg-white/10"
          title={t("loop.setEnd")}
        >
          <AlignEndHorizontal size={16} />
        </button>

        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        <button
          onClick={() => setAutoAdvanceBookmarks(!autoAdvanceBookmarks)}
          className={cn(
            "p-1.5 rounded-full transition-colors active:scale-90",
            autoAdvanceBookmarks
              ? "text-primary-400 bg-primary-500/20"
              : "text-gray-400 hover:bg-white/10"
          )}
          title={t("player.toggleAutoAdvance")}
        >
          <ChevronsRight size={16} />
        </button>

        <button
          onClick={handleQuickBookmark}
          className="p-1.5 rounded-full transition-colors active:scale-90 text-gray-400 hover:bg-white/10"
          title={t("bookmarks.addBookmark")}
        >
          <BookmarkPlus size={16} />
        </button>

        <button
          onClick={() => navigate("/sentence-practice")}
          className="p-1.5 rounded-full transition-colors active:scale-90 text-gray-400 hover:bg-white/10"
          title={t("sentencePractice.title")}
        >
          <ListMusic size={16} />
        </button>

        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-0.5 px-2 py-1 rounded-md text-xs font-medium text-gray-300 hover:bg-white/10 transition-colors">
              <span>{playbackRate.toFixed(2)}x</span>
              <ChevronDown size={12} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3 space-y-3 bg-gray-900 border-white/10 text-white" side="top" align="end">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">{t("player.playbackSpeed", { defaultValue: "Speed" })}</span>
              <span className="text-sm font-bold font-mono text-primary-400">{playbackRate.toFixed(2)}x</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={decreasePlaybackRate} className="flex-1 py-1.5 bg-white/5 rounded-lg text-xs hover:bg-white/10">-0.25</button>
              <button onClick={() => setPlaybackRate(1)} className="flex-1 py-1.5 bg-white/5 rounded-lg text-xs font-bold hover:bg-white/10">1x</button>
              <button onClick={increasePlaybackRate} className="flex-1 py-1.5 bg-white/5 rounded-lg text-xs hover:bg-white/10">+0.25</button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1.5 rounded-full transition-colors active:scale-90 text-gray-400 hover:bg-white/10">
              {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-3 bg-gray-900 border-white/10" side="top" sideOffset={12}>
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-gray-400">
                {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <Slider value={[volume]} min={0} max={1} step={0.01} onValueChange={handleVolumeChange} className="flex-1" />
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1.5 rounded-full transition-colors active:scale-90 text-gray-400 hover:bg-white/10">
              <Settings2 size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 space-y-4 bg-gray-900 border-white/10 text-white" side="top" align="end">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t("settingsPage.seekStep")}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0.1}
                  max={120}
                  step={0.1}
                  value={seekStepSeconds}
                  onChange={(e) => usePlayerStore.getState().setSeekStepSeconds(parseFloat(e.target.value) || 0)}
                  className="w-16 h-8 rounded-lg border border-white/10 bg-transparent px-2 text-xs font-bold text-right text-white"
                />
                <span className="text-[10px] text-gray-500">s</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Panel controls */}
      <div className="flex items-center gap-0.5 ml-1 pl-2 border-l border-white/10">
        {collapsed ? (
          <button onClick={onExpand} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Expand">
            <Square size={12} />
          </button>
        ) : (
          <button onClick={onCollapse} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Collapse">
            <Minus size={12} />
          </button>
        )}
        <button onClick={onHide} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Hide">
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

