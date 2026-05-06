import { createContext, useContext, type ReactNode } from 'react';
import { playbackClock, PlaybackClock } from './PlaybackClock';

interface PlayerWorkspaceContextValue {
  clock: PlaybackClock;
}

const PlayerWorkspaceContext = createContext<PlayerWorkspaceContextValue>({
  clock: playbackClock,
});

export function usePlayerWorkspace(): PlayerWorkspaceContextValue {
  return useContext(PlayerWorkspaceContext);
}

/**
 * PlayerWorkspace provides shared context (PlaybackClock, etc.) for all
 * player sub-components: waveform, transcript, media element.
 *
 * Eventually this will also hold the TimeRangeSelection for bidirectional
 * transcript-timeline sync (Phase 4).
 */
export function PlayerWorkspace({ children }: { children: ReactNode }) {
  return (
    <PlayerWorkspaceContext.Provider value={{ clock: playbackClock }}>
      {children}
    </PlayerWorkspaceContext.Provider>
  );
}
