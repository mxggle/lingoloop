import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  CheckCircle,
  Eye,
  EyeOff,
  FileAudio,
  FileText,
  Globe,
  Key,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  TestTube,
  Waves,
  Layout,
  Shield,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Input } from "../components/ui/input";
import { ModelSelector } from "../components/ui/ModelSelector";
import { LanguageSelector } from "../components/ui/LanguageSelector";
import { cn } from "../utils/cn";
import { aiService } from "../services/aiService";
import {
  AIProvider,
  AIServiceConfig,
  DEFAULT_MODELS,
  TranscriptionProvider,
  TRANSCRIPTION_PROVIDERS,
  getModelById,
  normalizeModelId,
} from "../types/aiService";
import { useLayoutSettings } from "../contexts/layoutSettings";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore, THEME_PRESETS } from "../stores/themeStore";
import { AppLayout } from "../components/layout/AppLayout";
import { DesktopCard, DesktopCardContent } from "../components/ui/DesktopCard";

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
  openai: "bg-success-100 text-success-700 dark:bg-success-950/40 dark:text-success-300",
  gemini: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  grok: "bg-warning-100 text-warning-700 dark:bg-warning-950/40 dark:text-warning-300",
  ollama: "bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300",
};

const statusToneClassName = {
  success:
    "border border-success-200 bg-success-50 text-success-700 dark:border-success-900/60 dark:bg-success-950/40 dark:text-success-300",
  warning:
    "border border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-900/60 dark:bg-warning-950/40 dark:text-warning-300",
  error:
    "border border-error-200 bg-red-50 text-error-700 dark:border-error-900/60 dark:bg-red-950/40 dark:text-error-300",
  neutral:
    "border border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  setApiKey: (key: string) => void;
  model: string;
  setModel: (model: string) => void;
}

type SettingsTab = "general" | "ai";

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") === "ai" ? "ai" : "general";
  });
  const [expandedProvider, setExpandedProvider] = useState<AIProvider | null>(() => {
    return (localStorage.getItem("preferred_ai_provider") as AIProvider) || "openai";
  });
  const { layoutSettings, setLayoutSettings } = useLayoutSettings();
  const { colors, setColors, resetColors } = useThemeStore();
  const hasHydratedAiSettingsRef = useRef(false);
  const pendingAiSettingsSaveRef = useRef<number | null>(null);
  const lastSavedAiSettingsRef = useRef<string | null>(null);

  const {
    seekStepSeconds,
    seekSmallStepSeconds,
    seekMode,
    setSeekStepSeconds,
    setSeekSmallStepSeconds,
    setSeekMode,
  } = usePlayerStore();

  // AI Settings state
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [grokApiKey, setGrokApiKey] = useState("");
  const [groqApiKey, setGroqApiKey] = useState("");

  const [openaiModel, setOpenaiModel] = useState(DEFAULT_MODELS.openai);
  const [geminiModel, setGeminiModel] = useState(DEFAULT_MODELS.gemini);
  const [grokModel, setGrokModel] = useState(DEFAULT_MODELS.grok);

  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState(DEFAULT_MODELS.ollama);
  const [localWhisperUrl, setLocalWhisperUrl] = useState("http://localhost:8000");
  const [localWhisperModel, setLocalWhisperModel] = useState("Systran/faster-whisper-large-v3");

  const [preferredProvider, setPreferredProvider] = useState<AIProvider>("openai");
  const [preferredTranscriptionProvider, setPreferredTranscriptionProvider] =
    useState<TranscriptionProvider>("openai");
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);

  const [showApiKeys, setShowApiKeys] = useState<Record<AIProvider, boolean>>({
    openai: false,
    gemini: false,
    grok: false,
    ollama: false,
  });
  const [showGroqApiKey, setShowGroqApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState<Record<AIProvider, boolean>>({
    openai: false,
    gemini: false,
    grok: false,
    ollama: false,
  });
  const [connectionStatus, setConnectionStatus] = useState<
    Record<AIProvider, "idle" | "success" | "error">
  >({
    openai: "idle",
    gemini: "idle",
    grok: "idle",
    ollama: "idle",
  });

  const [aiSubTab, setAiSubTab] = useState<"defaults" | "providers" | "transcription">("defaults");

  const currentAiSettingsSnapshot = JSON.stringify({
    openaiApiKey,
    geminiApiKey,
    grokApiKey,
    groqApiKey,
    openaiModel,
    geminiModel,
    grokModel,
    ollamaBaseUrl,
    ollamaModel,
    localWhisperUrl,
    localWhisperModel,
    preferredProvider,
    preferredTranscriptionProvider,
    targetLanguage,
    temperature,
    maxTokens,
  });

  useEffect(() => {
    const loadedOpenaiApiKey = localStorage.getItem("openai_api_key") || "";
    const loadedGeminiApiKey = localStorage.getItem("gemini_api_key") || "";
    const loadedGrokApiKey = localStorage.getItem("grok_api_key") || "";
    const loadedGroqApiKey = localStorage.getItem("groq_api_key") || "";
    const loadedPreferredProvider =
      (localStorage.getItem("preferred_ai_provider") as AIProvider) || "openai";
    const loadedPreferredTranscriptionProvider =
      (localStorage.getItem("preferred_transcription_provider") as TranscriptionProvider) || "openai";
    const loadedTargetLanguage = localStorage.getItem("target_language") || "English";
    const savedTemp = parseFloat(localStorage.getItem("ai_temperature") || "0.7");
    const loadedTemperature = Number.isFinite(savedTemp) ? savedTemp : 0.7;
    const savedTokens = parseInt(localStorage.getItem("ai_max_tokens") || "1000", 10);
    const loadedMaxTokens = Number.isFinite(savedTokens) ? savedTokens : 1000;
    const loadedOpenaiModel = normalizeModelId("openai", localStorage.getItem("openai_model"));
    const loadedGeminiModel = normalizeModelId("gemini", localStorage.getItem("gemini_model"));
    const loadedGrokModel = normalizeModelId("grok", localStorage.getItem("grok_model"));
    const loadedOllamaBaseUrl = localStorage.getItem("ollama_base_url") || "http://localhost:11434";
    const loadedOllamaModel = normalizeModelId("ollama", localStorage.getItem("ollama_model"));
    const loadedLocalWhisperUrl =
      localStorage.getItem("local_whisper_url") || "http://localhost:8000";
    const loadedLocalWhisperModel =
      localStorage.getItem("local_whisper_model") || "Systran/faster-whisper-large-v3";

    setOpenaiApiKey(loadedOpenaiApiKey);
    setGeminiApiKey(loadedGeminiApiKey);
    setGrokApiKey(loadedGrokApiKey);
    setGroqApiKey(loadedGroqApiKey);
    setPreferredProvider(loadedPreferredProvider);
    setPreferredTranscriptionProvider(loadedPreferredTranscriptionProvider);
    setTargetLanguage(loadedTargetLanguage);
    setTemperature(loadedTemperature);
    setMaxTokens(loadedMaxTokens);
    setOpenaiModel(loadedOpenaiModel);
    setGeminiModel(loadedGeminiModel);
    setGrokModel(loadedGrokModel);
    setOllamaBaseUrl(loadedOllamaBaseUrl);
    setOllamaModel(loadedOllamaModel);
    setLocalWhisperUrl(loadedLocalWhisperUrl);
    setLocalWhisperModel(loadedLocalWhisperModel);

    lastSavedAiSettingsRef.current = JSON.stringify({
      openaiApiKey: loadedOpenaiApiKey,
      geminiApiKey: loadedGeminiApiKey,
      grokApiKey: loadedGrokApiKey,
      groqApiKey: loadedGroqApiKey,
      openaiModel: loadedOpenaiModel,
      geminiModel: loadedGeminiModel,
      grokModel: loadedGrokModel,
      ollamaBaseUrl: loadedOllamaBaseUrl,
      ollamaModel: loadedOllamaModel,
      localWhisperUrl: loadedLocalWhisperUrl,
      localWhisperModel: loadedLocalWhisperModel,
      preferredProvider: loadedPreferredProvider,
      preferredTranscriptionProvider: loadedPreferredTranscriptionProvider,
      targetLanguage: loadedTargetLanguage,
      temperature: loadedTemperature,
      maxTokens: loadedMaxTokens,
    });
    hasHydratedAiSettingsRef.current = true;

    return () => {
      if (pendingAiSettingsSaveRef.current !== null) {
        window.clearTimeout(pendingAiSettingsSaveRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedAiSettingsRef.current) {
      return;
    }

    if (currentAiSettingsSnapshot === lastSavedAiSettingsRef.current) {
      return;
    }

    if (pendingAiSettingsSaveRef.current !== null) {
      window.clearTimeout(pendingAiSettingsSaveRef.current);
    }

    pendingAiSettingsSaveRef.current = window.setTimeout(() => {
      localStorage.setItem("openai_api_key", openaiApiKey);
      localStorage.setItem("gemini_api_key", geminiApiKey);
      localStorage.setItem("grok_api_key", grokApiKey);
      localStorage.setItem("groq_api_key", groqApiKey);
      localStorage.setItem("openai_model", openaiModel);
      localStorage.setItem("gemini_model", geminiModel);
      localStorage.setItem("grok_model", grokModel);
      localStorage.setItem("ollama_base_url", ollamaBaseUrl);
      localStorage.setItem("ollama_model", ollamaModel);
      localStorage.setItem("local_whisper_url", localWhisperUrl);
      localStorage.setItem("local_whisper_model", localWhisperModel);
      localStorage.setItem("preferred_ai_provider", preferredProvider);
      localStorage.setItem("preferred_transcription_provider", preferredTranscriptionProvider);
      localStorage.setItem("target_language", targetLanguage);
      localStorage.setItem("ai_temperature", temperature.toString());
      localStorage.setItem("ai_max_tokens", maxTokens.toString());

      lastSavedAiSettingsRef.current = currentAiSettingsSnapshot;
      pendingAiSettingsSaveRef.current = null;
      window.dispatchEvent(new CustomEvent("aiSettingsUpdated"));
      window.dispatchEvent(new CustomEvent("ai-settings-updated"));
    }, 400);

    return () => {
      if (pendingAiSettingsSaveRef.current !== null) {
        window.clearTimeout(pendingAiSettingsSaveRef.current);
      }
    };
  }, [
    openaiApiKey, geminiApiKey, grokApiKey, groqApiKey,
    openaiModel, geminiModel, grokModel,
    ollamaBaseUrl, ollamaModel,
    localWhisperUrl, localWhisperModel,
    preferredProvider, preferredTranscriptionProvider,
    targetLanguage, temperature, maxTokens, currentAiSettingsSnapshot
  ]);

  const providerConfigs: ProviderConfig[] = [
    { provider: "openai", apiKey: openaiApiKey, setApiKey: setOpenaiApiKey, model: openaiModel, setModel: setOpenaiModel },
    { provider: "gemini", apiKey: geminiApiKey, setApiKey: setGeminiApiKey, model: geminiModel, setModel: setGeminiModel },
    { provider: "grok", apiKey: grokApiKey, setApiKey: setGrokApiKey, model: grokModel, setModel: setGrokModel },
    { provider: "ollama", apiKey: "", setApiKey: () => { }, model: ollamaModel, setModel: setOllamaModel },
  ];

  function isOllama(provider: AIProvider): provider is "ollama" {
    return provider === "ollama";
  }

  const transcriptionSharedProvider =
    preferredTranscriptionProvider === "groq" || preferredTranscriptionProvider === "local-whisper"
      ? null
      : preferredTranscriptionProvider;

  const providerDisplayName = (provider: AIProvider) =>
    t(`aiSettingsPage.providers.${provider}`);

  const toggleApiKeyVisibility = (provider: AIProvider) => {
    setShowApiKeys((current) => ({ ...current, [provider]: !current[provider] }));
  };

  const getProviderSetupStatus = (provider: AIProvider, apiKey: string) => {
    if (provider === "ollama") return { label: t("aiSettingsPage.status.ready"), className: statusToneClassName.success };
    if (!apiKey.trim()) {
      return { label: t("aiSettingsPage.status.missing"), className: statusToneClassName.warning };
    }
    if (!aiService.validateApiKey(provider, apiKey)) {
      return { label: t("aiSettingsPage.status.invalid"), className: statusToneClassName.error };
    }
    return { label: t("aiSettingsPage.status.ready"), className: statusToneClassName.success };
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

  const testConnection = async (provider: AIProvider) => {
    const config = providerConfigs.find((item) => item.provider === provider);
    if (!config || (!config.apiKey.trim() && provider !== "ollama")) {
      toast.error(t("aiSettingsPage.enterApiKeyFirst", { provider: providerDisplayName(provider) }));
      return;
    }
    setTestingConnection((current) => ({ ...current, [provider]: true }));
    setConnectionStatus((current) => ({ ...current, [provider]: "idle" }));
    try {
      const requestConfig: AIServiceConfig = {
        provider,
        model: config.model,
        apiKey: config.apiKey,
        temperature: 0.1,
        maxTokens: 10,
      };
      const success = await aiService.testConnection(requestConfig);
      if (success) {
        setConnectionStatus((current) => ({ ...current, [provider]: "success" }));
        toast.success(t("aiSettingsPage.connectionSuccess", { provider: providerDisplayName(provider) }));
      } else {
        setConnectionStatus((current) => ({ ...current, [provider]: "error" }));
        toast.error(t("aiSettingsPage.connectionFailed", { provider: providerDisplayName(provider) }));
      }
    } catch (error) {
      setConnectionStatus((current) => ({ ...current, [provider]: "error" }));
      toast.error(
        t("aiSettingsPage.connectionFailedWithError", {
          provider: providerDisplayName(provider),
          message: error instanceof Error ? error.message : t("explanation.unknownError"),
        })
      );
    } finally {
      setTestingConnection((current) => ({ ...current, [provider]: false }));
    }
  };

  const layoutOptions = [
    { key: "showWaveform" as const, label: t("settings.waveformDisplay"), icon: <Waves className="h-4 w-4 text-teal-500" /> },
    { key: "showTranscript" as const, label: t("settings.transcriptPanel"), icon: <FileText className="h-4 w-4 text-orange-500" /> },
    { key: "showControls" as const, label: t("settings.playbackControls"), icon: <SlidersHorizontal className="h-4 w-4 text-error-500" /> },
  ];

  const AI_SUB_TABS = [
    { id: "defaults" as const, label: t("aiSettingsPage.sectionNav.defaults"), Icon: Globe },
    { id: "providers" as const, label: t("aiSettingsPage.sectionNav.providers"), Icon: Key },
    { id: "transcription" as const, label: t("aiSettingsPage.sectionNav.transcription"), Icon: FileAudio },
  ];

  const NAV_ITEMS = [
    { id: "general" as const, label: t("settingsPage.tabs.general"), Icon: SlidersHorizontal },
    { id: "ai" as const, label: t("settingsPage.tabs.ai"), Icon: Brain },
  ];

  return (
    <AppLayout bottomPaddingClassName="pb-0">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 lg:px-12 space-y-12 pb-16">

        {/* Sticky Header with Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-black/5 dark:border-white/5 pb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-all active:scale-95"
              title={t("common.back")}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="space-y-1.5">
              <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">
                {t("settingsPage.title")}
              </h2>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider opacity-60">
                {activeTab === "general"
                  ? t("settingsPage.interfaceLayoutHelp")
                  : t("aiSettingsPage.providerSetupDescription")}
              </p>
            </div>
          </div>

          {/* Tab Navigation Segmented Control */}
          <div className="flex p-1.5 gap-1.5 bg-black/5 dark:bg-white/5 rounded-2xl w-full max-w-[280px] shrink-0">
            {NAV_ITEMS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-300",
                  activeTab === id
                    ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* General Tab Content */}
        {activeTab === "general" && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* Appearance Group */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Globe className="h-4 w-4 text-primary-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("settingsPage.appearance")}</h3>
              </div>
              <DesktopCard>
                <DesktopCardContent className="p-6">
                  <LanguageSelector />
                </DesktopCardContent>
              </DesktopCard>
            </section>

            {/* Interface Layout Group */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Layout className="h-4 w-4 text-orange-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("settingsPage.interfaceLayout")}</h3>
              </div>
              <DesktopCard className="overflow-hidden">
                <div className="divide-y divide-black/5 dark:divide-white/5">
                  {layoutOptions.map((option) => (
                    <div
                      key={option.key}
                      className="flex items-center justify-between p-6 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500">
                          {option.icon}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {option.label}
                          </span>
                          <p className="text-xs text-gray-500 font-medium mt-1">Toggle visibility on the main player screen</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setLayoutSettings((prev) => ({
                            ...prev,
                            [option.key]: !prev[option.key],
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

            {/* Theme Customization Group */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Palette className="h-4 w-4 text-purple-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("settingsPage.theme")}</h3>
              </div>
              <DesktopCard>
                <DesktopCardContent className="p-8 space-y-10">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider opacity-60">
                      {t("settingsPage.themeHelp")}
                    </p>
                    <button
                      onClick={resetColors}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950 transition-all border border-black/5 dark:border-white/5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {t("settingsPage.resetTheme")}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-6">
                    {Object.entries(THEME_PRESETS).map(([name, themeColors]) => (
                      <button
                        key={name}
                        onClick={() => setColors(themeColors)}
                        className="flex flex-col items-center gap-2 group"
                      >
                        <div
                          className={cn(
                            "h-12 w-12 rounded-2xl border-2 transition-all duration-300",
                            colors.primary === themeColors.primary
                              ? "border-primary-500 scale-110 shadow-lg shadow-primary-500/10"
                              : "border-transparent group-hover:scale-105"
                          )}
                          style={{ backgroundColor: themeColors.primary }}
                        />
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider transition-colors",
                          colors.primary === themeColors.primary ? "text-primary-600 dark:text-primary-400" : "text-gray-400"
                        )}>
                          {name}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-black/5 dark:border-white/5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
                      {t("settingsPage.customPrimaryColor")}
                    </label>
                    <div className="flex items-center gap-6">
                      <div className="relative h-12 w-12 shrink-0">
                        <input
                          type="color"
                          value={colors.primary}
                          onChange={(e) => setColors({ primary: e.target.value })}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                        <div
                          className="h-full w-full rounded-2xl border border-black/10 dark:border-white/10 shadow-sm"
                          style={{ backgroundColor: colors.primary }}
                        />
                      </div>
                      <Input
                        type="text"
                        value={colors.primary.toUpperCase()}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^#[0-9A-F]{6}$/i.test(val)) {
                            setColors({ primary: val });
                          }
                        }}
                        placeholder="#8B5CF6"
                        className="h-12 max-w-[160px] font-mono text-sm uppercase rounded-2xl border-black/5 dark:border-white/5"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </DesktopCardContent>
              </DesktopCard>
            </section>

            {/* Playback Settings Group */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("settingsPage.playback")}</h3>
              </div>
              <DesktopCard className="overflow-hidden divide-y divide-black/5 dark:divide-white/5">
                <div className="flex items-center justify-between p-6 gap-6">
                  <div className="flex-1">
                    <label className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {t("settingsPage.seekMode")}
                    </label>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      {t("settings.seekModeHelp")}
                    </p>
                  </div>
                  <select
                    value={seekMode}
                    onChange={(e) => setSeekMode(e.target.value as "seconds" | "sentence")}
                    className="h-10 w-40 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-gray-800/50 px-4 text-xs font-bold focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="seconds">{t("settings.seekModeSeconds")}</option>
                    <option value="sentence">{t("settings.seekModeSentence")}</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-6 gap-6">
                  <div className="flex-1">
                    <label className={cn("text-sm font-bold text-gray-900 dark:text-gray-100", seekMode === "sentence" && "opacity-50")}>
                      {t("settingsPage.seekStep")}
                    </label>
                    <p className="text-xs text-gray-500 font-medium mt-1">
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
                      onChange={(e) => setSeekStepSeconds(parseFloat(e.target.value) || 0)}
                      className="h-10 w-24 text-right rounded-xl border-black/5 dark:border-white/5 text-sm font-bold"
                    />
                    <span className="text-xs font-black text-gray-400">SEC</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 gap-6">
                  <div className="flex-1">
                    <label className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {t("settingsPage.smallStep")}
                    </label>
                    <p className="text-xs text-gray-500 font-medium mt-1">
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
                      onChange={(e) => setSeekSmallStepSeconds(parseFloat(e.target.value) || 0)}
                      className="h-10 w-24 text-right rounded-xl border-black/5 dark:border-white/5 text-sm font-bold"
                    />
                    <span className="text-xs font-black text-gray-400">SEC</span>
                  </div>
                </div>
              </DesktopCard>
            </section>
          </div>
        )}

        {/* AI Tab Content */}
        {activeTab === "ai" && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* AI Configuration Glance */}
            <DesktopCard className="bg-primary-500 dark:bg-primary-600 text-white shadow-2xl shadow-primary-500/10 overflow-hidden group border-none">
              <DesktopCardContent className="p-8 relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                  <Brain size={120} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight">AI Intelligence</h3>
                    <p className="text-primary-100 text-xs font-semibold uppercase tracking-wider max-w-xs leading-relaxed opacity-80">
                      Configure high-performance models for your study sessions.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                      <span className="block text-[10px] font-black uppercase tracking-wider opacity-60 mb-1">{t("aiSettingsPage.preferredProvider")}</span>
                      <span className="text-sm font-bold">{providerDisplayName(preferredProvider)}</span>
                    </div>
                    <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                      <span className="block text-[10px] font-black uppercase tracking-wider opacity-60 mb-1">{t("aiSettingsPage.summaryDefaultModel")}</span>
                      <span className="text-sm font-bold">
                        {preferredProvider === "ollama"
                          ? ollamaModel || DEFAULT_MODELS.ollama
                          : getModelById(
                            providerConfigs.find(({ provider }) => provider === preferredProvider)?.model ||
                            DEFAULT_MODELS[preferredProvider]
                          )?.name || DEFAULT_MODELS[preferredProvider]}
                      </span>
                    </div>
                  </div>
                </div>
              </DesktopCardContent>
            </DesktopCard>

            <div className="space-y-8">
              {/* Sub-navigation Segmented Control */}
              <div className="flex p-1.5 gap-1.5 bg-black/5 dark:bg-white/5 rounded-2xl w-fit mx-auto sm:mx-0">
                {AI_SUB_TABS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAiSubTab(id)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-300",
                      aiSubTab === id
                        ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-white shadow-sm"
                        : "text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* AI Sections Content */}
              <div className="space-y-8 min-h-[400px]">

                {/* Defaults Section */}
                {aiSubTab === "defaults" && (
                  <section className="space-y-8 animate-in fade-in duration-300">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-1">
                        <Shield className="h-4 w-4 text-primary-500" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("aiSettingsPage.preferredProvider")}</h3>
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
                                "relative p-5 rounded-3xl border-2 transition-all duration-300 group",
                                isActive
                                  ? "border-primary-500 bg-primary-500/5 dark:bg-primary-500/10"
                                  : "border-black/5 dark:border-white/5 bg-white/40 dark:bg-gray-900/40 hover:border-primary-500/30"
                              )}
                            >
                              <span className={cn(
                                "block text-sm font-bold mb-1",
                                isActive ? "text-primary-700 dark:text-primary-300" : "text-gray-900 dark:text-white"
                              )}>
                                {providerDisplayName(provider)}
                              </span>
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-primary-500 transition-colors">
                                {status.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <DesktopCard>
                      <DesktopCardContent className="p-8 space-y-10">
                        <div className="grid gap-10 sm:grid-cols-2">
                          <div className="space-y-3">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                              {t("aiSettingsPage.targetLanguage")}
                            </label>
                            <select
                              value={targetLanguage}
                              onChange={(e) => setTargetLanguage(e.target.value)}
                              className="h-12 w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-gray-800/50 px-4 text-sm font-bold focus:ring-2 focus:ring-primary-500/20"
                            >
                              {LANGUAGE_OPTIONS.map((k) => (
                                <option key={k} value={LANGUAGE_VALUES[k]}>
                                  {t(`aiSettingsPage.languages.${k}`)}
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
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                setMaxTokens(Number.isFinite(v) ? v : 1000);
                              }}
                              className="h-12 rounded-2xl text-sm font-bold border-black/5 dark:border-white/5"
                            />
                          </div>
                        </div>

                        <div className="space-y-8 pt-8 border-t border-black/5 dark:border-white/5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                              {t("aiSettingsPage.generationBehavior")}
                            </label>
                            <span className="px-4 py-1 rounded-full bg-primary-500 text-white text-xs font-black font-mono">
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
                              onChange={(e) => setTemperature(parseFloat(e.target.value))}
                              className="w-full h-2 rounded-full appearance-none bg-black/5 dark:bg-white/5 accent-primary-500"
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
                )}

                {/* Providers Section */}
                {aiSubTab === "providers" && (
                  <section className="space-y-3 animate-in fade-in duration-300">
                    {providerConfigs.map(({ provider, apiKey, setApiKey, model, setModel }) => {
                      const providerName = providerDisplayName(provider);
                      const setupStatus = getProviderSetupStatus(provider, apiKey);
                      const isOllamaProvider = isOllama(provider);
                      const isExpanded = expandedProvider === provider;

                      return (
                        <DesktopCard key={provider} className={cn("group transition-all duration-300", isExpanded ? "border-primary-500/30 shadow-xl shadow-primary-500/5" : "border-black/5 dark:border-white/5")}>
                          {/* Accordion Header */}
                          <button
                            type="button"
                            onClick={() => setExpandedProvider(isExpanded ? null : provider)}
                            className="w-full flex items-center justify-between p-4 sm:p-6 text-left outline-none group/header"
                          >
                            <div className="flex items-center gap-4 sm:gap-6">
                              <div className={cn("p-2.5 rounded-2xl transition-all group-hover:scale-110 duration-300", providerSurfaceClassName[provider])}>
                                <Brain className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white uppercase tracking-tight">{providerName}</h4>
                                  {!isOllamaProvider && getConnectionStatusIcon(provider)}
                                </div>
                                <p className="text-[10px] font-medium text-gray-400 mt-0.5 uppercase tracking-wider opacity-60">
                                  {isOllamaProvider ? (ollamaModel || "Local Llama") : (getModelById(model)?.name || DEFAULT_MODELS[provider])}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={cn("hidden xs:inline-flex rounded-full px-3 py-0.5 text-[8px] font-black uppercase tracking-wider transition-colors", isExpanded ? "bg-primary-500 text-white" : setupStatus.className)}>
                                {setupStatus.label}
                              </span>
                              <ChevronRight className={cn("h-4 w-4 text-gray-400 transition-transform duration-300", isExpanded && "rotate-90 text-primary-500")} />
                            </div>
                          </button>

                          {/* Accordion Content */}
                          {isExpanded && (
                            <DesktopCardContent className="px-6 pb-8 pt-2 space-y-8 animate-in slide-in-from-top-2 duration-300">
                              <div className="grid gap-10 md:grid-cols-2 pt-6 border-t border-black/5 dark:border-white/5">
                                {isOllamaProvider ? (
                                  <>
                                    <div className="space-y-3">
                                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t("aiSettingsPage.ollamaBaseUrl")}</label>
                                      <Input
                                        type="text"
                                        value={ollamaBaseUrl}
                                        onChange={(e) => setOllamaBaseUrl(e.target.value)}
                                        placeholder="http://localhost:11434"
                                        className="h-12 rounded-2xl font-mono text-sm border-black/5 dark:border-white/5"
                                      />
                                    </div>
                                    <div className="space-y-3">
                                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t("aiSettingsPage.ollamaModel")}</label>
                                      <Input
                                        type="text"
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        placeholder="llama3.2"
                                        className="h-12 rounded-2xl text-sm font-bold border-black/5 dark:border-white/5"
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t("aiSettingsPage.apiKeyLabel")}</label>
                                        <button
                                          type="button"
                                          onClick={() => testConnection(provider)}
                                          disabled={!apiKey.trim() || testingConnection[provider]}
                                          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 disabled:opacity-50"
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
                                          onChange={(e) => setApiKey(e.target.value)}
                                          placeholder={t("aiSettingsPage.apiKeyPlaceholderLabel", { provider: providerName })}
                                          className="h-12 pr-12 rounded-2xl font-mono text-sm border-black/5 dark:border-white/5"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => toggleApiKeyVisibility(provider)}
                                          className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-primary-500 transition-colors"
                                        >
                                          {showApiKeys[provider] ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="space-y-4">
                                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">{t("aiSettingsPage.defaultModel")}</label>
                                      <ModelSelector
                                        selectedModel={model}
                                        onModelSelect={setModel}
                                        provider={provider}
                                        placeholder={t("aiSettingsPage.selectModelPlaceholder", { provider: providerName })}
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                                 <p className="text-xs font-medium text-gray-500 leading-relaxed">
                                    {t(`aiSettingsPage.providerDescriptions.${provider}`)}
                                 </p>
                              </div>
                            </DesktopCardContent>
                          )}
                        </DesktopCard>
                      );
                    })}
                  </section>
                )}
                {/* Transcription Section */}
                {aiSubTab === "transcription" && (
                  <section className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid gap-4 sm:grid-cols-3">
                      {(Object.keys(TRANSCRIPTION_PROVIDERS) as TranscriptionProvider[]).map((provider) => {
                        const isSelected = preferredTranscriptionProvider === provider;
                        return (
                          <button
                            key={provider}
                            type="button"
                            onClick={() => setPreferredTranscriptionProvider(provider)}
                            className={cn(
                              "relative p-6 rounded-3xl border-2 transition-all duration-300 group overflow-hidden",
                              isSelected
                                ? "border-primary-500 bg-primary-500/5 dark:bg-primary-500/10"
                                : "border-black/5 dark:border-white/5 bg-white/40 dark:bg-gray-900/40 hover:border-primary-500/30"
                            )}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className={cn("p-2 rounded-xl", isSelected ? "bg-primary-500 text-white" : "bg-black/5 dark:bg-white/5 text-gray-400")}>
                                <FileAudio size={18} />
                              </div>
                              {isSelected && <CheckCircle className="h-4 w-4 text-primary-500" />}
                            </div>
                            <span className={cn(
                              "block text-sm font-bold uppercase tracking-tight mb-1",
                              isSelected ? "text-primary-700 dark:text-primary-300" : "text-gray-900 dark:text-white"
                            )}>
                              {t(`aiSettingsPage.transcriptionProviders.${provider}`)}
                            </span>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate opacity-60">
                              {provider === "local-whisper" ? localWhisperModel || "Custom" : TRANSCRIPTION_PROVIDERS[provider].model}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    <DesktopCard>
                      <DesktopCardContent className="p-8">
                        {preferredTranscriptionProvider === "local-whisper" ? (
                          <div className="grid gap-8 md:grid-cols-2">
                            <div className="space-y-3">
                              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t("aiSettingsPage.localWhisperUrl")}</label>
                              <Input
                                type="text"
                                value={localWhisperUrl}
                                onChange={(e) => setLocalWhisperUrl(e.target.value)}
                                placeholder="http://localhost:8000"
                                className="h-12 rounded-2xl font-mono text-sm border-black/5 dark:border-white/5"
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t("aiSettingsPage.localWhisperModel")}</label>
                              <Input
                                type="text"
                                value={localWhisperModel}
                                onChange={(e) => setLocalWhisperModel(e.target.value)}
                                placeholder="Systran/faster-whisper-large-v3"
                                className="h-12 rounded-2xl text-sm font-bold border-black/5 dark:border-white/5"
                              />
                            </div>
                          </div>
                        ) : transcriptionSharedProvider ? (
                          <div className="flex items-center gap-6">
                            <div className="p-4 rounded-3xl bg-primary-500/10 text-primary-500">
                              <Shield size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                                {t("aiSettingsPage.transcriptionSharedKey")}
                              </p>
                              <p className="text-xs font-medium text-gray-500 mt-1 opacity-70">
                                {t("aiSettingsPage.transcriptionSharedKeyDescription", {
                                  provider: providerDisplayName(transcriptionSharedProvider),
                                })}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 max-w-md">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                              {t("aiSettingsPage.groqApiKeyLabel")}
                            </label>
                            <div className="relative">
                              <Input
                                type={showGroqApiKey ? "text" : "password"}
                                value={groqApiKey}
                                onChange={(e) => setGroqApiKey(e.target.value)}
                                placeholder={t("aiSettingsPage.groqApiKeyPlaceholder")}
                                className="h-12 pr-12 rounded-2xl font-mono text-sm border-black/5 dark:border-white/5"
                              />
                              <button
                                type="button"
                                onClick={() => setShowGroqApiKey((v) => !v)}
                                className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-primary-500 transition-colors"
                              >
                                {showGroqApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                            <a
                              href="https://console.groq.com/keys"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                            >
                              {t("aiSettingsPage.getGroqApiKey")}
                              <ChevronRight size={14} />
                            </a>
                          </div>
                        )}
                      </DesktopCardContent>
                    </DesktopCard>
                  </section>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page Footer */}
        <footer className="pt-10 border-t border-black/5 dark:border-white/5 flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <Shield className="h-4 w-4 text-green-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {t("settingsPage.footer.autoSaved")}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 uppercase tracking-[0.4em] font-bold opacity-30">
            {t("settingsPage.footer.tagline")}
          </p>
        </footer>
      </div>
    </AppLayout>
  );
};
