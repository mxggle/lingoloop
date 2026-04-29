import { useTranslation } from "react-i18next";
import { AlertCircle, Brain, CheckCircle } from "lucide-react";
import type {
  ConnectionStatus,
  ProviderConfigState,
} from "../../hooks/useAiSettingsState";
import type { AIProvider } from "../../types/aiService";
import { cn } from "../../utils/cn";
import { Card, CardContent } from "../ui/card";

const setupToneClassName = {
  success:
    "border-success-200 bg-success-50 text-success-700 dark:border-success-900/40 dark:bg-success-950/30 dark:text-success-300",
  warning:
    "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-900/40 dark:bg-warning-950/30 dark:text-warning-300",
  error:
    "border-error-200 bg-red-50 text-error-700 dark:border-error-900/40 dark:bg-red-950/30 dark:text-error-300",
} as const;

interface AIProviderListProps {
  providerConfigs: ProviderConfigState[];
  selectedProvider: AIProvider;
  preferredProvider: AIProvider;
  connectionStatus: Record<AIProvider, ConnectionStatus>;
  onSelectProvider: (provider: AIProvider) => void;
}

export function AIProviderList({
  providerConfigs,
  selectedProvider,
  preferredProvider,
  connectionStatus,
  onSelectProvider,
}: AIProviderListProps) {
  const { t } = useTranslation();

  const getConnectionStatusIcon = (provider: AIProvider) => {
    switch (connectionStatus[provider]) {
      case "success":
        return <CheckCircle className="h-3.5 w-3.5 text-success-500" />;
      case "error":
        return <AlertCircle className="h-3.5 w-3.5 text-error-500" />;
      default:
        return null;
    }
  };

  const getConnectionStatusLabel = (provider: AIProvider) => {
    switch (connectionStatus[provider]) {
      case "success":
        return t("aiSettingsPage.status.testPassed");
      case "error":
        return t("aiSettingsPage.status.testFailed");
      default:
        return null;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-2">
        <div className="space-y-1">
          {providerConfigs.map(({ provider, setupStatus }) => {
            const isSelected = selectedProvider === provider;
            const isPreferred = preferredProvider === provider;
            const connectionLabel = getConnectionStatusLabel(provider);

            return (
              <button
                key={provider}
                type="button"
                onClick={() => onSelectProvider(provider)}
                className={cn(
                  "w-full rounded-lg border px-3 py-3 text-left transition-colors duration-200",
                  isSelected
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-950/20"
                    : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-900/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                        isSelected
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                      )}
                    >
                      <Brain className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {t(`aiSettingsPage.providers.${provider}`)}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {t(`aiSettingsPage.providerDescriptions.${provider}`)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 pl-10.5">
                  {isPreferred ? (
                    <span className="rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {t("aiSettingsPage.status.default")}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      setupToneClassName[setupStatus.tone]
                    )}
                  >
                    {setupStatus.label}
                  </span>
                  {connectionLabel ? (
                    <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                      {getConnectionStatusIcon(provider)}
                      {connectionLabel}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
