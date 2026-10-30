import type { Artist, TopTrack } from '../types';
import { AUDIO_CONFIG } from '../theme/blobConfig';

export interface PlayerState {
  audioUnlocked: boolean;
  isPlaying: boolean;
  isPaused: boolean;
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

class PreviewPlayerEngine {
  private audioA: HTMLAudioElement;
  private audioB: HTMLAudioElement;
  private activeChannel: 'A' | 'B' = 'A';

  private hoverTimer: number | null = null;
  private fadeInterval: number | null = null;
  private beatRafId: number | null = null;

  private state: PlayerState = {
    audioUnlocked: false,
    isPlaying: false,
    isPaused: false,
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
    this.audioA = new Audio();
    this.audioB = new Audio();
    this.audioA.preload = 'auto';
    this.audioB.preload = 'auto';

    this.setupAudioListeners(this.audioA, 'A');
    this.setupAudioListeners(this.audioB, 'B');

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

  private setupAudioListeners(audio: HTMLAudioElement, channel: 'A' | 'B') {
    audio.addEventListener('timeupdate', () => {
      if (this.activeChannel === channel && this.state.isPlaying) {
        this.state.currentTime = audio.currentTime || 0;
        this.state.duration = audio.duration || 30;
        this.emit();
      }
    });

    audio.addEventListener('ended', () => {
      if (this.activeChannel === channel) {
        this.handleTrackEnded();
      }
    });

    audio.addEventListener('error', () => {
      if (this.activeChannel === channel) {
        this.handleTrackError();
      }
    });
  }

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
   * Unlock Web Audio / HTMLAudio playback from user gesture
   */
  public async unlockAudio(): Promise<boolean> {
    if (this.state.audioUnlocked) return true;
    try {
      this.audioA.muted = true;
      this.audioA.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      await this.audioA.play();
      this.audioA.pause();
      this.audioA.currentTime = 0;
      this.audioA.muted = this.state.isMuted;
      this.state.audioUnlocked = true;
      this.emit();
      return true;
    } catch (e) {
      console.warn('Audio unlock failed or deferred:', e);
      return false;
    }
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
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }

    if (!artist || !blobId) {
      this.pendingHoverBlobId = null;
      // Leaving blob: fade out and pause
      this.fadeOutAndPause(AUDIO_CONFIG.FADE_OUT_MS);
      return;
    }

    this.pendingHoverBlobId = blobId;

    // Check if clean track exists
    const cleanTrack = this.getBestCleanTrack(artist);

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

    // Preload track immediately
    const nextChannel = this.activeChannel === 'A' ? 'B' : 'A';
    const nextAudio = nextChannel === 'A' ? this.audioA : this.audioB;
    if (nextAudio.src !== cleanTrack.previewUrl) {
      nextAudio.src = cleanTrack.previewUrl;
      nextAudio.load();
    }

    // Wait 350ms before fading in
    this.hoverTimer = window.setTimeout(() => {
      // If pointer moved away, ignore
      if (this.pendingHoverBlobId !== blobId) return;
      // If globe is dragging or camera flying, ignore
      if (this.isDraggingOrFlying) return;
      // If audio is locked, hover music stays silent
      if (!this.state.audioUnlocked) return;

      // If already playing this exact track on this blob, keep playing
      if (
        this.state.isPlaying &&
        this.state.currentBlobId === blobId &&
        this.state.currentTrack?.previewUrl === cleanTrack.previewUrl
      ) {
        return;
      }

      this.crossfadeToTrack(artist, cleanTrack, blobId);
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
    this.crossfadeToTrack(artist, track, blobId || this.state.currentBlobId || 'manual');
  }

  /**
   * Crossfades from current channel to next channel
   */
  private crossfadeToTrack(artist: Artist, track: TopTrack, blobId: string) {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    const currentChannel = this.activeChannel;
    const currentAudio = currentChannel === 'A' ? this.audioA : this.audioB;

    const nextChannel = currentChannel === 'A' ? 'B' : 'A';
    const nextAudio = nextChannel === 'A' ? this.audioA : this.audioB;

    const targetVol = this.state.isMuted ? 0 : this.state.volume;

    // Prepare next audio
    if (nextAudio.src !== track.previewUrl) {
      nextAudio.src = track.previewUrl;
    }
    nextAudio.currentTime = 0;
    nextAudio.volume = 0;

    nextAudio
      .play()
      .then(() => {
        this.activeChannel = nextChannel;
        this.state.isPlaying = true;
        this.state.isPaused = false;
        this.state.currentTrack = track;
        this.state.currentArtist = artist;
        this.state.currentBlobId = blobId;
        this.state.statusMessage = null;
        this.emit();

        // Ramp next up and current down
        const steps = 15;
        const fadeIntervalTime = AUDIO_CONFIG.FADE_IN_MS / steps;
        let step = 0;
        const initialCurrentVol = currentAudio.volume;

        this.fadeInterval = window.setInterval(() => {
          step++;
          const progress = Math.min(1, step / steps);

          // Fade in next
          nextAudio.volume = progress * targetVol;

          // Fade out old
          if (currentAudio && !currentAudio.paused) {
            currentAudio.volume = Math.max(0, initialCurrentVol * (1 - progress));
          }

          if (progress >= 1) {
            if (this.fadeInterval) clearInterval(this.fadeInterval);
            this.fadeInterval = null;
            currentAudio.pause();
            currentAudio.currentTime = 0;
            nextAudio.volume = targetVol;
          }
        }, fadeIntervalTime);
      })
      .catch((err) => {
        console.warn('[previewPlayer] Playback rejected:', err);
        this.handleTrackError();
      });
  }

  /**
   * Fade out and pause current track
   */
  public fadeOutAndPause(durationMs: number = AUDIO_CONFIG.FADE_OUT_MS) {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    const currentAudio = this.activeChannel === 'A' ? this.audioA : this.audioB;
    if (currentAudio.paused) {
      this.state.isPlaying = false;
      this.state.isPaused = true;
      this.emit();
      return;
    }

    const steps = 12;
    const intervalTime = durationMs / steps;
    const initialVol = currentAudio.volume;
    let step = 0;

    this.fadeInterval = window.setInterval(() => {
      step++;
      const progress = Math.min(1, step / steps);
      currentAudio.volume = Math.max(0, initialVol * (1 - progress));

      if (progress >= 1) {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        currentAudio.pause();
        this.state.isPlaying = false;
        this.state.isPaused = true;
        this.emit();
      }
    }, intervalTime);
  }

  private pauseImmediate() {
    this.audioA.pause();
    this.audioB.pause();
    this.state.isPlaying = false;
    this.state.isPaused = true;
    this.emit();
  }

  public resume() {
    const activeAudio = this.activeChannel === 'A' ? this.audioA : this.audioB;
    if (this.state.currentTrack && activeAudio.src) {
      activeAudio.volume = this.state.isMuted ? 0 : this.state.volume;
      activeAudio
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
    const currentAudio = this.activeChannel === 'A' ? this.audioA : this.audioB;
    if (!this.state.isMuted) {
      currentAudio.volume = clamped;
    }
    this.emit();
  }

  public toggleMute() {
    const newMuted = !this.state.isMuted;
    this.state.isMuted = newMuted;
    const currentAudio = this.activeChannel === 'A' ? this.audioA : this.audioB;
    currentAudio.volume = newMuted ? 0 : this.state.volume;
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
        // Resume if we have an active panel or selection
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
        this.crossfadeToTrack(this.state.currentArtist, candidate, this.state.currentBlobId || 'manual');
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
        this.crossfadeToTrack(this.state.currentArtist, candidate, this.state.currentBlobId || 'manual');
        return;
      }
    }
  }

  private handleTrackEnded() {
    // Auto-advance through non-explicit songs of current artist
    this.nextTrack(true);
  }

  private handleTrackError() {
    // If a preview fails, try artist's next song, then show "Open on Apple Music". Never throw.
    if (!this.state.currentArtist || !this.state.currentArtist.topTracks) {
      this.state.statusMessage = 'Open on Apple Music';
      this.state.isPlaying = false;
      this.emit();
      return;
    }

    const currentRank = this.state.currentTrack?.rank ?? 0;
    const remaining = this.state.currentArtist.topTracks.filter(
      (t) => t.rank > currentRank && !t.explicit && Boolean(t.previewUrl)
    );

    if (remaining.length > 0) {
      this.crossfadeToTrack(this.state.currentArtist, remaining[0], this.state.currentBlobId || 'fallback');
    } else {
      this.state.statusMessage = 'Preview unavailable. Open on Apple Music';
      this.state.isPlaying = false;
      this.emit();
    }
  }
}

// Global shared singleton player
export const previewPlayer = new PreviewPlayerEngine();
