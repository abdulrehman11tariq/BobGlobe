import type { FC } from 'react';
import { Play, Pause, Plus, Minus, RotateCcw, Compass } from 'lucide-react';

interface ControlsOverlayProps {
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCamera: () => void;
}

export const ControlsOverlay: FC<ControlsOverlayProps> = ({
  autoRotate,
  onToggleAutoRotate,
  onZoomIn,
  onZoomOut,
  onResetCamera,
}) => {
  return (
    <>
      {/* Floating Control Buttons (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-20 flex flex-col gap-2.5">
        <button
          onClick={onToggleAutoRotate}
          title={autoRotate ? 'Pause Auto-Rotation' : 'Resume Auto-Rotation'}
          className="glass-btn w-11 h-11 rounded-2xl flex items-center justify-center text-slate-200 hover:text-sky-400 group relative"
        >
          {autoRotate ? (
            <Pause className="w-5 h-5 transition-transform group-hover:scale-110" />
          ) : (
            <Play className="w-5 h-5 transition-transform group-hover:scale-110 ml-0.5" />
          )}
        </button>

        <button
          onClick={onZoomIn}
          title="Zoom In"
          className="glass-btn w-11 h-11 rounded-2xl flex items-center justify-center text-slate-200 hover:text-sky-400 group"
        >
          <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
        </button>

        <button
          onClick={onZoomOut}
          title="Zoom Out"
          className="glass-btn w-11 h-11 rounded-2xl flex items-center justify-center text-slate-200 hover:text-sky-400 group"
        >
          <Minus className="w-5 h-5 transition-transform group-hover:scale-110" />
        </button>

        <button
          onClick={onResetCamera}
          title="Reset Camera View"
          className="glass-btn w-11 h-11 rounded-2xl flex items-center justify-center text-slate-200 hover:text-sky-400 group"
        >
          <RotateCcw className="w-5 h-5 transition-transform group-hover:rotate-[-45deg]" />
        </button>
      </div>

      {/* Exploration Hint Pill (Bottom Center) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="glass-pill px-4 py-2 rounded-full flex items-center gap-2 text-xs font-semibold text-slate-200 shadow-md">
          <Compass className="w-4 h-4 text-sky-400 animate-spin-slow" />
          <span>Drag to explore &bull; Scroll to zoom &bull; Click to inspect</span>
        </div>
      </div>
    </>
  );
};
