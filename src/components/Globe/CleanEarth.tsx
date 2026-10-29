import { useMemo, useRef, type FC } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_CONFIG } from '../../theme/earthConfig';
import { createOpaqueToonEarthMaterial } from './OpaqueToonEarthShader';
import { OpaqueClouds } from './OpaqueClouds';

interface CleanEarthProps {
  radius?: number;
  sunPosition?: [number, number, number];
}

/**
 * Clean, Simple, Cartoon Earth (100% Fully Opaque)
 * HARD RULE: ZERO TRANSPARENCY IN 3D (transparent: false, depthWrite: true).
 * Features:
 * - Smooth 192x192 sphere with real continent shapes
 * - Stepped toon bands (Friendly Blue ocean, shallow teal coast, fresh green land, mountain green, sand strip, polar white)
 * - Solid dark-blue inverted-hull outline (#1a365d, scale 1.018, BackSide)
 * - Solid 3D puffy clouds with instant binary toggle below 3.5 distance
 */
export const CleanEarth: FC<CleanEarthProps> = ({
  radius = EARTH_CONFIG.PLANET_RADIUS,
  sunPosition = EARTH_CONFIG.lighting.keySunPosition,
}) => {
  const earthMeshRef = useRef<THREE.Mesh>(null);

  // Load Land/Ocean Mask & Elevation Topology
  const [maskMap, topologyMap] = useLoader(THREE.TextureLoader, [
    EARTH_CONFIG.textures.mask,
    EARTH_CONFIG.textures.topology,
  ]);

  maskMap.anisotropy = 4;
  topologyMap.anisotropy = 4;

  const sunDir = useMemo(() => {
    return new THREE.Vector3(...sunPosition);
  }, [sunPosition]);

  // Clean, fully opaque toon Earth material
  const earthMaterial = useMemo(() => {
    return createOpaqueToonEarthMaterial({
      maskMap,
      topologyMap,
      sunPosition: sunDir,
    });
  }, [maskMap, topologyMap, sunDir]);

  // 192x192 smooth sphere geometry
  const sphereGeom = useMemo(() => {
    return new THREE.SphereGeometry(
      radius,
      EARTH_CONFIG.SPHERE_SEGMENTS,
      EARTH_CONFIG.SPHERE_SEGMENTS
    );
  }, [radius]);

  return (
    <group name="opaque-toon-earth">
      {/* 1. Smooth Cartoon Earth Sphere */}
      <mesh
        ref={earthMeshRef}
        geometry={sphereGeom}
        material={earthMaterial}
        receiveShadow
        castShadow
      />

      {/* 2. Solid Dark-Blue Inverted-Hull Cartoon Outline (scale 1.018, BackSide, transparent: false, depthWrite: true) */}
      <mesh scale={EARTH_CONFIG.OUTLINE_SCALE}>
        <sphereGeometry args={[radius, 96, 64]} />
        <meshBasicMaterial
          color={EARTH_CONFIG.colors.outline}
          side={THREE.BackSide}
          transparent={false}
          depthWrite={true}
        />
      </mesh>

      {/* 3. Fully Opaque Puffy 3D Clouds (Instant binary hide on close view, zero fade) */}
      <OpaqueClouds />
    </group>
  );
};
