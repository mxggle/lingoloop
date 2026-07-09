import { desktopApi } from "../platform/runtime";
import type { YouTubePreparedMedia } from "../types/desktop";
import type { YouTubePreparationProgress } from "../types/desktop";

const pending = new Map<string, Promise<YouTubePreparedMedia>>();
const completed = new Map<string, YouTubePreparedMedia>();
const progressByVideo = new Map<string, YouTubePreparationProgress>();
const listeners = new Map<string, Set<(progress: YouTubePreparationProgress) => void>>();
let stopProgressListener: (() => void) | null = null;

const ensureProgressListener = () => {
  if (!desktopApi || stopProgressListener) return;
  stopProgressListener = desktopApi.onYouTubePreparationProgress((progress) => {
    progressByVideo.set(progress.videoId, progress);
    listeners.get(progress.videoId)?.forEach((listener) => listener(progress));
  });
};

export const subscribeYouTubePreparation = (
  videoId: string,
  listener: (progress: YouTubePreparationProgress) => void,
): (() => void) => {
  ensureProgressListener();
  const videoListeners = listeners.get(videoId) ?? new Set();
  videoListeners.add(listener);
  listeners.set(videoId, videoListeners);
  const current = progressByVideo.get(videoId);
  if (current) listener(current);
  return () => {
    videoListeners.delete(listener);
    if (videoListeners.size === 0) listeners.delete(videoId);
  };
};

export const prepareYouTubeMedia = (videoId: string, language?: string): Promise<YouTubePreparedMedia> => {
  if (!desktopApi) {
    return Promise.reject(new Error("YouTube audio extraction is available in the desktop app only"));
  }
  ensureProgressListener();
  const cacheKey = `${videoId}:${language ?? ""}`;
  const cached = completed.get(cacheKey);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(cacheKey);
  if (existing) return existing;
  const request = desktopApi.youtubePrepare(videoId, language)
    .then((media) => {
      completed.set(cacheKey, media);
      return media;
    })
    .finally(() => pending.delete(cacheKey));
  pending.set(cacheKey, request);
  return request;
};
