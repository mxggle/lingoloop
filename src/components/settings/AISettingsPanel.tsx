import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronDown,
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
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { SettingsSection } from "./SettingsSection";
import { SettingsIconChip } from "./SettingsIconChip";


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
    opencodeBaseUrl,
    setOpencodeBaseUrl,
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
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("aiSettingsPage.title")}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("aiSettingsPage.subtitle")}
        </p>
      </div>

      <Tabs value={aiSubTab} onValueChange={(v) => handleSectionChange(v as AiSettingsSection)}>
        <TabsList>
          <TabsTrigger value="defaults">
            <Globe className="mr-1.5 h-3.5 w-3.5" />
            {t("aiSettingsPage.sectionNav.defaults")}
          </TabsTrigger>
          <TabsTrigger value="providers">
            <Key className="mr-1.5 h-3.5 w-3.5" />
            {t("aiSettingsPage.sectionNav.providers")}
          </TabsTrigger>
          <TabsTrigger value="transcription">
            <FileAudio className="mr-1.5 h-3.5 w-3.5" />
            {t("aiSettingsPage.sectionNav.transcription")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="defaults" className="space-y-6">
          <SettingsSection
            title={t("aiSettingsPage.preferredProvider")}
            icon={<Shield className="h-4 w-4 text-primary-500" />}
          >
            <div className="grid gap-2.5 sm:grid-cols-3">
              {providerConfigs.map(({ provider, setupStatus }) => {
                const isActive = preferredProvider === provider;
                const isReady = setupStatus.tone === "success";

                return (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => setPreferredProvider(provider)}
                    className={cn(
                      "relative flex min-h-[76px] flex-col gap-1.5 rounded-xl border-[1.5px] p-4 text-left transition-colors duration-200",
                      isActive
                        ? "border-primary-500 bg-primary-500/10"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-gray-700"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute right-3 top-3 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary-500 text-white transition-all duration-200",
                        isActive ? "scale-100 opacity-100" : "scale-50 opacity-0"
                      )}
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3.2} />
                    </span>
                    <span
                      className={cn(
                        "block pr-5 text-sm font-bold tracking-tight",
                        isActive
                          ? "text-primary-600 dark:text-primary-300"
                          : "text-gray-900 dark:text-white"
                      )}
                    >
                      {providerDisplayName(provider)}
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-1.5 text-[11.5px] font-semibold",
                        isReady
                          ? "text-gray-500 dark:text-gray-400"
                          : "text-gray-400 dark:text-gray-500"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          isReady ? "bg-success-500" : "bg-gray-300 dark:bg-gray-600"
                        )}
                      />
                      {setupStatus.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </SettingsSection>

          <SettingsSection title={t("aiSettingsPage.generationBehavior")}>
            <Card>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold tracking-wide text-gray-500 dark:text-gray-400">
                      {t("aiSettingsPage.targetLanguage")}
                    </label>
                    <div className="relative flex h-11 items-center rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 transition-colors focus-within:border-primary-500 focus-within:ring-[3px] focus-within:ring-primary-500/10 dark:border-gray-700 dark:bg-gray-950">
                      <select
                        value={targetLanguage}
                        onChange={(event) => setTargetLanguage(event.target.value)}
                        className="w-full appearance-none bg-transparent pr-6 text-sm font-semibold text-gray-900 focus:outline-none dark:text-white"
                      >
                        {LANGUAGE_OPTIONS.map((key) => (
                          <option key={key} value={LANGUAGE_VALUES[key]}>
                            {t(`aiSettingsPage.languages.${key}`)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold tracking-wide text-gray-500 dark:text-gray-400">
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
                      className="h-11 rounded-xl border-[1.5px] font-mono text-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-3 border-t border-gray-100 pt-6 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      {t("aiSettingsPage.generationBehavior")}
                    </label>
                    <span className="min-w-[44px] rounded-full bg-primary-500 px-2.5 py-0.5 text-center font-mono text-xs font-bold text-white">
                      {temperature.toFixed(1)}
                    </span>
                  </div>
                  <div className="relative flex h-6 items-center">
                    <span className="absolute left-0 right-0 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <span
                      className="absolute left-0 h-1.5 rounded-full bg-primary-500"
                      style={{ width: `${(temperature / 2) * 100}%` }}
                    />
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(event) =>
                        setTemperature(parseFloat(event.target.value))
                      }
                      className="aurora-range relative z-10 h-5 w-full cursor-pointer appearance-none bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between text-xs font-medium text-gray-400">
                    <span>{t("aiSettingsPage.temperatureFocused")}</span>
                    <span>{t("aiSettingsPage.temperatureBalanced")}</span>
                    <span>{t("aiSettingsPage.temperatureCreative")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SettingsSection>
        </TabsContent>

        <TabsContent value="providers">
          <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
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
              opencodeBaseUrl={opencodeBaseUrl}
              setOpencodeBaseUrl={setOpencodeBaseUrl}
              onToggleApiKeyVisibility={() =>
                toggleApiKeyVisibility(selectedProviderConfig.provider)
              }
              onTestConnection={() => {
                void testConnection(selectedProviderConfig.provider);
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="transcription" className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(TRANSCRIPTION_PROVIDERS) as TranscriptionProvider[]).map(
              (provider) => {
                const isSelected = preferredTranscriptionProvider === provider;

                return (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => setPreferredTranscriptionProvider(provider)}
                    className={cn(
                      "relative rounded-xl border-[1.5px] p-4 text-left transition-colors duration-200",
                      isSelected
                        ? "border-primary-500 bg-primary-500/10"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-gray-700"
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <SettingsIconChip active={isSelected}>
                        <FileAudio className="h-[18px] w-[18px]" />
                      </SettingsIconChip>
                      <span
                        className={cn(
                          "flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary-500 text-white transition-all duration-200",
                          isSelected ? "scale-100 opacity-100" : "scale-50 opacity-0"
                        )}
                      >
                        <Check className="h-2.5 w-2.5" strokeWidth={3.2} />
                      </span>
                    </div>
                    <span
                      className={cn(
                        "block text-sm font-bold tracking-tight",
                        isSelected
                          ? "text-primary-600 dark:text-primary-300"
                          : "text-gray-900 dark:text-white"
                      )}
                    >
                      {t(`aiSettingsPage.transcriptionProviders.${provider}`)}
                    </span>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {provider === "local-whisper"
                        ? localWhisperModel || "Custom"
                        : TRANSCRIPTION_PROVIDERS[provider].model}
                    </p>
                  </button>
                );
              }
            )}
          </div>

          <Card>
            <CardContent className="p-6">
              {preferredTranscriptionProvider === "local-whisper" ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("aiSettingsPage.localWhisperUrl")}
                    </label>
                    <Input
                      type="text"
                      value={localWhisperUrl}
                      onChange={(event) =>
                        setLocalWhisperUrl(event.target.value)
                      }
                      placeholder="http://localhost:8000"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("aiSettingsPage.localWhisperModel")}
                    </label>
                    <Input
                      type="text"
                      value={localWhisperModel}
                      onChange={(event) =>
                        setLocalWhisperModel(event.target.value)
                      }
                      placeholder="Systran/faster-whisper-large-v3"
                    />
                  </div>
                </div>
              ) : transcriptionSharedProvider ? (
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary-500/10 p-3 text-primary-500">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t("aiSettingsPage.transcriptionSharedKey")}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("aiSettingsPage.transcriptionSharedKeyDescription", {
                        provider: providerDisplayName(transcriptionSharedProvider),
                      })}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-w-md space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("aiSettingsPage.groqApiKeyLabel")}
                  </label>
                  <div className="relative">
                    <Input
                      type={showGroqApiKey ? "text" : "password"}
                      value={groqApiKey}
                      onChange={(event) => setGroqApiKey(event.target.value)}
                      placeholder={t("aiSettingsPage.groqApiKeyPlaceholder")}
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGroqApiKey((current) => !current)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showGroqApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    {t("aiSettingsPage.getGroqApiKey")}
                    <ChevronRight size={14} />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
