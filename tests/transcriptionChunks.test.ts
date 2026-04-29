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
    dedupeOverlappingSegments(accepted, incoming, {
      chunkStart: 115,
      overlapSeconds: 5,
    }).map((s) => s.text),
    ["Next phrase"]
  );
});
