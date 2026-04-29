import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Globe,
  TestTube,
} from "lucide-react";
import type {
  ConnectionStatus,
  ProviderConfigState,
} from "../../hooks/useAiSettingsState";
import type { AIProvider } from "../../types/aiService";
import { cn } from "../../utils/cn";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { ModelSelector } from "../ui/ModelSelector";


const setupToneClassName = {
  success:
    "border-success-200 bg-success-50 text-success-700 dark:border-success-900/40 dark:bg-success-950/30 dark:text-success-300",
  warning:
    "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-900/40 dark:bg-warning-950/30 dark:text-warning-300",
  error:
    "border-error-200 bg-red-50 text-error-700 dark:border-error-900/40 dark:bg-red-950/30 dark:text-error-300",
} as const;

interface AIProviderDetailProps {
  providerConfig: ProviderConfigState;
  preferredProvider: AIProvider;
  showApiKey: boolean;
  connectionStatus: ConnectionStatus;
  testingConnection: boolean;
  ollamaBaseUrl: string;
  setOllamaBaseUrl: (url: string) => void;
  opencodeBaseUrl: string;
  setOpencodeBaseUrl: (url: string) => void;
  onToggleApiKeyVisibility: () => void;
  onTestConnection: () => void;
}

export function AIProviderDetail({
  providerConfig,
  preferredProvider,
  showApiKey,
  connectionStatus,
  testingConnection,
  ollamaBaseUrl,
  setOllamaBaseUrl,
  opencodeBaseUrl,
  setOpencodeBaseUrl,
  onToggleApiKeyVisibility,
  onTestConnection,
}: AIProviderDetailProps) {
  const { t } = useTranslation();
  const { provider, apiKey, setApiKey, model, setModel, setupStatus } = providerConfig;
  const providerName = t(`aiSettingsPage.providers.${provider}`);
  const isOllama = provider === "ollama";
  const isOpencode = provider === "opencode";
  const isPreferred = preferredProvider === provider;

  const connectionFeedback =
    connectionStatus === "success"
      ? {
          Icon: CheckCircle,
          label: t("aiSettingsPage.status.testPassed"),
          className: "text-success-600 dark:text-success-300",
        }
      : connectionStatus === "error"
        ? {
            Icon: AlertCircle,
            label: t("aiSettingsPage.status.testFailed"),
            className: "text-error-600 dark:text-error-300",
          }
        : null;
  const ConnectionFeedbackIcon = connectionFeedback?.Icon;

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-6 p-6">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {providerName}
          </h3>
          {isPreferred ? (
            <span className="rounded-full bg-primary-500 px-2.5 py-0.5 text-[10px] font-semibold text-white">
              {t("aiSettingsPage.status.default")}
            </span>
          ) : null}
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold",
              setupToneClassName[setupStatus.tone]
            )}
          >
            {setupStatus.label}
          </span>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t(`aiSettingsPage.providerDescriptions.${provider}`)}
        </p>

        {isOllama ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("aiSettingsPage.ollamaBaseUrl")}
                </label>
                <Input
                  type="text"
                  value={ollamaBaseUrl}
                  onChange={(event) => setOllamaBaseUrl(event.target.value)}
                  placeholder="http://localhost:11434"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("aiSettingsPage.ollamaBaseUrlHelp")}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("aiSettingsPage.ollamaModel")}
                </label>
                <Input
                  type="text"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  placeholder="llama3.2"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("aiSettingsPage.ollamaModelHelp")}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary-500/10 p-2 text-primary-500">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {setupStatus.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("aiSettingsPage.ollamaBaseUrlHelp")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("aiSettingsPage.apiKeyLabel")}
                </label>
                <button
                  type="button"
                  onClick={onTestConnection}
                  disabled={!apiKey.trim() || testingConnection}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 disabled:opacity-50 dark:text-primary-400"
                >
                  {testingConnection ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-600 border-t-transparent dark:border-primary-400" />
                  ) : (
                    <TestTube className="h-3.5 w-3.5" />
                  )}
                  {t("aiSettingsPage.testConnection")}
                </button>
              </div>

              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={t("aiSettingsPage.apiKeyPlaceholderLabel", {
                    provider: providerName,
                  })}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={onToggleApiKeyVisibility}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("aiSettingsPage.storedLocally")}
              </p>
            </div>

            {connectionFeedback ? (
              <div className="flex items-center gap-2 text-sm">
                {ConnectionFeedbackIcon ? (
                  <ConnectionFeedbackIcon className={cn("h-4 w-4", connectionFeedback.className)} />
                ) : null}
                <span className={connectionFeedback.className}>
                  {connectionFeedback.label}
                </span>
              </div>
            ) : null}

            {isOpencode ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("aiSettingsPage.opencodeBaseUrl")}
                  </label>
                  <Input
                    type="text"
                    value={opencodeBaseUrl}
                    onChange={(event) => setOpencodeBaseUrl(event.target.value)}
                    placeholder="https://opencode.ai/zen/go/v1"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("aiSettingsPage.opencodeBaseUrlHelp")}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("aiSettingsPage.opencodeModel")}
                  </label>
                  <ModelSelector
                    selectedModel={model}
                    onModelSelect={setModel}
                    provider={provider}
                    placeholder={t("aiSettingsPage.selectModelPlaceholder", {
                      provider: providerName,
                    })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("aiSettingsPage.defaultModel")}
                </label>
                <ModelSelector
                  selectedModel={model}
                  onModelSelect={setModel}
                  provider={provider}
                  placeholder={t("aiSettingsPage.selectModelPlaceholder", {
                    provider: providerName,
                  })}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
