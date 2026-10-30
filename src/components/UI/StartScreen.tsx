import { useState, type FC } from 'react';
import { Volume2, Sparkles } from 'lucide-react';
import { previewPlayer } from '../../audio/previewPlayer';

interface StartScreenProps {
  onEnter?: () => void;
}

export const StartScreen: FC<StartScreenProps> = ({ onEnter }) => {
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  const handleUnlock = async () => {
    await previewPlayer.unlockAudio();
    setIsUnlocked(true);
    setDismissed(true);
    if (onEnter) onEnter();
  };

  if (dismissed || isUnlocked) return null;

  return (
    <div
      onClick={handleUnlock}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md cursor-pointer animate-in fade-in duration-300 select-none"
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          handleUnlock();
        }}
        className="glass-panel p-8 sm:p-10 rounded-3xl max-w-sm w-[90%] text-center shadow-2xl border border-white/20 flex flex-col items-center gap-6"
      >
        {/* Cute Bouncing Blob Illustration */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-pink-400/20 blur-xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 via-rose-300 to-amber-200 shadow-xl flex flex-col items-center justify-center border-4 border-white/80 animate-bounce">
            {/* Eyes */}
            <div className="flex gap-4 mb-1">
              <div className="w-2.5 h-3 bg-slate-800 rounded-full" />
              <div className="w-2.5 h-3 bg-slate-800 rounded-full" />
            </div>
            {/* Smile */}
            <div className="w-4 h-2 border-b-2 border-slate-800 rounded-full" />
            {/* Cheeks */}
            <div className="absolute top-12 left-3 w-3 h-1.5 bg-rose-500/40 rounded-full" />
            <div className="absolute top-12 right-3 w-3 h-1.5 bg-rose-500/40 rounded-full" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-sky-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive 3D Music World</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Tap to enter BobGlobe
          </h1>
          <p className="text-xs text-slate-300 font-medium">
            Hover over artists across the planet to preview songs and discover music trends.
          </p>
        </div>

        {/* Enter Button */}
        <button
          onClick={handleUnlock}
          className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-sky-500/30 transition-all flex items-center justify-center gap-2 group active:scale-95"
        >
          <Volume2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>Enter BobGlobe</span>
        </button>
      </div>
    </div>
  );
};
