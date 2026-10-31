import { useEffect, type FC } from 'react';
import type { BlobInstanceData, TopTrack } from '../../types';
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Music,
  ExternalLink,
  Users,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Apple,
} from 'lucide-react';
import { getUnplacedArtists } from '../../utils/blobPlacement';
import { usePreviewPlayer } from '../../hooks/usePreviewPlayer';
import { assetUrl } from '../../utils/assetUrl';

interface ArtistPanelProps {
  blob: BlobInstanceData | null;
  allBlobs?: BlobInstanceData[];
  onSelectBlob?: (blob: BlobInstanceData) => void;
  onClose: () => void;
  trendAvailable?: boolean;
}

function getCountryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const codePoints = [...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export const ArtistPanel: FC<ArtistPanelProps> = ({
  blob,
  allBlobs = [],
  onSelectBlob,
  onClose,
  trendAvailable = false,
}) => {
  const { isPlaying, currentTrack, player } = usePreviewPlayer();

  // Keyboard navigation: Esc closes, Arrow keys switch between the country's artists
  useEffect(() => {
    if (!blob) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && onSelectBlob && allBlobs.length > 0) {
        const countryBlobs = allBlobs
          .filter((b) => b.country.code === blob.country.code)
          .sort((a, b) => a.rank - b.rank);

        if (countryBlobs.length > 1) {
          const currentIdx = countryBlobs.findIndex((b) => b.id === blob.id);
          if (currentIdx !== -1) {
            e.preventDefault();
            const nextIdx =
              e.key === 'ArrowRight'
                ? (currentIdx + 1) % countryBlobs.length
                : (currentIdx - 1 + countryBlobs.length) % countryBlobs.length;
            onSelectBlob(countryBlobs[nextIdx]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [blob, allBlobs, onSelectBlob, onClose]);

  if (!blob) return null;

  const defaultAvatar = assetUrl('avatars/default.png');
  const { artist, country, rank } = blob;
  const flag = getCountryFlag(country.code);
  const avatarUrl = artist.photoMissing ? defaultAvatar : artist.imageUrl || defaultAvatar;
  const genres = artist.genres || (artist.genre ? [artist.genre] : []);

  const getTrendBadge = () => {
    if (!trendAvailable) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10">
          <Minus className="w-3.5 h-3.5" /> Stable
        </span>
      );
    }

    switch (artist.trend) {
      case 'up':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            <TrendingUp className="w-3.5 h-3.5" /> Trending Up
          </span>
        );
      case 'down':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/30">
            <TrendingDown className="w-3.5 h-3.5" /> Trending Down
          </span>
        );
      case 'new':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" /> New Entry
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10">
            <Minus className="w-3.5 h-3.5" /> Stable
          </span>
        );
    }
  };

  const handleToggleTrack = (track: TopTrack) => {
    if (isPlaying && currentTrack?.previewUrl === track.previewUrl) {
      player.fadeOutAndPause();
    } else {
      player.playTrack(artist, track, blob.id);
    }
  };

  return (
    <div className="fixed top-[108px] sm:top-20 right-3 sm:right-6 left-3 sm:left-auto z-40 sm:w-84 max-h-[calc(100vh-125px)] sm:max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in slide-in-from-right-8 duration-200">
      <div className="glass-panel p-5 rounded-3xl shadow-2xl border border-white/20 flex flex-col gap-4 text-slate-100">
        {/* Header with Photo & Close Button (sticky so close button is always reachable on phones) */}
        <div className="sticky top-0 z-20 -m-5 mb-0 p-5 bg-slate-950/95 backdrop-blur-md border-b border-white/10 rounded-t-3xl flex items-start justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            {/* Bigger Artist Photo */}
            <div
              className="relative w-14 h-14 rounded-2xl p-0.5 shrink-0 shadow-lg"
              style={{ backgroundColor: blob.color }}
            >
              <img
                src={avatarUrl}
                alt={artist.name}
                onError={(e) => {
                  e.currentTarget.src = defaultAvatar;
                }}
                className="w-full h-full object-cover rounded-[14px] bg-slate-800"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-sky-400 truncate">
                <span>{flag}</span>
                <span>#{artist.bestRank || rank} Top Artist &bull; {country.name}</span>
              </div>
              <h2 className="text-xl font-black text-white leading-tight truncate" title={artist.name}>
                {artist.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors border border-white/10 shrink-0"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Grid: Chart Presence & Trend */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-2xl border border-white/10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Apple Music Chart
            </span>
            <div className="text-xs font-extrabold text-white mt-0.5">
              {artist.songsInChart || 1} song{(artist.songsInChart || 1) === 1 ? '' : 's'} in Top 100
            </div>
            <div className="text-[10px] font-semibold text-sky-300">
              best #{artist.bestRank || rank}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Chart Trend
            </span>
            <div className="mt-1">{getTrendBadge()}</div>
          </div>
        </div>

        {/* Genre Tags */}
        {genres.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400">Genres:</span>
            {genres.map((g, idx) => (
              <span
                key={idx}
                className="text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-sky-950/80 text-sky-300 border border-sky-500/30 truncate max-w-[150px]"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Charting Songs in Chart Order */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-sky-400" /> Charting Songs
            </span>

            {/* Quick Next/Prev Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => player.prevTrack(true)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Previous track"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => player.nextTrack(true)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Next track"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {artist.topTracks && artist.topTracks.length > 0 ? (
              artist.topTracks.map((track) => {
                const isThisTrackPlaying = isPlaying && currentTrack?.previewUrl === track.previewUrl;

                return (
                  <div
                    key={track.rank}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-colors ${
                      isThisTrackPlaying
                        ? 'bg-sky-950/70 border-sky-400/50 text-white'
                        : 'bg-slate-900/60 border-white/10 text-slate-200 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Play / Pause button for this track */}
                      {track.previewUrl ? (
                        <button
                          onClick={() => handleToggleTrack(track)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                            isThisTrackPlaying
                              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/40'
                              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
                          }`}
                          title={isThisTrackPlaying ? 'Pause' : 'Play preview'}
                        >
                          {isThisTrackPlaying ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5" />
                          )}
                        </button>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-slate-800/40 text-slate-600 flex items-center justify-center shrink-0">
                          <Music className="w-3 h-3" />
                        </div>
                      )}

                      {/* Album Cover Thumbnail */}
                      {track.albumCoverUrl && (
                        <img
                          src={track.albumCoverUrl}
                          alt="Cover"
                          className="w-7 h-7 rounded-md object-cover shrink-0 shadow-xs"
                        />
                      )}

                      {/* Rank & Title */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-sky-400 font-bold shrink-0">
                            #{track.rank}
                          </span>
                          <span className="truncate font-bold text-white max-w-[130px]" title={track.title}>
                            {track.title}
                          </span>
                          {/* "E" Badge for explicit content */}
                          {track.explicit && (
                            <span
                              className="text-[9px] font-black px-1 py-0.2 bg-slate-800 text-slate-300 rounded border border-white/20 shrink-0"
                              title="Explicit content"
                            >
                              E
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Apple Music song link */}
                    {track.appleUrl && (
                      <a
                        href={track.appleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-slate-400 hover:text-sky-300 font-bold flex items-center gap-0.5 shrink-0"
                        title="Open on Apple Music"
                      >
                        <Apple className="w-3 h-3" />
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-slate-400 italic">No tracks available</div>
            )}
          </div>
        </div>

        {/* Unplaced / Hidden artists for this country (+N more) */}
        {(() => {
          const hidden = getUnplacedArtists(country.code);
          if (hidden.length === 0) return null;
          return (
            <div className="bg-slate-900/70 p-3 rounded-2xl border border-white/10 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                <Users className="w-3.5 h-3.5" />
                <span>+{hidden.length} more in {country.name}</span>
              </div>
              <div className="flex flex-col gap-1 text-xs">
                {hidden.map((h) => {
                  const r = country.artists.findIndex((a) => a.id === h.id) + 1;
                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-800/60 border border-white/5"
                    >
                      <span className="font-semibold text-slate-200 truncate max-w-[160px]">
                        #{r} {h.name}
                      </span>
                      <span className="text-[10px] text-sky-300 font-semibold">
                        {h.songsInChart || 1} song{(h.songsInChart || 1) === 1 ? '' : 's'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Links: Apple Music & Deezer */}
        <div className="grid grid-cols-2 gap-2">
          {artist.appleArtistUrl && (
            <a
              href={artist.appleArtistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-white/10 shadow-sm"
            >
              <Apple className="w-3.5 h-3.5" />
              <span>Apple Music</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {artist.deezerUrl && (
            <a
              href={artist.deezerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20"
            >
              <span>Deezer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Platform Attribution */}
        <div className="text-[10px] text-center text-slate-400 font-medium">
          Photo: Deezer &bull; Previews courtesy of Apple Music
        </div>

        {/* Footer tip */}
        <div className="text-[10px] text-center text-slate-400 font-medium">
          Use <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-white/10 text-slate-300 font-mono">←</kbd> <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-white/10 text-slate-300 font-mono">→</kbd> to switch artists &bull; <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-white/10 text-slate-300 font-mono">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
};
