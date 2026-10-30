import type { FC } from 'react';
import type { BlobInstanceData } from '../../types';
import { TrendingUp, TrendingDown, Minus, Sparkles, Music2, AlertCircle } from 'lucide-react';
import { usePreviewPlayer } from '../../hooks/usePreviewPlayer';
import { assetUrl } from '../../utils/assetUrl';

interface BlobTooltipProps {
  blob: BlobInstanceData | null;
  trendAvailable?: boolean;
}

function getCountryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const codePoints = [...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export const BlobTooltip: FC<BlobTooltipProps> = ({ blob, trendAvailable = false }) => {
  const { isPlaying, currentTrack, currentTime, duration, statusMessage } = usePreviewPlayer();

  if (!blob) return null;

  const defaultAvatar = assetUrl('avatars/default.png');
  const { artist, country, rank } = blob;
  const flag = getCountryFlag(country.code);
  const avatarUrl = artist.photoMissing ? defaultAvatar : artist.imageUrl || defaultAvatar;

  const genres = (artist.genres || (artist.genre ? [artist.genre] : [])).slice(0, 2);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-emerald-400" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-rose-400" />;
      case 'new':
        return <Sparkles className="w-3 h-3 text-amber-400" />;
      default:
        return <Minus className="w-3 h-3 text-slate-400" />;
    }
  };

  const progressPercent = Math.min(100, Math.max(0, (currentTime / (duration || 30)) * 100));

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-200">
      <div className="glass-panel p-4 rounded-3xl shadow-2xl border border-white/25 flex flex-col gap-3 min-w-[320px] max-w-[380px] text-white animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md bg-slate-950/80">
        {/* Top Row: Avatar, Name, Country Flag & Rank */}
        <div className="flex items-center gap-3">
          {/* Round artist photo with colored ring */}
          <div
            className="relative w-12 h-12 rounded-full p-[2.5px] shrink-0 shadow-md"
            style={{ backgroundColor: blob.color }}
          >
            <img
              src={avatarUrl}
              alt={artist.name}
              onError={(e) => {
                e.currentTarget.src = defaultAvatar;
              }}
              className="w-full h-full object-cover rounded-full bg-slate-800"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-black text-sm text-white truncate max-w-[200px]" title={artist.name}>
                {artist.name}
              </h3>
              {trendAvailable && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded-md border border-white/10 shrink-0">
                  {getTrendIcon(artist.trend)}
                  <span className="capitalize">{artist.trend}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-sky-300 font-bold mt-0.5 truncate">
              <span>{flag}</span>
              <span>#{artist.bestRank || rank} in {country.name}</span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-slate-300 font-semibold">
                {artist.songsInChart || 1} song{artist.songsInChart === 1 ? '' : 's'} in Top 100
              </span>
            </div>
          </div>
        </div>

        {/* Genres Chips */}
        {genres.length > 0 && (
          <div className="flex items-center gap-1.5">
            {genres.map((g, i) => (
              <span
                key={i}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-950/70 text-sky-300 border border-sky-500/25 truncate max-w-[140px]"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Bottom Audio Status: Now Playing or Clean Notice */}
        <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
          {isPlaying && currentTrack ? (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2 truncate max-w-[220px]">
                  {currentTrack.albumCoverUrl ? (
                    <img
                      src={currentTrack.albumCoverUrl}
                      alt="Cover"
                      className="w-6 h-6 rounded object-cover shadow-sm shrink-0"
                    />
                  ) : (
                    <Music2 className="w-4 h-4 text-sky-400 shrink-0" />
                  )}
                  <span className="font-extrabold text-[11px] text-white truncate">
                    {currentTrack.title}
                  </span>
                </div>

                {/* Animated CSS Equalizer Bars synced to 100 BPM clock */}
                <div className="flex items-end gap-[2px] h-3.5 shrink-0 px-1">
                  <span className="w-1 bg-sky-400 rounded-full animate-eq-bar-1" />
                  <span className="w-1 bg-indigo-400 rounded-full animate-eq-bar-2" />
                  <span className="w-1 bg-pink-400 rounded-full animate-eq-bar-3" />
                  <span className="w-1 bg-amber-400 rounded-full animate-eq-bar-4" />
                </div>
              </div>

              {/* 30-Second Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-400 to-indigo-400 h-1 rounded-full transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : statusMessage ? (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300/90 py-0.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{statusMessage}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold py-0.5">
              <Music2 className="w-3 h-3 text-sky-400" />
              <span>Hovering for preview...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
