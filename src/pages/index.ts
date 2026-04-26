import { lazy } from "react";

export { HomePage } from "./HomePage";

export const PlayerPage = lazy(() =>
  import("./PlayerPage").then((module) => ({ default: module.PlayerPage }))
);

export const SettingsPage = lazy(() =>
  import("./SettingsPage").then((module) => ({ default: module.SettingsPage }))
);

export const GlossaryPage = lazy(() =>
  import("./GlossaryPage").then((module) => ({ default: module.GlossaryPage }))
);
