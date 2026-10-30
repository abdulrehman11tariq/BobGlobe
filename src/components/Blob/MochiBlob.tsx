import { useRef, useMemo, useState, useEffect, type FC } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { easing } from 'maath';
import type { BlobInstanceData } from '../../types';
import { MOCHI_CONFIG } from '../../theme/mochiConfig';
import { getFaceTexture, type BlobExpression, type CheekMark } from './FaceTextures';
import { Accessory, type AccessoryType } from './Accessories';
import { createMochiGeometry, createFaceShellGeometry } from './MochiGeometry';

interface MochiBlobProps {
  blob: BlobInstanceData;
  isSelected: boolean;
  isHovered: boolean;
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
  onSelect,
  onHoverStart,
  onHoverEnd,
}) => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const faceGroupRef = useRef<THREE.Group>(null);
  const faceMeshRef = useRef<THREE.Mesh>(null);

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
  const currentExpression: BlobExpression = useMemo(() => {
    if (isBlinking) return 'blink';
    if (isSelected) return 'selected';
    if (isHovered) return 'hover';
    if (blob.artist.trend === 'up') return 'trend_up';
    if (blob.artist.trend === 'down') return 'trend_down';
    if (blob.artist.trend === 'new') return 'trend_new';
    return 'idle';
  }, [isBlinking, isSelected, isHovered, blob.artist.trend]);

  // Get shared CanvasTexture for this expression with subtle look shift
  const faceTexture = useMemo(
    () => getFaceTexture(currentExpression, cheekMark, lookShift.current.x, lookShift.current.y),
    [currentExpression, cheekMark]
  );

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

    // Apply combined scale to body
    const baseR = currentRadius.current;
    if (bodyGroupRef.current) {
      bodyGroupRef.current.scale.set(
        baseR * breatheXZ * boingScale.current.xz,
        baseR * breatheY * boingScale.current.y,
        baseR * breatheXZ * boingScale.current.xz
      );
    }

    // 5. Billboard-ish Head/Face rotation: turns towards camera around up-axis (limited to ~70 deg)
    if (faceGroupRef.current && rootGroupRef.current) {
      const camPosLocal = rootGroupRef.current.worldToLocal(camera.position.clone());
      let targetAngle = Math.atan2(camPosLocal.x, camPosLocal.z);
      targetAngle = Math.max(
        -MOCHI_CONFIG.MAX_HEAD_TURN_RAD,
        Math.min(MOCHI_CONFIG.MAX_HEAD_TURN_RAD, targetAngle)
      );
      easing.damp(faceGroupRef.current.rotation, 'y', targetAngle, 0.2, delta);

      // Subtle pupil shift toward camera
      lookShift.current.x = THREE.MathUtils.clamp(camPosLocal.x * 0.15, -0.8, 0.8);
      lookShift.current.y = THREE.MathUtils.clamp(camPosLocal.y * 0.15, -0.6, 0.6);
    }

    // 6. Distance Level of Detail (LOD): Enlarge face up to 1.4x at planetary camera distances
    if (faceMeshRef.current && rootGroupRef.current) {
      const worldPos = new THREE.Vector3(...blob.position);
      const camDist = camera.position.distanceTo(worldPos);

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
      {/* Soft Contact Shadow on Ground */}
      <mesh
        geometry={sharedShadowGeom}
        material={shadowMaterial}
        position={[0, -currentRadius.current * 0.76, 0]}
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
    </group>
  );
};
