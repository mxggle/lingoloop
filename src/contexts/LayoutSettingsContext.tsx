import { useState, type ReactNode } from "react";
import {
  LayoutSettingsContext,
  defaultLayoutSettings,
  type LayoutSettings,
} from "./layoutSettings";

export const LayoutSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(
    defaultLayoutSettings
  );
  return (
    <LayoutSettingsContext.Provider value={{ layoutSettings, setLayoutSettings }}>
      {children}
    </LayoutSettingsContext.Provider>
  );
};
