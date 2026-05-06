import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { electronStorage } from "./electronStorage";

export interface LayoutSettings {
  showPlayer: boolean;
  showWaveform: boolean;
  showTranscript: boolean;
  showControls: boolean;
  // panel visibility states
  transcriptPanelVisible: boolean;
  transcriptPanelCollapsed: boolean;
  videoPanelVisible: boolean;
  videoPanelCollapsed: boolean;
  timelinePanelVisible: boolean;
  timelinePanelCollapsed: boolean;
}

export interface LayoutState {
  layoutSettings: LayoutSettings;
  setLayoutSettings: (settings: LayoutSettings | ((prev: LayoutSettings) => LayoutSettings)) => void;
  updateLayoutSettings: (changes: Partial<LayoutSettings>) => void;
}

const defaultLayoutSettings: LayoutSettings = {
  showPlayer: true,
  showWaveform: true,
  showTranscript: true,
  showControls: true,
  transcriptPanelVisible: true,
  transcriptPanelCollapsed: false,
  videoPanelVisible: true,
  videoPanelCollapsed: false,
  timelinePanelVisible: true,
  timelinePanelCollapsed: false,
};

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      layoutSettings: defaultLayoutSettings,
      setLayoutSettings: (settings) =>
        set((state) => ({
          layoutSettings: typeof settings === "function" ? settings(state.layoutSettings) : settings,
        })),
      updateLayoutSettings: (changes) =>
        set((state) => ({
          layoutSettings: { ...state.layoutSettings, ...changes },
        })),
    }),
    {
      name: "layout-storage",
      storage: createJSONStorage(() => electronStorage),
    }
  )
);
