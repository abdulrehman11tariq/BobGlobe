import { useRef, type FC } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { Atmosphere } from './Atmosphere';
import { assetUrl } from '../../utils/assetUrl';

interface EarthProps {
  radius?: number;
}

export const Earth: FC<EarthProps> = ({ radius = 2.5 }) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  // Load NASA Blue Marble textures
  const [dayMap, normalMap, specularMap, cloudsMap] = useLoader(THREE.TextureLoader, [
    assetUrl('textures/earth_day.jpg'),
    assetUrl('textures/earth_normal.jpg'),
    assetUrl('textures/earth_specular.jpg'),
    assetUrl('textures/earth_clouds.png'),
  ]);

  // Configure texture color spaces and filtering
  dayMap.colorSpace = THREE.SRGBColorSpace;
  cloudsMap.colorSpace = THREE.SRGBColorSpace;

  // Gentle independent rotation for atmospheric clouds
  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.015;
    }
  });

  return (
    <group name="earth-system">
      {/* Primary Earth Globe */}
      <mesh ref={earthRef} receiveShadow castShadow>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          map={dayMap}
          bumpMap={normalMap}
          bumpScale={0.045}
          roughnessMap={specularMap}
          roughness={0.65}
          metalness={0.12}
        />
      </mesh>

      {/* Atmospheric Cloud Layer */}
      <mesh ref={cloudsRef} scale={[1.007, 1.007, 1.007]}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.38}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Atmosphere Glow Halo */}
      <Atmosphere radius={radius} glowColor="#38bdf8" />
    </group>
  );
};
