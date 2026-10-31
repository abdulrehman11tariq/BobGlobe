import type { Artist, TopTrack } from '../types';
import { AUDIO_CONFIG } from '../theme/blobConfig';

export interface PlayerState {
  audioUnlocked: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isLoadingSlow: boolean;
  currentTrack: TopTrack | null;
  currentArtist: Artist | null;
  currentBlobId: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  statusMessage: string | null;
  beatPhase: number;
  beatTick: number;
}

type StateListener = (state: PlayerState) => void;

const AUDIO_POOL_SIZE = 12;

interface PoolItem {
  audio: HTMLAudioElement;
  index: number;
  lastUsed: number;
  currentSrc: string;
}

interface ActiveFade {
  audio: HTMLAudioElement;
  startVol: number;
  targetVol: number;
  startTime: number;
  durationMs: number;
  onComplete?: () => void;
}

/**
 * URL-gated audio debug logger: enabled when ?audiodebug=1 is present
 */
export function audioLog(step: string, details?: unknown) {
  if (typeof window !== 'undefined') {
    const isDebug = new URLSearchParams(window.location.search).get('audiodebug') === '1';
    if (isDebug) {
      const now = performance.now().toFixed(1);
      console.log(`[AudioDebug +${now}ms] ${step}`, details ?? '');
    }
  }
}

class PreviewPlayerEngine {
  private pool: PoolItem[] = [];
  private activeItem: PoolItem | null = null;

  private hoverGen = 0;
  private earlyLoadTimer: number | null = null;
  private hoverTimer: number | null = null;
  private slowTimer: number | null = null;
  private fallbackTimeout: number | null = null;

  private activeFades = new Map<HTMLAudioElement, ActiveFade>();
  private fadeRafId: number | null = null;
  private beatRafId: number | null = null;
  private isFadingOutAtEnd = false;

  private state: PlayerState = {
    audioUnlocked: false,
    isPlaying: false,
    isPaused: false,
    isLoadingSlow: false,
    currentTrack: null,
    currentArtist: null,
    currentBlobId: null,
    currentTime: 0,
    duration: 30,
    volume: AUDIO_CONFIG.DEFAULT_VOLUME,
    isMuted: false,
    statusMessage: null,
    beatPhase: 0,
    beatTick: 0,
  };

  private listeners = new Set<StateListener>();
  private pendingHoverBlobId: string | null = null;
  private isDraggingOrFlying = false;
  private wasPlayingBeforeBlur = false;
  private wasPlayingBeforeDrag = false;

  constructor() {
    this.initPool();
    this.setupWindowUnlockListeners();

    // Tab blur & focus handling
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.state.isPlaying) {
            this.wasPlayingBeforeBlur = true;
            this.pauseImmediate();
          }
        } else {
          if (this.wasPlayingBeforeBlur) {
            this.wasPlayingBeforeBlur = false;
            if (!this.isDraggingOrFlying) {
              this.resume();
            }
          }
        }
      });
    }

    // Start 100 BPM Beat Clock RAF
    this.startBeatClock();
  }

  private initPool() {
    if (typeof window === 'undefined') return;

    for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
      const audio = new Audio();
      audio.preload = 'auto';
      const item: PoolItem = {
        audio,
        index: i,
        lastUsed: 0,
        currentSrc: '',
      };
      this.setupAudioListeners(item);
      this.pool.push(item);
    }
  }

  private setupAudioListeners(item: PoolItem) {
    const { audio, index } = item;

    audio.addEventListener('canplay', () => {
      if (this.activeItem === item) {
        audioLog('canplay fired', {
          poolIndex: index,
          duration: audio.duration,
          readyState: audio.readyState,
        });
      }
    });

    audio.addEventListener('loadedmetadata', () => {
      // Chorus seek enhancement: seek to ~8s (or 20% duration) so user hears chorus
      try {
        if (audio.duration && audio.duration > 15 && audio.currentTime < 1) {
          audio.currentTime = Math.min(8, audio.duration * 0.20);
        }
      } catch {
        // Ignore seek restriction errors
      }
    });

    audio.addEventListener('timeupdate', () => {
      if (this.activeItem === item && this.state.isPlaying) {
        this.state.currentTime = audio.currentTime || 0;
        this.state.duration = audio.duration || 30;
        this.emit();

        // Fade out over last 1.5s instead of stopping abruptly
        if (
          audio.duration > 0 &&
          audio.duration - audio.currentTime <= 1.5 &&
          !this.isFadingOutAtEnd
        ) {
          this.isFadingOutAtEnd = true;
          this.rampVolume(audio, 0, 1500, () => {
            this.isFadingOutAtEnd = false;
            this.handleTrackEnded();
          });
        }
      }
    });

    audio.addEventListener('ended', () => {
      if (this.activeItem === item) {
        this.handleTrackEnded();
      }
    });

    audio.addEventListener('error', () => {
      if (this.activeItem === item) {
        audioLog('audio error fired', { poolIndex: index, error: audio.error });
        this.handleTrackError();
      }
    });
  }

  private setupWindowUnlockListeners() {
    if (typeof window === 'undefined') return;

    // Check if browser already permits WebAudio / playback
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      try {
        const ctx = new AudioCtx();
        if (ctx.state === 'running') {
          this.state.audioUnlocked = true;
          ctx.close().catch(() => {});
        }
      } catch {
        // Ignored
      }
    }

    // Unlock reliably on FIRST user gesture anywhere on window
    const onUserGesture = () => {
      this.unlockAudio().then((unlocked) => {
        if (unlocked) {
          window.removeEventListener('pointerdown', onUserGesture);
          window.removeEventListener('keydown', onUserGesture);
          window.removeEventListener('touchend', onUserGesture);
        }
      });
    };

    window.addEventListener('pointerdown', onUserGesture, { passive: true });
    window.addEventListener('keydown', onUserGesture, { passive: true });
    window.addEventListener('touchend', onUserGesture, { passive: true });
  }

  /**
   * Unlock Web Audio / HTMLAudio playback from user gesture
   */
  public async unlockAudio(): Promise<boolean> {
    if (this.state.audioUnlocked) return true;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        ctx.close().catch(() => {});
      }

      if (this.pool.length > 0) {
        const first = this.pool[0].audio;
        first.muted = true;
        first.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
        await first.play();
        first.pause();
        first.currentTime = 0;
        first.muted = this.state.isMuted;
      }

      this.state.audioUnlocked = true;
      audioLog('audio unlocked via user gesture');
      this.emit();
      return true;
    } catch (e) {
      console.warn('Audio unlock deferred or failed:', e);
      return false;
    }
  }

  private acquireAudio(src: string): PoolItem {
    const now = performance.now();
    // 1. Check if src is already assigned to a pooled element
    const existing = this.pool.find((p) => p.currentSrc === src);
    if (existing) {
      existing.lastUsed = now;
      return existing;
    }

    // 2. Pick least recently used element that is not active or actively fading in
    let candidate: PoolItem | null = null;
    let oldestTime = Infinity;

    for (const item of this.pool) {
      if (item === this.activeItem && this.state.isPlaying) continue;
      if (this.activeFades.has(item.audio)) continue;
      if (item.lastUsed < oldestTime) {
        oldestTime = item.lastUsed;
        candidate = item;
      }
    }

    // Fallback to any non-active item if all are marked
    if (!candidate) {
      candidate = this.pool.find((p) => p !== this.activeItem) || this.pool[0];
    }

    // Reset element
    candidate.audio.pause();
    candidate.audio.currentTime = 0;
    candidate.currentSrc = src;
    candidate.lastUsed = now;
    candidate.audio.src = src;
    candidate.audio.load();

    return candidate;
  }

  /**
   * Preload clean previews for other blobs in same country in background
   */
  public preloadCountryPreviews(blobs: { artist: Artist }[]) {
    if (!blobs || blobs.length === 0) return;
    for (const b of blobs) {
      const clean = this.getBestCleanTrack(b.artist);
      if (clean?.previewUrl) {
        const existing = this.pool.find((p) => p.currentSrc === clean.previewUrl);
        if (!existing) {
          const idle = this.pool.find(
            (p) =>
              p !== this.activeItem &&
              !this.activeFades.has(p.audio) &&
              (!p.audio.src || p.audio.paused)
          );
          if (idle) {
            idle.currentSrc = clean.previewUrl;
            idle.audio.src = clean.previewUrl;
            idle.audio.preload = 'auto';
            idle.audio.load();
          }
        }
      }
    }
  }

  /**
   * Smooth volume ramp driven by requestAnimationFrame interpolating from CURRENT volume
   */
  private rampVolume(
    audio: HTMLAudioElement,
    targetVol: number,
    durationMs: number,
    onComplete?: () => void
  ) {
    const startVol = audio.volume;
    audioLog('fade start', {
      from: Number(startVol.toFixed(2)),
      to: Number(targetVol.toFixed(2)),
      durationMs,
    });

    if (durationMs <= 0 || Math.abs(startVol - targetVol) < 0.001) {
      audio.volume = targetVol;
      audioLog('fade end', { finalVol: targetVol });
      onComplete?.();
      return;
    }

    this.activeFades.set(audio, {
      audio,
      startVol,
      targetVol,
      startTime: performance.now(),
      durationMs,
      onComplete,
    });

    if (!this.fadeRafId) {
      this.fadeRafId = requestAnimationFrame(this.stepFades);
    }
  }

  private stepFades = (now: number) => {
    this.activeFades.forEach((fade, audio) => {
      const elapsed = now - fade.startTime;
      const progress = Math.min(1, Math.max(0, elapsed / fade.durationMs));
      const currentVol = fade.startVol + (fade.targetVol - fade.startVol) * progress;
      audio.volume = Math.max(0, Math.min(1, currentVol));

      if (progress >= 1) {
        audio.volume = fade.targetVol;
        audioLog('fade end', { finalVol: fade.targetVol });
        this.activeFades.delete(audio);
        fade.onComplete?.();
      }
    });

    if (this.activeFades.size > 0) {
      this.fadeRafId = requestAnimationFrame(this.stepFades);
    } else {
      this.fadeRafId = null;
    }
  };

  private startBeatClock() {
    if (typeof window === 'undefined') return;

    const beatIntervalMs = (60 / AUDIO_CONFIG.BEAT_BPM) * 1000; // 600ms per beat
    let lastTick = -1;

    const loop = (now: number) => {
      const phase = (now % beatIntervalMs) / beatIntervalMs;
      const currentTick = Math.floor(now / beatIntervalMs);

      this.state.beatPhase = phase;
      if (currentTick !== lastTick) {
        lastTick = currentTick;
        this.state.beatTick = currentTick;
      }

      this.beatRafId = requestAnimationFrame(loop);
    };

    this.beatRafId = requestAnimationFrame(loop);
  }

  public dispose() {
    if (this.beatRafId) {
      cancelAnimationFrame(this.beatRafId);
      this.beatRafId = null;
    }
    if (this.fadeRafId) {
      cancelAnimationFrame(this.fadeRafId);
      this.fadeRafId = null;
    }
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): PlayerState {
    return { ...this.state };
  }

  private emit() {
    const s = this.getState();
    this.listeners.forEach((fn) => fn(s));
  }

  /**
   * Finds the best-ranked non-explicit track with a preview
   */
  private getBestCleanTrack(artist: Artist): TopTrack | null {
    if (!artist.topTracks || artist.topTracks.length === 0) return null;
    const sorted = [...artist.topTracks].sort((a, b) => a.rank - b.rank);
    return sorted.find((t) => !t.explicit && Boolean(t.previewUrl)) || null;
  }

  /**
   * Handles pointer hovering over a blob
   */
  public hoverBlob(artist: Artist | null, blobId: string | null) {
    const gen = ++this.hoverGen;

    if (this.earlyLoadTimer) {
      clearTimeout(this.earlyLoadTimer);
      this.earlyLoadTimer = null;
    }
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    if (this.slowTimer) {
      clearTimeout(this.slowTimer);
      this.slowTimer = null;
    }
    if (this.fallbackTimeout) {
      clearTimeout(this.fallbackTimeout);
      this.fallbackTimeout = null;
    }
    this.state.isLoadingSlow = false;

    if (!artist || !blobId) {
      audioLog('pointerleave', { blobId: this.pendingHoverBlobId });
      this.pendingHoverBlobId = null;
      audioLog('fade out and pause');
      this.fadeOutAndPause(AUDIO_CONFIG.FADE_OUT_MS);
      return;
    }

    this.pendingHoverBlobId = blobId;
    audioLog('pointerenter', { artist: artist.name, blobId });
    audioLog('hoveredBlob set', { blobId });

    // Check if clean track exists
    const cleanTrack = this.getBestCleanTrack(artist);
    audioLog('preview chosen', {
      artist: artist.name,
      track: cleanTrack?.title ?? 'none',
      explicit: cleanTrack?.explicit ?? false,
      previewUrl: cleanTrack?.previewUrl ?? null,
    });

    // If no clean track, explicit songs NEVER autoplay
    if (!cleanTrack) {
      if (this.state.currentBlobId !== blobId) {
        this.fadeOutAndPause(AUDIO_CONFIG.FADE_OUT_MS);
      }
      this.state.statusMessage = 'No clean preview. Open on Apple Music';
      this.state.currentArtist = artist;
      this.state.currentBlobId = blobId;
      this.emit();
      return;
    }

    let poolItem: PoolItem | null = null;
    // Early loading starts after 40ms so momentary sweeps (5-15ms) across blobs don't allocate audio
    this.earlyLoadTimer = window.setTimeout(() => {
      if (this.hoverGen !== gen) return;
      poolItem = this.acquireAudio(cleanTrack.previewUrl);
      audioLog('audio element created and src set', {
        poolIndex: poolItem.index,
        src: cleanTrack.previewUrl,
      });
    }, 40);

    // 600ms loading indicator timer
    this.slowTimer = window.setTimeout(() => {
      if (this.hoverGen === gen && !this.state.isPlaying) {
        this.state.isLoadingSlow = true;
        this.emit();
      }
    }, 600);

    // 4s fallback timer
    this.fallbackTimeout = window.setTimeout(() => {
      if (this.hoverGen === gen && !this.state.isPlaying) {
        audioLog('load timeout >4s, trying fallback');
        this.handleTrackError(artist, blobId, cleanTrack);
      }
    }, 4000);

    // 350ms hover delay gates actual audio playback start
    audioLog('delay timer started', { delayMs: AUDIO_CONFIG.HOVER_DELAY_MS });
    this.hoverTimer = window.setTimeout(() => {
      if (this.hoverGen !== gen) return;
      if (this.pendingHoverBlobId !== blobId) return;
      if (this.isDraggingOrFlying) return;
      if (!this.state.audioUnlocked) return;

      if (
        this.state.isPlaying &&
        this.state.currentBlobId === blobId &&
        this.state.currentTrack?.previewUrl === cleanTrack.previewUrl
      ) {
        return;
      }

      const itemToPlay = poolItem || this.acquireAudio(cleanTrack.previewUrl);
      this.crossfadeToPoolItem(itemToPlay, artist, cleanTrack, blobId, gen);
    }, AUDIO_CONFIG.HOVER_DELAY_MS);
  }

  /**
   * Direct manual play from UI (e.g. artist panel play button)
   */
  public async playTrack(artist: Artist, track: TopTrack, blobId?: string) {
    await this.unlockAudio();
    if (!track.previewUrl) {
      this.state.statusMessage = 'Preview unavailable. Open on Apple Music';
      this.emit();
      return;
    }
    const poolItem = this.acquireAudio(track.previewUrl);
    this.crossfadeToPoolItem(
      poolItem,
      artist,
      track,
      blobId || this.state.currentBlobId || 'manual',
      ++this.hoverGen
    );
  }

  /**
   * Crossfade from current audio item to next pooled audio item
   */
  private crossfadeToPoolItem(
    poolItem: PoolItem,
    artist: Artist,
    track: TopTrack,
    blobId: string,
    gen: number
  ) {
    const nextAudio = poolItem.audio;
    const previousItem = this.activeItem;
    const previousAudio = previousItem ? previousItem.audio : null;

    const targetVol = this.state.isMuted ? 0 : this.state.volume;

    // Start with volume 0 if starting fresh or keep current volume
    if (previousAudio !== nextAudio) {
      nextAudio.volume = 0;
    }

    const playPromise = nextAudio.play();
    if (playPromise) {
      playPromise
        .then(() => {
          audioLog('play() result', {
            status: 'success',
            poolIndex: poolItem.index,
            track: track.title,
          });
          if (this.hoverGen !== gen) {
            nextAudio.pause();
            return;
          }

          if (this.slowTimer) {
            clearTimeout(this.slowTimer);
            this.slowTimer = null;
          }
          if (this.fallbackTimeout) {
            clearTimeout(this.fallbackTimeout);
            this.fallbackTimeout = null;
          }

          this.activeItem = poolItem;
          this.state.isLoadingSlow = false;
          this.state.isPlaying = true;
          this.state.isPaused = false;
          this.state.currentTrack = track;
          this.state.currentArtist = artist;
          this.state.currentBlobId = blobId;
          this.state.statusMessage = null;
          this.emit();

          // Smoothly ramp next up
          this.rampVolume(nextAudio, targetVol, AUDIO_CONFIG.FADE_IN_MS);

          // Smoothly ramp previous down and pause
          if (previousAudio && previousAudio !== nextAudio && !previousAudio.paused) {
            this.rampVolume(previousAudio, 0, AUDIO_CONFIG.FADE_OUT_MS, () => {
              previousAudio.pause();
              previousAudio.currentTime = 0;
            });
          }
        })
        .catch((err) => {
          audioLog('play() result', {
            status: 'error',
            name: err.name,
            message: err.message,
          });
          if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
            return;
          }
          this.handleTrackError(artist, blobId, track);
        });
    }
  }

  /**
   * Fade out and pause current track
   */
  public fadeOutAndPause(durationMs: number = AUDIO_CONFIG.FADE_OUT_MS) {
    if (this.earlyLoadTimer) {
      clearTimeout(this.earlyLoadTimer);
      this.earlyLoadTimer = null;
    }
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    if (this.slowTimer) {
      clearTimeout(this.slowTimer);
      this.slowTimer = null;
    }
    if (this.fallbackTimeout) {
      clearTimeout(this.fallbackTimeout);
      this.fallbackTimeout = null;
    }
    this.state.isLoadingSlow = false;

    const currentAudio = this.activeItem?.audio;
    if (!currentAudio || currentAudio.paused) {
      this.state.isPlaying = false;
      this.state.isPaused = true;
      this.emit();
      return;
    }

    this.rampVolume(currentAudio, 0, durationMs, () => {
      currentAudio.pause();
      this.state.isPlaying = false;
      this.state.isPaused = true;
      this.emit();
    });
  }

  private pauseImmediate() {
    if (this.activeItem) {
      this.activeItem.audio.pause();
    }
    this.state.isPlaying = false;
    this.state.isPaused = true;
    this.emit();
  }

  public resume() {
    if (this.activeItem && this.state.currentTrack && this.activeItem.audio.src) {
      const audio = this.activeItem.audio;
      audio.volume = this.state.isMuted ? 0 : this.state.volume;
      audio
        .play()
        .then(() => {
          this.state.isPlaying = true;
          this.state.isPaused = false;
          this.emit();
        })
        .catch((e) => console.warn('Resume error:', e));
    }
  }

  public togglePlayPause() {
    if (this.state.isPlaying) {
      this.fadeOutAndPause(AUDIO_CONFIG.FADE_OUT_MS);
    } else {
      this.resume();
    }
  }

  public setVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    this.state.volume = clamped;
    if (this.activeItem && !this.state.isMuted) {
      this.activeItem.audio.volume = clamped;
    }
    this.emit();
  }

  public toggleMute() {
    const newMuted = !this.state.isMuted;
    this.state.isMuted = newMuted;
    if (this.activeItem) {
      this.activeItem.audio.volume = newMuted ? 0 : this.state.volume;
    }
    this.emit();
  }

  public setDraggingOrFlying(active: boolean) {
    this.isDraggingOrFlying = active;
    if (active) {
      if (this.hoverTimer) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
      if (this.state.isPlaying) {
        this.wasPlayingBeforeDrag = true;
        this.fadeOutAndPause(150);
      }
    } else {
      if (this.wasPlayingBeforeDrag) {
        this.wasPlayingBeforeDrag = false;
      }
    }
  }

  /**
   * Advance to next track (for artist panel)
   */
  public nextTrack(onlyClean = true) {
    if (!this.state.currentArtist || !this.state.currentArtist.topTracks) return;
    const tracks = this.state.currentArtist.topTracks;
    const currentIdx = tracks.findIndex((t) => t.rank === this.state.currentTrack?.rank);
    for (let i = 1; i <= tracks.length; i++) {
      const idx = (currentIdx + i) % tracks.length;
      const candidate = tracks[idx];
      if (onlyClean && candidate.explicit) continue;
      if (candidate.previewUrl) {
        const poolItem = this.acquireAudio(candidate.previewUrl);
        this.crossfadeToPoolItem(
          poolItem,
          this.state.currentArtist,
          candidate,
          this.state.currentBlobId || 'manual',
          ++this.hoverGen
        );
        return;
      }
    }
  }

  /**
   * Go to previous track (for artist panel)
   */
  public prevTrack(onlyClean = true) {
    if (!this.state.currentArtist || !this.state.currentArtist.topTracks) return;
    const tracks = this.state.currentArtist.topTracks;
    const currentIdx = tracks.findIndex((t) => t.rank === this.state.currentTrack?.rank);
    for (let i = 1; i <= tracks.length; i++) {
      const idx = (currentIdx - i + tracks.length) % tracks.length;
      const candidate = tracks[idx];
      if (onlyClean && candidate.explicit) continue;
      if (candidate.previewUrl) {
        const poolItem = this.acquireAudio(candidate.previewUrl);
        this.crossfadeToPoolItem(
          poolItem,
          this.state.currentArtist,
          candidate,
          this.state.currentBlobId || 'manual',
          ++this.hoverGen
        );
        return;
      }
    }
  }

  private handleTrackEnded() {
    // Auto-advance through non-explicit songs of current artist
    this.nextTrack(true);
  }

  private handleTrackError(artist?: Artist, blobId?: string, failedTrack?: TopTrack) {
    const art = artist || this.state.currentArtist;
    const bId = blobId || this.state.currentBlobId;
    const currentRank = (failedTrack || this.state.currentTrack)?.rank ?? 0;

    if (!art || !art.topTracks) {
      this.state.statusMessage = 'Open on Apple Music';
      this.state.isPlaying = false;
      this.state.isLoadingSlow = false;
      this.emit();
      return;
    }

    const remaining = art.topTracks.filter(
      (t) => t.rank > currentRank && !t.explicit && Boolean(t.previewUrl)
    );

    if (remaining.length > 0) {
      audioLog('trying next track fallback', { track: remaining[0].title });
      const poolItem = this.acquireAudio(remaining[0].previewUrl);
      this.crossfadeToPoolItem(poolItem, art, remaining[0], bId || 'fallback', this.hoverGen);
    } else {
      this.state.statusMessage = 'Preview unavailable. Open on Apple Music';
      this.state.isPlaying = false;
      this.state.isLoadingSlow = false;
      this.emit();
    }
  }
}

// Global shared singleton player
export const previewPlayer = new PreviewPlayerEngine();
