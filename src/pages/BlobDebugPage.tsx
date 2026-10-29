import { useState, useRef, useMemo, type FC } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { easing } from 'maath';
import { MOCHI_CONFIG } from '../theme/mochiConfig';
import { getFaceTexture, type BlobExpression, type CheekMark } from '../components/Blob/FaceTextures';
import { Accessory, type AccessoryType } from '../components/Blob/Accessories';
import { createMochiGeometry, createFaceShellGeometry, getContactShadowTexture } from '../components/Blob/MochiGeometry';
import { Sparkles, ArrowLeft, RefreshCw, Sun, Moon, ZoomIn, ZoomOut } from 'lucide-react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface QABlobItemProps {
  id: string;
  name: string;
  sizeScale: number;
  position: [number, number, number];
  expression: BlobExpression;
  accessory: AccessoryType;
  cheekMark: CheekMark;
  color: string;
  isBoinging: boolean;
  onBoingEnd: () => void;
}

const sharedMochiGeom = createMochiGeometry();
const sharedFaceShellGeom = createFaceShellGeometry();
const sharedShadowGeom = new THREE.CircleGeometry(0.85, 20);
const sharedBellyGeom = new THREE.CircleGeometry(0.55, 20);
const sharedHighlightGeom = new THREE.CircleGeometry(0.24, 16);

const QABlobItem: FC<QABlobItemProps> = ({
  sizeScale,
  position,
  expression,
  accessory,
  cheekMark,
  color,
  isBoinging,
  onBoingEnd,
}) => {
  const bodyRef = useRef<THREE.Group>(null);
  const faceMeshRef = useRef<THREE.Mesh>(null);
  const boingScale = useRef<{ y: number; xz: number }>({ y: 1.0, xz: 1.0 });

  const faceTexture = useMemo(
    () => getFaceTexture(expression, cheekMark, 0, 0),
    [expression, cheekMark]
  );

  const bodyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.28,
      metalness: 0.04,
    });
  }, [color]);

  const outlineMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(MOCHI_CONFIG.OUTLINE_COLOR),
      side: THREE.BackSide,
      transparent: true,
      opacity: MOCHI_CONFIG.OUTLINE_OPACITY,
      depthWrite: false,
    });
  }, []);

  const shadowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      opacity: MOCHI_CONFIG.SHADOW_OPACITY * 1.2,
      depthWrite: false,
    });
  }, []);

  const faceMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: faceTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -5,
      polygonOffsetUnits: -5,
      side: THREE.DoubleSide,
    });
  }, [faceTexture]);

  const bellyMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: MOCHI_CONFIG.BELLY_OPACITY,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  }, []);

  const highlightMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: MOCHI_CONFIG.HIGHLIGHT_OPACITY,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
  }, []);

  useFrame(({ clock, camera }, delta) => {
    const t = clock.getElapsedTime();

    if (isBoinging) {
      boingScale.current.y = MOCHI_CONFIG.BOING_ANTICIPATION;
      boingScale.current.xz = 1.2;
      setTimeout(() => {
        boingScale.current.y = MOCHI_CONFIG.BOING_OVERSHOOT;
        boingScale.current.xz = 0.85;
        onBoingEnd();
      }, 70);
    }

    easing.damp(boingScale.current, 'y', 1.0, MOCHI_CONFIG.SPRING_DAMPING, delta);
    easing.damp(boingScale.current, 'xz', 1.0, MOCHI_CONFIG.SPRING_DAMPING, delta);

    // Idle breathing
    const breatheSin = Math.sin(t * MOCHI_CONFIG.BREATHE_SPEED + position[0]);
    const breatheY = 1.0 + breatheSin * MOCHI_CONFIG.BREATHE_SQUASH_Y;
    const breatheXZ = 1.0 - breatheSin * MOCHI_CONFIG.BREATHE_STRETCH_XZ;

    if (bodyRef.current) {
      bodyRef.current.scale.set(
        sizeScale * breatheXZ * boingScale.current.xz,
        sizeScale * breatheY * boingScale.current.y,
        sizeScale * breatheXZ * boingScale.current.xz
      );
    }

    // Distance LOD Scaling for far camera distance test
    if (faceMeshRef.current) {
      const worldPos = new THREE.Vector3(...position);
      const camDist = camera.position.distanceTo(worldPos);
      let lodScale = 1.0;
      if (camDist > MOCHI_CONFIG.LOD_FAR_DISTANCE) {
        lodScale = Math.min(
          MOCHI_CONFIG.LOD_MAX_SCALE,
          1.0 + (camDist - MOCHI_CONFIG.LOD_FAR_DISTANCE) * 0.12
        );
      }
      const finalFaceScale = MOCHI_CONFIG.FACE_WIDTH_SPAN * lodScale;
      faceMeshRef.current.scale.set(finalFaceScale * 1.35, finalFaceScale * 1.35, 1.0);
    }
  });

  return (
    <group position={position}>
      {/* Contact Shadow */}
      <mesh
        geometry={sharedShadowGeom}
        material={shadowMaterial}
        position={[0, -sizeScale * 0.76, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[sizeScale * 1.35, sizeScale * 1.35, 1.0]}
      />

      <group ref={bodyRef}>
        {/* Soft Mochi Body */}
        <mesh geometry={sharedMochiGeom} material={bodyMaterial} castShadow receiveShadow />

        {/* Outline */}
        <mesh
          geometry={sharedMochiGeom}
          material={outlineMaterial}
          scale={[MOCHI_CONFIG.OUTLINE_SCALE, MOCHI_CONFIG.OUTLINE_SCALE, MOCHI_CONFIG.OUTLINE_SCALE]}
        />

        {/* Belly Decal */}
        <mesh
          geometry={sharedBellyGeom}
          material={bellyMaterial}
          position={[0, -0.22, 0.94]}
          scale={[0.72, 0.62, 1.0]}
          renderOrder={2}
        />

        {/* Glossy Upper Highlight */}
        <mesh
          geometry={sharedHighlightGeom}
          material={highlightMaterial}
          position={[-0.38, 0.52, 0.62]}
          rotation={[0.3, -0.3, 0.2]}
          renderOrder={3}
        />

        {/* HUGE Unlit Kawaii Face */}
        <mesh
          ref={faceMeshRef}
          geometry={sharedFaceShellGeom}
          material={faceMaterial}
          position={[0, MOCHI_CONFIG.EYE_Y_POS + 0.08, 0.02]}
          renderOrder={10}
        />

        {/* Accessory */}
        <Accessory type={accessory} headY={MOCHI_CONFIG.BODY_HEIGHT * 0.9} />
      </group>
    </group>
  );
};

export const BlobDebugPage: FC<{ onReturnToGlobe: () => void }> = ({ onReturnToGlobe }) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Studio States
  const [expression, setExpression] = useState<BlobExpression>('idle');
  const [accessory, setAccessory] = useState<AccessoryType>('crown');
  const [cheekMark, setCheekMark] = useState<CheekMark>('blush');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false); // Lit vs Dark side
  const [isBoinging, setIsBoinging] = useState<boolean>(false);

  // 5 Blobs at 3 different sizes as requested:
  // 1: Smallest (minR ~ 0.45)
  // 2: Medium-Small (0.65)
  // 3: Medium (0.85)
  // 4: Standard Large (maxR ~ 1.10)
  // 5: King Size (1.35)
  const QA_BLOBS = useMemo(() => {
    return [
      { id: 'b1', name: 'Mini Mochi', size: 0.48, x: -3.2, color: MOCHI_CONFIG.PASTEL_COLORS[0], acc: 'sprout' as AccessoryType },
      { id: 'b2', name: 'Small Mochi', size: 0.70, x: -1.6, color: MOCHI_CONFIG.PASTEL_COLORS[1], acc: 'cat_ears' as AccessoryType },
      { id: 'b3', name: 'Medium Mochi', size: 0.92, x: 0.0, color: MOCHI_CONFIG.PASTEL_COLORS[2], acc: accessory },
      { id: 'b4', name: 'Large Mochi', size: 1.15, x: 1.8, color: MOCHI_CONFIG.PASTEL_COLORS[4], acc: 'bunny_ears' as AccessoryType },
      { id: 'b5', name: 'Crown Mochi', size: 1.35, x: 3.8, color: MOCHI_CONFIG.PASTEL_COLORS[3], acc: 'crown' as AccessoryType },
    ];
  }, [accessory]);

  const EXPRESSIONS: { id: BlobExpression; label: string }[] = [
    { id: 'idle', label: 'Idle (Huge Eyes)' },
    { id: 'hover', label: 'Hover (Starry Tongue)' },
    { id: 'selected', label: 'Selected (^ ^ Hearts)' },
    { id: 'trend_up', label: 'Excited (:3 Up)' },
    { id: 'trend_down', label: 'Sleepy (Z Down)' },
    { id: 'blink', label: 'Blink Arc' },
  ];

  const ACCESSORIES: { id: AccessoryType; label: string }[] = [
    { id: 'crown', label: 'Crown 👑' },
    { id: 'sprout', label: 'Sprout 🌱' },
    { id: 'cat_ears', label: 'Cat Ears 🐱' },
    { id: 'bunny_ears', label: 'Bunny Ears 🐰' },
    { id: 'antenna', label: 'Antenna 🛸' },
    { id: 'bow', label: 'Bow 🎀' },
    { id: 'hat', label: 'Party Hat 🎩' },
    { id: 'horns', label: 'Horns 🦄' },
    { id: 'mushroom', label: 'Mushroom 🍄' },
  ];

  // Camera Presets
  const setCameraDistance = (dist: number) => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object;
      camera.position.set(0, 0.4, dist);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden transition-colors duration-700 ${
      isDarkMode
        ? 'bg-gradient-to-b from-[#0b132b] via-[#1c2541] to-[#3a506b]'
        : 'bg-gradient-to-b from-[#63b7f4] via-[#a3d9fc] to-[#cae9fa]'
    }`}>
      {/* Top Navigation */}
      <header className="fixed top-0 left-0 right-0 z-30 p-5 flex items-center justify-between pointer-events-none">
        <button
          onClick={onReturnToGlobe}
          className="pointer-events-auto glass-btn px-4 py-2.5 rounded-2xl flex items-center gap-2 font-bold text-sm text-slate-800 shadow-lg"
        >
          <ArrowLeft className="w-4 h-4 text-sky-600" />
          <span>Return to 3D Globe</span>
        </button>

        <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold text-slate-800">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>QA Studio &bull; 5 Blobs at 3 Sizes &bull; Distance & Shadow Testing</span>
        </div>
      </header>

      {/* 3D Scene */}
      <div className="w-full h-full absolute inset-0">
        <Canvas
          camera={{ position: [0, 0.5, 5.2], fov: 45 }}
          gl={{ antialias: true }}
          shadows
        >
          {/* Lighting: Test under Bright Daylight OR Dark Shadowed hemisphere */}
          {isDarkMode ? (
            <>
              {/* Dark Night Hemisphere: Dim ambient light to verify unlit face readability */}
              <ambientLight intensity={0.25} color="#475569" />
              <directionalLight position={[-8, -5, -8]} intensity={0.2} color="#1e293b" />
            </>
          ) : (
            <>
              {/* Bright Daylight Sun */}
              <ambientLight intensity={0.85} color="#ffffff" />
              <directionalLight position={[6, 10, 6]} intensity={2.2} castShadow color="#fff9ed" />
              <directionalLight position={[-6, 4, -4]} intensity={0.5} color="#bde4fc" />
            </>
          )}

          {/* Render 5 Blobs in a row to compare sizes and distance readability */}
          {QA_BLOBS.map((b) => (
            <QABlobItem
              key={b.id}
              id={b.id}
              name={b.name}
              sizeScale={b.size}
              position={[b.x, -0.1, 0]}
              expression={expression}
              accessory={b.acc}
              cheekMark={cheekMark}
              color={b.color}
              isBoinging={isBoinging}
              onBoingEnd={() => setIsBoinging(false)}
            />
          ))}

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.08}
            minDistance={1.2}
            maxDistance={14.0}
          />
        </Canvas>
      </div>

      {/* Bottom Floating Distance & Lighting Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2.5 glass-panel p-2 rounded-2xl shadow-xl border border-white/90">
        {/* Camera Distance Presets */}
        <button
          onClick={() => setCameraDistance(2.2)}
          className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-xs"
        >
          <ZoomIn className="w-3.5 h-3.5 text-sky-500" /> Near (2.2m)
        </button>
        <button
          onClick={() => setCameraDistance(5.2)}
          className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-xs"
        >
          <span>Mid (5.2m)</span>
        </button>
        <button
          onClick={() => setCameraDistance(9.5)}
          className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-xs"
        >
          <ZoomOut className="w-3.5 h-3.5 text-purple-500" /> Far (9.5m Orbit)
        </button>

        <div className="h-5 w-px bg-slate-300 mx-1" />

        {/* Day / Dark Side Toggle */}
        <button
          onClick={() => setIsDarkMode((prev) => !prev)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            isDarkMode
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-amber-100 text-amber-900 shadow-xs'
          }`}
        >
          {isDarkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          <span>{isDarkMode ? 'Shadowed Side' : 'Sunlit Side'}</span>
        </button>
      </div>

      {/* Studio Controls Sidebar (Right) */}
      <div className="fixed top-20 right-6 bottom-20 z-30 w-80 max-w-[92vw] overflow-y-auto glass-panel p-4 rounded-3xl shadow-2xl border border-white/90 flex flex-col gap-3.5 text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="font-extrabold text-sm text-slate-800">QA Controls</span>
          <button
            onClick={() => setIsBoinging(true)}
            className="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Boing!
          </button>
        </div>

        {/* 1. Expression Selector */}
        <div>
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1 block">
            Expression Test
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {EXPRESSIONS.map((exp) => (
              <button
                key={exp.id}
                onClick={() => setExpression(exp.id)}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-left truncate ${
                  expression === exp.id
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'bg-white/70 hover:bg-white text-slate-700'
                }`}
              >
                {exp.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Accessory Selector */}
        <div>
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1 block">
            Accessory Test (Center Blob)
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {ACCESSORIES.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setAccessory(acc.id)}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-left truncate ${
                  accessory === acc.id
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'bg-white/70 hover:bg-white text-slate-700'
                }`}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Cheek Marks */}
        <div>
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1 block">
            Cheek Mark
          </label>
          <div className="grid grid-cols-4 gap-1">
            {(['blush', 'heart', 'star', 'freckles'] as CheekMark[]).map((mark) => (
              <button
                key={mark}
                onClick={() => setCheekMark(mark)}
                className={`py-1 px-1 rounded-lg text-xs font-bold capitalize transition-all ${
                  cheekMark === mark ? 'bg-sky-500 text-white shadow-xs' : 'bg-white/70 text-slate-700'
                }`}
              >
                {mark}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto text-[10px] text-slate-400 font-medium text-center border-t border-slate-200 pt-2">
          Test camera distance and lighting toggles below to verify face readability.
        </div>
      </div>
    </div>
  );
};
