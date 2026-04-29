
import { usePlayerStore } from "../../stores/playerStore";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { formatTime } from "../../utils/formatTime";
import { useAutoHide } from "../../hooks/useAutoHide";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Rewind,
  FastForward,
  Repeat,
  MoreVertical,
  Music,
  Youtube,
  Settings2,
  ListMusic,
} from "lucide-react";
import { Slider } from "../ui/slider";
import { cn } from "../../utils/cn";

import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";

interface CombinedControlsProps {
  /** When false the bar always starts at left:0 (web – no sidebar). Defaults to true. */
  showSidebarOffset?: boolean;
}

export const CombinedControls = ({ showSidebarOffset = true }: CombinedControlsProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isVisible, show: showControls, startHideTimer, pause } = useAutoHide(4000);
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
    setIsPlaying,
    setCurrentTime,
    setVolume,
    setMuted,
    setPlaybackRate,
    setIsLooping,
    seekForward: storeSeekForward,
    seekBackward: storeSeekBackward,
    seekStepSeconds,
    seekMode,
    setSeekStepSeconds,
    setSeekMode,
    maxLoops,
    setMaxLoops,
    loopDelay,
    setLoopDelay,
    isSidebarOpen,
    sidebarWidth,
  } = usePlayerStore();

  // Toggle play/pause
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle timeline slider change with improved seeking capability
  const handleTimelineChange = (values: number[]) => {
    setCurrentTime(values[0]);
    document.body.classList.add("user-seeking");
    setTimeout(() => {
      document.body.classList.remove("user-seeking");
    }, 100);
  };

  // Seek forward by configured step
  const seekForward = () => {
    storeSeekForward(seekStepSeconds);
  };

  // Seek backward by configured step
  const seekBackward = () => {
    storeSeekBackward(seekStepSeconds);
  };

  // Decrease playback rate
  const decreasePlaybackRate = () => {
    const newRate = Math.max(0.25, playbackRate - 0.25);
    setPlaybackRate(newRate);
  };

  // Increase playback rate
  const increasePlaybackRate = () => {
    const newRate = Math.min(2, playbackRate + 0.25);
    setPlaybackRate(newRate);
  };

  // Toggle mute
  const toggleMute = () => {
    if (muted) {
      const previousVolume = usePlayerStore.getState().previousVolume;
      if (previousVolume !== undefined && previousVolume > 0) {
        setVolume(previousVolume);
      } else {
        setVolume(1);
      }
      setMuted(false);
    } else {
      usePlayerStore.getState().setPreviousVolume(volume);
      setVolume(0);
      setMuted(true);
    }
  };

  // Handle volume slider change
  const handleVolumeChange = (values: number[]) => {
    setVolume(values[0]);
  };

  const toggleLooping = () => {
    setIsLooping(!isLooping);
  };

  const sidebarOffsetStyle =
    showSidebarOffset && isSidebarOpen
      ? { left: `calc(50% + ${sidebarWidth / 2}px)` }
      : {};

  return (
    <>
      {/* Bottom trigger bar — shows when controls are hidden */}
      <div
        className={cn(
          "fixed bottom-0 left-1/2 -translate-x-1/2 z-[59] w-24 h-1.5 rounded-t-full transition-all duration-300 cursor-pointer",
          "bg-white/30 dark:bg-white/20 backdrop-blur-sm",
          isVisible
            ? "opacity-0 translate-y-full pointer-events-none"
            : "opacity-100 translate-y-0"
        )}
        style={sidebarOffsetStyle}
        onMouseEnter={showControls}
      />

      <div
        className={cn(
          "fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] transition-all duration-500 ease-out",
          "w-[90%] max-w-3xl backdrop-blur-xl bg-white/80 dark:bg-gray-900/85 rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden",
          !isVisible && "translate-y-[calc(100%+3rem)] opacity-0 pointer-events-none"
        )}
        style={sidebarOffsetStyle}
        onMouseEnter={pause}
        onMouseLeave={startHideTimer}
      >
      {/* Timeline Slider - Minimalist line at the top */}
      <div className="absolute top-0 left-0 right-0 h-1.5 group cursor-pointer z-10">
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 100}
          step={0.1}
          onValueChange={handleTimelineChange}
          className="h-full"
          trackClassName="h-full rounded-none bg-transparent"
          rangeClassName="bg-primary-500"
          thumbClassName="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity bg-primary-600 border-white shadow-sm"
        />
      </div>

      <div className="flex items-center justify-between px-3 sm:px-6 py-3 h-20 sm:h-16 relative">
        {/* Left: Playback Controls */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            onClick={seekBackward}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-gray-700 dark:text-gray-400 active:scale-90"
            title={t("player.seekBackwardSeconds", { seconds: seekStepSeconds })}
          >
            <SkipBack size={18} className="sm:w-[20px] sm:h-[20px]" />
          </button>
          <button
            onClick={togglePlayPause}
            className="p-2.5 sm:p-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all"
            aria-label={isPlaying ? t("player.pause") : t("player.play")}
          >
            {isPlaying ? (
              <Pause size={20} className="sm:w-[22px] sm:h-[22px]" fill="currentColor" />
            ) : (
              <Play size={20} className="sm:w-[22px] sm:h-[22px] ml-0.5" fill="currentColor" />
            )}
          </button>
          <button
            onClick={seekForward}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-gray-700 dark:text-gray-400 active:scale-90"
            title={t("player.seekForwardSeconds", { seconds: seekStepSeconds })}
          >
            <SkipForward size={18} className="sm:w-[20px] sm:h-[20px]" />
          </button>
        </div>

        {/* Center: Media Info (Hidden on mobile if needed, but let's try to keep it minimal) */}
        <div className="flex-1 flex items-center justify-center px-2 sm:px-4 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3 max-w-[150px] sm:max-w-md">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-600 flex-shrink-0 shadow-md flex items-center justify-center text-white overflow-hidden">
              {currentYouTube ? <Youtube size={16} className="sm:w-[20px] sm:h-[20px]" /> : <Music size={16} className="sm:w-[20px] sm:h-[20px]" />}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] sm:text-sm font-semibold truncate text-gray-900 dark:text-gray-100 leading-tight">
                {currentYouTube ? currentYouTube.title : (currentFile ? currentFile.name : t("player.noMedia"))}
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="hidden xs:inline text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold truncate max-w-[40px] sm:max-w-none">
                  {currentYouTube ? "YouTube" : (currentFile ? t("common.localFile", { defaultValue: "Local" }) : "---")}
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Secondary Controls */}
        <div className="flex items-center gap-0.5 sm:gap-2">
          {/* Volume - hidden on very small screens */}
          <div className="hidden xs:block">
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-gray-700 dark:text-gray-400 active:scale-90">
                  {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-4 backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-black/10 dark:border-white/10 shadow-2xl rounded-xl" side="top" sideOffset={16}>
                <div className="flex items-center gap-3">
                  <button onClick={toggleMute} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <Slider
                    value={[volume]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="flex-1"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>


          <button
            onClick={() => navigate("/sentence-practice")}
            className="p-2 rounded-full transition-colors active:scale-90 text-gray-700 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5"
            title={t("sentencePractice.title")}
          >
            <ListMusic size={18} />
          </button>

          <button
            onClick={toggleLooping}
            className={cn(
              "p-2 rounded-full transition-colors active:scale-90",
              isLooping
                ? "text-primary-600 bg-primary-50 dark:bg-primary-900/30"
                : "text-gray-700 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5"
            )}
            title={t("player.toggleLooping")}
          >
            <Repeat size={18} />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-gray-700 dark:text-gray-400 active:scale-90">
                <MoreVertical size={18} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4 space-y-5 backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-black/10 dark:border-white/10 shadow-2xl rounded-xl" side="top" align="end" sideOffset={16}>
              {/* Playback Rate */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Settings2 size={14} />
                    <span className="text-xs font-medium uppercase tracking-wider">{t("player.playbackSpeed", { defaultValue: "Speed" })}</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-primary-600 dark:text-primary-400">{playbackRate.toFixed(2)}x</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={decreasePlaybackRate}
                    className="flex-1 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Rewind size={16} />
                  </button>
                  <button
                    onClick={() => setPlaybackRate(1)}
                    className="flex-1 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-[10px] font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase"
                  >
                    1x
                  </button>
                  <button
                    onClick={increasePlaybackRate}
                    className="flex-1 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FastForward size={16} />
                  </button>
                </div>
              </div>

              {/* Loop Settings */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t("loop.repeats")}</label>
                  <select
                    value={maxLoops}
                    onChange={(e) => setMaxLoops(Number(e.target.value))}
                    className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-2 text-xs font-semibold focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={0}>∞</option>
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={3}>3x</option>
                    <option value={5}>5x</option>
                    <option value={10}>10x</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t("loop.gap")}</label>
                  <select
                    value={loopDelay}
                    onChange={(e) => setLoopDelay(Number(e.target.value))}
                    className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-2 text-xs font-semibold focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={0}>0s</option>
                    <option value={0.5}>0.5s</option>
                    <option value={1}>1s</option>
                    <option value={2}>2s</option>
                    <option value={3}>3s</option>
                    <option value={5}>5s</option>
                  </select>
                </div>
              </div>

              {/* Seek Steps */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t("settingsPage.seekMode")}</label>
                  <select
                    value={seekMode}
                    onChange={(e) => setSeekMode(e.target.value as "seconds" | "sentence")}
                    className="h-7 rounded-md border-transparent bg-gray-100 dark:bg-gray-800 px-2 text-[10px] font-bold focus:ring-0"
                  >
                    <option value="seconds">{t("settings.seekModeSeconds", "Seconds")}</option>
                    <option value="sentence">{t("settings.seekModeSentence", "Sentence")}</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{t("settingsPage.seekStep")}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0.1}
                      max={120}
                      step={0.1}
                      disabled={seekMode === "sentence"}
                      value={seekStepSeconds}
                      onChange={(e) => setSeekStepSeconds(parseFloat(e.target.value) || 0)}
                      className="w-14 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-2 text-xs font-bold text-right focus:ring-1 focus:ring-primary-500 disabled:opacity-30"
                    />
                    <span className="text-[10px] font-bold text-gray-400">S</span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
    </>
  );
};

