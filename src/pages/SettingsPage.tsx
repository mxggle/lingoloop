import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { Button } from "../components/ui/button";
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

import { isElectron } from "../utils/platform";

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
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") === "ai" ? "ai" : "general";
  });
  const { layoutSettings, setLayoutSettings } = useLayoutSettings();
  const { colors, setColors, resetColors } = useThemeStore();
  const isLoadedRef = useRef(false);
  const isMac = typeof window !== "undefined" && navigator.userAgent.includes("Mac OS X");

  const {
    seekStepSeconds,
    seekSmallStepSeconds,
    seekMode,
    setSeekStepSeconds,
    setSeekSmallStepSeconds,
    setSeekMode,
    currentFile,
    currentYouTube,
  } = usePlayerStore();

  const hasMedia = !!(currentFile || currentYouTube);

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

  useEffect(() => {
    setOpenaiApiKey(localStorage.getItem("openai_api_key") || "");
    setGeminiApiKey(localStorage.getItem("gemini_api_key") || "");
    setGrokApiKey(localStorage.getItem("grok_api_key") || "");
    setGroqApiKey(localStorage.getItem("groq_api_key") || "");
    setPreferredProvider(
      (localStorage.getItem("preferred_ai_provider") as AIProvider) || "openai"
    );
    setPreferredTranscriptionProvider(
      (localStorage.getItem("preferred_transcription_provider") as TranscriptionProvider) || "openai"
    );
    setTargetLanguage(localStorage.getItem("target_language") || "English");
    const savedTemp = parseFloat(localStorage.getItem("ai_temperature") || "0.7");
    setTemperature(Number.isFinite(savedTemp) ? savedTemp : 0.7);
    const savedTokens = parseInt(localStorage.getItem("ai_max_tokens") || "1000", 10);
    setMaxTokens(Number.isFinite(savedTokens) ? savedTokens : 1000);
    setOpenaiModel(normalizeModelId("openai", localStorage.getItem("openai_model")));
    setGeminiModel(normalizeModelId("gemini", localStorage.getItem("gemini_model")));
    setGrokModel(normalizeModelId("grok", localStorage.getItem("grok_model")));
    setOllamaBaseUrl(localStorage.getItem("ollama_base_url") || "http://localhost:11434");
    setOllamaModel(normalizeModelId("ollama", localStorage.getItem("ollama_model")));
    setLocalWhisperUrl(localStorage.getItem("local_whisper_url") || "http://localhost:8000");
    setLocalWhisperModel(
      localStorage.getItem("local_whisper_model") || "Systran/faster-whisper-large-v3"
    );
    
    // Mark as loaded to enable auto-save
    setTimeout(() => {
      isLoadedRef.current = true;
    }, 100);
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (!isLoadedRef.current) return;

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

    window.dispatchEvent(new CustomEvent("aiSettingsUpdated"));
    window.dispatchEvent(new CustomEvent("ai-settings-updated"));
  }, [
    openaiApiKey, geminiApiKey, grokApiKey, groqApiKey,
    openaiModel, geminiModel, grokModel,
    ollamaBaseUrl, ollamaModel,
    localWhisperUrl, localWhisperModel,
    preferredProvider, preferredTranscriptionProvider,
    targetLanguage, temperature, maxTokens
  ]);

  const providerConfigs: ProviderConfig[] = [
    { provider: "openai", apiKey: openaiApiKey, setApiKey: setOpenaiApiKey, model: openaiModel, setModel: setOpenaiModel },
    { provider: "gemini", apiKey: geminiApiKey, setApiKey: setGeminiApiKey, model: geminiModel, setModel: setGeminiModel },
    { provider: "grok", apiKey: grokApiKey, setApiKey: setGrokApiKey, model: grokModel, setModel: setGrokModel },
    { provider: "ollama", apiKey: "", setApiKey: () => {}, model: ollamaModel, setModel: setOllamaModel },
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
    <div className="flex h-screen w-full overflow-hidden bg-gray-50/30 dark:bg-[#020617]">
      {/* Sidebar Navigation - Desktop */}
      <aside className={cn(
        "hidden md:flex w-64 flex-col border-r border-black/5 dark:border-white/5 bg-white/40 dark:bg-gray-950/40 backdrop-blur-xl",
        isElectron() && isMac && "pt-12"
      )}>
        <div className="p-6">
          <button
            onClick={() => navigate(hasMedia ? "/player" : "/")}
            className="flex items-center gap-3 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors group mb-8"
          >
            <div className="p-2 rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-black/5 dark:border-white/5 group-hover:scale-110 transition-transform">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight">{t("common.back")}</span>
          </button>

          <div className="space-y-1">
            {NAV_ITEMS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  activeTab === id
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <Icon className={cn("h-4 w-4", activeTab === id ? "text-white" : "text-gray-400")} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto p-6">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/10 dark:from-primary-500/20 dark:to-accent-500/20">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-1">Status</h4>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">All Systems Ready</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className={cn(
          "md:hidden sticky top-0 z-20 flex items-center px-4 border-b border-black/5 dark:border-white/5 bg-white/60 dark:bg-gray-950/60 backdrop-blur-xl",
          isElectron() && isMac ? "h-24 pt-8" : "h-16"
        )}>
          <button
            onClick={() => navigate(hasMedia ? "/player" : "/")}
            className="p-2 text-gray-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center font-bold text-gray-900 dark:text-white">
            {activeTab === "general" ? t("settingsPage.tabs.general") : t("settingsPage.tabs.ai")}
          </h1>
          <div className="w-9" />
        </header>

        {/* Mobile Nav Tabs */}
        <div className="md:hidden flex p-2 gap-2 bg-white/40 dark:bg-gray-950/40 backdrop-blur-xl border-b border-black/5 dark:border-white/5 overflow-x-auto scrollbar-none">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === id
                  ? "bg-primary-500 text-white shadow-md shadow-primary-500/20"
                  : "text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-900/50"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable Settings Area */}
        <main className="flex-1 overflow-y-auto scroll-smooth">
          <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 lg:px-12 space-y-10">
            
            {/* Page Header (Desktop) */}
            <div className="hidden md:block">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
                {activeTab === "general" ? t("settingsPage.tabs.general") : t("settingsPage.tabs.ai")}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {activeTab === "general" 
                  ? t("settingsPage.interfaceLayoutHelp") 
                  : t("aiSettingsPage.providerSetupDescription")}
              </p>
            </div>

            {/* General Tab Content */}
            {activeTab === "general" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Appearance Group */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Globe className="h-4 w-4 text-primary-500" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t("settingsPage.appearance")}</h3>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-black/5 dark:border-white/5 shadow-xl p-6">
                    <LanguageSelector />
                  </div>
                </section>

                {/* Interface Layout Group */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Layout className="h-4 w-4 text-orange-500" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t("settingsPage.interfaceLayout")}</h3>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-black/5 dark:border-white/5 shadow-xl overflow-hidden">
                    <div className="divide-y divide-black/5 dark:divide-white/5">
                      {layoutOptions.map((option) => (
                        <div
                          key={option.key}
                          className="flex items-center justify-between p-6 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800">
                              {option.icon}
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {option.label}
                              </span>
                              <p className="text-xs text-gray-500">Toggle visibility on the main player screen</p>
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
                  </div>
                </section>

                {/* Theme Customization Group */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Palette className="h-4 w-4 text-purple-500" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t("settingsPage.theme")}</h3>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-black/5 dark:border-white/5 shadow-xl p-6 space-y-8">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t("settingsPage.themeHelp")}
                      </p>
                      <button
                        onClick={resetColors}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950 transition-all"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t("settingsPage.resetTheme")}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
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
                                ? "border-primary-500 scale-110 shadow-lg shadow-primary-500/20"
                                : "border-transparent group-hover:scale-105"
                            )}
                            style={{ backgroundColor: themeColors.primary }}
                          />
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-tighter transition-colors",
                            colors.primary === themeColors.primary ? "text-primary-600 dark:text-primary-400" : "text-gray-400"
                          )}>
                            {name}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-black/5 dark:border-white/5">
                      <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                        {t("settingsPage.customPrimaryColor")}
                      </label>
                      <div className="flex items-center gap-4">
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
                          className="h-12 max-w-[140px] font-mono text-sm uppercase rounded-2xl"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Playback Settings Group */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t("settingsPage.playback")}</h3>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-black/5 dark:border-white/5 shadow-xl divide-y divide-black/5 dark:divide-white/5">
                    <div className="flex items-center justify-between p-6 gap-6">
                      <div className="flex-1">
                        <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {t("settingsPage.seekMode")}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          {t("settings.seekModeHelp")}
                        </p>
                      </div>
                      <select
                        value={seekMode}
                        onChange={(e) => setSeekMode(e.target.value as "seconds" | "sentence")}
                        className="h-10 w-40 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-gray-800/50 px-3 text-sm font-medium focus:ring-2 focus:ring-primary-500/20"
                      >
                        <option value="seconds">{t("settings.seekModeSeconds")}</option>
                        <option value="sentence">{t("settings.seekModeSentence")}</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between p-6 gap-6">
                      <div className="flex-1">
                        <label className={cn("text-sm font-semibold text-gray-900 dark:text-gray-100", seekMode === "sentence" && "opacity-50")}>
                          {t("settingsPage.seekStep")}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          {t("settings.seekStep")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0.1}
                          max={120}
                          step={0.1}
                          disabled={seekMode === "sentence"}
                          value={seekStepSeconds}
                          onChange={(e) => setSeekStepSeconds(parseFloat(e.target.value) || 0)}
                          className="h-10 w-24 text-right rounded-xl"
                        />
                        <span className="text-xs font-bold text-gray-400">SEC</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-6 gap-6">
                      <div className="flex-1">
                        <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {t("settingsPage.smallStep")}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          {t("settings.smallStep")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0.05}
                          max={10}
                          step={0.05}
                          value={seekSmallStepSeconds}
                          onChange={(e) => setSeekSmallStepSeconds(parseFloat(e.target.value) || 0)}
                          className="h-10 w-24 text-right rounded-xl"
                        />
                        <span className="text-xs font-bold text-gray-400">SEC</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* AI Tab Content */}
            {activeTab === "ai" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* AI Configuration Glance */}
                <div className="bg-primary-500 text-white rounded-[2rem] p-8 shadow-2xl shadow-primary-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-12 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                    <Brain size={120} />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                      <h3 className="text-3xl font-bold mb-2">AI Intelligence</h3>
                      <p className="text-primary-100 text-sm max-w-xs leading-relaxed">
                        Configure your preferred models and API providers for high-quality transcription and assistance.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <div className="px-4 py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20">
                        <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">{t("aiSettingsPage.preferredProvider")}</span>
                        <span className="text-sm font-bold">{providerDisplayName(preferredProvider)}</span>
                      </div>
                      <div className="px-4 py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20">
                        <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">{t("aiSettingsPage.summaryDefaultModel")}</span>
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
                </div>

                {/* Sub-navigation Segmented Control */}
                <div className="flex p-1.5 gap-1.5 bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl w-fit mx-auto sm:mx-0">
                  {AI_SUB_TABS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAiSubTab(id)}
                      className={cn(
                        "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300",
                        aiSubTab === id
                          ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                {/* AI Sections Content */}
                <div className="space-y-8 min-h-[400px]">
                  
                  {/* Defaults Section */}
                  {aiSubTab === "defaults" && (
                    <section className="space-y-8 animate-in fade-in duration-500">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                          <Shield className="h-4 w-4 text-primary-500" />
                          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t("aiSettingsPage.preferredProvider")}</h3>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          {providerConfigs.map(({ provider, apiKey }) => {
                            const status = getProviderSetupStatus(provider, apiKey);
                            const isActive = preferredProvider === provider;
                            return (
                              <button
                                key={provider}
                                type="button"
                                onClick={() => setPreferredProvider(provider)}
                                className={cn(
                                  "relative p-5 rounded-3xl border-2 text-left transition-all duration-300 group overflow-hidden",
                                  isActive
                                    ? "border-primary-500 bg-primary-50/50 dark:bg-primary-950/20"
                                    : "border-black/5 dark:border-white/5 bg-white dark:bg-gray-900 hover:border-primary-200 dark:hover:border-primary-900/50"
                                )}
                              >
                                {isActive && (
                                  <div className="absolute top-0 right-0 p-2">
                                    <div className="bg-primary-500 rounded-full p-1 shadow-lg shadow-primary-500/30">
                                      <CheckCircle className="h-3 w-3 text-white" />
                                    </div>
                                  </div>
                                )}
                                <span className={cn(
                                  "block text-sm font-bold mb-1",
                                  isActive ? "text-primary-700 dark:text-primary-300" : "text-gray-900 dark:text-white"
                                )}>
                                  {providerDisplayName(provider)}
                                </span>
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-primary-500 transition-colors">
                                  {status.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-black/5 dark:border-white/5 shadow-xl p-8 space-y-8">
                        <div className="grid gap-8 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">
                              {t("aiSettingsPage.targetLanguage")}
                            </label>
                            <select
                              value={targetLanguage}
                              onChange={(e) => setTargetLanguage(e.target.value)}
                              className="h-12 w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-gray-800/50 px-4 text-sm font-medium focus:ring-2 focus:ring-primary-500/20"
                            >
                              {LANGUAGE_OPTIONS.map((k) => (
                                <option key={k} value={LANGUAGE_VALUES[k]}>
                                  {t(`aiSettingsPage.languages.${k}`)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">
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
                              className="h-12 rounded-2xl"
                            />
                          </div>
                        </div>

                        <div className="space-y-6 pt-6 border-t border-black/5 dark:border-white/5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">
                              {t("aiSettingsPage.generationBehavior")}
                            </label>
                            <span className="px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-bold font-mono">
                              {temperature.toFixed(1)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none bg-gray-200 dark:bg-gray-800 accent-primary-500"
                          />
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter text-gray-400">
                            <span>{t("aiSettingsPage.temperatureFocused")}</span>
                            <span>{t("aiSettingsPage.temperatureBalanced")}</span>
                            <span>{t("aiSettingsPage.temperatureCreative")}</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Providers Section */}
                  {aiSubTab === "providers" && (
                    <section className="space-y-6 animate-in fade-in duration-500">
                      {providerConfigs.map(({ provider, apiKey, setApiKey, model, setModel }) => {
                        const providerName = providerDisplayName(provider);
                        const setupStatus = getProviderSetupStatus(provider, apiKey);
                        const isOllamaProvider = isOllama(provider);

                        return (
                          <div key={provider} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-black/5 dark:border-white/5 shadow-xl overflow-hidden group">
                            <div className="p-8 space-y-8">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                  <div className={cn("p-4 rounded-3xl shadow-sm transition-transform group-hover:scale-110 duration-500", providerSurfaceClassName[provider])}>
                                    <Brain className="h-6 w-6" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">{providerName}</h4>
                                      {!isOllamaProvider && getConnectionStatusIcon(provider)}
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                      {t(`aiSettingsPage.providerDescriptions.${provider}`)}
                                    </p>
                                  </div>
                                </div>
                                <span className={cn("inline-flex self-start sm:self-center rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-widest", setupStatus.className)}>
                                  {setupStatus.label}
                                </span>
                              </div>

                              <div className="grid gap-8 md:grid-cols-2 pt-6 border-t border-black/5 dark:border-white/5">
                                {isOllamaProvider ? (
                                  <>
                                    <div className="space-y-2">
                                      <label className="text-xs font-bold uppercase tracking-widest text-gray-400">{t("aiSettingsPage.ollamaBaseUrl")}</label>
                                      <Input
                                        type="text"
                                        value={ollamaBaseUrl}
                                        onChange={(e) => setOllamaBaseUrl(e.target.value)}
                                        placeholder="http://localhost:11434"
                                        className="h-12 rounded-2xl font-mono"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-xs font-bold uppercase tracking-widest text-gray-400">{t("aiSettingsPage.ollamaModel")}</label>
                                      <Input
                                        type="text"
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        placeholder="llama3.2"
                                        className="h-12 rounded-2xl"
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold uppercase tracking-widest text-gray-400">{t("aiSettingsPage.apiKeyLabel")}</label>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => testConnection(provider)}
                                          disabled={!apiKey.trim() || testingConnection[provider]}
                                          className="h-8 gap-2 text-xs font-bold text-primary-600 dark:text-primary-400"
                                        >
                                          {testingConnection[provider] ? (
                                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                                          ) : (
                                            <TestTube className="h-3.5 w-3.5" />
                                          )}
                                          {t("aiSettingsPage.testConnection")}
                                        </Button>
                                      </div>
                                      <div className="relative">
                                        <Input
                                          type={showApiKeys[provider] ? "text" : "password"}
                                          value={apiKey}
                                          onChange={(e) => setApiKey(e.target.value)}
                                          placeholder={t("aiSettingsPage.apiKeyPlaceholderLabel", { provider: providerName })}
                                          className="h-12 pr-12 rounded-2xl font-mono text-sm"
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
                                      <label className="block text-xs font-bold uppercase tracking-widest text-gray-400">{t("aiSettingsPage.defaultModel")}</label>
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
                            </div>
                          </div>
                        );
                      })}
                    </section>
                  )}

                  {/* Transcription Section */}
                  {aiSubTab === "transcription" && (
                    <section className="space-y-8 animate-in fade-in duration-500">
                      <div className="grid gap-4 sm:grid-cols-3">
                        {(Object.keys(TRANSCRIPTION_PROVIDERS) as TranscriptionProvider[]).map((provider) => {
                          const isSelected = preferredTranscriptionProvider === provider;
                          return (
                            <button
                              key={provider}
                              type="button"
                              onClick={() => setPreferredTranscriptionProvider(provider)}
                              className={cn(
                                "relative p-5 rounded-3xl border-2 text-left transition-all duration-300 group overflow-hidden",
                                isSelected
                                  ? "border-primary-500 bg-primary-50/50 dark:bg-primary-950/20"
                                  : "border-black/5 dark:border-white/5 bg-white dark:bg-gray-900 hover:border-primary-200 dark:hover:border-primary-900/50"
                              )}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className={cn("p-2 rounded-xl", isSelected ? "bg-primary-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500")}>
                                  <FileAudio size={18} />
                                </div>
                                {isSelected && <CheckCircle className="h-4 w-4 text-primary-500" />}
                              </div>
                              <span className={cn(
                                "block text-sm font-bold mb-1",
                                isSelected ? "text-primary-700 dark:text-primary-300" : "text-gray-900 dark:text-white"
                              )}>
                                {t(`aiSettingsPage.transcriptionProviders.${provider}`)}
                              </span>
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-tight truncate">
                                {provider === "local-whisper" ? localWhisperModel || "Custom" : TRANSCRIPTION_PROVIDERS[provider].model}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-black/5 dark:border-white/5 shadow-xl p-8">
                        {preferredTranscriptionProvider === "local-whisper" ? (
                          <div className="grid gap-8 md:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">{t("aiSettingsPage.localWhisperUrl")}</label>
                              <Input
                                type="text"
                                value={localWhisperUrl}
                                onChange={(e) => setLocalWhisperUrl(e.target.value)}
                                placeholder="http://localhost:8000"
                                className="h-12 rounded-2xl font-mono"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">{t("aiSettingsPage.localWhisperModel")}</label>
                              <Input
                                type="text"
                                value={localWhisperModel}
                                onChange={(e) => setLocalWhisperModel(e.target.value)}
                                placeholder="Systran/faster-whisper-large-v3"
                                className="h-12 rounded-2xl"
                              />
                            </div>
                          </div>
                        ) : transcriptionSharedProvider ? (
                          <div className="flex items-center gap-6">
                            <div className="p-4 rounded-3xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                              <Shield size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {t("aiSettingsPage.transcriptionSharedKey")}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                {t("aiSettingsPage.transcriptionSharedKeyDescription", {
                                  provider: providerDisplayName(transcriptionSharedProvider),
                                })}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 max-w-md">
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400">
                              {t("aiSettingsPage.groqApiKeyLabel")}
                            </label>
                            <div className="relative">
                              <Input
                                type={showGroqApiKey ? "text" : "password"}
                                value={groqApiKey}
                                onChange={(e) => setGroqApiKey(e.target.value)}
                                placeholder={t("aiSettingsPage.groqApiKeyPlaceholder")}
                                className="h-12 pr-12 rounded-2xl font-mono"
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
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                            >
                              {t("aiSettingsPage.getGroqApiKey")}
                              <ChevronRight size={14} />
                            </a>
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            )}
            
            {/* Page Footer */}
            <footer className="pt-10 pb-20 border-t border-black/5 dark:border-white/5 flex flex-col items-center gap-4 text-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-md border border-black/5 dark:border-white/5">
                <Shield className="h-3.5 w-3.5 text-green-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Settings are auto-saved to your device</span>
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-medium">
                LoopMate v1.2.0 • Made with ❤️ for Language Learners
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};
