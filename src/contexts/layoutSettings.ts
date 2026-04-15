import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";

export interface LayoutSettings {
  showPlayer: boolean;
  showWaveform: boolean;
  showTranscript: boolean;
  showControls: boolean;
}

export interface LayoutSettingsContextValue {
  layoutSettings: LayoutSettings;
  setLayoutSettings: Dispatch<SetStateAction<LayoutSettings>>;
}

export const defaultLayoutSettings: LayoutSettings = {
  showPlayer: true,
  showWaveform: true,
  showTranscript: true,
  showControls: true,
};

export const LayoutSettingsContext = createContext<LayoutSettingsContextValue>({
  layoutSettings: defaultLayoutSettings,
  setLayoutSettings: () => {},
});

export const useLayoutSettings = () => useContext(LayoutSettingsContext);
