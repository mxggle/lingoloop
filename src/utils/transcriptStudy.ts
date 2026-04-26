import type {
  CEFRLevel,
  JLPTLevel,
  MediaTranscriptStudy,
  SegmentTranscriptStudy,
  TranscriptLevelSystem,
  TranscriptSelectionState,
  TranscriptStudyItem,
  TranscriptStudyLevel,
} from "../types/transcriptStudy";

export interface TranscriptStudySourceSegment {
  id: string;
  text: string;
}

const ENGLISH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "but",
  "by",
  "do",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "his",
  "i",
  "if",
  "in",
  "is",
  "it",
  "its",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "she",
  "so",
  "that",
  "the",
  "their",
  "them",
  "there",
  "they",
  "this",
  "to",
  "was",
  "we",
  "were",
  "with",
  "you",
  "your",
]);

const JAPANESE_STOP_WORDS = new Set([
  "これ",
  "それ",
  "あれ",
  "です",
  "ます",
  "した",
  "して",
  "する",
  "いる",
  "ある",
  "こと",
  "もの",
  "よう",
  "さん",
  "ですか",
  "ますか",
]);

const BEGINNER_WORDS = new Set([
  "about",
  "after",
  "again",
  "because",
  "before",
  "different",
  "during",
  "family",
  "friend",
  "important",
  "language",
  "listen",
  "people",
  "really",
  "school",
  "should",
  "something",
  "sometimes",
  "think",
  "understand",
  "want",
  "watch",
  "where",
  "which",
  "would",
]);

const KNOWN_ENGLISH_EXPRESSIONS: Array<{ phrase: string; level: CEFRLevel }> = [
  { phrase: "a lot of", level: "A2" },
  { phrase: "at least", level: "A2" },
  { phrase: "because of", level: "A2" },
  { phrase: "for example", level: "A2" },
  { phrase: "in front of", level: "A2" },
  { phrase: "as soon as", level: "B1" },
  { phrase: "be able to", level: "B1" },
  { phrase: "end up", level: "B1" },
  { phrase: "figure out", level: "B1" },
  { phrase: "kind of", level: "B1" },
  { phrase: "look for", level: "B1" },
  { phrase: "pick up", level: "B1" },
  { phrase: "put off", level: "B1" },
  { phrase: "run out of", level: "B1" },
  { phrase: "take care of", level: "B1" },
  { phrase: "be supposed to", level: "B2" },
  { phrase: "carry out", level: "B2" },
  { phrase: "come up with", level: "B2" },
  { phrase: "in the long run", level: "B2" },
  { phrase: "make up for", level: "B2" },
  { phrase: "on the other hand", level: "B2" },
  { phrase: "with regard to", level: "C1" },
];

const KNOWN_JAPANESE_TERMS: Array<{
  phrase: string;
  level: JLPTLevel;
  type: "word" | "expression";
}> = [
  { phrase: "自己紹介", level: "N5", type: "word" },
  { phrase: "お願いします", level: "N5", type: "expression" },
  { phrase: "ありがとうございます", level: "N5", type: "expression" },
  { phrase: "すみません", level: "N5", type: "word" },
  { phrase: "大丈夫", level: "N4", type: "word" },
  { phrase: "よろしくお願いします", level: "N5", type: "expression" },
  { phrase: "経緯", level: "N1", type: "word" },
  { phrase: "背景", level: "N3", type: "word" },
  { phrase: "予定", level: "N4", type: "word" },
  { phrase: "拝見", level: "N2", type: "word" },
  { phrase: "伺う", level: "N2", type: "word" },
];

const PHRASAL_PARTICLES = new Set([
  "away",
  "back",
  "down",
  "in",
  "off",
  "on",
  "out",
  "over",
  "through",
  "up",
]);

const LEVEL_COLORS: Record<TranscriptStudyLevel, string> = {
  A1: "text-success-600 dark:text-success-400",
  A2: "text-teal-600 dark:text-teal-400",
  B1: "text-sky-600 dark:text-sky-400",
  B2: "text-blue-600 dark:text-blue-400",
  C1: "text-violet-600 dark:text-violet-400",
  C2: "text-error-600 dark:text-error-400",
  N5: "text-success-600 dark:text-success-400",
  N4: "text-teal-600 dark:text-teal-400",
  N3: "text-sky-600 dark:text-sky-400",
  N2: "text-blue-600 dark:text-blue-400",
  N1: "text-violet-600 dark:text-violet-400",
};

const LEVEL_ORDER: Record<TranscriptStudyLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
  N5: 1,
  N4: 2,
  N3: 3,
  N2: 4,
  N1: 5,
};

interface SegmentedToken {
  text: string;
  normalizedText: string;
  start: number;
  end: number;
  isWordLike: boolean;
}

export const inferTranscriptLevelSystem = (
  languageCode: string
): TranscriptLevelSystem => {
  return languageCode.startsWith("ja") ? "jlpt" : "cefr";
};

export const getLevelOptionsForSystem = (
  system: TranscriptLevelSystem
): TranscriptStudyLevel[] => {
  return system === "jlpt"
    ? ["N5", "N4", "N3", "N2", "N1"]
    : ["A1", "A2", "B1", "B2", "C1", "C2"];
};

export const getStudyLevelClassName = (level: TranscriptStudyLevel): string =>
  LEVEL_COLORS[level];

export const isStudyItemVisible = (
  item: TranscriptStudyItem,
  activeLevels: Set<TranscriptStudyLevel> | null
): boolean => {
  if (!activeLevels || activeLevels.size === 0) {
    return true;
  }

  return activeLevels.has(item.level);
};

export const buildTranscriptStudy = (
  segments: TranscriptStudySourceSegment[],
  levelSystem: TranscriptLevelSystem
): MediaTranscriptStudy => {
  return segments.reduce<MediaTranscriptStudy>((acc, segment) => {
    acc[segment.id] = buildSegmentTranscriptStudy(segment.text, levelSystem);
    return acc;
  }, {});
};

export const buildSegmentTranscriptStudy = (
  text: string,
  levelSystem: TranscriptLevelSystem
): SegmentTranscriptStudy => {
  const items =
    levelSystem === "jlpt"
      ? buildJapaneseStudyItems(text)
      : buildEnglishStudyItems(text);

  return {
    items: dedupeAndSortItems(items),
    levelSystem,
    updatedAt: Date.now(),
  };
};

export const getRenderableStudyItems = (
  items: TranscriptStudyItem[],
  activeLevels: Set<TranscriptStudyLevel> | null = null
): TranscriptStudyItem[] => {
  const visible = items.filter((item) => isStudyItemVisible(item, activeLevels));
  const sorted = [...visible].sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }
    if (left.type !== right.type) {
      return left.type === "expression" ? -1 : 1;
    }
    return right.end - left.end;
  });

  const result: TranscriptStudyItem[] = [];
  let lastEnd = -1;

  sorted.forEach((item) => {
    if (item.start < lastEnd) {
      return;
    }

    result.push(item);
    lastEnd = item.end;
  });

  return result;
};

export const findMatchingStudyItem = (
  items: TranscriptStudyItem[],
  start: number,
  end: number
): TranscriptStudyItem | null => {
  return items.find((item) => item.start === start && item.end === end) ?? null;
};

export const buildTranscriptSelectionKey = (
  selection: Pick<TranscriptSelectionState, "segmentId" | "text" | "start" | "end">
): string => {
  return `${selection.segmentId}:${selection.start}:${selection.end}:${selection.text.trim().toLowerCase()}`;
};

export const getLevelBadgeSortValue = (level: TranscriptStudyLevel): number =>
  LEVEL_ORDER[level];

function buildEnglishStudyItems(text: string): TranscriptStudyItem[] {
  const tokens = segmentText(text);
  const items: TranscriptStudyItem[] = [];
  const coveredWordIndexes = new Set<number>();
  const wordTokens = tokens.filter((token) => token.isWordLike);

  for (let size = 4; size >= 2; size -= 1) {
    for (let index = 0; index <= wordTokens.length - size; index += 1) {
      const slice = wordTokens.slice(index, index + size);
      const phrase = slice.map((token) => token.normalizedText).join(" ").trim();
      const knownExpression = KNOWN_ENGLISH_EXPRESSIONS.find(
        (expression) => expression.phrase === phrase
      );

      if (!knownExpression || slice.some((_, offset) => coveredWordIndexes.has(index + offset))) {
        continue;
      }

      items.push({
        text: text.slice(slice[0].start, slice[slice.length - 1].end),
        normalizedText: phrase,
        start: slice[0].start,
        end: slice[slice.length - 1].end,
        level: knownExpression.level,
        type: "expression",
      });

      slice.forEach((_, offset) => coveredWordIndexes.add(index + offset));
    }
  }

  for (let index = 0; index < wordTokens.length - 1; index += 1) {
    if (coveredWordIndexes.has(index) || coveredWordIndexes.has(index + 1)) {
      continue;
    }

    const first = wordTokens[index];
    const second = wordTokens[index + 1];

    if (first.normalizedText.length < 3 || !PHRASAL_PARTICLES.has(second.normalizedText)) {
      continue;
    }

    items.push({
      text: text.slice(first.start, second.end),
      normalizedText: `${first.normalizedText} ${second.normalizedText}`,
      start: first.start,
      end: second.end,
      level: first.normalizedText.length > 5 ? "B2" : "B1",
      type: "expression",
    });

    coveredWordIndexes.add(index);
    coveredWordIndexes.add(index + 1);
  }

  wordTokens.forEach((token, index) => {
    if (coveredWordIndexes.has(index) || shouldSkipEnglishWord(token.normalizedText)) {
      return;
    }

    items.push({
      text: text.slice(token.start, token.end),
      normalizedText: token.normalizedText,
      start: token.start,
      end: token.end,
      level: inferEnglishWordLevel(token.normalizedText),
      type: "word",
    });
  });

  return items;
}

function buildJapaneseStudyItems(text: string): TranscriptStudyItem[] {
  const tokens = segmentText(text);
  const items: TranscriptStudyItem[] = [];
  const wordTokens = tokens.filter((token) => token.isWordLike);
  const coveredRanges: Array<{ start: number; end: number }> = [];

  KNOWN_JAPANESE_TERMS.forEach((term) => {
    let searchFrom = 0;

    while (searchFrom < text.length) {
      const foundAt = text.indexOf(term.phrase, searchFrom);
      if (foundAt === -1) {
        break;
      }

      const end = foundAt + term.phrase.length;
      if (!coveredRanges.some((range) => overlaps(range.start, range.end, foundAt, end))) {
        items.push({
          text: term.phrase,
          normalizedText: term.phrase,
          start: foundAt,
          end,
          level: term.level,
          type: term.type,
        });
        coveredRanges.push({ start: foundAt, end });
      }

      searchFrom = end;
    }
  });

  wordTokens.forEach((token) => {
    if (
      shouldSkipJapaneseWord(token.normalizedText) ||
      coveredRanges.some((range) => overlaps(range.start, range.end, token.start, token.end))
    ) {
      return;
    }

    items.push({
      text: text.slice(token.start, token.end),
      normalizedText: token.normalizedText,
      start: token.start,
      end: token.end,
      level: inferJapaneseWordLevel(token.normalizedText),
      type: "word",
    });
  });

  return items;
}

function shouldSkipEnglishWord(token: string): boolean {
  return token.length < 2 || ENGLISH_STOP_WORDS.has(token);
}

function shouldSkipJapaneseWord(token: string): boolean {
  return token.length < 2 || JAPANESE_STOP_WORDS.has(token);
}

function inferEnglishWordLevel(token: string): CEFRLevel {
  if (BEGINNER_WORDS.has(token) || token.length <= 4) {
    return "A1";
  }
  if (token.length <= 5) {
    return "A2";
  }
  if (token.length <= 7) {
    return "B1";
  }
  if (token.length <= 9) {
    return "B2";
  }
  if (token.length <= 11) {
    return "C1";
  }
  return "C2";
}

function inferJapaneseWordLevel(token: string): JLPTLevel {
  const kanjiCount = Array.from(token).filter((char) => /\p{Script=Han}/u.test(char)).length;
  const hasHonorific = /^(拝|伺|恐縮|承知)/u.test(token);

  if (hasHonorific || kanjiCount >= 3 || token.length >= 6) {
    return "N1";
  }
  if (kanjiCount >= 2 || token.length >= 5) {
    return "N2";
  }
  if (kanjiCount === 1 || token.length >= 4) {
    return "N3";
  }
  if (/[ァ-ヶー]/u.test(token)) {
    return "N4";
  }
  return "N5";
}

function segmentText(text: string): SegmentedToken[] {
  const SegmenterCtor = (
    Intl as typeof Intl & {
      Segmenter?: new (
        locales?: Intl.LocalesArgument,
        options?: { granularity?: "word" }
      ) => {
        segment(input: string): Iterable<{
          segment: string;
          index: number;
          isWordLike?: boolean;
        }>;
      };
    }
  ).Segmenter;

  if (typeof Intl !== "undefined" && SegmenterCtor) {
    const segmenter = new SegmenterCtor(undefined, { granularity: "word" });
    return Array.from(segmenter.segment(text)).map((segment) => {
      const normalizedText = normalizeToken(segment.segment);
      return {
        text: segment.segment,
        normalizedText,
        start: segment.index,
        end: segment.index + segment.segment.length,
        isWordLike: Boolean(segment.isWordLike) && normalizedText.length > 0,
      };
    });
  }

  return Array.from(text.matchAll(/\p{L}[\p{L}\p{N}'’-]*/gu)).map((match) => {
    const value = match[0] ?? "";
    const start = match.index ?? 0;
    return {
      text: value,
      normalizedText: normalizeToken(value),
      start,
      end: start + value.length,
      isWordLike: true,
    };
  });
}

function normalizeToken(token: string): string {
  return token
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function dedupeAndSortItems(items: TranscriptStudyItem[]): TranscriptStudyItem[] {
  const seen = new Set<string>();

  return items
    .filter((item) => {
      const key = `${item.type}:${item.start}:${item.end}:${item.normalizedText}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((left, right) => {
      if (left.start !== right.start) {
        return left.start - right.start;
      }
      if (left.type !== right.type) {
        return left.type === "expression" ? -1 : 1;
      }
      return right.end - left.end;
    });
}

function overlaps(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number
): boolean {
  return leftStart < rightEnd && rightStart < leftEnd;
}
