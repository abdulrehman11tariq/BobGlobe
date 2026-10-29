import { useEffect, useState, type FC } from 'react';
import { useProgress } from '@react-three/drei';

interface LoadingScreenProps {
  onLoaded?: () => void;
}

const FUN_MESSAGES = [
  'Sculpting low-poly hills & valleys...',
  'Planting sunny acacia & blossom trees...',
  'Puffing up low-poly sky clouds...',
  'Pouring sparkling turquoise oceans...',
  'Waking up cute music creatures...',
  'Almost ready for launch! 🌍✨',
];

export const LoadingScreen: FC<LoadingScreenProps> = ({ onLoaded }) => {
  const { progress, active } = useProgress();
  const [visible, setVisible] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);

  // Cycle through fun messages while loading
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % FUN_MESSAGES.length);
    }, 1100);
    return () => clearInterval(interval);
  }, []);

  // When loading finishes, wait a brief moment for smooth fadeout
  useEffect(() => {
    if (!active && progress === 100) {
      const timer = setTimeout(() => {
        setVisible(false);
        onLoaded?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [active, progress, onLoaded]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#63b7f4] via-[#a3d9fc] to-[#cae9fa] transition-opacity duration-700 ${
        !active && progress === 100 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background soft ambient sun aura */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-white/40 blur-3xl pointer-events-none" />

      {/* Cute Blob Mascot SVG Animation */}
      <div className="relative mb-6 flex flex-col items-center">
        <div className="relative w-28 h-28 flex items-center justify-center animate-bounce">
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_12px_20px_rgba(20,80,140,0.25)]">
            {/* Blob Body */}
            <path
              d="M60 15 C85 15, 105 35, 105 60 C105 90, 85 105, 60 105 C35 105, 15 90, 15 60 C15 35, 35 15, 60 15 Z"
              fill="url(#blobGrad)"
            />
            {/* Cute Cheeks */}
            <circle cx="36" cy="68" r="7" fill="#f472b6" opacity="0.75" />
            <circle cx="84" cy="68" r="7" fill="#f472b6" opacity="0.75" />
            {/* Left Eye */}
            <ellipse cx="44" cy="54" rx="5.5" ry="7.5" fill="#0f172a" />
            <circle cx="46" cy="51" r="2.5" fill="#ffffff" />
            {/* Right Eye */}
            <ellipse cx="76" cy="54" rx="5.5" ry="7.5" fill="#0f172a" />
            <circle cx="78" cy="51" r="2.5" fill="#ffffff" />
            {/* Cute Smile */}
            <path
              d="M53 66 Q60 74 67 66"
              stroke="#0f172a"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="transparent"
            />
            {/* Musical Headphones */}
            <path
              d="M22 60 A38 38 0 0 1 98 60"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="round"
              fill="transparent"
            />
            <rect x="16" y="52" width="10" height="18" rx="5" fill="#38bdf8" />
            <rect x="94" y="52" width="10" height="18" rx="5" fill="#38bdf8" />

            <defs>
              <linearGradient id="blobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#f472b6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Brand Title */}
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 drop-shadow-sm">
          BobGlobe
        </h1>
        <p className="text-xs uppercase tracking-widest text-sky-800 font-bold mt-1">
          Next Byte Hacks V5
        </p>
      </div>

      {/* Progress Bar Container */}
      <div className="w-64 max-w-[85vw] flex flex-col items-center">
        <div className="w-full bg-white/60 rounded-full h-3 p-0.5 border border-white/80 overflow-hidden shadow-inner">
          <div
            className="bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(56,189,248,0.5)]"
            style={{ width: `${Math.max(12, Math.round(progress))}%` }}
          />
        </div>

        {/* Status text */}
        <div className="w-full flex justify-between items-center text-xs text-sky-900 mt-2 font-semibold">
          <span className="truncate max-w-[75%] transition-all duration-300">
            {FUN_MESSAGES[messageIndex]}
          </span>
          <span className="font-mono text-sky-900 font-bold">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  );
};
