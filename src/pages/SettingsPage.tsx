import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Shield } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import {
  SettingsWorkspace,
} from "../components/settings/SettingsWorkspace";
import { type SettingsTab } from "../components/settings/SettingsSidebar";
import { useAiSettingsState } from "../hooks/useAiSettingsState";

const getTabFromSearch = (search: string): SettingsTab => {
  const params = new URLSearchParams(search);
  return params.get("tab") === "ai" ? "ai" : "general";
};

export function SettingsPage() {
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

  return (
    <AppLayout bottomPaddingClassName="pb-0">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8 lg:px-12">
        <header className="space-y-6 border-b border-black/5 pb-8 dark:border-white/5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl bg-black/5 p-2 text-gray-600 transition-all hover:bg-black/10 active:scale-95 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
              title={t("common.back")}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="space-y-1.5">
              <h2 className="text-3xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                {t("settingsPage.title")}
              </h2>
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 opacity-60 dark:text-gray-400">
                {subtitle}
              </p>
            </div>
          </div>
        </header>

        <SettingsWorkspace
          activeTab={activeTab}
          onTabChange={setActiveTab}
          aiSettingsState={aiSettingsState}
          variant="page"
        />

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
    </AppLayout>
  );
}
