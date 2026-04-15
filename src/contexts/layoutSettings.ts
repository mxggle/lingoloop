import { useShallow } from "zustand/react/shallow";
import { useLayoutStore, type LayoutSettings } from "../stores/layoutStore";

export type { LayoutSettings };

export const useLayoutSettings = () => {
  return useLayoutStore(
    useShallow((state) => ({
      layoutSettings: state.layoutSettings,
      setLayoutSettings: state.setLayoutSettings,
    }))
  );
};
