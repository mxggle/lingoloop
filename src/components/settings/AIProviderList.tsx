import { useTranslation } from "react-i18next";
import { AlertCircle, Brain, CheckCircle } from "lucide-react";
import type {
  ConnectionStatus,
  ProviderConfigState,
} from "../../hooks/useAiSettingsState";
import type { AIProvider } from "../../types/aiService";
import { cn } from "../../utils/cn";
import { DesktopCard, DesktopCardContent } from "../ui/DesktopCard";

const setupToneClassName = {
  success:
    "border border-success-200 bg-success-50 text-success-700 dark:border-success-900/60 dark:bg-success-950/40 dark:text-success-300",
  warning:
    "border border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-900/60 dark:bg-warning-950/40 dark:text-warning-300",
  error:
    "border border-error-200 bg-red-50 text-error-700 dark:border-error-900/60 dark:bg-red-950/40 dark:text-error-300",
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
        return <CheckCircle className="h-4 w-4 text-success-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-error-500" />;
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
    <DesktopCard className="overflow-hidden">
      <DesktopCardContent className="p-2">
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
                  "w-full rounded-2xl border px-4 py-4 text-left transition-all duration-200",
                  isSelected
                    ? "border-primary-500 bg-primary-500/5 shadow-sm dark:bg-primary-500/10"
                    : "border-transparent hover:border-black/10 hover:bg-black/[0.02] dark:hover:border-white/10 dark:hover:bg-white/[0.03]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                          isSelected
                            ? "bg-primary-500 text-white"
                            : "bg-black/5 text-gray-500 dark:bg-white/5 dark:text-gray-300"
                        )}
                      >
                        <Brain className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                          {t(`aiSettingsPage.providers.${provider}`)}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {t(`aiSettingsPage.providerDescriptions.${provider}`)}
                        </p>
                      </div>
                    </div>

                    {connectionLabel ? (
                      <div className="flex items-center gap-2 pl-11 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        {getConnectionStatusIcon(provider)}
                        <span>{connectionLabel}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {isPreferred ? (
                      <span className="rounded-full bg-primary-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                        {t("aiSettingsPage.status.default")}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                        setupToneClassName[setupStatus.tone]
                      )}
                    >
                      {setupStatus.label}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </DesktopCardContent>
    </DesktopCard>
  );
}
