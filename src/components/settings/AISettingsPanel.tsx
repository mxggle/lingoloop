import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Brain,
  CheckCircle,
  ChevronRight,
  Eye,
  EyeOff,
  FileAudio,
  Globe,
  Key,
  Shield,
  TestTube,
} from "lucide-react";
import { aiService } from "../../services/aiService";
import {
  AIProvider,
  DEFAULT_MODELS,
  TRANSCRIPTION_PROVIDERS,
  TranscriptionProvider,
  getModelById,
} from "../../types/aiService";
import { cn } from "../../utils/cn";
import type { UseAiSettingsStateResult } from "../../hooks/useAiSettingsState";
import { DesktopCard, DesktopCardContent } from "../ui/DesktopCard";
import { Input } from "../ui/input";
import { ModelSelector } from "../ui/ModelSelector";

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

const providerSurfaceClassName: Record<AIProvider, string> = {
  openai:
    "bg-success-100 text-success-700 dark:bg-success-950/40 dark:text-success-300",
  gemini: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  grok: "bg-warning-100 text-warning-700 dark:bg-warning-950/40 dark:text-warning-300",
  ollama:
    "bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300",
};

const statusToneClassName = {
  success:
    "border border-success-200 bg-success-50 text-success-700 dark:border-success-900/60 dark:bg-success-950/40 dark:text-success-300",
  warning:
    "border border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-900/60 dark:bg-warning-950/40 dark:text-warning-300",
  error:
    "border border-error-200 bg-red-50 text-error-700 dark:border-error-900/60 dark:bg-red-950/40 dark:text-error-300",
} as const;

export type AiSettingsSection = "defaults" | "providers" | "transcription";

const AI_SETTINGS_SECTIONS: readonly AiSettingsSection[] = [
  "defaults",
  "providers",
  "transcription",
];

function isOllama(provider: AIProvider): provider is "ollama" {
  return provider === "ollama";
}

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
    initialSection ?? "defaults"
  );

  useEffect(() => {
    if (initialSection) {
      setAiSubTab(initialSection);
    }
  }, [initialSection]);

  const { providerConfigs, defaultsState, providersState, transcriptionState } = state;
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
    expandedProvider,
    setExpandedProvider,
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

  const getProviderSetupStatus = (provider: AIProvider, apiKey: string) => {
    if (provider === "ollama") {
      return {
        label: t("aiSettingsPage.status.ready"),
        className: statusToneClassName.success,
      };
    }

    if (!apiKey.trim()) {
      return {
        label: t("aiSettingsPage.status.missing"),
        className: statusToneClassName.warning,
      };
    }

    if (!aiService.validateApiKey(provider, apiKey)) {
      return {
        label: t("aiSettingsPage.status.invalid"),
        className: statusToneClassName.error,
      };
    }

    return {
      label: t("aiSettingsPage.status.ready"),
      className: statusToneClassName.success,
    };
  };

  const getConnectionStatusIcon = (provider: AIProvider) => {
    switch (connectionStatus[provider]) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-success-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-error-500" />;
      default:
        return null;
    }
  };

  const handleSectionChange = (section: AiSettingsSection) => {
    setAiSubTab(section);
    onSectionChange?.(section);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <DesktopCard className="group overflow-hidden border-none bg-primary-500 text-white shadow-2xl shadow-primary-500/10 dark:bg-primary-600">
        <DesktopCardContent className="relative p-8">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 transform p-8 opacity-10 transition-transform duration-700 group-hover:scale-110">
            <Brain size={120} />
          </div>
          <div className="relative z-10 flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div className="space-y-1">
              <h3 className="text-2xl font-black uppercase tracking-tight">
                AI Intelligence
              </h3>
              <p className="max-w-xs text-xs font-semibold uppercase tracking-wider leading-relaxed text-primary-100 opacity-80">
                Configure high-performance models for your study sessions.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur-md">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wider opacity-60">
                  {t("aiSettingsPage.preferredProvider")}
                </span>
                <span className="text-sm font-bold">
                  {providerDisplayName(preferredProvider)}
                </span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur-md">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wider opacity-60">
                  {t("aiSettingsPage.summaryDefaultModel")}
                </span>
                <span className="text-sm font-bold">
                  {preferredProvider === "ollama"
                    ? providerConfigs.find(
                        ({ provider }) => provider === preferredProvider
                      )?.model || DEFAULT_MODELS.ollama
                    : getModelById(
                        providerConfigs.find(
                          ({ provider }) => provider === preferredProvider
                        )?.model || DEFAULT_MODELS[preferredProvider]
                      )?.name || DEFAULT_MODELS[preferredProvider]}
                </span>
              </div>
            </div>
          </div>
        </DesktopCardContent>
      </DesktopCard>

      <div className="space-y-8">
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
                  {providerConfigs.map(({ provider, apiKey }) => {
                    const status = getProviderSetupStatus(provider, apiKey);
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
                          {status.label}
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
            <section className="space-y-3 animate-in fade-in duration-300">
              {providerConfigs.map(({ provider, apiKey, setApiKey, model, setModel }) => {
                const providerName = providerDisplayName(provider);
                const setupStatus = getProviderSetupStatus(provider, apiKey);
                const isOllamaProvider = isOllama(provider);
                const isExpanded = expandedProvider === provider;

                return (
                  <DesktopCard
                    key={provider}
                    className={cn(
                      "group transition-all duration-300",
                      isExpanded
                        ? "border-primary-500/30 shadow-xl shadow-primary-500/5"
                        : "border-black/5 dark:border-white/5"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedProvider(isExpanded ? null : provider)
                      }
                      className="group/header flex w-full items-center justify-between p-4 text-left outline-none sm:p-6"
                    >
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div
                          className={cn(
                            "rounded-2xl p-2.5 transition-all duration-300 group-hover:scale-110",
                            providerSurfaceClassName[provider]
                          )}
                        >
                          <Brain className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold uppercase tracking-tight text-gray-900 dark:text-white sm:text-base">
                              {providerName}
                            </h4>
                            {!isOllamaProvider ? getConnectionStatusIcon(provider) : null}
                          </div>
                          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-400 opacity-60">
                            {isOllamaProvider
                              ? model || "Local Llama"
                              : getModelById(model)?.name || DEFAULT_MODELS[provider]}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={cn(
                            "hidden rounded-full px-3 py-0.5 text-[8px] font-black uppercase tracking-wider xs:inline-flex",
                            isExpanded ? "bg-primary-500 text-white" : setupStatus.className
                          )}
                        >
                          {setupStatus.label}
                        </span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 text-gray-400 transition-transform duration-300",
                            isExpanded && "rotate-90 text-primary-500"
                          )}
                        />
                      </div>
                    </button>

                    {isExpanded ? (
                      <DesktopCardContent className="animate-in slide-in-from-top-2 space-y-8 px-6 pb-8 pt-2 duration-300">
                        <div className="grid gap-10 border-t border-black/5 pt-6 dark:border-white/5 md:grid-cols-2">
                          {isOllamaProvider ? (
                            <>
                              <div className="space-y-3">
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                  {t("aiSettingsPage.ollamaBaseUrl")}
                                </label>
                                <Input
                                  type="text"
                                  value={ollamaBaseUrl}
                                  onChange={(event) =>
                                    setOllamaBaseUrl(event.target.value)
                                  }
                                  placeholder="http://localhost:11434"
                                  className="h-12 rounded-2xl border-black/5 font-mono text-sm dark:border-white/5"
                                />
                              </div>
                              <div className="space-y-3">
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                  {t("aiSettingsPage.ollamaModel")}
                                </label>
                                <Input
                                  type="text"
                                  value={model}
                                  onChange={(event) => setModel(event.target.value)}
                                  placeholder="llama3.2"
                                  className="h-12 rounded-2xl border-black/5 text-sm font-bold dark:border-white/5"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    {t("aiSettingsPage.apiKeyLabel")}
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void testConnection(provider);
                                    }}
                                    disabled={
                                      !apiKey.trim() || testingConnection[provider]
                                    }
                                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600 disabled:opacity-50 dark:text-primary-400"
                                  >
                                    {testingConnection[provider] ? (
                                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                                    ) : (
                                      <TestTube className="h-4 w-4" />
                                    )}
                                    {t("aiSettingsPage.testConnection")}
                                  </button>
                                </div>
                                <div className="relative">
                                  <Input
                                    type={showApiKeys[provider] ? "text" : "password"}
                                    value={apiKey}
                                    onChange={(event) => setApiKey(event.target.value)}
                                    placeholder={t(
                                      "aiSettingsPage.apiKeyPlaceholderLabel",
                                      { provider: providerName }
                                    )}
                                    className="h-12 rounded-2xl border-black/5 pr-12 font-mono text-sm dark:border-white/5"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleApiKeyVisibility(provider)}
                                    className="absolute inset-y-0 right-4 flex items-center text-gray-400 transition-colors hover:text-primary-500"
                                  >
                                    {showApiKeys[provider] ? (
                                      <EyeOff size={18} />
                                    ) : (
                                      <Eye size={18} />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                                  {t("aiSettingsPage.defaultModel")}
                                </label>
                                <ModelSelector
                                  selectedModel={model}
                                  onModelSelect={setModel}
                                  provider={provider}
                                  placeholder={t(
                                    "aiSettingsPage.selectModelPlaceholder",
                                    { provider: providerName }
                                  )}
                                />
                              </div>
                            </>
                          )}
                        </div>
                        <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-4 dark:border-white/5 dark:bg-white/[0.02]">
                          <p className="text-xs font-medium leading-relaxed text-gray-500">
                            {t(`aiSettingsPage.providerDescriptions.${provider}`)}
                          </p>
                        </div>
                      </DesktopCardContent>
                    ) : null}
                  </DesktopCard>
                );
              })}
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
  defaultSection: "defaults" as AiSettingsSection,
  isSection: (
    section: string | null | undefined
  ): section is AiSettingsSection =>
    !!section &&
    (AI_SETTINGS_SECTIONS as readonly string[]).includes(section),
}) as AISettingsPanelComponentType;
