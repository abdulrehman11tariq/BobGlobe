import { useMemo, useRef, type FC } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_CONFIG } from '../../theme/earthConfig';
import { OpaqueClouds } from './OpaqueClouds';

interface CleanEarthProps {
  radius?: number;
  onDeselect?: () => void;
}

/**
 * Cartoon Earth Sphere
 * Texture: world_map_4096.png (Equirectangular, -180 to 180, 90 to -90)
 * Material: 100% OPAQUE MeshStandardMaterial with high roughness
 * No transparency, no glow shell, no color tinting.
 */
export const CleanEarth: FC<CleanEarthProps> = ({
  radius = EARTH_CONFIG.PLANET_RADIUS,
  onDeselect,
}) => {
  const earthMeshRef = useRef<THREE.Mesh>(null);

  // Load world_map_4096.png texture
  const colorMap = useLoader(THREE.TextureLoader, EARTH_CONFIG.textures.worldMap);

  useMemo(() => {
    colorMap.colorSpace = THREE.SRGBColorSpace;
    colorMap.anisotropy = 8;
    colorMap.generateMipmaps = true;
    colorMap.minFilter = THREE.LinearMipmapLinearFilter;
    colorMap.magFilter = THREE.LinearFilter;
    colorMap.needsUpdate = true;
  }, [colorMap]);

  // Clean, opaque toon Earth material with true texture colors
  const earthMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: colorMap,
      roughness: 0.92,
      metalness: 0.0,
      color: '#ffffff', // No color tinting that changes map colors
      transparent: false,
      depthWrite: true,
    });
  }, [colorMap]);

  // 192x192 smooth sphere geometry matching Three.js UV mapping
  const sphereGeom = useMemo(() => {
    return new THREE.SphereGeometry(
      radius,
      EARTH_CONFIG.SPHERE_SEGMENTS,
      EARTH_CONFIG.SPHERE_SEGMENTS
    );
  }, [radius]);

  return (
    <group name="clean-earth">
      {/* 1. Opaque Earth Sphere (No extra rotation applied) */}
      <mesh
        ref={earthMeshRef}
        geometry={sphereGeom}
        material={earthMaterial}
        receiveShadow
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onDeselect?.();
        }}
      />

      {/* 2. Solid Dark-Blue Inverted-Hull Cartoon Outline (scale 1.018, BackSide) */}
      <mesh scale={EARTH_CONFIG.OUTLINE_SCALE}>
        <sphereGeometry args={[radius, 96, 64]} />
        <meshBasicMaterial
          color={EARTH_CONFIG.colors.outline}
          side={THREE.BackSide}
          transparent={false}
          depthWrite={true}
        />
      </mesh>

      {/* 3. Fully Opaque Puffy 3D Clouds */}
      <OpaqueClouds />
    </group>
  );
};
