# Sentence Practice Mode Design

## Summary

Add a dedicated full-screen sentence-by-sentence practice mode. The user sees one transcript segment at a time in large text, can loop-play that sentence, manually or automatically advance to the next sentence, and record their own voice for comparison.

## Motivation

The current transcript panel shows all segments in a scrollable list. For intensive shadowing and sentence-level drilling, users need an immersive, distraction-free view where a single sentence occupies the entire screen, with easy playback and recording controls.

## Approach

A new page `/sentence-practice` rendered as a full-screen overlay over the persistent player. This preserves the existing audio element and player state while providing a completely independent UI for sentence-level practice.

## Data Model

### SentencePracticeStore (Zustand, persisted)

```ts
interface SentencePracticeState {
  // Current sentence index within the transcript segments array
  currentSentenceIndex: number;
  // Whether to auto-advance to next sentence after playback finishes
  autoAdvance: boolean;
  // Whether to loop the current sentence
  loopCurrent: boolean;
  // Map mediaId -> array of recorded takes per sentence index
  recordings: Record<string, SentenceRecording[]>;
  // Whether the practice view is currently active
  isActive: boolean;
}

interface SentenceRecording {
  id: string;
  sentenceIndex: number;
  storageId: string;      // IndexedDB mediaStorage ID
  duration: number;
  createdAt: number;
  peaks?: number[];
}
```

Persist only `recordings` and user preferences (`autoAdvance`, `loopCurrent`). `currentSentenceIndex` and `isActive` are ephemeral.

## Component Architecture

### Layer 4 – Pages

- `SentencePracticePage.tsx` — route entry point, uses `AppLayout`, wraps the view.

### Layer 2 – Shared UI

- `SentencePracticeView.tsx` — main layout:
  - Large centered sentence text
  - Sentence counter (e.g. "3 / 42")
  - Playback controls (Loop Play / Play Once / Pause)
  - Navigation (Previous / Next)
  - Auto-advance toggle
  - Recording controls
  - Recording list for current sentence
  - Exit button

- `SentenceRecorder.tsx` — isolated recording widget:
  - Request microphone stream on mount (or on first record click)
  - Start / Stop button
  - Recording duration timer
  - Peak meter (visual feedback)
  - After stop: save to `mediaStorage`, add entry to store

- `SentenceRecordingList.tsx` — list of recorded takes for current sentence:
  - Play / Delete per take
  - Waveform mini-visualization (optional v1)

### Layer 1 – Core

- `stores/sentencePracticeStore.ts` — Zustand store (see Data Model)
- Reuse `utils/audioRecorder.ts` (`UniversalAudioRecorder`)
- Reuse `utils/mediaStorage.ts` (`storeMediaFile`, `retrieveMediaFile`, `deleteMediaFile`)

## Navigation & Entry Points

### Entry points (both implemented)

1. **TranscriptPanel header** — button "逐句练习" / "Sentence Practice" next to export/import controls.
2. **Player controls** — icon button in `CombinedControls` / `MobileControls` (next to shadowing toggle).

### Exit

- Back button or "Exit Practice" button navigates to `/player`.
- On exit: clear sentence-level A-B loop, restore normal playback if it was playing.

## Routing

Add to `AppRouter.tsx`:

```tsx
<Route path="/sentence-practice" element={<SentencePracticePage />} />
```

The `PersistentPlayer` mechanism already keeps the audio element mounted across routes, so playback continues seamlessly.

## Playback Behavior

| Action | Behavior |
|--------|----------|
| Enter mode | Set `currentSentenceIndex` to the segment closest to current playback time. Set `loopStart`/`loopEnd` to that segment's time range if `loopCurrent` is true. |
| Loop Play | Sets A-B loop to sentence boundaries, plays. |
| Play Once | Seeks to sentence start, plays. When playback reaches sentence end, pauses. |
| Auto-advance ON | After sentence finishes (either loop iteration or single play), increment index, update loop points, and play next sentence. |
| Auto-advance OFF | Playback stops at sentence boundary; user manually advances. |
| Manual Next | Increment index, update loop points, start playing. |
| Manual Previous | Decrement index, update loop points, start playing. |

## Recording Behavior

- Recording is **manual** — user presses a record button to start, presses again to stop.
- While recording, the original audio playback should be **muted** (reuse existing mute logic) so the microphone doesn't pick it up.
- On stop: decode the recorded blob to get actual duration, save to IndexedDB via `storeMediaFile`, add a `SentenceRecording` entry tied to `(mediaId, sentenceIndex)`.
- Recordings are persisted per media.

## Keyboard Shortcuts

- `Space` — Play / Pause current sentence
- `ArrowRight` — Next sentence
- `ArrowLeft` — Previous sentence
- `R` — Start / Stop recording

## Error Handling

- No transcript loaded: show empty state with prompt to go back and load/generate transcript.
- Microphone permission denied: show inline error message with link to browser settings.
- Recording fails: toast error, keep UI usable.

## i18n

Add keys to `en.json`, `ja.json`, `zh.json`:

- `sentencePractice.title`
- `sentencePractice.exit`
- `sentencePractice.loopPlay`
- `sentencePractice.playOnce`
- `sentencePractice.autoAdvance`
- `sentencePractice.record`
- `sentencePractice.stopRecording`
- `sentencePractice.noTranscript`
- `sentencePractice.recordingCount` (e.g. "{{count}} recordings")

## Testing / Validation

- Build passes (`npm run build`)
- Lint passes (`npm run lint`)
- Manual check:
  1. Load media with transcript
  2. Enter sentence practice mode from both entry points
  3. Navigate sentences with buttons and keyboard
  4. Toggle loop / auto-advance
  5. Record a take, play it back, delete it
  6. Exit and return to player — playback state is sane

## Open Questions / Future Work

- Should recordings be exportable (e.g. as a ZIP of sentence-by-sentence audio)? — Deferred to v2.
- Should we show the user's recording waveform overlaid with the original sentence waveform? — Deferred to v2.
