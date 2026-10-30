import type { FC } from 'react';
import { X, Trophy, ExternalLink } from 'lucide-react';
import type { GlobalTopArtist, BlobInstanceData } from '../../types';
import { assetUrl } from '../../utils/assetUrl';

interface GlobalTopPanelProps {
  isOpen: boolean;
  onClose: () => void;
  globalTop: GlobalTopArtist[];
  blobs: BlobInstanceData[];
  onSelectBlob: (blob: BlobInstanceData) => void;
}

function getCountryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const codePoints = [...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export const GlobalTopPanel: FC<GlobalTopPanelProps> = ({
  isOpen,
  onClose,
  globalTop,
  blobs,
  onSelectBlob,
}) => {
  if (!isOpen) return null;

  const top10 = (globalTop || []).slice(0, 10);

  const handleArtistClick = (artist: GlobalTopArtist) => {
    // Find matching placed blob for this artist
    const blobMatch =
      blobs.find((b) => b.artist.id === artist.id && b.country.code === artist.bestCountry) ||
      blobs.find((b) => b.artist.id === artist.id) ||
      blobs.find((b) => b.artist.name.toLowerCase() === artist.name.toLowerCase());

    if (blobMatch) {
      onSelectBlob(blobMatch);
    }
  };

  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/40 font-black';
    if (rank === 2) return 'bg-slate-300 text-slate-950 shadow-md font-black';
    if (rank === 3) return 'bg-amber-700 text-white shadow-md font-black';
    return 'bg-slate-800 text-slate-300 font-bold';
  };

  return (
    <div className="fixed top-20 left-6 z-40 w-80 max-w-[90vw] max-h-[82vh] flex flex-col glass-panel rounded-3xl p-5 shadow-2xl border border-white/20 text-white animate-in fade-in slide-in-from-left-6 duration-200 bg-slate-950/85 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white">Global Top 10</h2>
            <span className="text-[10px] text-slate-400 font-semibold">
              Most-Played Artists Worldwide
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors border border-white/10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Artists List */}
      <div className="flex flex-col gap-1.5 mt-3 overflow-y-auto pr-1">
        {top10.length === 0 ? (
          <div className="text-xs text-slate-400 italic py-4 text-center">
            No chart rankings available
          </div>
        ) : (
          top10.map((artist) => {
            const flag = getCountryFlag(artist.bestCountry);
            const defaultAvatar = assetUrl('avatars/default.png');
            const avatarUrl = artist.photoMissing
              ? defaultAvatar
              : artist.imageUrl || defaultAvatar;

            return (
              <div
                key={artist.id}
                onClick={() => handleArtistClick(artist)}
                className="group p-2 rounded-2xl bg-slate-900/50 hover:bg-slate-800/80 border border-white/5 hover:border-white/20 transition-all cursor-pointer flex items-center gap-2.5 shadow-xs"
              >
                {/* Rank Badge */}
                <span
                  className={`w-6 h-6 rounded-lg text-xs flex items-center justify-center shrink-0 ${getRankBadgeStyle(
                    artist.rank
                  )}`}
                >
                  {artist.rank}
                </span>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-slate-800">
                  <img
                    src={avatarUrl}
                    alt={artist.name}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = defaultAvatar;
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3
                      className="text-xs font-black text-white group-hover:text-sky-300 transition-colors truncate max-w-[130px]"
                      title={artist.name}
                    >
                      {artist.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                    <span>{flag}</span>
                    <span className="truncate max-w-[110px]">
                      #{artist.bestRank} in {artist.bestCountry}
                    </span>
                  </div>
                </div>

                {/* Deezer Link */}
                {artist.deezerUrl && (
                  <a
                    href={artist.deezerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-sky-300 hover:bg-slate-700/50 transition-colors"
                    title="Open on Deezer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-center text-slate-400 font-medium shrink-0">
        Click any artist to fly to their location on Earth
      </div>
    </div>
  );
};
