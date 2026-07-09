import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { desktopStorage } from "./desktopStorage";
import { usePlayerStore } from "./playerStore";

// Per-media study progress. Only stores what other stores can't derive:
// cumulative listening time, practiced sentences, and last-studied stamps.
// Counts shown in the UI (bookmarks, glossary, takes) come from their stores.

export interface MediaProgress {
  listenedSeconds: number;
  lastStudiedAt: number;
  practicedSentenceIndices: number[];
}

export interface ProgressState {
  progress: Record<string, MediaProgress>;
}

export interface ProgressActions {
  addListenedSeconds: (mediaId: string, seconds: number) => void;
  markSentencePracticed: (mediaId: string, sentenceIndex: number) => void;
  recordStudyActivity: (mediaId: string) => void;
  getProgress: (mediaId: string) => MediaProgress | null;
}

const emptyProgress = (): MediaProgress => ({
  listenedSeconds: 0,
  lastStudiedAt: Date.now(),
  practicedSentenceIndices: [],
});

export const PROGRESS_STORAGE_KEY = "pawcast-progress";

export const useProgressStore = create<ProgressState & ProgressActions>()(
  persist(
    (set, get) => ({
      progress: {},

      addListenedSeconds: (mediaId, seconds) =>
        set((state) => {
          const current = state.progress[mediaId] ?? emptyProgress();
          return {
            progress: {
              ...state.progress,
              [mediaId]: {
                ...current,
                listenedSeconds: current.listenedSeconds + seconds,
                lastStudiedAt: Date.now(),
              },
            },
          };
        }),

      markSentencePracticed: (mediaId, sentenceIndex) =>
        set((state) => {
          const current = state.progress[mediaId] ?? emptyProgress();
          if (current.practicedSentenceIndices.includes(sentenceIndex)) {
            return {
              progress: {
                ...state.progress,
                [mediaId]: { ...current, lastStudiedAt: Date.now() },
              },
            };
          }
          return {
            progress: {
              ...state.progress,
              [mediaId]: {
                ...current,
                practicedSentenceIndices: [...current.practicedSentenceIndices, sentenceIndex],
                lastStudiedAt: Date.now(),
              },
            },
          };
        }),

      recordStudyActivity: (mediaId) =>
        set((state) => {
          const current = state.progress[mediaId] ?? emptyProgress();
          return {
            progress: {
              ...state.progress,
              [mediaId]: { ...current, lastStudiedAt: Date.now() },
            },
          };
        }),

      getProgress: (mediaId) => get().progress[mediaId] ?? null,
    }),
    {
      name: PROGRESS_STORAGE_KEY,
      storage: createJSONStorage(() => desktopStorage),
      version: 1,
    }
  )
);

// ─── Listening-time tracking ───
// Ticks while playback is active; each tick credits the elapsed wall time
// to the current media. Uses a coarse interval so the persisted store is
// written at most every LISTEN_TICK_MS during playback.
const LISTEN_TICK_MS = 15_000;

let listenTimer: ReturnType<typeof setInterval> | null = null;

const startListenTimer = () => {
  if (listenTimer) return;
  listenTimer = setInterval(() => {
    const { isPlaying, getCurrentMediaId } = usePlayerStore.getState();
    if (!isPlaying) return;
    const mediaId = getCurrentMediaId();
    if (mediaId) {
      useProgressStore.getState().addListenedSeconds(mediaId, LISTEN_TICK_MS / 1000);
    }
  }, LISTEN_TICK_MS);
};

const stopListenTimer = () => {
  if (listenTimer) {
    clearInterval(listenTimer);
    listenTimer = null;
  }
};

usePlayerStore.subscribe((state) => {
  if (state.isPlaying) startListenTimer();
  else stopListenTimer();
});
