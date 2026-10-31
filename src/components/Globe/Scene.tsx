import { Suspense, forwardRef, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { EARTH_CONFIG } from '../../theme/earthConfig';
import { CleanEarth } from './CleanEarth';
import { CozySpaceBackdrop } from './CozySpaceBackdrop';
import { BlobsLayer } from './BlobsLayer';
import { CameraController } from './CameraController';
import { CountryMarkers } from './CountryMarkers';
import { CountryOutline } from './CountryOutline';
import { Controls, type ControlsHandle } from './Controls';
import type { BlobInstanceData } from '../../types';

interface SceneProps {
  autoRotate: boolean;
  blobs: BlobInstanceData[];
  selectedBlob: BlobInstanceData | null;
  playingBlobId?: string | null;
  trendAvailable?: boolean;
  isInteracting?: boolean;
  onSelectBlob: (blob: BlobInstanceData | null) => void;
  onHoverBlob: (blob: BlobInstanceData | null) => void;
  activeOutlineCountry?: string | null;
  debug?: boolean;
  showMarkers?: boolean;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onCameraTransitionChange?: (isFlying: boolean) => void;
  children?: ReactNode;
}

const isTouchDevice =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0));

export const Scene = forwardRef<ControlsHandle, SceneProps>(
  (
    {
      autoRotate,
      blobs,
      selectedBlob,
      playingBlobId = null,
      trendAvailable = false,
      isInteracting = false,
      onSelectBlob,
      onHoverBlob,
      activeOutlineCountry,
      debug = false,
      showMarkers = false,
      onInteractionStart,
      onInteractionEnd,
      onCameraTransitionChange,
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
            alpha: false,
            powerPreference: 'high-performance',
          }}
          dpr={[1, isTouchDevice ? 1.5 : 2]}
          onPointerMissed={(e) => {
            // Deselect when clicking empty space
            if (e.type === 'click') {
              onSelectBlob(null);
            }
          }}
        >
          {/* Planetary Sun Directional Lighting */}
          <directionalLight
            position={[5, 3, 5]}
            intensity={2.8}
            color="#fff8f0"
          />

          <Suspense fallback={null}>
            {/* Cozy Gradient Space Backdrop & Sparse Stars */}
            <CozySpaceBackdrop />

            {/* Clean, Soft, Premium Earth */}
            <CleanEarth
              radius={EARTH_CONFIG.PLANET_RADIUS}
              onDeselect={() => onSelectBlob(null)}
            />

            {/* Debug Country Candidate Markers & Footprints (Toggled with 'M' key) */}
            <CountryMarkers visible={showMarkers} blobs={blobs} />

            {/* Country Outline on Hover & Selection */}
            <CountryOutline countryCode={activeOutlineCountry ?? null} />

            {/* Kawaii Mochi Blobs (Star of the show!) */}
            <BlobsLayer
              blobs={blobs}
              selectedBlob={selectedBlob}
              playingBlobId={playingBlobId}
              trendAvailable={trendAvailable}
              isInteracting={isInteracting}
              onSelectBlob={(b) => onSelectBlob(b)}
              onHoverBlob={onHoverBlob}
              debug={debug}
            />

            {/* Camera Smooth Fly-To Controller */}
            <CameraController
              selectedBlob={selectedBlob}
              controlsRef={ref as React.RefObject<ControlsHandle>}
              onTransitionChange={onCameraTransitionChange}
            />

            {children}
          </Suspense>

          <Controls
            ref={ref}
            autoRotate={autoRotate}
            onInteractionStart={onInteractionStart}
            onInteractionEnd={onInteractionEnd}
          />
        </Canvas>
      </div>
    );
  }
);

Scene.displayName = 'Scene';
