import { useSyncExternalStore } from "react";
import {
  getCurrentTime,
  subscribeCurrentTime,
} from "../stores/currentTimeStore";
import type { TranscriptWord } from "../types/transcriptWord";

/**
 * Throttled subscription interval (~10 fps). The PlaybackClock already
 * supports different subscriber rates; this complements it for word-level
 * highlight without causing a 60fps render storm.
 */
const THROTTLE_MS = 100;

/**
 * Subscribes to the lightweight currentTimeStore at ~10 fps and performs
 * a binary search over the words array to find which word (if any) contains
 * the current playback time.
 *
 * Returns the active word's ID, or `null` if no word is currently active.
 * Uses `useSyncExternalStore` so React only re-renders when the active word
 * actually changes (the subscription callback is throttled, and the snapshot
 * is cheap — just a string or null).
 */
export function useWordState(words: TranscriptWord[]): string | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      let lastEmit = 0;
      const throttledListener = () => {
        const now = performance.now();
        if (now - lastEmit >= THROTTLE_MS) {
          lastEmit = now;
          onStoreChange();
        }
      };
      const unsubscribe = subscribeCurrentTime(throttledListener);
      return unsubscribe;
    },
    () => findActiveWord(words),
    () => findActiveWord(words)
  );
}

/**
 * Binary search through a sorted (by start time) words array to find the
 * word whose time range contains `currentTime`. Returns the word ID or null.
 *
 * Assumption: words are sorted by `start` time (ascending). This is true for
 * words extracted from Whisper API responses.
 */
function findActiveWord(words: TranscriptWord[]): string | null {
  if (words.length === 0) return null;

  const time = getCurrentTime();

  let low = 0;
  let high = words.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const word = words[mid];

    if (time < word.start) {
      high = mid - 1;
    } else if (time >= word.end) {
      low = mid + 1;
    } else {
      return word.id;
    }
  }

  return null;
}
