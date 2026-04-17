import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import {
  SettingsWorkspace,
  type SettingsTab,
} from "../components/settings/SettingsWorkspace";
import { useAiSettingsState } from "../hooks/useAiSettingsState";

const getTabFromSearch = (search: string): SettingsTab => {
  const params = new URLSearchParams(search);
  return params.get("tab") === "ai" ? "ai" : "general";
};

export function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const aiSettingsState = useAiSettingsState();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() =>
    getTabFromSearch(location.search)
  );

  useEffect(() => {
    setActiveTab(getTabFromSearch(location.search));
  }, [location.search]);

  return (
    <AppLayout bottomPaddingClassName="pb-0">
      <SettingsWorkspace
        activeTab={activeTab}
        onTabChange={setActiveTab}
        aiSettingsState={aiSettingsState}
        variant="page"
        onBack={() => navigate(-1)}
      />
    </AppLayout>
  );
}
