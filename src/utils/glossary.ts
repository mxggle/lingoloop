import type {
  CreateGlossaryEntryInput,
  GlossaryEntry,
} from "../types/transcriptStudy";

export const normalizeGlossaryText = (text: string): string =>
  text.trim().replace(/\s+/g, " ").toLowerCase();

export const buildGlossaryEntryId = (
  input: Pick<
    CreateGlossaryEntryInput,
    "mediaId" | "segmentId" | "selectionStart" | "selectionEnd" | "text"
  >
): string => {
  const normalized = normalizeGlossaryText(input.text)
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return [
    "glossary",
    input.mediaId,
    input.segmentId,
    input.selectionStart,
    input.selectionEnd,
    normalized || "selection",
  ].join(":");
};

export const createGlossaryEntry = (
  input: CreateGlossaryEntryInput,
  now = Date.now()
): GlossaryEntry => ({
  id: buildGlossaryEntryId(input),
  mediaId: input.mediaId,
  mediaName: input.mediaName,
  mediaType: input.mediaType,
  youtubeId: input.youtubeId,
  segmentId: input.segmentId,
  text: input.text.trim(),
  contextText: input.contextText.trim(),
  selectionStart: input.selectionStart,
  selectionEnd: input.selectionEnd,
  startTime: Math.max(0, input.startTime),
  endTime: Math.max(input.startTime, input.endTime),
  createdAt: now,
  updatedAt: now,
});

export const isDuplicateGlossaryEntry = (
  entries: GlossaryEntry[],
  input: CreateGlossaryEntryInput
): boolean => {
  const normalized = normalizeGlossaryText(input.text);

  return entries.some(
    (entry) =>
      entry.mediaId === input.mediaId &&
      entry.segmentId === input.segmentId &&
      entry.selectionStart === input.selectionStart &&
      entry.selectionEnd === input.selectionEnd &&
      normalizeGlossaryText(entry.text) === normalized
  );
};
