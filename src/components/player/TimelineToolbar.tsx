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
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    playbackRate,
    isLooping,
    seekStepSeconds,
    setIsPlaying,
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

        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1.5 rounded-full transition-colors active:scale-90 text-gray-700 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5">
              <Settings2 size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 space-y-4" side="top" align="end">
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
