import {
  Clock,
  Globe,
  Layout,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Waves,
  FileText,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLayoutSettings } from "../../contexts/layoutSettings";
import { usePlayerStore } from "../../stores/playerStore";
import { THEME_PRESETS, useThemeStore } from "../../stores/themeStore";
import { cn } from "../../utils/cn";
import { Input } from "../ui/input";
import { LanguageSelector } from "../ui/LanguageSelector";
import { DesktopCard, DesktopCardContent } from "../ui/DesktopCard";

const layoutIconClassNames = {
  showWaveform: "text-teal-500",
  showTranscript: "text-orange-500",
  showControls: "text-error-500",
};

export function GeneralSettingsPanel() {
  const { t } = useTranslation();
  const { layoutSettings, setLayoutSettings } = useLayoutSettings();
  const { colors, setColors, resetColors } = useThemeStore();
  const {
    seekMode,
    seekStepSeconds,
    seekSmallStepSeconds,
    setSeekMode,
    setSeekStepSeconds,
    setSeekSmallStepSeconds,
  } = usePlayerStore();

  const layoutOptions = [
    {
      key: "showWaveform" as const,
      label: t("settings.waveformDisplay"),
      icon: <Waves className={cn("h-4 w-4", layoutIconClassNames.showWaveform)} />,
    },
    {
      key: "showTranscript" as const,
      label: t("settings.transcriptPanel"),
      icon: (
        <FileText className={cn("h-4 w-4", layoutIconClassNames.showTranscript)} />
      ),
    },
    {
      key: "showControls" as const,
      label: t("settings.playbackControls"),
      icon: (
        <SlidersHorizontal
          className={cn("h-4 w-4", layoutIconClassNames.showControls)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Globe className="h-4 w-4 text-primary-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("settingsPage.appearance")}
          </h3>
        </div>
        <DesktopCard>
          <DesktopCardContent className="p-6">
            <LanguageSelector />
          </DesktopCardContent>
        </DesktopCard>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Layout className="h-4 w-4 text-orange-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("settingsPage.interfaceLayout")}
          </h3>
        </div>
        <DesktopCard className="overflow-hidden">
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {layoutOptions.map((option) => (
              <div
                key={option.key}
                className="flex items-center justify-between p-6 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-gray-100 p-2.5 text-gray-500 dark:bg-gray-800">
                    {option.icon}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {option.label}
                    </span>
                    <p className="mt-1 text-xs font-medium text-gray-500">
                      Toggle visibility on the main player screen
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setLayoutSettings((current) => ({
                      ...current,
                      [option.key]: !current[option.key],
                    }))
                  }
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300",
                    layoutSettings[option.key]
                      ? "bg-primary-500"
                      : "bg-gray-200 dark:bg-gray-700"
                  )}
                  aria-label={option.label}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300",
                      layoutSettings[option.key] ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </DesktopCard>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Palette className="h-4 w-4 text-purple-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("settingsPage.theme")}
          </h3>
        </div>
        <DesktopCard>
          <DesktopCardContent className="space-y-10 p-8">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 opacity-60 dark:text-gray-400">
                {t("settingsPage.themeHelp")}
              </p>
              <button
                type="button"
                onClick={resetColors}
                className="flex items-center gap-1.5 rounded-xl border border-black/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 transition-all hover:bg-primary-50 hover:text-primary-600 dark:border-white/5 dark:hover:bg-primary-950"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("settingsPage.resetTheme")}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 sm:grid-cols-6">
              {Object.entries(THEME_PRESETS).map(([name, themeColors]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setColors(themeColors)}
                  className="group flex flex-col items-center gap-2"
                >
                  <div
                    className={cn(
                      "h-12 w-12 rounded-2xl border-2 transition-all duration-300",
                      colors.primary === themeColors.primary
                        ? "scale-110 border-primary-500 shadow-lg shadow-primary-500/10"
                        : "border-transparent group-hover:scale-105"
                    )}
                    style={{ backgroundColor: themeColors.primary }}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider transition-colors",
                      colors.primary === themeColors.primary
                        ? "text-primary-600 dark:text-primary-400"
                        : "text-gray-400"
                    )}
                  >
                    {name}
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-black/5 pt-6 dark:border-white/5">
              <label className="mb-4 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t("settingsPage.customPrimaryColor")}
              </label>
              <div className="flex items-center gap-6">
                <div className="relative h-12 w-12 shrink-0">
                  <input
                    type="color"
                    value={colors.primary}
                    onChange={(event) => setColors({ primary: event.target.value })}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <div
                    className="h-full w-full rounded-2xl border border-black/10 shadow-sm dark:border-white/10"
                    style={{ backgroundColor: colors.primary }}
                  />
                </div>
                <Input
                  type="text"
                  value={colors.primary.toUpperCase()}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (/^#[0-9A-F]{6}$/i.test(nextValue)) {
                      setColors({ primary: nextValue });
                    }
                  }}
                  placeholder="#8B5CF6"
                  className="h-12 max-w-[160px] rounded-2xl border-black/5 font-mono text-sm uppercase dark:border-white/5"
                  maxLength={7}
                />
              </div>
            </div>
          </DesktopCardContent>
        </DesktopCard>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Clock className="h-4 w-4 text-blue-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("settingsPage.playback")}
          </h3>
        </div>
        <DesktopCard className="divide-y divide-black/5 overflow-hidden dark:divide-white/5">
          <div className="flex items-center justify-between gap-6 p-6">
            <div className="flex-1">
              <label className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {t("settingsPage.seekMode")}
              </label>
              <p className="mt-1 text-xs font-medium text-gray-500">
                {t("settings.seekModeHelp")}
              </p>
            </div>
            <select
              value={seekMode}
              onChange={(event) =>
                setSeekMode(event.target.value as "seconds" | "sentence")
              }
              className="h-10 w-40 rounded-xl border border-black/10 bg-white/50 px-4 text-xs font-bold focus:ring-2 focus:ring-primary-500/20 dark:border-white/10 dark:bg-gray-800/50"
            >
              <option value="seconds">{t("settings.seekModeSeconds")}</option>
              <option value="sentence">{t("settings.seekModeSentence")}</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-6 p-6">
            <div className="flex-1">
              <label
                className={cn(
                  "text-sm font-bold text-gray-900 dark:text-gray-100",
                  seekMode === "sentence" && "opacity-50"
                )}
              >
                {t("settingsPage.seekStep")}
              </label>
              <p className="mt-1 text-xs font-medium text-gray-500">
                {t("settings.seekStep")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0.1}
                max={120}
                step={0.1}
                disabled={seekMode === "sentence"}
                value={seekStepSeconds}
                onChange={(event) =>
                  setSeekStepSeconds(parseFloat(event.target.value) || 0)
                }
                className="h-10 w-24 rounded-xl border-black/5 text-right text-sm font-bold dark:border-white/5"
              />
              <span className="text-xs font-black text-gray-400">SEC</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-6 p-6">
            <div className="flex-1">
              <label className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {t("settingsPage.smallStep")}
              </label>
              <p className="mt-1 text-xs font-medium text-gray-500">
                {t("settings.smallStep")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0.05}
                max={10}
                step={0.05}
                value={seekSmallStepSeconds}
                onChange={(event) =>
                  setSeekSmallStepSeconds(parseFloat(event.target.value) || 0)
                }
                className="h-10 w-24 rounded-xl border-black/5 text-right text-sm font-bold dark:border-white/5"
              />
              <span className="text-xs font-black text-gray-400">SEC</span>
            </div>
          </div>
        </DesktopCard>
      </section>
    </div>
  );
}
