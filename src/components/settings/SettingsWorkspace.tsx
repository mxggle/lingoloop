import { useTranslation } from "react-i18next";
import { ArrowLeft, Brain, Shield, SlidersHorizontal } from "lucide-react";
import { GeneralSettingsPanel } from "./GeneralSettingsPanel";
import { AISettingsPanel } from "./AISettingsPanel";
import { SettingsSidebar } from "./SettingsSidebar";
import type { UseAiSettingsStateResult } from "../../hooks/useAiSettingsState";

export type SettingsTab = "general" | "ai";
export type SettingsWorkspaceVariant = "page" | "standalone";

interface SettingsWorkspaceProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  aiSettingsState: UseAiSettingsStateResult;
  variant?: SettingsWorkspaceVariant;
  onBack?: () => void;
}

export function SettingsWorkspace({
  activeTab,
  onTabChange,
  aiSettingsState,
  variant = "page",
  onBack,
}: SettingsWorkspaceProps) {
  const { t } = useTranslation();

  const navItems = [
    {
      id: "general" as const,
      label: t("settingsPage.tabs.general"),
      description: t("settingsPage.interfaceLayoutHelp"),
      Icon: SlidersHorizontal,
    },
    {
      id: "ai" as const,
      label: t("settingsPage.tabs.ai"),
      description: t("aiSettingsPage.providerSetupDescription"),
      Icon: Brain,
    },
  ];

  const subtitle =
    activeTab === "general"
      ? t("settingsPage.interfaceLayoutHelp")
      : t("aiSettingsPage.providerSetupDescription");

  return (
    <div
      className={
        variant === "page"
          ? "mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8 lg:px-12"
          : "mx-auto max-w-6xl space-y-8 px-6 py-6"
      }
    >
      <header className="space-y-6 border-b border-black/5 pb-8 dark:border-white/5">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            {variant === "page" && onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl bg-black/5 p-2 text-gray-600 transition-all hover:bg-black/10 active:scale-95 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                title={t("common.back")}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : null}
            <div className="space-y-1.5">
              <h2 className="text-3xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                {t("settingsPage.title")}
              </h2>
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 opacity-60 dark:text-gray-400">
                {subtitle}
              </p>
            </div>
          </div>

          <SettingsSidebar
            activeTab={activeTab}
            items={navItems}
            onTabChange={onTabChange}
            orientation="horizontal"
            className="w-full max-w-[280px] shrink-0 lg:hidden"
          />
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <div className="sticky top-8">
            <SettingsSidebar
              activeTab={activeTab}
              items={navItems}
              onTabChange={onTabChange}
            />
          </div>
        </div>

        <div className="space-y-10">
          {activeTab === "general" ? (
            <GeneralSettingsPanel />
          ) : (
            <AISettingsPanel state={aiSettingsState} />
          )}

          <footer className="flex flex-col items-center gap-4 border-t border-black/5 pt-10 text-center dark:border-white/5">
            <div className="flex items-center gap-2 rounded-2xl border border-black/5 bg-black/5 px-4 py-2 dark:border-white/5 dark:bg-white/5">
              <Shield className="h-4 w-4 text-green-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {t("settingsPage.footer.autoSaved")}
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400 opacity-30">
              {t("settingsPage.footer.tagline")}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
