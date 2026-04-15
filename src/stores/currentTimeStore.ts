/**
 * Lightweight external store for high-frequency currentTime updates.
 *
 * During playback the MediaPlayer pushes ~30 updates/sec via requestAnimationFrame.
 * Routing those through the main Zustand playerStore triggers its full subscriber
 * list (persist middleware, every usePlayerStore() call-site, etc.), which is the
 * primary source of transcript-highlight lag.
 *
 * This module exposes a simple pub/sub that React components can consume via
 * `useSyncExternalStore`.  Only the *derived* boolean ("am I active?") causes a
 * React re-render — the raw numeric time value never enters the React reconciler.
 *
 * The main Zustand store is still updated, but at a throttled ~4 Hz so that
 * non-critical consumers (seek slider, playback-time display, persistence) stay
 * in sync without causing a render storm.
 */

type Listener = () => void;

let _currentTime = 0;
const _listeners = new Set<Listener>();

/** Read the latest time (non-reactive — for use in callbacks / event handlers). */
export function getCurrentTime(): number {
  return _currentTime;
}

/** Called by the MediaPlayer rAF loop at full frame rate. */
export function setCurrentTime(time: number): void {
  if (Object.is(_currentTime, time)) {
    return;
  }

  _currentTime = time;
  // Notify all subscribed components
  for (const listener of _listeners) {
    listener();
  }
}

/** Subscribe / unsubscribe (matches the useSyncExternalStore contract). */
export function subscribeCurrentTime(listener: Listener): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

/** Snapshot getter for useSyncExternalStore. */
export function getSnapshot(): number {
  return _currentTime;
}
