import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Scene } from './components/Globe/Scene';
import { ControlsOverlay } from './components/UI/ControlsOverlay';
import { Header } from './components/UI/Header';
import { LoadingScreen } from './components/UI/LoadingScreen';
import { BlobTooltip } from './components/UI/BlobTooltip';
import { ArtistPanel } from './components/UI/ArtistPanel';
import { DebugOverlay } from './components/UI/DebugOverlay';
import { BlobDebugPage } from './pages/BlobDebugPage';
import { useGlobeData } from './hooks/useGlobeData';
import { generateCountryBlobs } from './utils/blobPlacement';
import { loadLandMask, isLandMaskReady } from './utils/terrainSampler';
import { runLandmarkStartupCheck } from './utils/landmarkCheck';
import type { ControlsHandle } from './components/Globe/Controls';
import type { BlobInstanceData } from './types';

export function App() {
  const controlsRef = useRef<ControlsHandle>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [selectedBlob, setSelectedBlob] = useState<BlobInstanceData | null>(null);
  const [hoveredBlob, setHoveredBlob] = useState<BlobInstanceData | null>(null);
  const [debug, setDebug] = useState<boolean>(false);
  const [showMarkers, setShowMarkers] = useState<boolean>(false);
  const [maskReady, setMaskReady] = useState<boolean>(isLandMaskReady());
  
  // Preload land mask texture for pixel-level sampling
  useEffect(() => {
    loadLandMask().then(() => setMaskReady(true));
  }, []);

  // Check if initial route is /debug/blob
  const [isDebugBlobStudio, setIsDebugBlobStudio] = useState<boolean>(() => {
    return (
      window.location.pathname.includes('/debug/blob') ||
      window.location.search.includes('preview=blob')
    );
  });

  // 1. Load Seed Data from /data/latest.json
  const { data, error, maxListeners } = useGlobeData();

  // 2. Compute non-overlapping blob placements on the terrain surface
  const allBlobs = useMemo(() => {
    if (!data || !data.countries || !maskReady) return [];

    const list: BlobInstanceData[] = [];
    for (const country of data.countries) {
      const countryBlobs = generateCountryBlobs(country, maxListeners);
      list.push(...countryBlobs);
    }
    return list;
  }, [data, maskReady, maxListeners]);

  // 3. Dev-only startup check: verify all blobs on land & landmark continents
  useEffect(() => {
    if (import.meta.env.DEV && allBlobs.length > 0) {
      runLandmarkStartupCheck(allBlobs);
    }
  }, [allBlobs]);

  // 4. Keyboard Shortcuts: 'Escape' to deselect & return, 'D' to toggle debug, 'M' to toggle country markers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedBlob(null);
      } else if (e.key === 'd' || e.key === 'D') {
        setDebug((prev) => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        setShowMarkers((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev);
  }, []);

  const handleInteractionStart = useCallback(() => {
    setIsInteracting(true);
  }, []);

  const handleInteractionEnd = useCallback(() => {
    setIsInteracting(false);
  }, []);

  const handleZoomIn = useCallback(() => {
    controlsRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    controlsRef.current?.zoomOut();
  }, []);

  const handleResetCamera = useCallback(() => {
    setSelectedBlob(null);
    controlsRef.current?.resetCamera();
  }, []);

  if (isDebugBlobStudio) {
    return (
      <BlobDebugPage
        onReturnToGlobe={() => {
          setIsDebugBlobStudio(false);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0d1527]">
      {/* Loading Screen */}
      <LoadingScreen />

      {/* Top Header */}
      <Header
        lastUpdated={
          selectedBlob
            ? `Viewing: ${selectedBlob.artist.name}`
            : isInteracting
            ? 'Exploring'
            : autoRotate
            ? 'Auto-Orbiting'
            : 'Paused'
        }
        totalCountries={data?.countries.length || 60}
        onOpenStudio={() => {
          setIsDebugBlobStudio(true);
          window.history.pushState({}, '', '/debug/blob');
        }}
      />

      {/* Hover Tooltip */}
      <BlobTooltip blob={hoveredBlob} />

      {/* Selected Artist Detail Panel */}
      <ArtistPanel
        blob={selectedBlob}
        onClose={() => setSelectedBlob(null)}
      />

      {/* Debug Info Overlay (Toggle with 'D') */}
      <DebugOverlay
        enabled={debug}
        blobCount={allBlobs.length}
        countryCount={data?.countries.length || 0}
      />

      {/* Debug Marker Mode Indicator (Toggle with 'M') */}
      {showMarkers && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-full bg-neutral-900/90 text-yellow-300 border border-yellow-400/50 shadow-xl text-xs font-mono font-semibold flex items-center gap-2 animate-pulse">
          <span>📍 Country Coordinates Active</span>
          <span className="text-[10px] text-neutral-400">(Press M to hide)</span>
        </div>
      )}

      {/* 3D WebGL Canvas Scene */}
      <Scene
        ref={controlsRef}
        autoRotate={autoRotate && !isInteracting}
        blobs={allBlobs}
        selectedBlob={selectedBlob}
        onSelectBlob={setSelectedBlob}
        onHoverBlob={setHoveredBlob}
        debug={debug}
        showMarkers={showMarkers}
        onInteractionStart={handleInteractionStart}
        onInteractionEnd={handleInteractionEnd}
      />

      {/* Bottom Floating Controls */}
      <ControlsOverlay
        autoRotate={autoRotate && !selectedBlob}
        onToggleAutoRotate={handleToggleAutoRotate}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetCamera={handleResetCamera}
        showMarkers={showMarkers}
        onToggleMarkers={() => setShowMarkers((prev) => !prev)}
      />

      {/* Error Banner if data fetch fails */}
      {error && (
        <div className="fixed bottom-20 left-6 z-50 glass-panel px-4 py-2 rounded-xl text-xs font-bold text-rose-600 border border-rose-300">
          ⚠️ {error}
        </div>
      )}
    </main>
  );
}

export default App;
