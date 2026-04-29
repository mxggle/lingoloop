export interface TranscriptionSegment {
  id: number;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface ChunkRange {
  start: number;
  end: number;
}

interface DedupeOptions {
  chunkStart: number;
  overlapSeconds: number;
  timestampToleranceSeconds?: number;
}

const normalizeSegmentText = (text: string) =>
  text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.。！？!?、,，;；:：]+$/u, "")
    .toLowerCase();

export const buildChunkRanges = (
  durationSeconds: number,
  chunkDurationSeconds = 120,
  overlapSeconds = 5
): ChunkRange[] => {
  if (durationSeconds <= 0 || chunkDurationSeconds <= 0) {
    return [];
  }

  const ranges: ChunkRange[] = [];
  let chunkStart = 0;

  while (chunkStart < durationSeconds) {
    const start = Math.max(0, chunkStart - overlapSeconds);
    const end = Math.min(durationSeconds, chunkStart + chunkDurationSeconds + overlapSeconds);
    ranges.push({ start, end });

    if (end >= durationSeconds) {
      break;
    }

    chunkStart += chunkDurationSeconds;
  }

  return ranges;
};

export const dedupeOverlappingSegments = (
  acceptedSegments: TranscriptionSegment[],
  incomingSegments: TranscriptionSegment[],
  {
    chunkStart,
    overlapSeconds,
    timestampToleranceSeconds = 0.5,
  }: DedupeOptions
): TranscriptionSegment[] => {
  const overlapEnd = chunkStart + overlapSeconds;
  const acceptedOverlapSegments = acceptedSegments.filter(
    (segment) => segment.start >= chunkStart && segment.start <= overlapEnd
  );

  return incomingSegments.filter((incoming) => {
    if (incoming.start < chunkStart || incoming.start > overlapEnd) {
      return true;
    }

    const incomingText = normalizeSegmentText(incoming.text);
    return !acceptedOverlapSegments.some(
      (accepted) =>
        normalizeSegmentText(accepted.text) === incomingText &&
        Math.abs(accepted.start - incoming.start) <= timestampToleranceSeconds
    );
  });
};
