/**
 * AppLayout – public facade used by all pages.
 *
 * Selects the platform layout while keeping pages platform-neutral.
 */
import { Dispatch, SetStateAction } from "react";
import { DesktopAppLayout } from "../desktop/DesktopAppLayout";
import { WebAppLayout } from "../web/WebAppLayout";
import { isDesktop } from "../../platform/runtime";

import { LayoutSettings } from "../../stores/layoutStore";

interface AppLayoutProps {
  children: React.ReactNode;
  layoutSettings?: LayoutSettings;
  setLayoutSettings?: Dispatch<SetStateAction<LayoutSettings>>;
  bottomPaddingClassName?: string;
}

export const AppLayout = (props: AppLayoutProps) => {
  return isDesktop() ? <DesktopAppLayout {...props} /> : <WebAppLayout {...props} />;
};
