# Progressive Transcription Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make long full-file transcription progressive while keeping short and range transcription simple and precise.

**Architecture:** Keep platform-specific concerns out of the feature. `transcriptionService` owns provider calls, abort propagation, chunk range generation, chunk slicing, timestamp offsetting, and boundary deduplication. `TranscriptPanel` decides when to use chunking and owns UI state only; `playerStore` gets a batch append action so each completed chunk causes one store write.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, node:test, browser Web Audio APIs, existing `encodeWAV` utility.

---

## File Map

- Modify `src/services/transcriptionService.ts`: add request options, chunked transcription API, and provider abort propagation.
- Create `src/utils/transcriptionChunks.ts`: pure chunk range and overlap deduplication helpers exported for tests and service use.
- Modify `src/stores/playerStore.ts`: add `addTranscriptSegments` action that sorts and persists once per batch.
- Modify `src/components/transcript/TranscriptPanel.tsx`: choose single vs chunked mode, wire cancellation, use batch appends, remove simulation fallback for real provider errors, and display chunk progress.
- Modify `src/i18n/locales/en.json`: add progressive transcription UI strings.
- Modify `src/i18n/locales/ja.json`: add matching Japanese strings.
- Modify `src/i18n/locales/zh.json`: add matching Chinese strings.
- Create `tests/transcriptionChunks.test.ts`: test chunk range generation and boundary deduplication.

## Task 1: Pure Chunking And Dedup Helpers

**Files:**
- Create: `src/utils/transcriptionChunks.ts`
- Create: `tests/transcriptionChunks.test.ts`

- [ ] **Step 1: Add failing tests for chunk ranges**

Add `tests/transcriptionChunks.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildChunkRanges,
  dedupeOverlappingSegments,
  type TranscriptionSegment,
} from "../src/utils/transcriptionChunks.ts";

test("buildChunkRanges creates overlapping two-minute chunks", () => {
  assert.deepEqual(buildChunkRanges(600, 120, 5), [
    { start: 0, end: 125 },
    { start: 115, end: 245 },
    { start: 235, end: 365 },
    { start: 355, end: 485 },
    { start: 475, end: 600 },
  ]);
});
```

- [ ] **Step 2: Run the failing test**

Run: `node --experimental-strip-types --test tests/transcriptionChunks.test.ts`

Expected: FAIL because `buildChunkRanges` is not exported.

- [ ] **Step 3: Implement chunk range helper**

In `src/utils/transcriptionChunks.ts`, export:

```ts
export interface ChunkRange {
  start: number;
  end: number;
}

export const buildChunkRanges = (
  durationSeconds: number,
  chunkDurationSeconds = 120,
  overlapSeconds = 5
): ChunkRange[] => {
  if (durationSeconds <= 0) return [];
  const ranges: ChunkRange[] = [];
  let start = 0;
  while (start < durationSeconds) {
    const isFirst = start === 0;
    const end = Math.min(durationSeconds, start + chunkDurationSeconds + (isFirst ? overlapSeconds : overlapSeconds * 2));
    ranges.push({ start, end });
    if (end >= durationSeconds) break;
    start += chunkDurationSeconds - overlapSeconds;
  }
  return ranges;
};
```

Adjust the exact implementation if needed so it matches the desired example ranges without creating zero-length or duplicate final chunks.

- [ ] **Step 4: Add failing tests for boundary dedup**

Extend `tests/transcriptionChunks.test.ts`:

```ts
const segment = (
  id: number,
  text: string,
  start: number,
  end: number,
  confidence = 0.9
): TranscriptionSegment => ({ id, text, start, end, confidence });

test("dedupeOverlappingSegments removes normalized duplicate text in leading overlap", () => {
  const accepted = [segment(0, "Hello world.", 118.1, 120.2, 0.8)];
  const incoming = [
    segment(0, " hello   world ", 118.3, 120.1, 0.95),
    segment(1, "Next phrase", 121, 124),
  ];

  assert.deepEqual(
    dedupeOverlappingSegments(accepted, incoming, { chunkStart: 115, overlapSeconds: 5 }).map((s) => s.text),
    ["Next phrase"]
  );
});
```

- [ ] **Step 5: Implement dedup helper**

Export `dedupeOverlappingSegments(accepted, incoming, options)` from `src/utils/transcriptionChunks.ts`. Normalize text with trim, whitespace collapse, lowercase, and common trailing punctuation removal. Only compare incoming segments in `[chunkStart, chunkStart + overlapSeconds]` against accepted segments in the same absolute window, with `<= 0.5` second start proximity.

- [ ] **Step 6: Verify helper tests**

Run: `node --experimental-strip-types --test tests/transcriptionChunks.test.ts`

Expected: PASS.

## Task 2: Abort-Aware Provider Calls And Chunked Service API

**Files:**
- Modify: `src/services/transcriptionService.ts`
- Test: `tests/transcriptionChunks.test.ts`

- [ ] **Step 1: Add service request option types**

Add:

```ts
export interface TranscriptionRequestOptions {
  signal?: AbortSignal;
}

export interface ChunkedTranscriptionProgress {
  chunkIndex: number;
  totalChunks: number;
  progress: number;
}
```

- [ ] **Step 2: Thread options through `transcribe`**

Change `transcribe(config, audioBlob)` to `transcribe(config, audioBlob, options = {})`, then pass `options` to `transcribeWithOpenAI`, `transcribeWithGroq`, `transcribeWithGemini`, and `transcribeWithLocalWhisper`.

- [ ] **Step 3: Pass abort signals to fetch providers**

Add `signal: options.signal` to Groq, Gemini, and local Whisper fetch options.

- [ ] **Step 4: Pass abort signal to OpenAI if supported**

For OpenAI SDK calls, pass request options as the second argument:

```ts
await openai.audio.transcriptions.create({ ...request }, options.signal ? { signal: options.signal } : undefined);
```

If TypeScript rejects this for the installed SDK, use the SDK-supported request options type rather than suppressing types.

- [ ] **Step 5: Add `transcribeInChunks`**

Implement:

```ts
public async transcribeInChunks(
  config: TranscriptionConfig,
  audioBlob: Blob,
  options: ChunkedTranscriptionOptions
): Promise<TranscriptionResult>
```

The method should decode once, generate chunk ranges, encode each chunk to WAV, call `this.transcribe(config, chunkBlob, { signal })`, offset each segment by `chunk.start`, dedupe against accepted segments, call `onChunkComplete(acceptedChunkSegments, index, total)`, and return a combined `TranscriptionResult`.

- [ ] **Step 6: Verify build**

Run: `npm run build`

Expected: PASS.

## Task 3: Batch Transcript Store Append

**Files:**
- Modify: `src/stores/playerStore.ts`

- [ ] **Step 1: Extend `PlayerActions`**

Add:

```ts
addTranscriptSegments: (segments: Array<Omit<TranscriptSegment, "id">>) => void;
```

- [ ] **Step 2: Implement batch append**

Reuse the existing duplicate rule from `addTranscriptSegment`, but process the entire batch in one `set` call. Generate IDs with `crypto.randomUUID()`, sort once, build study metadata for each accepted new segment, and call `setStoredTranscript(mediaId, updatedSegments, updatedStudyBySegment)` once after the state update.

- [ ] **Step 3: Refactor single append to delegate**

Make `addTranscriptSegment(segment)` call `get().addTranscriptSegments([segment])` to keep behavior consistent.

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: PASS.

## Task 4: Wire TranscriptPanel Progressive Flow

**Files:**
- Modify: `src/components/transcript/TranscriptPanel.tsx`

- [ ] **Step 1: Pull `addTranscriptSegments` from the store**

Update the Zustand selector and local destructuring near the existing transcript actions.

- [ ] **Step 2: Add local progress/cancel state**

Add:

```ts
const abortControllerRef = useRef<AbortController | null>(null);
const [transcriptionStatus, setTranscriptionStatus] = useState<string | null>(null);
```

Clear/abort on unmount.

- [ ] **Step 3: Choose transcription mode**

After `extractAudioFromMedia(range)`, use audio duration metadata from the blob decode or service helper result. If `range` exists, always call `transcribe`. If no range and duration is at least 480 seconds, call `transcribeInChunks`.

- [ ] **Step 4: Append completed chunk segments**

In `onChunkComplete`, call `addTranscriptSegments` with mapped store segments:

```ts
segments.map((segment) => ({
  text: segment.text.trim(),
  startTime: Math.max(0, segment.start),
  endTime: Math.max(segment.start, segment.end),
  confidence: segment.confidence,
  isFinal: true,
}))
```

- [ ] **Step 5: Add cancel button behavior**

During processing, render a small cancel button that calls `abortControllerRef.current?.abort()`. On abort, stop without showing a provider failure toast.

- [ ] **Step 6: Remove real-error simulation fallback**

In the real provider error catch path, delete `await simulateTranscription()`. Keep simulation only inside the YouTube unsupported branch.

- [ ] **Step 7: Verify UI build**

Run: `npm run build`

Expected: PASS.

## Task 5: i18n Strings

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/ja.json`
- Modify: `src/i18n/locales/zh.json`

- [ ] **Step 1: Add English strings**

Add keys under `transcript`:

```json
"processingChunk": "Transcribing chunk {{current}} of {{total}}...",
"cancelTranscription": "Cancel transcription",
"transcriptionCancelled": "Transcription cancelled"
```

- [ ] **Step 2: Add Japanese and Chinese equivalents**

Use concise UI text matching the existing locale style.

- [ ] **Step 3: Verify JSON and build**

Run: `npm run build`

Expected: PASS.

## Task 6: Final Verification

**Files:**
- All modified files above

- [ ] **Step 1: Run targeted tests**

Run: `node --experimental-strip-types --test tests/transcriptionChunks.test.ts`

Expected: PASS.

- [ ] **Step 2: Run existing tests that do not need a browser**

Run: `node --experimental-strip-types --test tests/sentenceSeek.test.ts`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Manual smoke test**

Start the app with `npm run dev`, load a short audio file, confirm it uses normal transcription UI, then load a long audio file and confirm chunk progress appears and completed chunks append before the whole file finishes.

- [ ] **Step 5: Review dirty worktree**

Run: `git diff -- src/services/transcriptionService.ts src/stores/playerStore.ts src/components/transcript/TranscriptPanel.tsx src/i18n/locales/en.json src/i18n/locales/ja.json src/i18n/locales/zh.json tests/transcriptionChunks.test.ts`

Expected: only progressive transcription changes are present.
