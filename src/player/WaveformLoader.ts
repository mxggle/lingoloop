import type { WaveformLevelData, WaveformLevelMeta } from './types';
import { desktopApi } from '../platform/runtime';

// Matches the structure returned by IPC
interface WaveformMeta {
  mediaId: string;
  duration: number;
  sampleRate: number;
  levels: WaveformLevelMeta[];
}

interface CachedLevel {
  data: WaveformLevelData;
  loadedAt: number;
}

/**
 * Service that loads and caches FFmpeg-generated waveform data.
 *
 * On desktop: uses the native waveform service.
 * On web: falls back to AudioContext-based analysis (Float32Array peaks).
 */
export class WaveformLoader {
  private metas = new Map<string, WaveformMeta>();
  private levels = new Map<string, Map<number, CachedLevel>>();
  private pendingAnalysis = new Set<string>();

  /** True when the native desktop waveform capability is available. */
  get isAvailable(): boolean {
    return desktopApi !== null;
  }

  /**
   * Start waveform analysis for a media file.
   * Returns the metadata once complete. Progress is reported via callback.
   */
  async analyze(
    filePath: string,
    mediaId: string,
    onProgress?: (fraction: number) => void,
  ): Promise<WaveformMeta | null> {
    if (!this.isAvailable) {
      throw new Error('WaveformLoader: desktop waveform API not available');
    }

    if (this.pendingAnalysis.has(mediaId)) {
      // Wait for existing analysis
      const meta = this.metas.get(mediaId);
      if (meta) return meta;
      throw new Error('WaveformLoader: analysis already in progress for ' + mediaId);
    }

    this.pendingAnalysis.add(mediaId);

    const api = desktopApi;
    if (!api) return null;

    let unsub: (() => void) | undefined;
    if (onProgress) {
      unsub = api.onWaveformProgress((payload) => {
        if (payload.mediaId === mediaId) {
          onProgress(payload.fraction);
        }
      });
    }

    try {
      const meta = await api.waveformAnalyze(filePath, mediaId);
      if (meta) this.metas.set(mediaId, meta);
      return meta;
    } finally {
      this.pendingAnalysis.delete(mediaId);
      unsub?.();
    }
  }

  /** Get cached metadata, or fetch it. */
  async getMeta(mediaId: string): Promise<WaveformMeta | null> {
    const cached = this.metas.get(mediaId);
    if (cached) return cached;

    if (!this.isAvailable) return null;

    const meta = await desktopApi?.waveformGetMeta(mediaId) ?? null;
    if (meta) this.metas.set(mediaId, meta);
    return meta;
  }

  /**
   * Load waveform level data for the given media + level.
   * Caches in memory after first load.
   */
  async loadLevel(
    mediaId: string,
    level: number,
  ): Promise<WaveformLevelData | null> {
    // Check cache
    const mediaCache = this.levels.get(mediaId);
    const cached = mediaCache?.get(level);
    if (cached) return cached.data;

    if (!this.isAvailable) return null;

    const raw = await desktopApi?.waveformGetLevel(mediaId, level) ?? null;
    if (!raw) return null;

    const data: WaveformLevelData = {
      mediaId: raw.mediaId,
      level: raw.level,
      samplesPerPeak: raw.samplesPerPeak,
      sampleRate: raw.sampleRate,
      min: new Int16Array(raw.min),
      max: new Int16Array(raw.max),
      rms: new Uint16Array(raw.rms),
    };

    if (!this.levels.has(mediaId)) {
      this.levels.set(mediaId, new Map());
    }
    this.levels.get(mediaId)!.set(level, { data, loadedAt: Date.now() });

    return data;
  }

  /**
   * Choose the best level for a given viewport and load it.
   * This is the main entry point for the waveform renderer.
   */
  async loadForViewport(params: {
    mediaId: string;
    visibleDuration: number;
    canvasWidth: number;
  }): Promise<WaveformLevelData | null> {
    const meta = await this.getMeta(params.mediaId);
    if (!meta) return null;

    const secondsPerPixel = params.visibleDuration / Math.max(1, params.canvasWidth);
    const samplesPerPixel = secondsPerPixel * meta.sampleRate;

    const levelMeta =
      meta.levels.find((l) => l.samplesPerPeak >= samplesPerPixel) ??
      meta.levels[meta.levels.length - 1];

    return this.loadLevel(params.mediaId, levelMeta.level);
  }

  /** Clear all cached data for a media. */
  clear(mediaId: string): void {
    this.metas.delete(mediaId);
    this.levels.delete(mediaId);
  }

  /** Clear all caches. */
  clearAll(): void {
    this.metas.clear();
    this.levels.clear();
  }
}

/** Singleton instance shared across the player workspace. */
export const waveformLoader = new WaveformLoader();
