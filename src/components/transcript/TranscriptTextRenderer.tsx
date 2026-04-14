import { useMemo, useRef } from "react";
import type {
  SegmentTranscriptStudy,
  TranscriptStudyLevel,
  TranscriptSelectionState,
} from "../../types/transcriptStudy";
import {
  findMatchingStudyItem,
  getRenderableStudyItems,
  getStudyLevelClassName,
} from "../../utils/transcriptStudy";
import { cn } from "@/utils/cn";

interface TranscriptTextRendererProps {
  segmentId: string;
  text: string;
  study: SegmentTranscriptStudy | undefined;
  highlightsEnabled: boolean;
  activeLevels: Set<TranscriptStudyLevel> | null;
  selectionEnabled: boolean;
  onSelectionChange: (selection: TranscriptSelectionState | null) => void;
}

const MAX_SELECTION_LENGTH = 120;

export const TranscriptTextRenderer = ({
  segmentId,
  text,
  study,
  highlightsEnabled,
  activeLevels,
  selectionEnabled,
  onSelectionChange,
}: TranscriptTextRendererProps) => {
  const containerRef = useRef<HTMLParagraphElement | null>(null);
  const items = useMemo(
    () =>
      highlightsEnabled
        ? getRenderableStudyItems(study?.items || [], activeLevels)
        : [],
    [activeLevels, highlightsEnabled, study?.items]
  );

  const handleSelectionCapture = () => {
    if (!selectionEnabled || !containerRef.current || typeof window === "undefined") {
      onSelectionChange(null);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      onSelectionChange(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const root = containerRef.current;

    if (!root.contains(range.commonAncestorContainer)) {
      return;
    }

    const offsets = getRangeOffsets(root, range);
    if (!offsets) {
      onSelectionChange(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const selectedText = text.slice(offsets.start, offsets.end);
    const normalizedText = selectedText.trim();

    if (
      normalizedText.length === 0 ||
      normalizedText.length > MAX_SELECTION_LENGTH ||
      rect.width === 0
    ) {
      onSelectionChange(null);
      return;
    }

    const leadingTrim = selectedText.length - selectedText.trimStart().length;
    const trailingTrim = selectedText.length - selectedText.trimEnd().length;
    const start = offsets.start + leadingTrim;
    const end = offsets.end - trailingTrim;

    onSelectionChange({
      segmentId,
      text: text.slice(start, end),
      start,
      end,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      matchedItem: findMatchingStudyItem(items, start, end),
    });
  };

  const parts: JSX.Element[] = [];
  let cursor = 0;

  items.forEach((item) => {
    if (item.start > cursor) {
      parts.push(
        <span key={`plain-${cursor}`}>{text.slice(cursor, item.start)}</span>
      );
    }

    parts.push(
      <span
        key={`${item.type}-${item.start}-${item.end}`}
        className={cn(
          getStudyLevelClassName(item.level),
          item.type === "expression" ? "font-semibold" : "font-medium"
        )}
      >
        {text.slice(item.start, item.end)}
      </span>
    );

    cursor = item.end;
  });

  if (cursor < text.length) {
    parts.push(<span key={`plain-${cursor}`}>{text.slice(cursor)}</span>);
  }

  return (
    <p
      ref={containerRef}
      className="text-gray-800 dark:text-gray-200 leading-7 select-text whitespace-pre-wrap"
      onMouseUp={handleSelectionCapture}
      onKeyUp={handleSelectionCapture}
    >
      {parts}
    </p>
  );
};

function getRangeOffsets(root: HTMLElement, range: Range) {
  const startRange = range.cloneRange();
  startRange.selectNodeContents(root);
  startRange.setEnd(range.startContainer, range.startOffset);

  const endRange = range.cloneRange();
  endRange.selectNodeContents(root);
  endRange.setEnd(range.endContainer, range.endOffset);

  const start = startRange.toString().length;
  const end = endRange.toString().length;

  if (end <= start) {
    return null;
  }

  return { start, end };
}
