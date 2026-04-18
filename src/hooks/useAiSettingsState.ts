import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { aiService } from "../services/aiService";
import {
  AIProvider,
  AIServiceConfig,
  DEFAULT_MODELS,
  DEFAULT_TRANSCRIPTION_PROVIDER,
  TranscriptionProvider,
  normalizeModelId,
} from "../types/aiService";

export type ConnectionStatus = "idle" | "success" | "error";

export type ProviderSetupTone = "success" | "warning" | "error";

type ProviderRecord<T> = Record<AIProvider, T>;

type PersistedAiSettings = {
  openaiApiKey: string;
  geminiApiKey: string;
  grokApiKey: string;
  groqApiKey: string;
  openaiModel: string;
  geminiModel: string;
  grokModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  localWhisperUrl: string;
  localWhisperModel: string;
  preferredProvider: AIProvider;
  preferredTranscriptionProvider: TranscriptionProvider;
  targetLanguage: string;
  temperature: number;
  maxTokens: number;
};

export interface ProviderConfigState {
  provider: AIProvider;
  apiKey: string;
  setApiKey: (apiKey: string) => void;
  model: string;
  setModel: (model: string) => void;
  setupStatus: {
    label: string;
    tone: ProviderSetupTone;
    isConfigured: boolean;
  };
}

export interface AiDefaultsState {
  preferredProvider: AIProvider;
  setPreferredProvider: (provider: AIProvider) => void;
  targetLanguage: string;
  setTargetLanguage: (language: string) => void;
  temperature: number;
  setTemperature: (temperature: number) => void;
  maxTokens: number;
  setMaxTokens: (maxTokens: number) => void;
}

export interface AiProvidersState {
  selectedProvider: AIProvider;
  setSelectedProvider: (provider: AIProvider) => void;
  showApiKeys: ProviderRecord<boolean>;
  toggleApiKeyVisibility: (provider: AIProvider) => void;
  testingConnection: ProviderRecord<boolean>;
  connectionStatus: ProviderRecord<ConnectionStatus>;
  testConnection: (provider: AIProvider) => Promise<void>;
  ollamaBaseUrl: string;
  setOllamaBaseUrl: (url: string) => void;
}

export interface AiTranscriptionState {
  preferredTranscriptionProvider: TranscriptionProvider;
  setPreferredTranscriptionProvider: (provider: TranscriptionProvider) => void;
  transcriptionSharedProvider: AIProvider | null;
  groqApiKey: string;
  setGroqApiKey: (apiKey: string) => void;
  showGroqApiKey: boolean;
  setShowGroqApiKey: (show: boolean | ((current: boolean) => boolean)) => void;
  localWhisperUrl: string;
  setLocalWhisperUrl: (url: string) => void;
  localWhisperModel: string;
  setLocalWhisperModel: (model: string) => void;
}

export interface UseAiSettingsStateResult {
  providerConfigs: ProviderConfigState[];
  defaultsState: AiDefaultsState;
  providersState: AiProvidersState;
  transcriptionState: AiTranscriptionState;
}

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_LOCAL_WHISPER_URL = "http://localhost:8000";
const DEFAULT_LOCAL_WHISPER_MODEL = "Systran/faster-whisper-large-v3";
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1000;

const DEFAULT_SHOW_API_KEYS: ProviderRecord<boolean> = {
  openai: false,
  gemini: false,
  grok: false,
  ollama: false,
};

const DEFAULT_TESTING_CONNECTION: ProviderRecord<boolean> = {
  openai: false,
  gemini: false,
  grok: false,
  ollama: false,
};

const DEFAULT_CONNECTION_STATUS: ProviderRecord<ConnectionStatus> = {
  openai: "idle",
  gemini: "idle",
  grok: "idle",
  ollama: "idle",
};

const isPlausibleHttpUrl = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
};

const getProviderConfigSignatures = (config: {
  openaiApiKey: string;
  openaiModel: string;
  geminiApiKey: string;
  geminiModel: string;
  grokApiKey: string;
  grokModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
}): ProviderRecord<string> => ({
  openai: `${config.openaiApiKey}\u0000${config.openaiModel}`,
  gemini: `${config.geminiApiKey}\u0000${config.geminiModel}`,
  grok: `${config.grokApiKey}\u0000${config.grokModel}`,
  ollama: `${config.ollamaBaseUrl}\u0000${config.ollamaModel}`,
});

const serializeAiSettings = (settings: PersistedAiSettings) => JSON.stringify(settings);

const getLoadedAiSettings = (): PersistedAiSettings => {
  const preferredProvider =
    (localStorage.getItem("preferred_ai_provider") as AIProvider) || "openai";
  const preferredTranscriptionProvider =
    (localStorage.getItem(
      "preferred_transcription_provider"
    ) as TranscriptionProvider) || DEFAULT_TRANSCRIPTION_PROVIDER;
  const savedTemp = parseFloat(
    localStorage.getItem("ai_temperature") || DEFAULT_TEMPERATURE.toString()
  );
  const savedTokens = parseInt(
    localStorage.getItem("ai_max_tokens") || DEFAULT_MAX_TOKENS.toString(),
    10
  );

  return {
    openaiApiKey: localStorage.getItem("openai_api_key") || "",
    geminiApiKey: localStorage.getItem("gemini_api_key") || "",
    grokApiKey: localStorage.getItem("grok_api_key") || "",
    groqApiKey: localStorage.getItem("groq_api_key") || "",
    openaiModel: normalizeModelId("openai", localStorage.getItem("openai_model")),
    geminiModel: normalizeModelId("gemini", localStorage.getItem("gemini_model")),
    grokModel: normalizeModelId("grok", localStorage.getItem("grok_model")),
    ollamaBaseUrl:
      localStorage.getItem("ollama_base_url") || DEFAULT_OLLAMA_BASE_URL,
    ollamaModel: normalizeModelId("ollama", localStorage.getItem("ollama_model")),
    localWhisperUrl:
      localStorage.getItem("local_whisper_url") || DEFAULT_LOCAL_WHISPER_URL,
    localWhisperModel:
      localStorage.getItem("local_whisper_model") || DEFAULT_LOCAL_WHISPER_MODEL,
    preferredProvider,
    preferredTranscriptionProvider,
    targetLanguage: localStorage.getItem("target_language") || "English",
    temperature: Number.isFinite(savedTemp) ? savedTemp : DEFAULT_TEMPERATURE,
    maxTokens: Number.isFinite(savedTokens) ? savedTokens : DEFAULT_MAX_TOKENS,
  };
};

export function useAiSettingsState(): UseAiSettingsStateResult {
  const { t } = useTranslation();
  const hasHydratedAiSettingsRef = useRef(false);
  const pendingAiSettingsSaveRef = useRef<number | null>(null);
  const lastSavedAiSettingsRef = useRef<string | null>(null);
  const providerConfigSignaturesRef = useRef<ProviderRecord<string> | null>(null);

  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [grokApiKey, setGrokApiKey] = useState("");
  const [groqApiKey, setGroqApiKey] = useState("");

  const [openaiModel, setOpenaiModel] = useState(DEFAULT_MODELS.openai);
  const [geminiModel, setGeminiModel] = useState(DEFAULT_MODELS.gemini);
  const [grokModel, setGrokModel] = useState(DEFAULT_MODELS.grok);

  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(DEFAULT_OLLAMA_BASE_URL);
  const [ollamaModel, setOllamaModel] = useState(DEFAULT_MODELS.ollama);
  const [localWhisperUrl, setLocalWhisperUrl] = useState(DEFAULT_LOCAL_WHISPER_URL);
  const [localWhisperModel, setLocalWhisperModel] = useState(
    DEFAULT_LOCAL_WHISPER_MODEL
  );

  const [preferredProvider, setPreferredProvider] = useState<AIProvider>("openai");
  const [preferredTranscriptionProvider, setPreferredTranscriptionProvider] =
    useState<TranscriptionProvider>(DEFAULT_TRANSCRIPTION_PROVIDER);
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_MAX_TOKENS);

  const [showApiKeys, setShowApiKeys] =
    useState<ProviderRecord<boolean>>(DEFAULT_SHOW_API_KEYS);
  const [showGroqApiKey, setShowGroqApiKey] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("openai");
  const [testingConnection, setTestingConnection] = useState<
    ProviderRecord<boolean>
  >(DEFAULT_TESTING_CONNECTION);
  const [connectionStatus, setConnectionStatus] = useState<
    ProviderRecord<ConnectionStatus>
  >(DEFAULT_CONNECTION_STATUS);

  const getProviderSetupStatus = (
    provider: AIProvider,
    apiKey: string,
    model: string,
    baseURL?: string
  ) => {
    if (provider === "ollama") {
      if (!model.trim() || !baseURL?.trim()) {
        return {
          label: t("aiSettingsPage.status.missing"),
          tone: "warning" as const,
          isConfigured: false,
        };
      }

      if (!isPlausibleHttpUrl(baseURL)) {
        return {
          label: t("aiSettingsPage.status.invalid"),
          tone: "error" as const,
          isConfigured: false,
        };
      }

      return {
        label: t("aiSettingsPage.status.ready"),
        tone: "success" as const,
        isConfigured: true,
      };
    }

    if (!apiKey.trim()) {
      return {
        label: t("aiSettingsPage.status.missing"),
        tone: "warning" as const,
        isConfigured: false,
      };
    }

    if (!aiService.validateApiKey(provider, apiKey)) {
      return {
        label: t("aiSettingsPage.status.invalid"),
        tone: "error" as const,
        isConfigured: false,
      };
    }

    return {
      label: t("aiSettingsPage.status.ready"),
      tone: "success" as const,
      isConfigured: true,
    };
  };

  const providerConfigs: ProviderConfigState[] = [
    {
      provider: "openai",
      apiKey: openaiApiKey,
      setApiKey: setOpenaiApiKey,
      model: openaiModel,
      setModel: setOpenaiModel,
      setupStatus: getProviderSetupStatus("openai", openaiApiKey, openaiModel),
    },
    {
      provider: "gemini",
      apiKey: geminiApiKey,
      setApiKey: setGeminiApiKey,
      model: geminiModel,
      setModel: setGeminiModel,
      setupStatus: getProviderSetupStatus("gemini", geminiApiKey, geminiModel),
    },
    {
      provider: "grok",
      apiKey: grokApiKey,
      setApiKey: setGrokApiKey,
      model: grokModel,
      setModel: setGrokModel,
      setupStatus: getProviderSetupStatus("grok", grokApiKey, grokModel),
    },
    {
      provider: "ollama",
      apiKey: "",
      setApiKey: () => undefined,
      model: ollamaModel,
      setModel: setOllamaModel,
      setupStatus: getProviderSetupStatus(
        "ollama",
        "",
        ollamaModel,
        ollamaBaseUrl
      ),
    },
  ];

  const currentAiSettingsSnapshot = serializeAiSettings({
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
    const loadedSettings = getLoadedAiSettings();

    setOpenaiApiKey(loadedSettings.openaiApiKey);
    setGeminiApiKey(loadedSettings.geminiApiKey);
    setGrokApiKey(loadedSettings.grokApiKey);
    setGroqApiKey(loadedSettings.groqApiKey);
    setOpenaiModel(loadedSettings.openaiModel);
    setGeminiModel(loadedSettings.geminiModel);
    setGrokModel(loadedSettings.grokModel);
    setOllamaBaseUrl(loadedSettings.ollamaBaseUrl);
    setOllamaModel(loadedSettings.ollamaModel);
    setLocalWhisperUrl(loadedSettings.localWhisperUrl);
    setLocalWhisperModel(loadedSettings.localWhisperModel);
    setPreferredProvider(loadedSettings.preferredProvider);
    setSelectedProvider(loadedSettings.preferredProvider);
    setPreferredTranscriptionProvider(
      loadedSettings.preferredTranscriptionProvider
    );
    setTargetLanguage(loadedSettings.targetLanguage);
    setTemperature(loadedSettings.temperature);
    setMaxTokens(loadedSettings.maxTokens);

    lastSavedAiSettingsRef.current = serializeAiSettings(loadedSettings);
    providerConfigSignaturesRef.current = getProviderConfigSignatures(
      loadedSettings
    );
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
      localStorage.setItem(
        "preferred_transcription_provider",
        preferredTranscriptionProvider
      );
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
    currentAiSettingsSnapshot,
    geminiApiKey,
    geminiModel,
    grokApiKey,
    grokModel,
    groqApiKey,
    localWhisperModel,
    localWhisperUrl,
    maxTokens,
    ollamaBaseUrl,
    ollamaModel,
    openaiApiKey,
    openaiModel,
    preferredProvider,
    preferredTranscriptionProvider,
    targetLanguage,
    temperature,
  ]);

  useEffect(() => {
    if (!hasHydratedAiSettingsRef.current) {
      return;
    }

    const providerConfigSignatures = getProviderConfigSignatures({
      openaiApiKey,
      openaiModel,
      geminiApiKey,
      geminiModel,
      grokApiKey,
      grokModel,
      ollamaBaseUrl,
      ollamaModel,
    });

    if (providerConfigSignaturesRef.current === null) {
      providerConfigSignaturesRef.current = providerConfigSignatures;
      return;
    }

    const changedProviders = (
      Object.keys(providerConfigSignatures) as AIProvider[]
    ).filter(
      (provider) =>
        providerConfigSignatures[provider] !==
        providerConfigSignaturesRef.current?.[provider]
    );

    if (changedProviders.length === 0) {
      return;
    }

    setConnectionStatus((current) => {
      const nextStatus = { ...current };

      changedProviders.forEach((provider) => {
        nextStatus[provider] = "idle";
      });

      return nextStatus;
    });
    providerConfigSignaturesRef.current = providerConfigSignatures;
  }, [
    geminiApiKey,
    geminiModel,
    grokApiKey,
    grokModel,
    ollamaBaseUrl,
    ollamaModel,
    openaiApiKey,
    openaiModel,
  ]);

  const toggleApiKeyVisibility = (provider: AIProvider) => {
    setShowApiKeys((current) => ({ ...current, [provider]: !current[provider] }));
  };

  const providerDisplayName = (provider: AIProvider) =>
    t(`aiSettingsPage.providers.${provider}`);

  const testConnection = async (provider: AIProvider) => {
    const config = providerConfigs.find((item) => item.provider === provider);

    if (!config || (!config.apiKey.trim() && provider !== "ollama")) {
      toast.error(
        t("aiSettingsPage.enterApiKeyFirst", {
          provider: providerDisplayName(provider),
        })
      );
      return;
    }

    setTestingConnection((current) => ({ ...current, [provider]: true }));
    setConnectionStatus((current) => ({ ...current, [provider]: "idle" }));

    try {
      const requestConfig: AIServiceConfig = {
        provider,
        model: config.model,
        apiKey: config.apiKey,
        baseURL: provider === "ollama" ? ollamaBaseUrl.trim() : undefined,
        temperature: 0.1,
        maxTokens: 10,
      };
      const success = await aiService.testConnection(requestConfig);

      if (success) {
        setConnectionStatus((current) => ({ ...current, [provider]: "success" }));
        toast.success(
          t("aiSettingsPage.connectionSuccess", {
            provider: providerDisplayName(provider),
          })
        );
      } else {
        setConnectionStatus((current) => ({ ...current, [provider]: "error" }));
        toast.error(
          t("aiSettingsPage.connectionFailed", {
            provider: providerDisplayName(provider),
          })
        );
      }
    } catch (error) {
      setConnectionStatus((current) => ({ ...current, [provider]: "error" }));
      toast.error(
        t("aiSettingsPage.connectionFailedWithError", {
          provider: providerDisplayName(provider),
          message:
            error instanceof Error ? error.message : t("explanation.unknownError"),
        })
      );
    } finally {
      setTestingConnection((current) => ({ ...current, [provider]: false }));
    }
  };

  const transcriptionSharedProvider =
    preferredTranscriptionProvider === "groq" ||
    preferredTranscriptionProvider === "local-whisper"
      ? null
      : preferredTranscriptionProvider;

  return {
    providerConfigs,
    defaultsState: {
      preferredProvider,
      setPreferredProvider,
      targetLanguage,
      setTargetLanguage,
      temperature,
      setTemperature,
      maxTokens,
      setMaxTokens,
    },
    providersState: {
      selectedProvider,
      setSelectedProvider,
      showApiKeys,
      toggleApiKeyVisibility,
      testingConnection,
      connectionStatus,
      testConnection,
      ollamaBaseUrl,
      setOllamaBaseUrl,
    },
    transcriptionState: {
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
    },
  };
}
