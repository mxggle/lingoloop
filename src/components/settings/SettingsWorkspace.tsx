import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Brain, SlidersHorizontal } from "lucide-react";
import { GeneralSettingsPanel } from "./GeneralSettingsPanel";
import { AISettingsPanel } from "./AISettingsPanel";
import {
  SettingsSidebar,
  type SettingsSidebarItem,
  type SettingsTab,
} from "./SettingsSidebar";
import type { UseAiSettingsStateResult } from "../../hooks/useAiSettingsState";

export type SettingsWorkspaceVariant = "page" | "standalone";

export interface SettingsWorkspaceRouteState {
  tab: SettingsTab;
  section?: string;
}

const parseSettingsWorkspaceSearch = (
  search: string
): SettingsWorkspaceRouteState => {
  const params = new URLSearchParams(search);
  const section = params.get("section")?.trim() || undefined;

  return {
    tab: params.get("tab") === "ai" ? "ai" : "general",
    section,
  };
};

const buildSettingsWorkspaceSearch = (
  state: SettingsWorkspaceRouteState
): string => {
  const params = new URLSearchParams();

  params.set("tab", state.tab);

  if (state.section) {
    params.set("section", state.section);
  }

  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : "";
};

const getSettingsWorkspaceNavItems = (
  t: TFunction<"translation", undefined>
): SettingsSidebarItem[] => {
  return [
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
};

interface SettingsWorkspaceProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  aiSettingsState: UseAiSettingsStateResult;
  variant?: SettingsWorkspaceVariant;
}

type SettingsWorkspaceComponent = ((
  props: SettingsWorkspaceProps
) => JSX.Element) & {
  parseSearch: (search: string) => SettingsWorkspaceRouteState;
  buildSearch: (state: SettingsWorkspaceRouteState) => string;
  getNavItems: (t: TFunction<"translation", undefined>) => SettingsSidebarItem[];
};

const SettingsWorkspaceComponent = ({
  activeTab,
  onTabChange,
  aiSettingsState,
  variant = "page",
}: SettingsWorkspaceProps) => {
  const { t } = useTranslation();
  const navItems = getSettingsWorkspaceNavItems(t);

  if (variant === "standalone") {
    return (
      <div className="min-w-0">
        {activeTab === "general" ? (
          <GeneralSettingsPanel />
        ) : (
          <AISettingsPanel state={aiSettingsState} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
            variant="page"
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
};

export const SettingsWorkspace = Object.assign(SettingsWorkspaceComponent, {
  parseSearch: parseSettingsWorkspaceSearch,
  buildSearch: buildSettingsWorkspaceSearch,
  getNavItems: getSettingsWorkspaceNavItems,
}) as SettingsWorkspaceComponent;
