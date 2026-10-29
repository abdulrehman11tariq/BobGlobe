import { Suspense, forwardRef, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { EARTH_CONFIG } from '../../theme/earthConfig';
import { CleanEarth } from './CleanEarth';
import { CozySpaceBackdrop } from './CozySpaceBackdrop';
import { BlobsLayer } from './BlobsLayer';
import { CameraController } from './CameraController';
import { Controls, type ControlsHandle } from './Controls';
import type { BlobInstanceData } from '../../types';

interface SceneProps {
  autoRotate: boolean;
  blobs: BlobInstanceData[];
  selectedBlob: BlobInstanceData | null;
  onSelectBlob: (blob: BlobInstanceData | null) => void;
  onHoverBlob: (blob: BlobInstanceData | null) => void;
  debug?: boolean;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  children?: ReactNode;
}

export const Scene = forwardRef<ControlsHandle, SceneProps>(
  (
    {
      autoRotate,
      blobs,
      selectedBlob,
      onSelectBlob,
      onHoverBlob,
      debug = false,
      onInteractionStart,
      onInteractionEnd,
      children,
    },
    ref
  ) => {
    return (
      <div className="w-full h-full absolute inset-0 bg-[#0f172a]">
        <Canvas
          camera={{
            position: [0, 1.2, 5.8],
            fov: 45,
            near: 0.1,
            far: 1000,
          }}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            alpha: false,
          }}
          shadows
          dpr={[1, 2]}
          onPointerMissed={() => {
            onSelectBlob(null);
          }}
        >
          {/* Gentle Lighting Setup: NO black night side! */}
          {/* Strong Hemisphere / Sky Ambient Fill */}
          <hemisphereLight
            args={[
              EARTH_CONFIG.lighting.hemiSkyColor,
              EARTH_CONFIG.lighting.hemiGroundColor,
              EARTH_CONFIG.lighting.hemiIntensity,
            ]}
          />

          {/* Soft Warm Key Sun Light */}
          <directionalLight
            position={EARTH_CONFIG.lighting.keySunPosition}
            intensity={EARTH_CONFIG.lighting.keySunIntensity}
            color={EARTH_CONFIG.lighting.keySunColor}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0002}
          />

          {/* Soft Opposite Fill to ensure tranquil blue-gray depth */}
          <directionalLight
            position={[-9, -4, -8]}
            intensity={0.4}
            color="#38bdf8"
          />

          <Suspense fallback={null}>
            {/* Cozy Gradient Space Backdrop & Sparse Stars */}
            <CozySpaceBackdrop />

            {/* Clean, Soft, Premium Earth */}
            <CleanEarth
              radius={EARTH_CONFIG.PLANET_RADIUS}
              sunPosition={EARTH_CONFIG.lighting.keySunPosition}
            />

            {/* Kawaii Mochi Blobs (Star of the show!) */}
            <BlobsLayer
              blobs={blobs}
              selectedBlob={selectedBlob}
              onSelectBlob={(b) => onSelectBlob(b)}
              onHoverBlob={onHoverBlob}
              debug={debug}
            />

            {/* Camera Smooth Fly-To Controller */}
            <CameraController
              selectedBlob={selectedBlob}
              controlsRef={ref as React.RefObject<ControlsHandle>}
            />

            {children}
          </Suspense>

          <Controls
            ref={ref}
            autoRotate={autoRotate && !selectedBlob}
            onInteractionStart={onInteractionStart}
            onInteractionEnd={onInteractionEnd}
          />
        </Canvas>
      </div>
    );
  }
);

Scene.displayName = 'Scene';
