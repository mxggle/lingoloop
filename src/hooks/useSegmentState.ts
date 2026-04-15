import { useSyncExternalStore } from "react";
import { usePlayerStore } from "../stores/playerStore";
import type { TranscriptSegment } from "../stores/playerStore";
import {
  getCurrentTime,
  subscribeCurrentTime,
} from "../stores/currentTimeStore";

const BUFFER = 0.15;

interface SegmentState {
  isActive: boolean;
  isPlaying: boolean;
  isCurrentlyLooping: boolean;
}

/**
 * Subscribes to the lightweight currentTimeStore (updated at rAF rate) rather
 * than the full Zustand playerStore.  Only the *derived* booleans enter the
 * React tree, so a segment only re-renders when its active/playing/looping
 * status actually flips — not on every 33 ms time tick.
 *
 * Loop / play state is read synchronously from the Zustand store via getState()
 * (which is free — no subscription overhead).
 */
export function useSegmentState(segment: TranscriptSegment): SegmentState {
  // Read the high-frequency time via useSyncExternalStore.  React will only
  // re-render this component if the *return value* of the selector differs.
  const state = useSyncExternalStore(
    subscribeCurrentTime,
    () => computeSegmentState(segment),
    () => computeSegmentState(segment)
  );

  return state;
}

// Cache to avoid creating new objects when nothing changed.
const stateCache = new WeakMap<TranscriptSegment, SegmentState>();

function computeSegmentState(segment: TranscriptSegment): SegmentState {
  const currentTime = getCurrentTime();
  const { isLooping, loopStart, loopEnd, isPlaying } =
    usePlayerStore.getState();

  const expectedLoopStart = Math.max(0, segment.startTime - BUFFER);
  const isCurrentlyLooping =
    isLooping &&
    loopStart !== null &&
    loopEnd !== null &&
    Math.abs(loopStart - expectedLoopStart) < 0.1 &&
    Math.abs(loopEnd - segment.endTime) < 0.1;

  const isActive = isCurrentlyLooping
    ? currentTime >= expectedLoopStart && currentTime <= segment.endTime
    : !isLooping &&
      currentTime >= segment.startTime &&
      currentTime <= segment.endTime;

  // Return the cached object if the values haven't changed.  This prevents
  // React from re-rendering when useSyncExternalStore compares snapshots via
  // Object.is — since we return the same reference, Object.is returns true.
  const prev = stateCache.get(segment);
  if (
    prev &&
    prev.isActive === isActive &&
    prev.isPlaying === isPlaying &&
    prev.isCurrentlyLooping === isCurrentlyLooping
  ) {
    return prev;
  }

  const next: SegmentState = { isActive, isPlaying, isCurrentlyLooping };
  stateCache.set(segment, next);
  return next;
}
