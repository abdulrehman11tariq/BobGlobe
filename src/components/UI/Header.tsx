import type { FC } from 'react';
import { Globe2, Sparkles } from 'lucide-react';

interface HeaderProps {
  lastUpdated?: string;
  totalCountries?: number;
  onOpenStudio?: () => void;
}

export const Header: FC<HeaderProps> = ({
  lastUpdated = 'Phase 1 Live Demo',
  totalCountries = 60,
  onOpenStudio,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 pointer-events-none p-4 md:p-6 flex items-start justify-between">
      {/* Brand & Subtitle */}
      <div className="pointer-events-auto flex items-center gap-3 glass-panel px-4 py-2.5 rounded-2xl">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center shadow-md shadow-sky-500/25">
          <Globe2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-lg tracking-tight text-white">
              BobGlobe
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
              Next Byte Hacks V5
            </span>
          </div>
          <p className="text-xs text-slate-300 font-semibold">
            Photorealistic Earth &bull; {totalCountries} Countries
          </p>
        </div>
      </div>

      {/* Top Right Action Pills */}
      <div className="pointer-events-auto flex items-center gap-2">
        {onOpenStudio && (
          <button
            onClick={onOpenStudio}
            className="glass-btn px-3.5 py-1.5 rounded-full text-xs font-extrabold text-slate-200 hover:text-white flex items-center gap-1.5 shadow-sm"
            title="Open Kawaii Mochi Studio (/debug/blob)"
          >
            <span>Blob Studio</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded font-mono">/debug/blob</span>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-2 glass-pill px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-200">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>{lastUpdated}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
        </div>
      </div>
    </header>
  );
};
