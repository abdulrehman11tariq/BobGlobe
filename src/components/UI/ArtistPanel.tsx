import type { FC } from 'react';
import type { BlobInstanceData } from '../../types';
import { X, TrendingUp, TrendingDown, Minus, Sparkles, Music, ExternalLink } from 'lucide-react';

interface ArtistPanelProps {
  blob: BlobInstanceData | null;
  onClose: () => void;
}

export const ArtistPanel: FC<ArtistPanelProps> = ({ blob, onClose }) => {
  if (!blob) return null;

  const { artist, country, rank } = blob;

  const getTrendBadge = () => {
    switch (artist.trend) {
      case 'up':
        return (
          <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
            <TrendingUp className="w-3.5 h-3.5" /> Trending Up
          </span>
        );
      case 'down':
        return (
          <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
            <TrendingDown className="w-3.5 h-3.5" /> Trending Down
          </span>
        );
      case 'new':
        return (
          <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            <Sparkles className="w-3.5 h-3.5" /> New Entry
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
            <Minus className="w-3.5 h-3.5" /> Stable
          </span>
        );
    }
  };

  return (
    <div className="fixed top-20 right-6 z-40 w-80 max-w-[90vw] animate-in fade-in slide-in-from-right-8 duration-200">
      <div className="glass-panel p-5 rounded-3xl shadow-2xl border border-white/20 flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="w-4 h-4 rounded-full shadow-md"
              style={{ backgroundColor: blob.color }}
            />
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-400">
                #{rank} Top Artist &bull; {country.name}
              </span>
              <h2 className="text-xl font-black text-white leading-tight">
                {artist.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors border border-white/10"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-2xl border border-white/10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Monthly Listeners
            </span>
            <div className="text-base font-extrabold text-white">
              {artist.listeners.toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Weekly Trend
            </span>
            <div className="mt-0.5">{getTrendBadge()}</div>
          </div>
        </div>

        {/* Genre Tag */}
        {artist.genre && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Genre:</span>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-sky-950/80 text-sky-300 border border-sky-500/30">
              {artist.genre}
            </span>
          </div>
        )}

        {/* Top Tracks Preview */}
        <div>
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-2">
            <Music className="w-3.5 h-3.5 text-sky-400" /> Top Tracks
          </span>
          <div className="flex flex-col gap-1.5">
            {artist.topTracks && artist.topTracks.length > 0 ? (
              artist.topTracks.slice(0, 3).map((track, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-xs font-semibold text-slate-200 flex items-center justify-between shadow-xs"
                >
                  <span className="truncate max-w-[80%]">
                    {idx + 1}. {track.title}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">Preview</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 italic">No tracks available</div>
            )}
          </div>
        </div>

        {/* Deezer Link */}
        {artist.deezerUrl && (
          <a
            href={artist.deezerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/25"
          >
            <span>Open on Deezer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Footer tip */}
        <div className="text-[11px] text-center text-slate-400 font-medium">
          Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10 text-slate-300 font-mono">Esc</kbd> or click empty space to return
        </div>
      </div>
    </div>
  );
};
