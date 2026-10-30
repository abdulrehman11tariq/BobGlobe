import type { FC, ReactNode } from 'react';
import { Globe2, Sparkles, Info, Trophy } from 'lucide-react';

interface HeaderProps {
  lastUpdated?: string;
  totalCountries?: number;
  updatedAt?: string | null;
  onOpenStudio?: () => void;
  onOpenAbout?: () => void;
  onOpenGlobalTop?: () => void;
  children?: ReactNode;
}

function getHoursAgoText(updatedAt?: string | null): string {
  if (!updatedAt) return 'Updated recently';
  try {
    const diffMs = Date.now() - new Date(updatedAt).getTime();
    const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    if (diffHours === 0) return 'Updated just now';
    if (diffHours === 1) return 'Updated 1 hour ago';
    return `Updated ${diffHours} hours ago`;
  } catch {
    return 'Updated recently';
  }
}

export const Header: FC<HeaderProps> = ({
  lastUpdated,
  totalCountries = 116,
  updatedAt,
  onOpenStudio,
  onOpenAbout,
  onOpenGlobalTop,
  children,
}) => {
  const updatedChipText = getHoursAgoText(updatedAt);

  return (
    <header className="fixed top-0 left-0 right-0 z-30 pointer-events-none p-3 sm:p-5 flex flex-wrap items-center justify-between gap-3">
      {/* Brand & Subtitle */}
      <div className="pointer-events-auto flex items-center gap-3 glass-panel px-4 py-2 rounded-2xl shadow-xl">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center shadow-md shadow-sky-500/25 shrink-0">
          <Globe2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-base tracking-tight text-white">
              BobGlobe
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
              Apple Music Country Charts
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-semibold">
            Photorealistic Earth &bull; {totalCountries} Countries
          </p>
        </div>
      </div>

      {/* Center Slot (e.g. Search Bar) */}
      {children && <div className="pointer-events-auto flex items-center">{children}</div>}

      {/* Top Right Action Pills */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Global Top 10 Toggle Button */}
        {onOpenGlobalTop && (
          <button
            onClick={onOpenGlobalTop}
            className="glass-btn px-3.5 py-1.5 rounded-full text-xs font-extrabold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 shadow-sm border border-amber-400/30"
            title="Open Global Top 10 Chart"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Global Top 10</span>
          </button>
        )}

        {/* "About the data" Button */}
        {onOpenAbout && (
          <button
            onClick={onOpenAbout}
            className="glass-btn px-3.5 py-1.5 rounded-full text-xs font-extrabold text-slate-200 hover:text-white flex items-center gap-1.5 shadow-sm"
            title="About the data"
          >
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">About</span>
          </button>
        )}

        {/* Blob Studio Shortcut */}
        {onOpenStudio && (
          <button
            onClick={onOpenStudio}
            className="hidden lg:flex glass-btn px-3.5 py-1.5 rounded-full text-xs font-extrabold text-slate-200 hover:text-white items-center gap-1.5 shadow-sm"
            title="Open Kawaii Mochi Studio (/debug/blob)"
          >
            <span>Blob Studio</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded font-mono">/debug/blob</span>
          </button>
        )}

        {/* "Updated X hours ago" chip */}
        <div className="hidden sm:flex items-center gap-2 glass-pill px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-200">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>{lastUpdated || updatedChipText}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
        </div>
      </div>
    </header>
  );
};
