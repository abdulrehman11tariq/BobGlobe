import { useRef, useMemo, useState, useEffect, type FC } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { easing } from 'maath';
import type { BlobInstanceData } from '../../types';
import { MOCHI_CONFIG } from '../../theme/mochiConfig';
import { AUDIO_CONFIG } from '../../theme/blobConfig';
import { getFaceTexture, type BlobExpression, type CheekMark } from './FaceTextures';
import { Accessory, type AccessoryType } from './Accessories';
import { createMochiGeometry, createFaceShellGeometry } from './MochiGeometry';

// Reusable scratch objects to eliminate per-frame GC allocations
const _scratchCamPosLocal = new THREE.Vector3();
const _scratchBlobWorldPos = new THREE.Vector3();

interface MochiBlobProps {
  blob: BlobInstanceData;
  isSelected: boolean;
  isHovered: boolean;
  isPlaying?: boolean;
  isSameCountryHovered?: boolean;
  trendAvailable?: boolean;
  onSelect: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

// Single shared geometries & textures for maximum 60fps performance
const sharedMochiGeom = createMochiGeometry();
const sharedFaceShellGeom = createFaceShellGeometry();
const sharedShadowGeom = new THREE.CircleGeometry(0.85, 16);
const sharedBellyGeom = new THREE.CircleGeometry(0.55, 20);
const sharedHighlightGeom = new THREE.CircleGeometry(0.24, 16);

// Shared solid music note components (100% opaque, zero transparency)
const sharedNoteHeadGeom = new THREE.SphereGeometry(0.12, 10, 8);
const sharedNoteStemGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6);
const sharedNoteFlagGeom = new THREE.BoxGeometry(0.14, 0.05, 0.03);

/**
 * Deterministically pick accessory and cheek mark from artist id
 */
function getBlobPersonality(blob: BlobInstanceData): { accessory: AccessoryType; cheekMark: CheekMark } {
  if (blob.rank === 1) {
    return { accessory: 'crown', cheekMark: 'star' };
  }

  const ACCESSORIES: AccessoryType[] = [
    'sprout',
    'cat_ears',
    'bunny_ears',
    'antenna',
    'bow',
    'hat',
    'horns',
    'mushroom',
  ];

  const CHEEKS: CheekMark[] = ['blush', 'heart', 'star', 'freckles'];

  let hash = 0;
  for (let i = 0; i < blob.artist.id.length; i++) {
    hash = (Math.imul(31, hash) + blob.artist.id.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);

  const accessory = ACCESSORIES[hash % ACCESSORIES.length];
  const cheekMark = CHEEKS[(hash >> 3) % CHEEKS.length];

  return { accessory, cheekMark };
}

export const MochiBlob: FC<MochiBlobProps> = ({
  blob,
  isSelected,
  isHovered,
  isPlaying = false,
  isSameCountryHovered = false,
  trendAvailable = false,
  onSelect,
  onHoverStart,
  onHoverEnd,
}) => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const faceGroupRef = useRef<THREE.Group>(null);
  const faceMeshRef = useRef<THREE.Mesh>(null);
  const note1Ref = useRef<THREE.Group>(null);
  const note2Ref = useRef<THREE.Group>(null);

  const { camera } = useThree();

  // Animation & physical springs
  const currentRadius = useRef<number>(blob.targetRadius);
  const boingScale = useRef<{ y: number; xz: number }>({ y: 1.0, xz: 1.0 });
  const idlePhase = useMemo(() => Math.random() * Math.PI * 2, []);

  // Pupil look direction shift (-1 to 1)
  const lookShift = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Blinking state
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const nextBlinkTime = useRef<number>(2.0 + Math.random() * 3.5);
  const blinkTimer = useRef<number>(0);

  // Personality traits
  const { accessory, cheekMark } = useMemo(() => getBlobPersonality(blob), [blob]);

  // Determine current active facial expression
  // When isPlaying, uses happy expression; when !trendAvailable, uses neutral idle
  const currentExpression: BlobExpression = useMemo(() => {
    if (isBlinking) return 'blink';
    if (isPlaying) return 'hover'; // Happy singing/dancing expression
    if (isSelected) return 'selected';
    if (isHovered) return 'hover';
    if (trendAvailable) {
      if (blob.artist.trend === 'up') return 'trend_up';
      if (blob.artist.trend === 'down') return 'trend_down';
      if (blob.artist.trend === 'new') return 'trend_new';
    }
    return 'idle'; // Neutral expression while trendAvailable is false
  }, [isBlinking, isPlaying, isSelected, isHovered, trendAvailable, blob.artist.trend]);

  // Get shared CanvasTexture for this expression with subtle look shift
  const faceTexture = useMemo(
    () => getFaceTexture(currentExpression, cheekMark, lookShift.current.x, lookShift.current.y),
    [currentExpression, cheekMark]
  );

  // Solid Music Note Material (100% opaque, zero transparency)
  const noteMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color('#fbbf24'),
      transparent: false,
      depthWrite: true,
    });
  }, []);

  // Body material: Soft pastel tone with subsurface finish
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(blob.color),
      roughness: 0.28,
      metalness: 0.04,
      flatShading: false,
    });
  }, [blob.color]);

  // Inverted-hull cartoon outline material (renders backfaces slightly scaled)
  const outlineMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(MOCHI_CONFIG.OUTLINE_COLOR),
      side: THREE.BackSide,
      transparent: false,
      depthWrite: true,
    });
  }, []);

  // Contact shadow material: Solid darker-green decal on terrain (fully opaque)
  const shadowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color('#468b42'),
      transparent: false,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  }, []);

  // Belly light oval material (solid lighter pastel tint)
  const bellyMaterial = useMemo(() => {
    const lighter = new THREE.Color(blob.color).lerp(new THREE.Color('#ffffff'), 0.45);
    return new THREE.MeshBasicMaterial({
      color: lighter,
      transparent: false,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  }, [blob.color]);

  // Glossy highlight material (solid white, fully opaque)
  const highlightMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: false,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
  }, []);

  // UNLIT Face Material (MeshBasicMaterial) - Cutout with alphaTest, fully opaque (transparent: false, depthWrite: true)
  const faceMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: faceTexture,
      transparent: false,
      alphaTest: 0.5,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -5,
      polygonOffsetUnits: -5,
      side: THREE.DoubleSide,
    });
  }, [faceTexture]);

  // Trigger boing spring impulse when clicked or hovered
  useEffect(() => {
    if (isSelected || isHovered) {
      boingScale.current.y = MOCHI_CONFIG.BOING_ANTICIPATION;
      boingScale.current.xz = 1.18;
      const timer = setTimeout(() => {
        boingScale.current.y = MOCHI_CONFIG.BOING_OVERSHOOT;
        boingScale.current.xz = 0.88;
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [isSelected, isHovered]);

  // Align blob up-axis along planet surface normal
  const surfaceNormal = useMemo(() => new THREE.Vector3(...blob.normal), [blob.normal]);
  const alignQuaternion = useMemo(() => {
    const defaultUp = new THREE.Vector3(0, 1, 0);
    return new THREE.Quaternion().setFromUnitVectors(defaultUp, surfaceNormal);
  }, [surfaceNormal]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    // 1. Blinking cycle
    blinkTimer.current += delta;
    if (blinkTimer.current >= nextBlinkTime.current) {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
      }, MOCHI_CONFIG.BLINK_DURATION * 1000);
      blinkTimer.current = 0;
      nextBlinkTime.current =
        MOCHI_CONFIG.BLINK_MIN_INTERVAL +
        Math.random() * (MOCHI_CONFIG.BLINK_MAX_INTERVAL - MOCHI_CONFIG.BLINK_MIN_INTERVAL);
    }

    // 2. Smoothly damp radius scale to target radius
    const hoverBump = isSelected ? 1.25 : isHovered ? 1.15 : 1.0;
    const targetR = blob.targetRadius * hoverBump;
    easing.damp(currentRadius, 'current', targetR, 0.18, delta);

    // Smoothly ease position and orientation when rankings refresh (~0.8s spring transition)
    if (rootGroupRef.current) {
      easing.damp3(rootGroupRef.current.position, blob.position, 0.25, delta);
      easing.dampQ(rootGroupRef.current.quaternion, alignQuaternion, 0.25, delta);
    }

    // 3. Damped boing spring recovery back to 1.0
    easing.damp(boingScale.current, 'y', 1.0, MOCHI_CONFIG.SPRING_DAMPING, delta);
    easing.damp(boingScale.current, 'xz', 1.0, MOCHI_CONFIG.SPRING_DAMPING, delta);

    // 4. Gentle idle breathing squash & stretch
    const breatheSin = Math.sin(t * MOCHI_CONFIG.BREATHE_SPEED + idlePhase);
    const breatheY = 1.0 + breatheSin * MOCHI_CONFIG.BREATHE_SQUASH_Y;
    const breatheXZ = 1.0 - breatheSin * MOCHI_CONFIG.BREATHE_STRETCH_XZ;

    // Apply combined scale to body upward from the bottom pivot (lowest vertex at y = -0.4992)
    // Anchoring bodyGroupRef at +0.4992 * scaleY guarantees bottom of body remains exactly at Y = 0 on ground
    const baseR = currentRadius.current;
    const scaleY = baseR * breatheY * boingScale.current.y;
    const scaleXZ = baseR * breatheXZ * boingScale.current.xz;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Dance & Hop Feedback:
    // When isPlaying, bounces on 100 BPM beat; same-country blobs do a small hop on hover
    let danceHopY = 0;
    if (isPlaying && !prefersReducedMotion) {
      const beatPeriod = 60 / AUDIO_CONFIG.BEAT_BPM; // 0.600s
      const beatProgress = (t % beatPeriod) / beatPeriod;
      danceHopY = Math.sin(beatProgress * Math.PI) * 0.18 * baseR;
    } else if (isSameCountryHovered && !isHovered && !isSelected && !prefersReducedMotion) {
      danceHopY = Math.max(0, Math.sin(t * 8)) * 0.08 * baseR;
    }

    if (bodyGroupRef.current) {
      bodyGroupRef.current.position.set(0, 0.4992 * scaleY + danceHopY, 0);
      bodyGroupRef.current.scale.set(scaleXZ, scaleY, scaleXZ);
    }

    // Solid Music Notes floating up & shrinking away when playing
    if (note1Ref.current && note2Ref.current) {
      if (isPlaying && !prefersReducedMotion) {
        note1Ref.current.visible = true;
        note2Ref.current.visible = true;

        const p1 = (t * 0.85) % 1;
        const p2 = (t * 0.85 + 0.5) % 1;

        // Shrinking away as they rise
        const s1 = (1 - p1) * baseR * 0.45;
        const s2 = (1 - p2) * baseR * 0.45;

        note1Ref.current.scale.set(s1, s1, s1);
        note1Ref.current.position.set(
          baseR * 0.35 + Math.sin(p1 * Math.PI * 2) * 0.12 * baseR,
          scaleY * 1.1 + p1 * baseR * 1.3,
          Math.cos(p1 * Math.PI * 2) * 0.12 * baseR
        );
        note1Ref.current.rotation.z = Math.sin(p1 * 4) * 0.25;

        note2Ref.current.scale.set(s2, s2, s2);
        note2Ref.current.position.set(
          -baseR * 0.35 - Math.sin(p2 * Math.PI * 2) * 0.12 * baseR,
          scaleY * 1.1 + p2 * baseR * 1.3,
          Math.cos(p2 * Math.PI * 2) * 0.12 * baseR
        );
        note2Ref.current.rotation.z = -Math.sin(p2 * 4) * 0.25;
      } else {
        note1Ref.current.visible = false;
        note2Ref.current.visible = false;
      }
    }

    // 5. Billboard-ish Head/Face rotation: turns towards camera around up-axis (limited to ~70 deg)
    if (faceGroupRef.current && rootGroupRef.current) {
      _scratchCamPosLocal.copy(camera.position);
      rootGroupRef.current.worldToLocal(_scratchCamPosLocal);
      let targetAngle = Math.atan2(_scratchCamPosLocal.x, _scratchCamPosLocal.z);
      targetAngle = Math.max(
        -MOCHI_CONFIG.MAX_HEAD_TURN_RAD,
        Math.min(MOCHI_CONFIG.MAX_HEAD_TURN_RAD, targetAngle)
      );
      easing.damp(faceGroupRef.current.rotation, 'y', targetAngle, 0.2, delta);

      // Subtle pupil shift toward camera
      lookShift.current.x = THREE.MathUtils.clamp(_scratchCamPosLocal.x * 0.15, -0.8, 0.8);
      lookShift.current.y = THREE.MathUtils.clamp(_scratchCamPosLocal.y * 0.15, -0.6, 0.6);
    }

    // 6. Distance Level of Detail (LOD): Enlarge face up to 1.4x at planetary camera distances
    if (faceMeshRef.current && rootGroupRef.current) {
      _scratchBlobWorldPos.set(blob.position[0], blob.position[1], blob.position[2]);
      const camDist = camera.position.distanceTo(_scratchBlobWorldPos);

      // Scale face up smoothly as camera zooms out so eyes stay bold and readable
      let lodScale = 1.0;
      if (camDist > MOCHI_CONFIG.LOD_FAR_DISTANCE) {
        lodScale = Math.min(
          MOCHI_CONFIG.LOD_MAX_SCALE,
          1.0 + (camDist - MOCHI_CONFIG.LOD_FAR_DISTANCE) * 0.12
        );
      }
      // Clamped face scale spanning 76% of body width
      const faceScale = MOCHI_CONFIG.FACE_WIDTH_SPAN * lodScale;
      faceMeshRef.current.scale.set(faceScale * 1.35, faceScale * 1.35, 1.0);
    }
  });

  return (
    <group
      ref={rootGroupRef}
      position={blob.position}
      quaternion={alignQuaternion}
      name={`mochi-blob-${blob.artist.name}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        onHoverStart();
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
        onHoverEnd();
      }}
    >
      {/* Soft Contact Shadow on Ground (Sits at Y = 0 on terrain surface) */}
      <mesh
        geometry={sharedShadowGeom}
        material={shadowMaterial}
        position={[0, 0.0008, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[currentRadius.current * 1.35, currentRadius.current * 1.35, 1.0]}
      />

      {/* Main Squishy Mochi Body Group */}
      <group ref={bodyGroupRef}>
        {/* Soft Rounded Pastel Body */}
        <mesh
          geometry={sharedMochiGeom}
          material={bodyMaterial}
          castShadow
          receiveShadow
        />

        {/* Thin Inverted-Hull Cartoon Outline */}
        <mesh
          geometry={sharedMochiGeom}
          material={outlineMaterial}
          scale={[MOCHI_CONFIG.OUTLINE_SCALE, MOCHI_CONFIG.OUTLINE_SCALE, MOCHI_CONFIG.OUTLINE_SCALE]}
        />

        {/* Lighter Belly Oval */}
        <mesh
          geometry={sharedBellyGeom}
          material={bellyMaterial}
          position={[0, -0.22, 0.94]}
          scale={[0.72, 0.62, 1.0]}
          renderOrder={2}
        />

        {/* Upper Glossy Highlight */}
        <mesh
          geometry={sharedHighlightGeom}
          material={highlightMaterial}
          position={[-0.38, 0.52, 0.62]}
          rotation={[0.3, -0.3, 0.2]}
          renderOrder={3}
        />

        {/* Kawaii Face Group (Turns to look at camera, unlit, never z-fights) */}
        <group ref={faceGroupRef}>
          <mesh
            ref={faceMeshRef}
            geometry={sharedFaceShellGeom}
            material={faceMaterial}
            position={[0, MOCHI_CONFIG.EYE_Y_POS + 0.08, 0.02]}
            renderOrder={10}
          />
        </group>

        {/* Personality Accessory on Head */}
        <Accessory type={accessory} headY={MOCHI_CONFIG.BODY_HEIGHT * 0.9} />
      </group>

      {/* Floating Solid Music Notes (100% Opaque, Zero Transparency) */}
      <group ref={note1Ref} visible={false}>
        <mesh geometry={sharedNoteHeadGeom} material={noteMaterial} position={[0, -0.12, 0]} rotation={[0, 0, 0.4]} />
        <mesh geometry={sharedNoteStemGeom} material={noteMaterial} position={[0.08, 0.05, 0]} />
        <mesh geometry={sharedNoteFlagGeom} material={noteMaterial} position={[0.13, 0.18, 0]} />
      </group>

      <group ref={note2Ref} visible={false}>
        <mesh geometry={sharedNoteHeadGeom} material={noteMaterial} position={[0, -0.12, 0]} rotation={[0, 0, 0.4]} />
        <mesh geometry={sharedNoteStemGeom} material={noteMaterial} position={[0.08, 0.05, 0]} />
        <mesh geometry={sharedNoteFlagGeom} material={noteMaterial} position={[0.13, 0.18, 0]} />
      </group>
    </group>
  );
};
