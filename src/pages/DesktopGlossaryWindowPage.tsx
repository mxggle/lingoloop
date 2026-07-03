import { useTranslation } from "react-i18next";
import { GlossaryWindowShell } from "../components/desktop/GlossaryWindowShell";
import { GlossaryContent } from "../components/glossary/GlossaryContent";

export function DesktopGlossaryWindowPage() {
  const { t } = useTranslation();

  return (
    <GlossaryWindowShell title={t("glossary.title")}>
      <GlossaryContent />
    </GlossaryWindowShell>
  );
}
