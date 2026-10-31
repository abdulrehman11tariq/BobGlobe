import type { FC } from 'react';
import { X, Info, Apple, Music2 } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  updatedAt?: string | null;
}

export const AboutModal: FC<AboutModalProps> = ({ isOpen, onClose, updatedAt }) => {
  if (!isOpen) return null;

  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel max-w-md w-full p-6 rounded-3xl shadow-2xl border border-white/20 text-slate-100 flex flex-col gap-5 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
              <Info className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-black text-white">About the data</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors border border-white/10"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Required Exact Explanatory Text */}
        <div className="text-xs leading-relaxed text-slate-200 bg-slate-900/60 p-4 rounded-2xl border border-white/10 space-y-3 font-medium">
          <p>
            Blob size shows how many of a country's current Apple Music most-played Top 100 songs belong to each artist, with higher chart positions counting more. It reflects Apple Music's country chart, updated daily, and is not a full picture of everything people listen to. Artist photos come from Deezer. Song previews and links come from Apple Music.
          </p>
          {formattedDate && (
            <div className="text-[11px] font-bold text-sky-300 pt-1 border-t border-white/5 flex items-center justify-between">
              <span>Last chart snapshot:</span>
              <span className="font-mono text-slate-300">{formattedDate}</span>
            </div>
          )}
        </div>

        {/* Source Badges */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/40 border border-white/5">
            <Apple className="w-4 h-4 text-white" />
            <div>
              <div className="font-bold text-white text-[11px]">Apple Music</div>
              <div className="text-[10px] text-slate-400">Charts & Previews</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/40 border border-white/5">
            <Music2 className="w-4 h-4 text-sky-400" />
            <div>
              <div className="font-bold text-white text-[11px]">Deezer</div>
              <div className="text-[10px] text-slate-400">Artist Photos</div>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="text-[10px] leading-relaxed text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-white/5">
          <span className="font-bold text-slate-300">Disclaimer: </span>
          Not affiliated with or endorsed by Apple, Deezer or the artists. Hackathon project, non-commercial. Artist names, photos and audio previews belong to their owners.
        </div>

        {/* Open Source Credits */}
        <div className="text-[10px] text-slate-400 text-center space-y-0.5">
          <div>Geography: Natural Earth (Public Domain) &bull; Font: Plus Jakarta Sans (OFL)</div>
          <div>Built with Three.js, React Three Fiber & Lucide (MIT / ISC)</div>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors border border-white/10"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
