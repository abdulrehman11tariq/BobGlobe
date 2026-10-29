import { useState, useEffect, useRef, type FC } from 'react';
import { Activity, CircleDot, Globe2 } from 'lucide-react';

interface DebugOverlayProps {
  enabled: boolean;
  blobCount: number;
  countryCount: number;
}

export const DebugOverlay: FC<DebugOverlayProps> = ({ enabled, blobCount, countryCount }) => {
  const [fps, setFps] = useState<number>(60);
  const frameCount = useRef<number>(0);
  const lastTime = useRef<number>(performance.now());

  useEffect(() => {
    let animId: number;

    const loop = (now: number) => {
      frameCount.current++;
      const elapsed = now - lastTime.current;

      if (elapsed >= 500) {
        const currentFps = Math.round((frameCount.current * 1000) / elapsed);
        setFps(currentFps);
        frameCount.current = 0;
        lastTime.current = now;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  if (!enabled) return null;

  return (
    <div className="fixed top-20 left-6 z-40 pointer-events-none animate-in fade-in duration-150">
      <div className="glass-panel p-3.5 rounded-2xl border border-rose-400/40 shadow-xl flex flex-col gap-2 font-mono text-xs text-slate-200">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1.5">
          <span className="font-bold text-[10px] uppercase tracking-wider text-rose-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" /> Debug Mode [D]
          </span>
          <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
            fps >= 55 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {fps} FPS
          </span>
        </div>

        <div className="flex flex-col gap-1 text-[11px] text-slate-300 font-medium">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <CircleDot className="w-3.5 h-3.5 text-sky-400" /> Active Blobs:
            </span>
            <span className="font-bold text-white">{blobCount}</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-emerald-400" /> Countries:
            </span>
            <span className="font-bold text-white">{countryCount}</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-rose-400" /> Spacing Rings:
            </span>
            <span className="font-bold text-rose-400">Visible</span>
          </div>
        </div>
      </div>
    </div>
  );
};
