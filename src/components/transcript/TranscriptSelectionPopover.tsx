import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { AI_PROMPTS } from "../../config/prompts";
import { BookmarkPlus, Loader, Sparkles, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { MarkdownRenderer } from "../ui/MarkdownRenderer";
import { aiService } from "../../services/aiService";
import { usePlayerStore, type TranscriptSegment } from "../../stores/playerStore";
import {
  AIProvider,
  AIServiceConfig,
  DEFAULT_MODELS,
  normalizeModelId,
} from "../../types/aiService";
import type { TranscriptSelectionState } from "../../types/transcriptStudy";
import { buildTranscriptSelectionKey } from "../../utils/transcriptStudy";
import {
  getSelectionExplanationState,
  selectionExplanationCache,
  setSelectionExplanationState,
  type SelectionExplanationResult,
} from "./selectionExplanationState";

interface TranscriptSelectionPopoverProps {
  selection: TranscriptSelectionState;
  segment: TranscriptSegment;
  segmentText: string;
  onClose: () => void;
}

export const TranscriptSelectionPopover = ({
  selection,
  segment,
  segmentText,
  onClose,
}: TranscriptSelectionPopoverProps) => {
  const { t } = useTranslation();
  const [result, setResult] = useState<SelectionExplanationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(() => ({
    top: selection.rect.top + selection.rect.height + 10,
    left: selection.rect.left,
  }));
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const currentFile = usePlayerStore((state) => state.currentFile);
  const currentYouTube = usePlayerStore((state) => state.currentYouTube);
  const addGlossaryEntry = usePlayerStore((state) => state.addGlossaryEntry);
  const getCurrentMediaId = usePlayerStore((state) => state.getCurrentMediaId);

  const key = useMemo(() => buildTranscriptSelectionKey(selection), [selection]);
  const selectedProvider = useMemo(
    () =>
      (localStorage.getItem("preferred_ai_provider") as AIProvider) || "openai",
    []
  );
  const targetLanguage = useMemo(
    () => localStorage.getItem("target_language") || "English",
    []
  );
  const selectedModel = useMemo(
    () =>
      normalizeModelId(
        selectedProvider,
        localStorage.getItem(`${selectedProvider}_model`) ||
          DEFAULT_MODELS[selectedProvider]
      ),
    [selectedProvider]
  );

  useEffect(() => {
    const cached = selectionExplanationCache.get(key);
    const state = getSelectionExplanationState(key);

    if (cached) {
      setResult(cached);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (state.status === "error") {
      setError(state.error || t("explanation.unknownError"));
      setResult(null);
      setIsLoading(false);
      return;
    }

    setResult(null);
    setError(null);
    setIsLoading(state.status === "loading");
  }, [key, t]);

  useEffect(() => {
    setPosition({
      top: selection.rect.top + selection.rect.height + 10,
      left: selection.rect.left,
    });
  }, [selection]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const generateExplanation = async () => {
    const apiKey = localStorage.getItem(`${selectedProvider}_api_key`) || "";

    if (!aiService.validateApiKey(selectedProvider, apiKey)) {
      toast.error(
        t("explanation.configureApiKey", {
          provider: selectedProvider.toUpperCase(),
        })
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelectionExplanationState(key, { status: "loading" });

    try {
      const config: AIServiceConfig = {
        provider: selectedProvider,
        model: selectedModel,
        apiKey,
        temperature: parseFloat(localStorage.getItem("ai_temperature") || "0.7"),
        maxTokens: parseInt(localStorage.getItem("ai_max_tokens") || "1200", 10),
        systemPrompt: AI_PROMPTS.system.languageTutorCompact(targetLanguage),
      };

      const prompt = AI_PROMPTS.features.selectionExplanation(
        segmentText,
        selection.text,
        targetLanguage
      );

      const response = await aiService.generateResponse(config, prompt);
      const explanation = {
        explanation: response.content,
        usage: response.usage,
        model: response.model,
        provider: response.provider,
      };

      selectionExplanationCache.set(key, explanation);
      setSelectionExplanationState(key, {
        status: "completed",
        result: explanation,
      });
      setResult(explanation);
      setError(null);
    } catch (generationError) {
      const message =
        generationError instanceof Error
          ? generationError.message
          : t("explanation.unknownError");
      setSelectionExplanationState(key, { status: "error", error: message });
      setError(message);
      setResult(null);
      toast.error(
        t("explanation.generationFailed", {
          message,
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToGlossary = () => {
    const mediaId = getCurrentMediaId();

    if (!mediaId) {
      toast.error(t("glossary.loadMediaFirst"));
      return;
    }

    const saved = addGlossaryEntry({
      mediaId,
      mediaName:
        currentFile?.name ||
        currentYouTube?.title ||
        currentYouTube?.id ||
        t("glossary.unknownMedia"),
      mediaType: currentFile?.type,
      youtubeId: currentYouTube?.id,
      segmentId: segment.id,
      text: selection.text,
      contextText: segment.text,
      selectionStart: selection.start,
      selectionEnd: selection.end,
      startTime: segment.startTime,
      endTime: segment.endTime,
    });

    if (saved) {
      toast.success(t("glossary.saved"));
      onClose();
    }
  };

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest("button")) {
      return;
    }

    dragOffsetRef.current = {
      x: event.clientX - position.left,
      y: event.clientY - position.top,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setPosition({
        left: Math.max(12, moveEvent.clientX - dragOffsetRef.current.x),
        top: Math.max(12, moveEvent.clientY - dragOffsetRef.current.y),
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const content = (
    <div
      className="transcript-selection-popover fixed z-[70] w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white/95 p-3 text-gray-900 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-100"
      style={{
        top: Math.min(position.top, window.innerHeight - 280),
        left: Math.min(position.left, Math.max(12, window.innerWidth - 400)),
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div
        className="mb-2 flex cursor-move items-start justify-between gap-3"
        onPointerDown={handleDragStart}
      >
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
            {t("transcript.selectionContext")}
          </div>
          <div className="mt-1 truncate text-sm font-semibold">“{selection.text}”</div>
          {selection.matchedItem && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("transcript.selectionKnownItem", {
                type: t(`transcript.studyType.${selection.matchedItem.type}`),
                level: selection.matchedItem.level,
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label={t("common.close")}
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSaveToGlossary}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
        >
          <BookmarkPlus size={13} />
          {t("glossary.saveSelection")}
        </button>

        {!result && (
          <button
            type="button"
            onClick={generateExplanation}
            disabled={isLoading}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? (
              <Loader size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
            {t("transcript.explainSelection")}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 text-sm text-error-600 dark:text-error-400">{error}</div>
      )}

      {result && (
        <div className="mt-3 space-y-2">
          <div className="prose perror-sm max-w-none text-sm dark:perror-invert [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0">
            <MarkdownRenderer content={result.explanation} />
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500">
            {t("explanation.providerInfo", {
              provider: result.provider,
              model: result.model,
              tokens: result.usage?.totalTokens ?? 0,
            })}
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
};
