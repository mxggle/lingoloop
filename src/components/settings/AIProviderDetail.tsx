import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Globe,
  Shield,
  TestTube,
} from "lucide-react";
import type {
  ConnectionStatus,
  ProviderConfigState,
} from "../../hooks/useAiSettingsState";
import type { AIProvider } from "../../types/aiService";
import { cn } from "../../utils/cn";
import { DesktopCard, DesktopCardContent } from "../ui/DesktopCard";
import { Input } from "../ui/input";
import { ModelSelector } from "../ui/ModelSelector";

const setupToneClassName = {
  success:
    "border border-success-200 bg-success-50 text-success-700 dark:border-success-900/60 dark:bg-success-950/40 dark:text-success-300",
  warning:
    "border border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-900/60 dark:bg-warning-950/40 dark:text-warning-300",
  error:
    "border border-error-200 bg-red-50 text-error-700 dark:border-error-900/60 dark:bg-red-950/40 dark:text-error-300",
} as const;

interface AIProviderDetailProps {
  providerConfig: ProviderConfigState;
  preferredProvider: AIProvider;
  showApiKey: boolean;
  connectionStatus: ConnectionStatus;
  testingConnection: boolean;
  ollamaBaseUrl: string;
  setOllamaBaseUrl: (url: string) => void;
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
  onToggleApiKeyVisibility,
  onTestConnection,
}: AIProviderDetailProps) {
  const { t } = useTranslation();
  const { provider, apiKey, setApiKey, model, setModel, setupStatus } = providerConfig;
  const providerName = t(`aiSettingsPage.providers.${provider}`);
  const isOllama = provider === "ollama";
  const isPreferred = preferredProvider === provider;
  const hasOllamaBaseUrl = ollamaBaseUrl.trim().length > 0;
  const hasOllamaModel = model.trim().length > 0;

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
  const connectionStatusLabel = "Connection Status";
  const ollamaStatusDescription = setupStatus.isConfigured || !hasOllamaBaseUrl
    ? t("aiSettingsPage.ollamaBaseUrlHelp")
    : !hasOllamaModel
      ? t("aiSettingsPage.ollamaModelHelp")
      : t("aiSettingsPage.ollamaBaseUrlHelp");

  return (
    <DesktopCard className="h-full min-h-[440px]">
      <DesktopCardContent className="flex h-full flex-col gap-8 p-6 sm:p-8">
        <div className="flex flex-col gap-5 border-b border-black/5 pb-6 dark:border-white/5">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
              {providerName}
            </h3>
            {isPreferred ? (
              <span className="rounded-full bg-primary-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                {t("aiSettingsPage.status.default")}
              </span>
            ) : null}
            <span
              className={cn(
                "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
                setupToneClassName[setupStatus.tone]
              )}
            >
              {setupStatus.label}
            </span>
          </div>

          <p className="max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            {t(`aiSettingsPage.providerDescriptions.${provider}`)}
          </p>
        </div>

        {isOllama ? (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {t("aiSettingsPage.ollamaBaseUrl")}
                </label>
                <Input
                  type="text"
                  value={ollamaBaseUrl}
                  onChange={(event) => setOllamaBaseUrl(event.target.value)}
                  placeholder="http://localhost:11434"
                  className="h-12 rounded-2xl border-black/5 font-mono text-sm dark:border-white/5"
                />
                <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                  {t("aiSettingsPage.ollamaBaseUrlHelp")}
                </p>
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
                <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                  {t("aiSettingsPage.ollamaModelHelp")}
                </p>
              </div>
            </div>

            <div className="mt-auto rounded-3xl border border-black/5 bg-black/[0.02] p-4 dark:border-white/5 dark:bg-white/[0.02]">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-primary-500/10 p-2.5 text-primary-500">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {setupStatus.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                    {ollamaStatusDescription}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t("aiSettingsPage.apiKeyLabel")}
                  </label>
                  <button
                    type="button"
                    onClick={onTestConnection}
                    disabled={!apiKey.trim() || testingConnection}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600 disabled:opacity-50 dark:text-primary-400"
                  >
                    {testingConnection ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-600 border-t-transparent dark:border-primary-400" />
                    ) : (
                      <TestTube className="h-4 w-4" />
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
                    className="h-12 rounded-2xl border-black/5 pr-12 font-mono text-sm dark:border-white/5"
                  />
                  <button
                    type="button"
                    onClick={onToggleApiKeyVisibility}
                    className="absolute inset-y-0 right-4 flex items-center text-gray-400 transition-colors hover:text-primary-500"
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                  {t("aiSettingsPage.storedLocally")}
                </p>
              </div>

              <div className="rounded-3xl border border-black/5 bg-black/[0.02] p-4 dark:border-white/5 dark:bg-white/[0.02]">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-primary-500/10 p-2.5 text-primary-500">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {connectionStatusLabel}
                    </p>
                    {connectionFeedback ? (
                      <div
                        className={cn(
                          "flex items-center gap-2 text-sm font-medium",
                          connectionFeedback.className
                        )}
                      >
                        {ConnectionFeedbackIcon ? (
                          <ConnectionFeedbackIcon className="h-4 w-4" />
                        ) : null}
                        <span>{connectionFeedback.label}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {setupStatus.label}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-black/5 pt-6 dark:border-white/5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
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
          </>
        )}
      </DesktopCardContent>
    </DesktopCard>
  );
}
