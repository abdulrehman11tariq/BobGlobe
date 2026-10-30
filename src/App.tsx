import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Scene } from './components/Globe/Scene';
import { ControlsOverlay } from './components/UI/ControlsOverlay';
import { Header } from './components/UI/Header';
import { LoadingScreen } from './components/UI/LoadingScreen';
import { BlobTooltip } from './components/UI/BlobTooltip';
import { ArtistPanel } from './components/UI/ArtistPanel';
import { DebugOverlay } from './components/UI/DebugOverlay';
import { StartScreen } from './components/UI/StartScreen';
import { AboutModal } from './components/UI/AboutModal';
import { AudioControlsBar } from './components/UI/AudioControlsBar';
import { SearchBar } from './components/UI/SearchBar';
import { GlobalTopPanel } from './components/UI/GlobalTopPanel';
import { BlobDebugPage } from './pages/BlobDebugPage';
import { useGlobeData } from './hooks/useGlobeData';
import { usePreviewPlayer } from './hooks/usePreviewPlayer';
import { computeGlobalBlobLayout } from './utils/blobPlacement';
import { loadLandMask, isLandMaskReady } from './utils/terrainSampler';
import { loadCountryIdMask, isCountryIdMaskReady } from './utils/countryIdSampler';
import { runLandmarkStartupCheck } from './utils/landmarkCheck';
import { runElevationAudit } from './utils/elevationAudit';
import { preloadImage } from './utils/imageCache';
import { BORDER_OUTLINE_CONFIG } from './theme/blobConfig';
import type { ControlsHandle } from './components/Globe/Controls';
import type { BlobInstanceData } from './types';

export function App() {
  const controlsRef = useRef<ControlsHandle>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [selectedBlob, setSelectedBlob] = useState<BlobInstanceData | null>(null);
  const [hoveredBlob, setHoveredBlob] = useState<BlobInstanceData | null>(null);
  const [activeOutlineCountry, setActiveOutlineCountry] = useState<string | null>(null);
  const [debug, setDebug] = useState<boolean>(false);
  const [showMarkers, setShowMarkers] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isGlobalTopOpen, setIsGlobalTopOpen] = useState<boolean>(false);
  const [auditMessage, setAuditMessage] = useState<string | null>(null);
  const [hasProcessedDeepLink, setHasProcessedDeepLink] = useState<boolean>(false);
  const [masksReady, setMasksReady] = useState<boolean>(
    isLandMaskReady() && isCountryIdMaskReady()
  );

  // Audio Engine Hook
  const { isPlaying, currentBlobId, player } = usePreviewPlayer();

  // Preload land mask & country ID mask textures for CPU lookups
  useEffect(() => {
    Promise.all([loadLandMask(), loadCountryIdMask()]).then(() => {
      setMasksReady(true);
    });
  }, []);

  // Country Outline on Hover & Selection Manager:
  // - Show outline of hovered blob's country immediately
  // - Moving between blobs in same country keeps outline steady with no flicker
  // - Hide 100ms after pointer leaves blobs (or revert to selected blob's country)
  // - Pause outline changes while dragging the globe
  useEffect(() => {
    if (isInteracting) return;

    if (hoveredBlob) {
      setActiveOutlineCountry(hoveredBlob.country.code);
    } else {
      const timer = setTimeout(() => {
        if (selectedBlob) {
          setActiveOutlineCountry(selectedBlob.country.code);
        } else {
          setActiveOutlineCountry(null);
        }
      }, BORDER_OUTLINE_CONFIG.LEAVE_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [hoveredBlob, selectedBlob, isInteracting]);

  // Check if initial route is /debug/blob
  const [isDebugBlobStudio, setIsDebugBlobStudio] = useState<boolean>(() => {
    return (
      window.location.pathname.includes('/debug/blob') ||
      window.location.search.includes('preview=blob')
    );
  });

  // 1. Load Data from /data/latest.json with fallback seed data
  const { data, error, refetch, maxListeners, trendAvailable, updatedAt, globalTop } = useGlobeData();

  // 2. Compute non-overlapping scattered blob placements inside own country
  const allBlobs = useMemo(() => {
    if (!data || !data.countries || !masksReady) return [];
    return computeGlobalBlobLayout(data.countries, maxListeners);
  }, [data, masksReady, maxListeners]);

  // Preload images for top global artists in memory (max 100 cache)
  useEffect(() => {
    if (globalTop && globalTop.length > 0) {
      globalTop.slice(0, 25).forEach((a) => {
        if (a.imageUrl) preloadImage(a.imageUrl);
      });
    }
  }, [globalTop]);

  // Select / Click Handler:
  // If user clicks a blob, open panel and ensure audio plays without restarting
  // If user clicks empty canvas (blob = null), deselect & stop playing
  const handleSelectBlob = useCallback(
    (blob: BlobInstanceData | null) => {
      setSelectedBlob(blob);
      if (blob) {
        // If not playing or playing another blob, trigger clean track for this blob
        if (!isPlaying || currentBlobId !== blob.id) {
          player.hoverBlob(blob.artist, blob.id);
        }
        // Sync deep link URL without page reload
        const url = new URL(window.location.href);
        url.searchParams.set('artist', blob.artist.id);
        url.searchParams.set('country', blob.country.code);
        window.history.replaceState({}, '', url.toString());
      } else {
        // Tap elsewhere = stop
        player.fadeOutAndPause();
        const url = new URL(window.location.href);
        url.searchParams.delete('artist');
        url.searchParams.delete('country');
        window.history.replaceState({}, '', url.toString());
      }
    },
    [isPlaying, currentBlobId, player]
  );

  // 3. Deep Link Resolution: ?artist=<artistId> or ?country=<ISO>
  useEffect(() => {
    if (hasProcessedDeepLink || allBlobs.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const artistParam = params.get('artist');
    const countryParam = params.get('country');

    if (artistParam) {
      const match =
        allBlobs.find((b) => b.artist.id === artistParam) ||
        allBlobs.find((b) => b.artist.name.toLowerCase() === artistParam.toLowerCase());
      if (match) {
        handleSelectBlob(match);
        setHasProcessedDeepLink(true);
        return;
      }
    }

    if (countryParam) {
      const countryCode = countryParam.toUpperCase();
      const match =
        allBlobs.find((b) => b.country.code === countryCode && b.rank === 1) ||
        allBlobs.find((b) => b.country.code === countryCode);
      if (match) {
        handleSelectBlob(match);
        setHasProcessedDeepLink(true);
      }
    }
  }, [allBlobs, hasProcessedDeepLink, handleSelectBlob]);

  // "Surprise Me" Random Explorer
  const handleSurpriseMe = useCallback(() => {
    if (allBlobs.length === 0) return;
    const randomBlob = allBlobs[Math.floor(Math.random() * allBlobs.length)];
    handleSelectBlob(randomBlob);
  }, [allBlobs, handleSelectBlob]);

  // 4. Dev-only startup check: verify all blobs on land & landmark continents
  useEffect(() => {
    if (import.meta.env.DEV && allBlobs.length > 0) {
      runLandmarkStartupCheck(allBlobs);
    }
  }, [allBlobs]);

  // 5. Keyboard Shortcuts: 'Escape' to deselect & return, 'D' to toggle debug, 'M' to toggle country markers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedBlob(null);
        setIsAboutOpen(false);
        setIsGlobalTopOpen(false);
      } else if (e.key === 'd' || e.key === 'D') {
        setDebug((prev) => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        setShowMarkers((prev) => !prev);
      } else if (e.key === 'g' || e.key === 'G') {
        const results = runElevationAudit(allBlobs);
        const pass = results.length > 0 && results.every((r) => r.passed);
        setAuditMessage(
          pass
            ? `✅ Elevation Audit PASSED: 8/8 sample blobs within < 0.003 units`
            : `⚠️ Elevation Audit: Check console for blob warnings`
        );
        setTimeout(() => setAuditMessage(null), 4000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allBlobs]);

  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev);
  }, []);

  const handleInteractionStart = useCallback(() => {
    setIsInteracting(true);
    player.setDraggingOrFlying(true);
  }, [player]);

  const handleInteractionEnd = useCallback(() => {
    setIsInteracting(false);
    player.setDraggingOrFlying(false);
  }, [player]);

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

  // Hover Handler: connects 350ms hover delay audio playback
  const handleHoverBlob = useCallback(
    (blob: BlobInstanceData | null) => {
      setHoveredBlob(blob);
      if (blob) {
        player.hoverBlob(blob.artist, blob.id);
      } else {
        player.hoverBlob(null, null);
      }
    },
    [player]
  );

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
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#0d1527]"
      onClick={() => {
        // Unlocks audio if not already unlocked
        player.unlockAudio();
      }}
    >
      {/* Audio Unlock Start Screen */}
      <StartScreen />

      {/* Loading Screen */}
      <LoadingScreen />

      {/* Top Header with SearchBar & Global Top 10 Toggle */}
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
        totalCountries={data?.countries.length || 116}
        updatedAt={updatedAt}
        onOpenStudio={() => {
          setIsDebugBlobStudio(true);
          window.history.pushState({}, '', '/debug/blob');
        }}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenGlobalTop={() => setIsGlobalTopOpen((prev) => !prev)}
      >
        <SearchBar
          blobs={allBlobs}
          countries={data?.countries || []}
          onSelectBlob={handleSelectBlob}
          onSurpriseMe={handleSurpriseMe}
        />
      </Header>

      {/* Global Top 10 Side Panel */}
      <GlobalTopPanel
        isOpen={isGlobalTopOpen}
        onClose={() => setIsGlobalTopOpen(false)}
        globalTop={globalTop}
        blobs={allBlobs}
        onSelectBlob={(b) => {
          handleSelectBlob(b);
          setIsGlobalTopOpen(false);
        }}
      />

      {/* About the Data Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        updatedAt={updatedAt}
      />

      {/* Hover Card (Round photo, flag, songs in chart, equalizer & progress) */}
      <BlobTooltip blob={hoveredBlob} trendAvailable={trendAvailable} />

      {/* Selected Artist Detail Panel */}
      <ArtistPanel
        blob={selectedBlob}
        allBlobs={allBlobs}
        onSelectBlob={handleSelectBlob}
        onClose={() => setSelectedBlob(null)}
        trendAvailable={trendAvailable}
      />

      {/* Fixed Audio Controls Bar (Mute + Volume Slider + Status) */}
      <AudioControlsBar />

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

      {/* Elevation Audit Toast Indicator (Toggle with 'G') */}
      {auditMessage && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-neutral-900/95 text-emerald-300 border border-emerald-400/50 shadow-2xl text-xs font-mono font-semibold flex items-center gap-2">
          <span>{auditMessage}</span>
          <span className="text-[10px] text-neutral-400">(logged to console)</span>
        </div>
      )}

      {/* 3D WebGL Canvas Scene */}
      <Scene
        ref={controlsRef}
        autoRotate={autoRotate && !isInteracting}
        blobs={allBlobs}
        selectedBlob={selectedBlob}
        playingBlobId={isPlaying ? currentBlobId : null}
        trendAvailable={trendAvailable}
        onSelectBlob={handleSelectBlob}
        onHoverBlob={handleHoverBlob}
        activeOutlineCountry={activeOutlineCountry}
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

      {/* Friendly Full-Screen Error State with Retry Button (no silent empty globe) */}
      {error && !data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-center animate-in fade-in duration-200">
          <div className="glass-panel p-8 rounded-3xl max-w-sm w-full border border-rose-500/30 flex flex-col items-center gap-5 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-400/30 shadow-lg text-2xl">
              ⚠️
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Unable to load globe data</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {error}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-6 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs shadow-lg shadow-sky-500/30 transition-all flex items-center gap-2 active:scale-95"
            >
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
