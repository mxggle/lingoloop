import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle,
  ChevronRight,
  Eye,
  EyeOff,
  FileAudio,
  Globe,
  Key,
  Shield,
} from "lucide-react";
import {
  AIProvider,
  TRANSCRIPTION_PROVIDERS,
  TranscriptionProvider,
} from "../../types/aiService";
import { cn } from "../../utils/cn";
import type { UseAiSettingsStateResult } from "../../hooks/useAiSettingsState";
import { AIProviderDetail } from "./AIProviderDetail";
import { AIProviderList } from "./AIProviderList";
import { DesktopCard, DesktopCardContent } from "../ui/DesktopCard";
import { Input } from "../ui/input";

const LANGUAGE_OPTIONS = [
  "english",
  "spanish",
  "french",
  "german",
  "chinese",
  "japanese",
  "korean",
] as const;

const LANGUAGE_VALUES: Record<(typeof LANGUAGE_OPTIONS)[number], string> = {
  english: "English",
  spanish: "Spanish",
  french: "French",
  german: "German",
  chinese: "Chinese",
  japanese: "Japanese",
  korean: "Korean",
};

export type AiSettingsSection = "defaults" | "providers" | "transcription";
const DEFAULT_AI_SETTINGS_SECTION: AiSettingsSection = "defaults";

const AI_SETTINGS_SECTIONS: readonly AiSettingsSection[] = [
  DEFAULT_AI_SETTINGS_SECTION,
  "providers",
  "transcription",
];

interface AISettingsPanelProps {
  state: UseAiSettingsStateResult;
  initialSection?: AiSettingsSection;
  onSectionChange?: (section: AiSettingsSection) => void;
}

const AISettingsPanelComponent = ({
  state,
  initialSection,
  onSectionChange,
}: AISettingsPanelProps) => {
  const { t } = useTranslation();
  const [aiSubTab, setAiSubTab] = useState<AiSettingsSection>(
    initialSection ?? DEFAULT_AI_SETTINGS_SECTION
  );

  useEffect(() => {
    setAiSubTab(initialSection ?? DEFAULT_AI_SETTINGS_SECTION);
  }, [initialSection]);

  const { providerConfigs, defaultsState, providersState, transcriptionState } =
    state;
  const {
    preferredProvider,
    setPreferredProvider,
    targetLanguage,
    setTargetLanguage,
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
  } = defaultsState;
  const {
    showApiKeys,
    toggleApiKeyVisibility,
    testingConnection,
    connectionStatus,
    testConnection,
    selectedProvider,
    setSelectedProvider,
    ollamaBaseUrl,
    setOllamaBaseUrl,
  } = providersState;
  const {
    preferredTranscriptionProvider,
    setPreferredTranscriptionProvider,
    transcriptionSharedProvider,
    groqApiKey,
    setGroqApiKey,
    showGroqApiKey,
    setShowGroqApiKey,
    localWhisperUrl,
    setLocalWhisperUrl,
    localWhisperModel,
    setLocalWhisperModel,
  } = transcriptionState;

  const aiSubTabs = [
    { id: "defaults" as const, label: t("aiSettingsPage.sectionNav.defaults"), Icon: Globe },
    { id: "providers" as const, label: t("aiSettingsPage.sectionNav.providers"), Icon: Key },
    {
      id: "transcription" as const,
      label: t("aiSettingsPage.sectionNav.transcription"),
      Icon: FileAudio,
    },
  ];

  const providerDisplayName = (provider: AIProvider) =>
    t(`aiSettingsPage.providers.${provider}`);

  const handleSectionChange = (section: AiSettingsSection) => {
    setAiSubTab(section);
    onSectionChange?.(section);
  };

  const selectedProviderConfig =
    providerConfigs.find(({ provider }) => provider === selectedProvider) ??
    providerConfigs[0];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="space-y-2">
        <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
          {t("aiSettingsPage.title")}
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          {t("aiSettingsPage.subtitle")}
        </p>
      </div>

      <div className="space-y-6">
        <div className="mx-auto flex w-fit gap-1.5 rounded-2xl bg-black/5 p-1.5 dark:bg-white/5 sm:mx-0">
          {aiSubTabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleSectionChange(id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-wide transition-all duration-300",
                aiSubTab === id
                  ? "bg-white text-primary-600 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="min-h-[400px] space-y-8">
          {aiSubTab === "defaults" ? (
            <section className="space-y-8 animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Shield className="h-4 w-4 text-primary-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t("aiSettingsPage.preferredProvider")}
                  </h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-4">
                  {providerConfigs.map(({ provider, setupStatus }) => {
                    const isActive = preferredProvider === provider;

                    return (
                      <button
                        key={provider}
                        type="button"
                        onClick={() => setPreferredProvider(provider)}
                        className={cn(
                          "group relative rounded-3xl border-2 p-5 transition-all duration-300",
                          isActive
                            ? "border-primary-500 bg-primary-500/5 dark:bg-primary-500/10"
                            : "border-black/5 bg-white/40 hover:border-primary-500/30 dark:border-white/5 dark:bg-gray-900/40"
                        )}
                      >
                        <span
                          className={cn(
                            "mb-1 block text-sm font-bold",
                            isActive
                              ? "text-primary-700 dark:text-primary-300"
                              : "text-gray-900 dark:text-white"
                          )}
                        >
                          {providerDisplayName(provider)}
                        </span>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 transition-colors group-hover:text-primary-500">
                          {setupStatus.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <DesktopCard>
                <DesktopCardContent className="space-y-10 p-8">
                  <div className="grid gap-10 sm:grid-cols-2">
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {t("aiSettingsPage.targetLanguage")}
                      </label>
                      <select
                        value={targetLanguage}
                        onChange={(event) => setTargetLanguage(event.target.value)}
                        className="h-12 w-full rounded-2xl border border-black/10 bg-white/50 px-4 text-sm font-bold focus:ring-2 focus:ring-primary-500/20 dark:border-white/10 dark:bg-gray-800/50"
                      >
                        {LANGUAGE_OPTIONS.map((key) => (
                          <option key={key} value={LANGUAGE_VALUES[key]}>
                            {t(`aiSettingsPage.languages.${key}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {t("aiSettingsPage.maxTokens")}
                      </label>
                      <Input
                        type="number"
                        min={100}
                        max={4000}
                        value={maxTokens}
                        onChange={(event) => {
                          const nextValue = parseInt(event.target.value, 10);
                          setMaxTokens(Number.isFinite(nextValue) ? nextValue : 1000);
                        }}
                        className="h-12 rounded-2xl border-black/5 text-sm font-bold dark:border-white/5"
                      />
                    </div>
                  </div>

                  <div className="space-y-8 border-t border-black/5 pt-8 dark:border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {t("aiSettingsPage.generationBehavior")}
                      </label>
                      <span className="rounded-full bg-primary-500 px-4 py-1 font-mono text-xs font-black text-white">
                        {temperature.toFixed(1)}
                      </span>
                    </div>
                    <div className="space-y-4">
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={temperature}
                        onChange={(event) =>
                          setTemperature(parseFloat(event.target.value))
                        }
                        className="h-2 w-full appearance-none rounded-full bg-black/5 accent-primary-500 dark:bg-white/5"
                      />
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 opacity-60">
                        <span>{t("aiSettingsPage.temperatureFocused")}</span>
                        <span>{t("aiSettingsPage.temperatureBalanced")}</span>
                        <span>{t("aiSettingsPage.temperatureCreative")}</span>
                      </div>
                    </div>
                  </div>
                </DesktopCardContent>
              </DesktopCard>
            </section>
          ) : null}

          {aiSubTab === "providers" ? (
            <section className="animate-in fade-in duration-300">
              <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                <AIProviderList
                  providerConfigs={providerConfigs}
                  selectedProvider={selectedProvider}
                  preferredProvider={preferredProvider}
                  connectionStatus={connectionStatus}
                  onSelectProvider={setSelectedProvider}
                />
                <AIProviderDetail
                  providerConfig={selectedProviderConfig}
                  preferredProvider={preferredProvider}
                  showApiKey={showApiKeys[selectedProviderConfig.provider]}
                  connectionStatus={connectionStatus[selectedProviderConfig.provider]}
                  testingConnection={testingConnection[selectedProviderConfig.provider]}
                  ollamaBaseUrl={ollamaBaseUrl}
                  setOllamaBaseUrl={setOllamaBaseUrl}
                  onToggleApiKeyVisibility={() =>
                    toggleApiKeyVisibility(selectedProviderConfig.provider)
                  }
                  onTestConnection={() => {
                    void testConnection(selectedProviderConfig.provider);
                  }}
                />
              </div>
            </section>
          ) : null}

          {aiSubTab === "transcription" ? (
            <section className="space-y-8 animate-in fade-in duration-300">
              <div className="grid gap-4 sm:grid-cols-3">
                {(Object.keys(TRANSCRIPTION_PROVIDERS) as TranscriptionProvider[]).map(
                  (provider) => {
                    const isSelected = preferredTranscriptionProvider === provider;

                    return (
                      <button
                        key={provider}
                        type="button"
                        onClick={() => setPreferredTranscriptionProvider(provider)}
                        className={cn(
                          "group relative overflow-hidden rounded-3xl border-2 p-6 transition-all duration-300",
                          isSelected
                            ? "border-primary-500 bg-primary-500/5 dark:bg-primary-500/10"
                            : "border-black/5 bg-white/40 hover:border-primary-500/30 dark:border-white/5 dark:bg-gray-900/40"
                        )}
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div
                            className={cn(
                              "rounded-xl p-2",
                              isSelected
                                ? "bg-primary-500 text-white"
                                : "bg-black/5 text-gray-400 dark:bg-white/5"
                            )}
                          >
                            <FileAudio size={18} />
                          </div>
                          {isSelected ? (
                            <CheckCircle className="h-4 w-4 text-primary-500" />
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            "mb-1 block text-sm font-bold uppercase tracking-tight",
                            isSelected
                              ? "text-primary-700 dark:text-primary-300"
                              : "text-gray-900 dark:text-white"
                          )}
                        >
                          {t(`aiSettingsPage.transcriptionProviders.${provider}`)}
                        </span>
                        <p className="truncate text-[10px] font-bold uppercase tracking-widest text-gray-400 opacity-60">
                          {provider === "local-whisper"
                            ? localWhisperModel || "Custom"
                            : TRANSCRIPTION_PROVIDERS[provider].model}
                        </p>
                      </button>
                    );
                  }
                )}
              </div>

              <DesktopCard>
                <DesktopCardContent className="p-8">
                  {preferredTranscriptionProvider === "local-whisper" ? (
                    <div className="grid gap-8 md:grid-cols-2">
                      <div className="space-y-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                          {t("aiSettingsPage.localWhisperUrl")}
                        </label>
                        <Input
                          type="text"
                          value={localWhisperUrl}
                          onChange={(event) =>
                            setLocalWhisperUrl(event.target.value)
                          }
                          placeholder="http://localhost:8000"
                          className="h-12 rounded-2xl border-black/5 font-mono text-sm dark:border-white/5"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                          {t("aiSettingsPage.localWhisperModel")}
                        </label>
                        <Input
                          type="text"
                          value={localWhisperModel}
                          onChange={(event) =>
                            setLocalWhisperModel(event.target.value)
                          }
                          placeholder="Systran/faster-whisper-large-v3"
                          className="h-12 rounded-2xl border-black/5 text-sm font-bold dark:border-white/5"
                        />
                      </div>
                    </div>
                  ) : transcriptionSharedProvider ? (
                    <div className="flex items-center gap-6">
                      <div className="rounded-3xl bg-primary-500/10 p-4 text-primary-500">
                        <Shield size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-tight text-gray-900 dark:text-white">
                          {t("aiSettingsPage.transcriptionSharedKey")}
                        </p>
                        <p className="mt-1 text-xs font-medium text-gray-500 opacity-70">
                          {t("aiSettingsPage.transcriptionSharedKeyDescription", {
                            provider: providerDisplayName(transcriptionSharedProvider),
                          })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-md space-y-4">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {t("aiSettingsPage.groqApiKeyLabel")}
                      </label>
                      <div className="relative">
                        <Input
                          type={showGroqApiKey ? "text" : "password"}
                          value={groqApiKey}
                          onChange={(event) => setGroqApiKey(event.target.value)}
                          placeholder={t("aiSettingsPage.groqApiKeyPlaceholder")}
                          className="h-12 rounded-2xl border-black/5 pr-12 font-mono text-sm dark:border-white/5"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGroqApiKey((current) => !current)}
                          className="absolute inset-y-0 right-4 flex items-center text-gray-400 transition-colors hover:text-primary-500"
                        >
                          {showGroqApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        {t("aiSettingsPage.getGroqApiKey")}
                        <ChevronRight size={14} />
                      </a>
                    </div>
                  )}
                </DesktopCardContent>
              </DesktopCard>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
};

type AISettingsPanelComponentType = ((
  props: AISettingsPanelProps
) => JSX.Element) & {
  defaultSection: AiSettingsSection;
  isSection: (section: string | null | undefined) => section is AiSettingsSection;
};

export const AISettingsPanel = Object.assign(AISettingsPanelComponent, {
  defaultSection: DEFAULT_AI_SETTINGS_SECTION,
  isSection: (
    section: string | null | undefined
  ): section is AiSettingsSection =>
    !!section &&
    (AI_SETTINGS_SECTIONS as readonly string[]).includes(section),
}) as AISettingsPanelComponentType;
