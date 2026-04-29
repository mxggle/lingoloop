import {
  Globe,
  Layout,
  Palette,
  RotateCcw,
  Clock,
  Waves,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLayoutSettings } from "../../contexts/layoutSettings";
import { usePlayerStore } from "../../stores/playerStore";
import { THEME_PRESETS, useThemeStore } from "../../stores/themeStore";
import { cn } from "../../utils/cn";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { LanguageSelector } from "../ui/LanguageSelector";
import { SettingsSection } from "./SettingsSection";
import { SettingsRow } from "./SettingsRow";

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
      description: "Display audio waveform visualization",
      icon: <Waves className={cn("h-4 w-4", layoutIconClassNames.showWaveform)} />,
    },
    {
      key: "showTranscript" as const,
      label: t("settings.transcriptPanel"),
      description: "Show AI-generated transcript panel",
      icon: <FileText className={cn("h-4 w-4", layoutIconClassNames.showTranscript)} />,
    },
    {
      key: "showControls" as const,
      label: t("settings.playbackControls"),
      description: "Display playback control buttons",
      icon: <SlidersHorizontal className={cn("h-4 w-4", layoutIconClassNames.showControls)} />,
    },
  ];

  return (
    <div className="space-y-10">
      {/* Appearance */}
      <SettingsSection
        title={t("settingsPage.appearance")}
        icon={<Globe className="h-4 w-4 text-primary-500" />}
      >
        <Card>
          <CardContent className="p-6">
            <LanguageSelector />
          </CardContent>
        </Card>
      </SettingsSection>

      {/* Interface Layout */}
      <SettingsSection
        title={t("settingsPage.interfaceLayout")}
        description={t("settingsPage.interfaceLayoutHelp")}
        icon={<Layout className="h-4 w-4 text-orange-500" />}
      >
        <Card>
          <CardContent className="p-0">
            {layoutOptions.map((option, index) => (
              <SettingsRow
                key={option.key}
                label={
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gray-100 p-2 text-gray-500 dark:bg-gray-800">
                      {option.icon}
                    </div>
                    <span>{option.label}</span>
                  </div>
                }
                description={option.description}
                noBorder={index === layoutOptions.length - 1}
                className="px-6"
              >
                <Switch
                  checked={layoutSettings[option.key]}
                  onCheckedChange={(checked) =>
                    setLayoutSettings((current) => ({
                      ...current,
                      [option.key]: checked,
                    }))
                  }
                />
              </SettingsRow>
            ))}
          </CardContent>
        </Card>
      </SettingsSection>

      {/* Theme */}
      <SettingsSection
        title={t("settingsPage.theme")}
        description={t("settingsPage.themeHelp")}
        icon={<Palette className="h-4 w-4 text-purple-500" />}
        action={
          <button
            type="button"
            onClick={resetColors}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("settingsPage.resetTheme")}
          </button>
        }
      >
        <Card>
          <CardContent className="space-y-8 p-6">
            <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
              {Object.entries(THEME_PRESETS).map(([name, themeColors]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setColors(themeColors)}
                  className="group flex flex-col items-center gap-2"
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl border-2 transition-all duration-200",
                      colors.primary === themeColors.primary
                        ? "border-primary-500 scale-110"
                        : "border-transparent group-hover:scale-105"
                    )}
                    style={{ backgroundColor: themeColors.primary }}
                  />
                  <span
                    className={cn(
                      "text-xs font-medium",
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

            <div className="border-t border-gray-100 pt-6 dark:border-gray-800">
              <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settingsPage.customPrimaryColor")}
              </label>
              <div className="flex items-center gap-4">
                <div className="relative h-10 w-10 shrink-0">
                  <input
                    type="color"
                    value={colors.primary}
                    onChange={(event) => setColors({ primary: event.target.value })}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <div
                    className="h-full w-full rounded-lg border border-gray-200 shadow-sm dark:border-gray-700"
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
                  className="h-10 max-w-[140px] font-mono text-sm uppercase"
                  maxLength={7}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </SettingsSection>

      {/* Playback */}
      <SettingsSection
        title={t("settingsPage.playback")}
        icon={<Clock className="h-4 w-4 text-blue-500" />}
      >
        <Card>
          <CardContent className="p-0">
            <SettingsRow
              label={t("settingsPage.seekMode")}
              description={t("settings.seekModeHelp")}
              className="px-6"
            >
              <select
                value={seekMode}
                onChange={(event) =>
                  setSeekMode(event.target.value as "seconds" | "sentence")
                }
                className="h-10 w-40 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="seconds">{t("settings.seekModeSeconds")}</option>
                <option value="sentence">{t("settings.seekModeSentence")}</option>
              </select>
            </SettingsRow>

            <SettingsRow
              label={t("settingsPage.seekStep")}
              description={t("settings.seekStep")}
              className="px-6"
            >
              <div className="flex items-center gap-2">
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
                  className="h-10 w-24 text-right text-sm font-medium"
                />
                <span className="text-xs font-semibold text-gray-400">SEC</span>
              </div>
            </SettingsRow>

            <SettingsRow
              label={t("settingsPage.smallStep")}
              description={t("settings.smallStep")}
              noBorder
              className="px-6"
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0.05}
                  max={10}
                  step={0.05}
                  value={seekSmallStepSeconds}
                  onChange={(event) =>
                    setSeekSmallStepSeconds(parseFloat(event.target.value) || 0)
                  }
                  className="h-10 w-24 text-right text-sm font-medium"
                />
                <span className="text-xs font-semibold text-gray-400">SEC</span>
              </div>
            </SettingsRow>
          </CardContent>
        </Card>
      </SettingsSection>
    </div>
  );
}
