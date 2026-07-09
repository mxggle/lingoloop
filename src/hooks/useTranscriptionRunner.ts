import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { usePlayerStore } from "../stores/playerStore";
import { useTranscriptStore } from "../stores/transcriptStore";
import { transcriptionService } from "../services/transcriptionService";
import type { TranscriptionProvider } from "../types/aiService";
import { encodeWAV } from "../utils/wavEncoder";
import { breakIntoSentences as utilBreakIntoSentences } from "../utils/sentenceBreaker";
import { desktopApi } from "../platform/runtime";
import { prepareYouTubeMedia, subscribeYouTubePreparation } from "../services/youtubeMediaService";
import {
  assignWordsToSegments,
  normalizeRange,
  type TimeRange,
} from "../utils/transcriptSegments";

const LARGE_TRANSCRIPTION_FILE_SIZE = 25 * 1024 * 1024;
const PROGRESSIVE_TRANSCRIPTION_THRESHOLD_SECONDS = 8 * 60;

export interface TranscriptionRunnerOptions {
  /** Range to use when the caller doesn't pass one (e.g. the active A-B loop). */
  getFallbackRange?: () => TimeRange | undefined;
}

/**
 * Owns the transcription workflow: provider/API-key settings, audio
 * extraction, chunked vs. single-shot transcription, progress, and
 * cancellation. UI state only — transcript data lands in transcriptStore.
 */
export const useTranscriptionRunner = ({ getFallbackRange }: TranscriptionRunnerOptions = {}) => {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isAutomaticYouTubeLookup, setIsAutomaticYouTubeLookup] = useState(false);
  const [youtubeCaptionsUnavailable, setYouTubeCaptionsUnavailable] = useState(false);
  const [youtubeCaptionsAvailable, setYouTubeCaptionsAvailable] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<TranscriptionProvider>("openai");
  const abortControllerRef = useRef<AbortController | null>(null);
  const getFallbackRangeRef = useRef(getFallbackRange);
  const automaticLookupRef = useRef<string | null>(null);
  const currentYouTubeId = usePlayerStore((state) => state.currentYouTube?.id ?? null);
  const transcriptLanguageSetting = useTranscriptStore((state) => state.transcriptLanguage);
  const isTranscriptLoading = useTranscriptStore((state) => state.isTranscriptLoading);
  getFallbackRangeRef.current = getFallbackRange;

  // Load API key and transcription provider settings, and stay in sync with
  // the AI settings window (custom events + BroadcastChannel).
  useEffect(() => {
    const loadSettings = () => {
      const provider = transcriptionService.getPreferredProvider();
      setCurrentProvider(provider);
      const key = transcriptionService.getApiKeyForProvider(provider);
      setApiKey(key);
    };

    loadSettings();

    const handleSettingsUpdate = () => {
      loadSettings();
    };

    window.addEventListener("ai-settings-updated", handleSettingsUpdate);
    window.addEventListener("aiSettingsUpdated", handleSettingsUpdate);

    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      broadcastChannel = new BroadcastChannel("abloop-settings");
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === "ai-settings-updated") {
          loadSettings();
        }
      };
    }

    return () => {
      window.removeEventListener("ai-settings-updated", handleSettingsUpdate);
      window.removeEventListener("aiSettingsUpdated", handleSettingsUpdate);
      broadcastChannel?.close();
    };
  }, []);

  // YouTube captions are cheap compared with speech-to-text. Look them up as
  // soon as the media opens and reuse the same preparation job as waveform loading.
  useEffect(() => {
    if (!desktopApi || !currentYouTubeId || isTranscriptLoading) return;
    const existingSegments = useTranscriptStore.getState().getCurrentMediaTranscripts();
    if (existingSegments.some((segment) => segment.source === "youtube")) {
      setYouTubeCaptionsAvailable(true);
      return;
    }
    const lookupKey = `${currentYouTubeId}:${transcriptLanguageSetting}`;
    if (automaticLookupRef.current === lookupKey) return;
    automaticLookupRef.current = lookupKey;

    let active = true;
    setIsProcessing(true);
    setIsAutomaticYouTubeLookup(true);
    setYouTubeCaptionsUnavailable(false);
    setYouTubeCaptionsAvailable(false);
    setProcessingProgress(2);
    setTranscriptionStatus(t("transcript.youtubePreparation.checking"));
    const unsubscribe = subscribeYouTubePreparation(currentYouTubeId, (progress) => {
      if (!active || progress.stage === "ready") return;
      const stageBase = progress.stage === "checking" ? 0 : progress.stage === "downloading" ? 5 : 62;
      const stageSpan = progress.stage === "checking" ? 5 : progress.stage === "downloading" ? 57 : 8;
      setProcessingProgress(Math.round(stageBase + progress.fraction * stageSpan));
      setTranscriptionStatus(t(`transcript.youtubePreparation.${progress.stage}`));
    });

    void prepareYouTubeMedia(currentYouTubeId, transcriptLanguageSetting)
      .then((prepared) => {
        if (!active || usePlayerStore.getState().currentYouTube?.id !== currentYouTubeId) return;
        if (prepared.transcript.length > 0) {
          setYouTubeCaptionsAvailable(true);
          setTranscriptionStatus(t("transcript.youtubePreparation.importing"));
          setProcessingProgress(90);
          useTranscriptStore.getState().addTranscriptSegments(
            prepared.transcript.map((segment) => ({
              ...segment,
              confidence: 1,
              isFinal: true,
              source: "youtube" as const,
            }))
          );
          setProcessingProgress(100);
        } else {
          setYouTubeCaptionsUnavailable(true);
        }
      })
      .catch((error) => {
        if (active) console.error("YouTube caption lookup failed:", error);
      })
      .finally(() => {
        if (!active) return;
        unsubscribe();
        setTranscriptionStatus(null);
        setIsProcessing(false);
        setIsAutomaticYouTubeLookup(false);
      });

    return () => {
      active = false;
      unsubscribe();
      setTranscriptionStatus(null);
      setIsProcessing(false);
      setIsAutomaticYouTubeLookup(false);
    };
  }, [currentYouTubeId, isTranscriptLoading, t, transcriptLanguageSetting]);

  // Abort an in-flight transcription when the consumer unmounts.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  const sliceAudioBlob = async (blob: Blob, range: TimeRange): Promise<Blob> => {
    const audioContext = new AudioContext();
    try {
      const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
      const startFrame = Math.max(0, Math.floor(range.start * audioBuffer.sampleRate));
      const endFrame = Math.min(audioBuffer.length, Math.floor(range.end * audioBuffer.sampleRate));
      const frameCount = endFrame - startFrame;
      if (frameCount <= 0) throw new Error("Invalid time range");

      const slicedData = new Float32Array(frameCount);
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let index = 0; index < frameCount; index++) {
          slicedData[index] += channelData[startFrame + index] / audioBuffer.numberOfChannels;
        }
      }
      return encodeWAV(slicedData, audioBuffer.sampleRate);
    } finally {
      await audioContext.close();
    }
  };

  const extractAudioFromMedia = async (range?: TimeRange): Promise<Blob> => {
    const { currentFile } = usePlayerStore.getState();
    return new Promise((resolve, reject) => {
      if (!currentFile) {
        reject(new Error(t("transcript.noFileLoaded")));
        return;
      }

      // For audio files, we can use them directly or slice them if range provided
      if (currentFile.type.includes("audio")) {
        fetch(currentFile.url)
          .then(async (response) => {
            if (!range) {
              resolve(await response.blob());
              return;
            }

            return response.arrayBuffer();
          })
          .then(async (arrayBuffer) => {
            if (!range || !arrayBuffer) {
              return;
            }

            try {
              const audioContext = new AudioContext();
              const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

              let startFrame = Math.floor(range.start * audioBuffer.sampleRate);
              let endFrame = Math.floor(range.end * audioBuffer.sampleRate);
              startFrame = Math.max(0, startFrame);
              endFrame = Math.min(audioBuffer.length, endFrame);

              const frameCount = endFrame - startFrame;
              if (frameCount <= 0) {
                reject(new Error("Invalid time range"));
                return;
              }

              // Mix down to mono for speech recognition
              const channel0 = audioBuffer.getChannelData(0);
              const slicedData = new Float32Array(frameCount);

              if (audioBuffer.numberOfChannels > 1) {
                const channel1 = audioBuffer.getChannelData(1);
                for (let i = 0; i < frameCount; i++) {
                  const idx = startFrame + i;
                  slicedData[i] = (channel0[idx] + channel1[idx]) / 2;
                }
              } else {
                for (let i = 0; i < frameCount; i++) {
                  slicedData[i] = channel0[startFrame + i];
                }
              }

              const wavBlob = encodeWAV(slicedData, audioBuffer.sampleRate);
              audioContext.close();
              resolve(wavBlob);
            } catch (err) {
              console.error("Error processing audio:", err);
              reject(err);
            }
          })
          .catch((error) => reject(error));
        return;
      }

      // For video files, capture the audio track in real time
      if (currentFile.type.includes("video")) {
        const video = document.createElement("video");
        video.src = currentFile.url;

        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        const source = audioContext.createMediaElementSource(video);
        source.connect(destination);

        const mediaRecorder = new MediaRecorder(destination.stream);
        const chunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/wav" });
          resolve(blob);
        };

        video.onloadedmetadata = () => {
          const startTime = range ? range.start : 0;
          const duration = range ? (range.end - range.start) : video.duration;

          video.currentTime = startTime;

          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            video.play();
            mediaRecorder.start();

            setTimeout(() => {
              video.pause();
              mediaRecorder.stop();
              audioContext.close();
              video.remove();
            }, duration * 1000);
          };

          video.addEventListener("seeked", onSeeked);
        };

        video.onerror = () => {
          reject(new Error(t("transcript.errorLoadingVideo")));
        };

        return;
      }

      reject(new Error(t("transcript.unsupportedFileType")));
    });
  };

  const transcribeMedia = async (
    requestedRange?: Partial<TimeRange>,
    options?: { forceFullRange?: boolean }
  ) => {
    const { currentFile, currentYouTube, duration } = usePlayerStore.getState();
    const {
      transcriptLanguage,
      clearTranscript,
      startTranscribing,
      stopTranscribing,
      addTranscriptSegments,
    } = useTranscriptStore.getState();

    if (!currentFile && !currentYouTube) {
      toast.error(t("transcript.noMediaToTranscribe"));
      return;
    }

    const range = options?.forceFullRange
      ? normalizeRange(requestedRange)
      : normalizeRange(requestedRange) || getFallbackRangeRef.current?.();

    if (currentFile && !range && currentFile.size > LARGE_TRANSCRIPTION_FILE_SIZE) {
      toast(t("transcript.largeFileRangeRecommended"));
    }

    try {
      setIsProcessing(true);
      setIsAutomaticYouTubeLookup(false);
      setErrorMessage("");
      setTranscriptionStatus(null);

      // Only clear if doing full transcript
      if (!range || options?.forceFullRange) {
        clearTranscript("ai");
      }

      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      startTranscribing();
      setProcessingProgress(10);

      let youtubeAudioBlob: Blob | null = null;
      if (currentYouTube) {
        const prepared = await prepareYouTubeMedia(currentYouTube.id, transcriptLanguage);
        if (prepared.transcript.length > 0) {
          setYouTubeCaptionsAvailable(true);
          const hasStoredCaptions = useTranscriptStore.getState()
            .getCurrentMediaTranscripts()
            .some((segment) => segment.source === "youtube");
          if (!hasStoredCaptions) {
            addTranscriptSegments(prepared.transcript.map((segment) => ({
              ...segment,
              confidence: 1,
              isFinal: true,
              source: "youtube" as const,
            })));
          }
        }
        if (!desktopApi) throw new Error(t("transcript.youtubeTranscriptionWarning"));
        const response = await fetch(desktopApi.mediaUrl(prepared.audioPath));
        if (!response.ok) throw new Error(t("transcript.errorLoadingAudio"));
        const downloadedAudio = await response.blob();
        youtubeAudioBlob = range && !options?.forceFullRange
          ? await sliceAudioBlob(downloadedAudio, range)
          : downloadedAudio;
      }

      const audioBlob = youtubeAudioBlob ?? await extractAudioFromMedia(range);
      setProcessingProgress(30);

      if (!apiKey && currentProvider !== "local-whisper") {
        setShowApiKeyInput(true);
        return;
      }

      const providerInfo = transcriptionService.getProviderInfo(currentProvider);
      toast(t("transcript.processingWithProvider", { provider: providerInfo.name }));

      setProcessingProgress(50);

      const transcriptionConfig = {
        provider: currentProvider,
        apiKey: apiKey,
        language: transcriptLanguage,
      };
      const shouldUseChunkedTranscription =
        !range && (
          duration >= PROGRESSIVE_TRANSCRIPTION_THRESHOLD_SECONDS ||
          (currentProvider === "local-whisper" && youtubeAudioBlob !== null)
        );

      const result = shouldUseChunkedTranscription
        ? await transcriptionService.transcribeInChunks(
          transcriptionConfig,
          audioBlob,
          {
            signal: abortController.signal,
            onChunkComplete: (segments, chunkIndex, totalChunks) => {
              setTranscriptionStatus(
                t("transcript.processingChunk", {
                  current: chunkIndex,
                  total: totalChunks,
                })
              );
              setProcessingProgress(
                Math.min(95, 50 + Math.round((chunkIndex / totalChunks) * 45))
              );
              addTranscriptSegments(
                segments.map((segment) => ({
                  text: segment.text.trim(),
                  startTime: Math.max(0, segment.start),
                  endTime: Math.max(segment.start, segment.end),
                  confidence: segment.confidence,
                  isFinal: true,
                  source: "ai" as const,
                }))
              );
            },
          }
        )
        : await transcriptionService.transcribe(
          transcriptionConfig,
          audioBlob,
          { signal: abortController.signal }
        );

      setProcessingProgress(80);

      const startTimeOffset = range ? range.start : 0;

      if (shouldUseChunkedTranscription) {
        setProcessingProgress(100);
        return;
      }

      if (result.segments && result.segments.length > 0) {
        // Map word-level data from API response to segments
        const wordMap = assignWordsToSegments(result.words, result.segments);
        let wordCounter = 0;

        addTranscriptSegments(
          result.segments.map((segment) => {
            const segmentWords = wordMap.get(segment.id);
            const words = segmentWords?.map((w) => ({
              id: `word-${wordCounter++}`,
              text: w.word,
              start: Math.max(0, w.start + startTimeOffset),
              end: Math.max(0, w.end + startTimeOffset),
            }));
            const wordIds = words?.map((w) => w.id);

            return {
              text: segment.text.trim(),
              startTime: Math.max(0, segment.start + startTimeOffset),
              endTime: Math.max(segment.start + startTimeOffset, segment.end + startTimeOffset),
              confidence: segment.confidence,
              isFinal: true,
              source: "ai" as const,
              words,
              wordIds,
            };
          })
        );
      } else {
        // If no segments are returned, use the full transcript with basic sentence breaking
        const sentences = await utilBreakIntoSentences(result.fullText);

        addTranscriptSegments(sentences.map((sentence, index) => {
          const startTime = (index * 30) / sentences.length;
          const endTime = ((index + 1) * 30) / sentences.length;

          return {
            text: sentence.trim(),
            startTime: Math.max(0, startTime + startTimeOffset),
            endTime: Math.max(startTime + startTimeOffset, endTime + startTimeOffset),
            confidence: 0.85,
            isFinal: true,
            source: "ai" as const,
          };
        }));
      }

      setProcessingProgress(100);
    } catch (error) {
      console.error("Error transcribing media:", error);

      if (error instanceof Error && error.name === "AbortError") {
        toast(t("transcript.transcriptionCancelled"));
        return;
      }

      let message = t("transcript.transcriptionFailed");

      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("Unauthorized")) {
          message += t("transcript.invalidApiKey");
        } else if (error.message.includes("429") || error.message.includes("rate limit")) {
          message += t("transcript.rateLimitExceeded");
        } else if (error.message.includes("413") || error.message.includes("too large")) {
          message += t("transcript.audioFileTooLarge");
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          message += t("transcript.networkError");
        } else {
          message += t("transcript.genericError", { message: error.message });
        }
      } else {
        message += t("transcript.unknownError");
      }

      setErrorMessage(message);
      toast.error(message);
    } finally {
      if (abortControllerRef.current?.signal.aborted || abortControllerRef.current) {
        abortControllerRef.current = null;
      }
      setTranscriptionStatus(null);
      setIsProcessing(false);
      stopTranscribing();
    }
  };

  const cancelTranscription = () => {
    abortControllerRef.current?.abort();
  };

  return {
    isProcessing,
    processingProgress,
    transcriptionStatus,
    errorMessage,
    showApiKeyInput,
    setShowApiKeyInput,
    currentProvider,
    isAutomaticYouTubeLookup,
    youtubeCaptionsUnavailable,
    youtubeCaptionsAvailable,
    transcribeMedia,
    cancelTranscription,
  };
};
