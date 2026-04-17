import { useTranslation } from "react-i18next";
import { Brain, SlidersHorizontal } from "lucide-react";
import { GeneralSettingsPanel } from "./GeneralSettingsPanel";
import { AISettingsPanel } from "./AISettingsPanel";
import {
  SettingsSidebar,
  type SettingsTab,
} from "./SettingsSidebar";
import type { UseAiSettingsStateResult } from "../../hooks/useAiSettingsState";

export type SettingsWorkspaceVariant = "page" | "standalone";

interface SettingsWorkspaceProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  aiSettingsState: UseAiSettingsStateResult;
  variant?: SettingsWorkspaceVariant;
}

export function SettingsWorkspace({
  activeTab,
  onTabChange,
  aiSettingsState,
  variant = "page",
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

  return (
    <div
      className={
        variant === "page"
          ? "space-y-8"
          : "space-y-6"
      }
    >
      <SettingsSidebar
        activeTab={activeTab}
        items={navItems}
        onTabChange={onTabChange}
        orientation="horizontal"
        className="w-full max-w-[280px] shrink-0 lg:hidden"
      />

      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <SettingsSidebar
            activeTab={activeTab}
            items={navItems}
            onTabChange={onTabChange}
          />
        </div>

        <div>
          {activeTab === "general" ? (
            <GeneralSettingsPanel />
          ) : (
            <AISettingsPanel state={aiSettingsState} />
          )}
        </div>
      </div>
    </div>
  );
}
