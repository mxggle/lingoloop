import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { playbackClock, PlaybackClock } from './PlaybackClock';
import type { TimeRangeSelection } from './types';

interface PlayerWorkspaceContextValue {
  clock: PlaybackClock;
}

interface PlayerSelectionContextValue {
  selection: TimeRangeSelection | null;
  setSelection: (sel: TimeRangeSelection | null) => void;
}

const PlayerWorkspaceContext = createContext<PlayerWorkspaceContextValue>({
  clock: playbackClock,
});

const PlayerSelectionContext = createContext<PlayerSelectionContextValue>({
  selection: null,
  setSelection: () => {},
});

export function usePlayerWorkspace(): PlayerWorkspaceContextValue {
  return useContext(PlayerWorkspaceContext);
}

export function usePlayerSelection(): PlayerSelectionContextValue {
  return useContext(PlayerSelectionContext);
}

/**
 * PlayerWorkspace provides shared context (PlaybackClock, etc.) for all
 * player sub-components: waveform, transcript, media element.
 *
 * Also holds the TimeRangeSelection for bidirectional transcript-timeline sync.
 */
export function PlayerWorkspace({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<TimeRangeSelection | null>(null);
  const stableSetSelection = useCallback(
    (sel: TimeRangeSelection | null) => setSelection(sel),
    []
  );

  return (
    <PlayerWorkspaceContext.Provider value={{ clock: playbackClock }}>
      <PlayerSelectionContext.Provider
        value={{ selection, setSelection: stableSetSelection }}
      >
        {children}
      </PlayerSelectionContext.Provider>
    </PlayerWorkspaceContext.Provider>
  );
}
