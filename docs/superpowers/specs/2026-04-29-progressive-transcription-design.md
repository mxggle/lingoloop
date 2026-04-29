# Progressive Transcription Design

**Date:** 2026-04-29
**Scope:** Enable progressive (chunked) transcription for long audio files to reduce perceived latency and show results as they arrive.

## Problem

The current implementation extracts the entire audio into a single blob and sends it to the transcription API in one shot. For long audio (10+ minutes), this forces users to wait minutes before seeing any results. For very long audio (30+ minutes), the response may even be truncated due to token limits.

## Solution: Hybrid Progressive Transcription

Use the current single-request transcription path when it is still the best UX, and switch to overlapping chunk-based transcription for long full-file jobs.

### When to Chunk

- **Selected loop/range transcription:** keep the existing single-request path. These jobs are usually short and users expect precise, quick output for the chosen range.
- **Full-file transcription under 8 minutes:** keep the existing single-request path. This avoids unnecessary API overhead and avoids boundary artifacts.
- **Full-file transcription at or above 8 minutes:** use progressive chunked transcription.

The threshold should be duration-based, not file-size-based. File size is still useful for warnings, but duration is what determines transcription latency and chunk count.

### Chunking Strategy

- **Chunk size:** 2 minutes (120 seconds)
- **Overlap:** 5 seconds between adjacent chunks
- **Rationale:** 2 minutes balances API latency vs. chunk count. 5-second overlap ensures words at boundaries are not cut off.

Example for 10-minute audio:
- Chunk 1: 0:00 – 2:05
- Chunk 2: 1:55 – 4:05
- Chunk 3: 3:55 – 6:05
- Chunk 4: 5:55 – 8:05
- Chunk 5: 7:55 – 10:00

### Processing Flow

1. **Determine transcription mode** from the requested range and decoded/known duration.
2. **For short/range jobs:** keep the existing single `transcriptionService.transcribe()` flow.
3. **For long full-file jobs:** extract/decode full audio into a single `AudioBuffer` (decode once, slice many times).
4. **Generate chunk ranges** based on total duration.
5. **For each chunk:**
   a. Slice the `AudioBuffer` into a `Float32Array`.
   b. Encode to WAV blob.
   c. Call `transcriptionService.transcribe()` with the chunk and the active `AbortSignal`.
   d. Offset all segment timestamps by the chunk's start time.
   e. Deduplicate boundary segments before writing to the store (see below).
   f. Append accepted segments to the transcript store as one batch.
   g. Update progress UI.
6. **On completion:** Set `isTranscribing = false`.
7. **On error:** Stop processing, show error toast. Already-received segments remain.
8. **On cancel:** Abort current fetch, stop processing. Already-received segments remain.

### Boundary Deduplication

Because chunks overlap by 5 seconds, the last few segments of chunk N and the first few segments of chunk N+1 may be duplicates.

**Algorithm:**
- After chunk N+1 returns, collect new segments whose absolute `startTime` falls within the leading overlap window `[chunkStart, chunkStart + overlap]`.
- Compare these with already accepted segments whose timestamps fall near the previous chunk tail `[chunkStart, chunkStart + overlap]`.
- A duplicate match requires:
  - normalized text equality (trim, collapse whitespace, lowercase, strip common trailing punctuation), and
  - timestamp proximity within 0.5 seconds.
- If a match is found, keep the one with higher confidence or the earlier chunk's version, and discard the duplicate.

Do not rely on `addTranscriptSegment` for chunk-boundary deduplication. The existing store check only catches exact text with nearly identical starts, which is useful as a last-resort guard but too weak for overlapping transcription output.

### API & State Changes

**`transcriptionService.ts`**
- Add request options to the existing transcription entry point:
  - `transcribe(config, audioBlob, options?: { signal?: AbortSignal })`
- Pass `signal` into provider implementations where supported:
  - Groq `fetch`
  - Gemini `fetch`
  - Local Whisper `fetch`
  - OpenAI SDK request options, if supported by the installed SDK version
- Add `transcribeInChunks(config, audioBlob, options)` method.
- `options` includes:
  - `chunkDurationSeconds: number` (default: 120)
  - `overlapSeconds: number` (default: 5)
  - `minChunkingDurationSeconds: number` (default: 480)
  - `onChunkComplete: (segments: TranscriptionSegment[], chunkIndex: number, totalChunks: number) => void`
  - `onProgress?: (progress: ChunkedTranscriptionProgress) => void`
  - `signal?: AbortSignal` for cancellation
- Internally, decode the audio once, then loop through chunks.
- Keep chunk generation, slicing, timestamp offsetting, and boundary deduplication in service-level helpers or small pure utilities. `TranscriptPanel` should orchestrate UI state, not own chunking rules.

**`playerStore.ts`**
- Add `addTranscriptSegments(segments)` to append a chunk batch in one store update.
- Sort once per chunk and persist once per chunk.
- Preserve existing `addTranscriptSegment` for imports/manual single-segment use.

**`TranscriptPanel.tsx`**
- Choose single vs chunked transcription based on requested range and duration.
- Pass `onChunkComplete` to append segments and update progress.
- Maintain an `AbortController` ref to allow cancellation.
- Update progress text to show "Transcribing chunk X of Y...".
- Keep the existing range offset behavior: if a range is transcribed through the single-request path, segment timestamps are offset by the range start.
- Remove the demo `simulateTranscription()` fallback from real provider failures. Simulation can remain only for the current YouTube unsupported path.

**i18n**
- Add progress/cancel strings to:
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/ja.json`
  - `src/i18n/locales/zh.json`

### Cancellation

An `AbortController` is created when transcription starts. If the user navigates away or clicks cancel:
- `controller.abort()` is called.
- The in-flight `fetch()` is cancelled.
- `transcribeInChunks` treats `AbortError` as cancellation and stops processing further chunks.
- Already-received segments remain in the transcript.
- UI state is reset in `finally`, and the controller ref is cleared.

### Error Handling

- If a single chunk fails, stop processing and surface the error.
- Already-received chunks are preserved.
- The user can retry (which clears the transcript and restarts).
- Do not inject simulated/demo transcript content after a real provider failure.

### Performance Considerations

- Audio decoding happens once upfront, not per chunk.
- Chunks are processed sequentially, not in parallel. This prevents API rate-limit issues and keeps memory usage bounded.
- Each chunk is encoded to WAV on demand and garbage-collected after the API call.
- Transcript store writes happen once per completed chunk, not once per segment.
- Full-file audio decode still has memory cost for very long media. This is acceptable for the first implementation because it matches the current range-slicing approach, but future work can optimize video/audio extraction to stream or slice without decoding the entire file.

### UI/UX

- Progress bar shows overall progress: `chunkIndex / totalChunks`.
- Toast messages update per chunk: "Chunk 2 of 5 complete".
- Segments appear in the transcript panel in real time as each chunk finishes.
- A cancel button is shown during transcription.
- Short/range jobs keep the current simpler progress behavior.

## Files Modified

- `src/services/transcriptionService.ts`
- `src/components/transcript/TranscriptPanel.tsx`
- `src/stores/playerStore.ts`
- `src/i18n/locales/en.json`
- `src/i18n/locales/ja.json`
- `src/i18n/locales/zh.json`

## Risks

- **Boundary word splitting:** Mitigated by 5-second overlap + chunk-aware deduplication.
- **Gemini still truncates within a chunk:** Mitigated by the previously-landed `maxOutputTokens: 65536` and `repairTruncatedJson()`.
- **Video file extraction is slow:** The existing `MediaRecorder` approach for video is already slow; chunking doesn't make it worse, but we may want to optimize video→audio extraction in the future.
- **OpenAI cancellation may depend on SDK support:** If the installed SDK cannot pass `AbortSignal`, cancellation should still stop subsequent chunks and ignore late results, but the current chunk may complete in the background.
- **Partial transcript after failure/cancel:** This is intentional. Retry clears the transcript and starts over.
