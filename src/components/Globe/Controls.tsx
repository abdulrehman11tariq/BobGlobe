import { forwardRef, useImperativeHandle, useRef } from 'react';
import { OrbitControls as DreiOrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export interface ControlsHandle {
  resetCamera: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  getControls: () => OrbitControlsImpl | null;
}

interface ControlsProps {
  autoRotate?: boolean;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export const Controls = forwardRef<ControlsHandle, ControlsProps>(
  ({ autoRotate = true, onInteractionStart, onInteractionEnd }, ref) => {
    const controlsRef = useRef<OrbitControlsImpl>(null);

    useImperativeHandle(ref, () => ({
      resetCamera: () => {
        if (controlsRef.current) {
          controlsRef.current.reset();
        }
      },
      zoomIn: () => {
        if (controlsRef.current) {
          const camera = controlsRef.current.object;
          camera.position.multiplyScalar(0.85);
          controlsRef.current.update();
        }
      },
      zoomOut: () => {
        if (controlsRef.current) {
          const camera = controlsRef.current.object;
          camera.position.multiplyScalar(1.18);
          controlsRef.current.update();
        }
      },
      getControls: () => controlsRef.current,
    }));

    return (
      <DreiOrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.65}
        zoomSpeed={0.8}
        panSpeed={0.5}
        enablePan={false} // Keeping Earth centered looks cleanest for a globe app
        minDistance={3.2}
        maxDistance={9.5}
        autoRotate={autoRotate}
        autoRotateSpeed={0.55}
        onStart={onInteractionStart}
        onEnd={onInteractionEnd}
      />
    );
  }
);

Controls.displayName = 'Controls';
