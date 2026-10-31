import { useCallback, type FC } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { ArrowLeft, Download, Sparkles, Image as ImageIcon } from 'lucide-react';
import { MOCHI_CONFIG } from '../theme/mochiConfig';
import { createMochiGeometry, createFaceShellGeometry } from '../components/Blob/MochiGeometry';
import { getFaceTexture, type BlobExpression } from '../components/Blob/FaceTextures';

interface ThumbnailGeneratorPageProps {
  onReturnToGlobe: () => void;
}

// 1. Shared Geometries for Thumbnails
const sharedMochiGeom = createMochiGeometry();
const sharedFaceShellGeom = createFaceShellGeometry();
const sharedShadowGeom = new THREE.CircleGeometry(0.85, 24);

// Crown Accessory Geometry
function createCrownGeometry(): THREE.BufferGeometry {
  const geom = new THREE.CylinderGeometry(0.26, 0.22, 0.22, 5, 1, false);
  return geom;
}
const sharedCrownGeom = createCrownGeometry();

// Miniature Hero Blob Component for Canvas
interface HeroBlobProps {
  position: [number, number, number];
  scale?: number;
  color: string;
  hasCrown?: boolean;
  accessoryColor?: string;
  expression?: BlobExpression;
}

const HeroBlob: FC<HeroBlobProps> = ({
  position,
  scale = 1.0,
  color,
  hasCrown = false,
  accessoryColor = '#fbbf24',
  expression = 'idle',
}) => {
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.75,
    metalness: 0.02,
  });

  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(MOCHI_CONFIG.OUTLINE_COLOR),
    side: THREE.BackSide,
  });

  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#101828'),
  });

  const faceTexture = getFaceTexture(expression, 'star');
  const faceMaterial = new THREE.MeshBasicMaterial({
    map: faceTexture,
    transparent: false,
    alphaTest: 0.1,
  });

  const crownMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accessoryColor),
    roughness: 0.3,
    metalness: 0.2,
  });

  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Contact Shadow */}
      <mesh
        geometry={sharedShadowGeom}
        material={shadowMaterial}
        position={[0, -0.75, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* Main Mochi Body */}
      <mesh geometry={sharedMochiGeom} material={bodyMaterial}>
        {/* Crisp Toon Outline */}
        <mesh
          geometry={sharedMochiGeom}
          material={outlineMaterial}
          scale={[1.05, 1.05, 1.05]}
        />
      </mesh>

      {/* Curved Face Shell */}
      <mesh
        geometry={sharedFaceShellGeom}
        material={faceMaterial}
        position={[0, 0.05, 0.01]}
        scale={[1.0, 1.0, 1.0]}
      />

      {/* Crown */}
      {hasCrown && (
        <group position={[0, 0.85, 0]} rotation={[0.08, 0.12, -0.05]}>
          <mesh geometry={sharedCrownGeom} material={crownMaterial} />
        </group>
      )}
    </group>
  );
};

// Planet Arc at the bottom
const PlanetArc: FC = () => {
  const oceanMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1B4332'),
    roughness: 0.85,
  });

  return (
    <group position={[0, -5.6, 0]}>
      <mesh material={oceanMaterial}>
        <sphereGeometry args={[5.2, 48, 32]} />
      </mesh>
    </group>
  );
};

export const ThumbnailGeneratorPage: FC<ThumbnailGeneratorPageProps> = ({
  onReturnToGlobe,
}) => {
  // Helper to trigger browser download of a blob
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 1. Download Devpost 1500x1000 Thumbnail
  const handleDownloadThumbnail = useCallback(() => {
    const webglCanvas = document.querySelector<HTMLCanvasElement>('#thumbnail-webgl canvas');
    if (!webglCanvas) return;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = 1500;
    outCanvas.height = 1000;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    // Draw WebGL snapshot
    ctx.drawImage(webglCanvas, 0, 0, 1500, 1000);

    // Overlay typography
    ctx.save();
    ctx.textAlign = 'center';

    // Title: BobGlobe
    ctx.font = '800 92px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.85)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 8;
    ctx.fillText('BobGlobe', 750, 190);

    // Tagline Pill
    ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#7dd3fc';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.fillText("Every country's top artists, as cute blobs", 750, 250);

    ctx.restore();

    outCanvas.toBlob((blob) => {
      if (blob) triggerDownload(blob, 'thumbnail-1500x1000.png');
    }, 'image/png');
  }, []);

  // 2. Download 512x512 App Icon
  const handleDownloadIcon = useCallback(() => {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = 512;
    outCanvas.height = 512;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    // Solid Cozy Indigo Background with Rounded Rect
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Draw Hero Blob Snapshot from center of WebGL
    const webglCanvas = document.querySelector<HTMLCanvasElement>('#thumbnail-webgl canvas');
    if (webglCanvas) {
      // Crop center 50%
      const srcSize = Math.min(webglCanvas.width, webglCanvas.height) * 0.55;
      const sx = (webglCanvas.width - srcSize) / 2;
      const sy = (webglCanvas.height - srcSize) / 2 + srcSize * 0.05;
      ctx.drawImage(webglCanvas, sx, sy, srcSize, srcSize, 32, 32, 448, 448);
    }

    outCanvas.toBlob((blob) => {
      if (blob) triggerDownload(blob, 'icon-512.png');
    }, 'image/png');
  }, []);

  // 3. Download 64x64 Favicon
  const handleDownloadFavicon = useCallback(() => {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = 64;
    outCanvas.height = 64;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    // Solid Cozy Indigo Background
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 0, 64, 64);

    const webglCanvas = document.querySelector<HTMLCanvasElement>('#thumbnail-webgl canvas');
    if (webglCanvas) {
      const srcSize = Math.min(webglCanvas.width, webglCanvas.height) * 0.45;
      const sx = (webglCanvas.width - srcSize) / 2;
      const sy = (webglCanvas.height - srcSize) / 2 + srcSize * 0.1;
      ctx.drawImage(webglCanvas, sx, sy, srcSize, srcSize, 4, 4, 56, 56);
    }

    outCanvas.toBlob((blob) => {
      if (blob) triggerDownload(blob, 'favicon.png');
    }, 'image/png');
  }, []);

  return (
    <div className="min-h-screen bg-[#090d20] text-slate-100 flex flex-col items-center p-4 sm:p-8 font-sans select-none overflow-y-auto">
      {/* Top Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between pb-6 border-b border-white/10 mb-6">
        <button
          onClick={onReturnToGlobe}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-all font-bold text-sm border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Globe</span>
        </button>

        <div className="text-center">
          <h1 className="text-xl font-black text-white flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>BobGlobe Brand Asset Generator</span>
          </h1>
          <p className="text-xs text-slate-400">
            Dev-only tool to export official high-resolution PNG brand assets
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadThumbnail}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-sky-500/25 transition-all"
            title="Export 1500x1000 Devpost Thumbnail"
          >
            <Download className="w-4 h-4" />
            <span>Thumbnail (1500x1000)</span>
          </button>

          <button
            onClick={handleDownloadIcon}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-400/30 transition-all"
            title="Export 512x512 Square Icon"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Icon (512x512)</span>
          </button>

          <button
            onClick={handleDownloadFavicon}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-white/10 transition-all"
            title="Export 64x64 Favicon"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Favicon (64x64)</span>
          </button>
        </div>
      </div>

      {/* Main 3:2 Canvas Frame (1500 x 1000 ratio) */}
      <div
        id="thumbnail-webgl"
        className="relative w-full max-w-4xl aspect-[3/2] rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-gradient-to-b from-[#090d20] via-[#101935] to-[#1e1b4b]"
      >
        <Canvas
          gl={{
            preserveDrawingBuffer: true,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          camera={{ position: [0, 0.4, 4.2], fov: 42 }}
        >
          {/* Solid Gradient Backdrop Mesh */}
          <color attach="background" args={['#0e142e']} />

          {/* Warm Directional Key & Hemisphere Lighting */}
          <directionalLight position={[4, 5, 4]} intensity={2.6} color="#fff8f0" />
          <ambientLight intensity={1.1} color="#c7d2fe" />

          {/* Solid White Stars */}
          <group>
            {[
              [-2.8, 1.8, -1],
              [-2.1, 1.4, -0.5],
              [-1.4, 1.9, -1.2],
              [1.6, 1.7, -0.8],
              [2.4, 1.3, -1.5],
              [2.9, 1.9, -1.1],
              [-0.4, 2.0, -1],
              [0.5, 1.8, -1.3],
            ].map((p, i) => (
              <mesh key={i} position={p as [number, number, number]}>
                <sphereGeometry args={[0.025, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            ))}
          </group>

          {/* Hero Crown Blob (Center, #1 Global Rank Style) */}
          <HeroBlob
            position={[0, -0.05, 0.4]}
            scale={1.35}
            color="#fbbf24"
            hasCrown={true}
            expression="selected"
          />

          {/* Left Flanking Blobs */}
          <HeroBlob
            position={[-1.3, -0.22, 0.1]}
            scale={0.92}
            color="#f472b6"
            expression="hover"
          />
          <HeroBlob
            position={[-2.2, -0.38, -0.2]}
            scale={0.78}
            color="#38bdf8"
            expression="trend_new"
          />
          <HeroBlob
            position={[-0.8, 0.5, -0.3]}
            scale={0.65}
            color="#34d399"
            expression="idle"
          />

          {/* Right Flanking Blobs */}
          <HeroBlob
            position={[1.3, -0.22, 0.1]}
            scale={0.92}
            color="#a855f7"
            expression="trend_up"
          />
          <HeroBlob
            position={[2.2, -0.38, -0.2]}
            scale={0.78}
            color="#fb7185"
            expression="hover"
          />
          <HeroBlob
            position={[0.8, 0.5, -0.3]}
            scale={0.65}
            color="#818cf8"
            expression="idle"
          />

          {/* Planet Arc at Bottom */}
          <PlanetArc />
        </Canvas>

        {/* Foreground Typography Overlay in Preview */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center pt-8 sm:pt-12 text-center">
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight drop-shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
            BobGlobe
          </h2>
          <p className="text-sm sm:text-lg font-bold text-sky-300 drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)] mt-1 sm:mt-2">
            Every country's top artists, as cute blobs
          </p>
        </div>
      </div>
    </div>
  );
};
