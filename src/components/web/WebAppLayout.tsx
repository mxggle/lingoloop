import type { Dispatch, SetStateAction } from "react";

import type { LayoutSettings } from "../../stores/layoutStore";
import { AppLayoutBase } from "../layout/AppLayoutBase";

interface WebAppLayoutProps {
  children: React.ReactNode;
  layoutSettings?: LayoutSettings;
  setLayoutSettings?: Dispatch<SetStateAction<LayoutSettings>>;
  bottomPaddingClassName?: string;
}

export const WebAppLayout = (props: WebAppLayoutProps) => (
  <AppLayoutBase containerClassName="max-w-5xl mx-auto" {...props} />
);
