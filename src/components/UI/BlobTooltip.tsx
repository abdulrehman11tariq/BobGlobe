import type { FC } from 'react';
import type { BlobInstanceData } from '../../types';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';

interface BlobTooltipProps {
  blob: BlobInstanceData | null;
}

export const BlobTooltip: FC<BlobTooltipProps> = ({ blob }) => {
  if (!blob) return null;

  const { artist, country, rank } = blob;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
      case 'down':
        return <TrendingDown className="w-3.5 h-3.5 text-rose-500" />;
      case 'new':
        return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Minus className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-200">
      <div className="glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-lg border border-white/80 animate-in fade-in zoom-in-95 duration-150">
        {/* Blob Color Dot */}
        <span
          className="w-3.5 h-3.5 rounded-full shadow-sm"
          style={{ backgroundColor: blob.color }}
        />

        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-white">{artist.name}</span>
            <span className="text-[11px] font-bold text-sky-300 bg-sky-900/60 px-1.5 py-0.5 rounded-md border border-sky-400/30">
              #{rank} in {country.name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold mt-0.5">
            <span>{artist.listeners.toLocaleString()} monthly listeners</span>
            <span className="flex items-center gap-0.5">
              {getTrendIcon(artist.trend)}
              <span className="capitalize">{artist.trend}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
