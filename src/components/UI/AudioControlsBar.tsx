import type { FC } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { usePreviewPlayer } from '../../hooks/usePreviewPlayer';

export const AudioControlsBar: FC = () => {
  const {
    audioUnlocked,
    isPlaying,
    volume,
    isMuted,
    currentTrack,
    currentArtist,
    statusMessage,
    player,
  } = usePreviewPlayer();

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
      {/* Audio Unlock Hint if sound is still locked */}
      {!audioUnlocked && (
        <button
          onClick={() => player.unlockAudio()}
          className="glass-panel px-3.5 py-2 rounded-full text-xs font-bold text-amber-300 border border-amber-400/40 shadow-lg flex items-center gap-2 hover:bg-slate-900/80 transition-all animate-pulse"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Click anywhere to enable sound</span>
        </button>
      )}

      {/* Main Audio Dock */}
      <div className="glass-panel px-3 py-2 rounded-2xl border border-white/15 shadow-xl flex items-center gap-3 text-slate-200">
        {/* Play/Pause Button */}
        <button
          onClick={() => player.togglePlayPause()}
          disabled={!currentTrack && !statusMessage}
          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors border border-white/10"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Current track title / status */}
        <div className="hidden sm:flex flex-col max-w-[140px] truncate">
          {currentTrack ? (
            <>
              <span className="text-[11px] font-extrabold text-white truncate">
                {currentTrack.title}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold truncate">
                {currentArtist?.name}
              </span>
            </>
          ) : statusMessage ? (
            <span className="text-[10px] font-semibold text-amber-300/90 truncate">
              {statusMessage}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">Hover a blob</span>
          )}
        </div>

        {/* Mute Button */}
        <button
          onClick={() => player.toggleMute()}
          className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors border border-white/10"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-sky-400" />
          )}
        </button>

        {/* Volume Slider (default 0.6) */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (isMuted && val > 0) {
              player.toggleMute();
            }
            player.setVolume(val);
          }}
          className="w-16 h-1.5 accent-sky-400 bg-slate-700 rounded-lg cursor-pointer"
          title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
        />
      </div>
    </div>
  );
};
