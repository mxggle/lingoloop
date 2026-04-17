import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Brain, Shield, SlidersHorizontal } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { SettingsWindowShell } from "../components/electron/SettingsWindowShell";
import { SettingsWorkspace } from "../components/settings/SettingsWorkspace";
import {
  SettingsSidebar,
  type SettingsTab,
} from "../components/settings/SettingsSidebar";
import { useAiSettingsState } from "../hooks/useAiSettingsState";

const getTabFromSearch = (search: string): SettingsTab => {
  const params = new URLSearchParams(search);
  return params.get("tab") === "ai" ? "ai" : "general";
};

export function ElectronSettingsWindowPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const aiSettingsState = useAiSettingsState();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() =>
    getTabFromSearch(location.search)
  );

  useEffect(() => {
    setActiveTab(getTabFromSearch(location.search));
  }, [location.search]);

  const subtitle =
    activeTab === "general"
      ? t("settingsPage.interfaceLayoutHelp")
      : t("aiSettingsPage.providerSetupDescription");

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

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);

    const params = new URLSearchParams(location.search);
    params.set("tab", tab);

    navigate(
      {
        pathname: location.pathname,
        search: `?${params.toString()}`,
      },
      { replace: true }
    );
  };

  return (
    <SettingsWindowShell
      title={t("settingsPage.title")}
      subtitle={subtitle}
      navigation={
        <SettingsSidebar
          activeTab={activeTab}
          items={navItems}
          onTabChange={handleTabChange}
          variant="standalone"
        />
      }
      footer={
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
          <Shield className="h-4 w-4 text-green-500" />
          <span>{t("settingsPage.footer.autoSaved")}</span>
        </div>
      }
    >
      <SettingsWorkspace
        activeTab={activeTab}
        onTabChange={handleTabChange}
        aiSettingsState={aiSettingsState}
        variant="standalone"
      />
    </SettingsWindowShell>
  );
}
