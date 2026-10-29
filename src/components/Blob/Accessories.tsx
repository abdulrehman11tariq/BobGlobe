import { useMemo, type FC } from 'react';
import * as THREE from 'three';
import { MOCHI_CONFIG } from '../../theme/mochiConfig';

export type AccessoryType =
  | 'crown'
  | 'sprout'
  | 'cat_ears'
  | 'bunny_ears'
  | 'antenna'
  | 'bow'
  | 'hat'
  | 'horns'
  | 'mushroom';

interface AccessoryProps {
  type: AccessoryType;
  headY?: number;
}

export const Accessory: FC<AccessoryProps> = ({ type, headY = 0.76 }) => {
  // Shared materials for accessories
  const materials = useMemo(() => {
    return {
      gold: new THREE.MeshStandardMaterial({
        color: '#ffc107',
        roughness: 0.22,
        metalness: 0.75,
      }),
      gem: new THREE.MeshStandardMaterial({
        color: '#f43f5e',
        roughness: 0.15,
        metalness: 0.2,
      }),
      sprout: new THREE.MeshStandardMaterial({
        color: '#22c55e',
        roughness: 0.35,
      }),
      catOuter: new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.45,
      }),
      innerPink: new THREE.MeshStandardMaterial({
        color: '#ff7096',
        roughness: 0.55,
      }),
      antennaStem: new THREE.MeshStandardMaterial({
        color: '#475569',
        roughness: 0.35,
      }),
      antennaGlow: new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#0284c7',
        emissiveIntensity: 0.75,
      }),
      bow: new THREE.MeshStandardMaterial({
        color: '#f43f5e',
        roughness: 0.3,
      }),
      hat: new THREE.MeshStandardMaterial({
        color: '#8b5cf6',
        roughness: 0.35,
      }),
      horns: new THREE.MeshStandardMaterial({
        color: '#facc15',
        roughness: 0.25,
      }),
      mushroomRed: new THREE.MeshStandardMaterial({
        color: '#ef4444',
        roughness: 0.3,
      }),
      whiteDot: new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.4,
      }),
    };
  }, []);

  // Scale enlarged to ~28% of body width as requested
  const s = MOCHI_CONFIG.ACCESSORY_SCALE * 1.25;

  switch (type) {
    case 'crown':
      return (
        <group position={[0, headY + 0.12, 0]} scale={[s * 1.1, s * 1.1, s * 1.1]}>
          <mesh material={materials.gold} castShadow>
            <cylinderGeometry args={[0.82, 0.65, 0.52, 5]} />
          </mesh>
          {/* Ruby jewel on front */}
          <mesh position={[0, 0, 0.72]} material={materials.gem}>
            <sphereGeometry args={[0.18, 10, 10]} />
          </mesh>
        </group>
      );

    case 'sprout':
      return (
        <group position={[0, headY + 0.1, 0]} scale={[s * 1.1, s * 1.1, s * 1.1]}>
          {/* Stem */}
          <mesh material={materials.sprout} position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.07, 0.1, 0.85, 8]} />
          </mesh>
          {/* Left leaf */}
          <mesh
            material={materials.sprout}
            position={[-0.36, 0.78, 0]}
            rotation={[0, 0, 0.7]}
            scale={[0.42, 0.18, 0.3]}
          >
            <sphereGeometry args={[1, 12, 12]} />
          </mesh>
          {/* Right leaf */}
          <mesh
            material={materials.sprout}
            position={[0.36, 0.78, 0]}
            rotation={[0, 0, -0.7]}
            scale={[0.42, 0.18, 0.3]}
          >
            <sphereGeometry args={[1, 12, 12]} />
          </mesh>
        </group>
      );

    case 'cat_ears':
      return (
        <group position={[0, headY + 0.02, 0]} scale={[s * 1.05, s * 1.05, s * 1.05]}>
          {/* Left ear */}
          <group position={[-0.78, 0.25, 0]} rotation={[0, 0, 0.28]}>
            <mesh material={materials.catOuter}>
              <coneGeometry args={[0.55, 0.9, 4]} />
            </mesh>
            <mesh material={materials.innerPink} position={[0, -0.05, 0.18]} scale={0.68}>
              <coneGeometry args={[0.55, 0.9, 4]} />
            </mesh>
          </group>
          {/* Right ear */}
          <group position={[0.78, 0.25, 0]} rotation={[0, 0, -0.28]}>
            <mesh material={materials.catOuter}>
              <coneGeometry args={[0.55, 0.9, 4]} />
            </mesh>
            <mesh material={materials.innerPink} position={[0, -0.05, 0.18]} scale={0.68}>
              <coneGeometry args={[0.55, 0.9, 4]} />
            </mesh>
          </group>
        </group>
      );

    case 'bunny_ears':
      return (
        <group position={[0, headY + 0.04, 0]} scale={[s * 0.95, s * 1.25, s * 0.95]}>
          {/* Left tall ear */}
          <group position={[-0.58, 0.65, 0]} rotation={[0, 0, 0.16]}>
            <mesh material={materials.catOuter} scale={[0.34, 1.3, 0.34]}>
              <capsuleGeometry args={[0.5, 0.85, 8, 8]} />
            </mesh>
            <mesh material={materials.innerPink} position={[0, 0, 0.16]} scale={[0.22, 1.0, 0.22]}>
              <capsuleGeometry args={[0.5, 0.85, 8, 8]} />
            </mesh>
          </group>
          {/* Right tall ear */}
          <group position={[0.58, 0.65, 0]} rotation={[0, 0, -0.16]}>
            <mesh material={materials.catOuter} scale={[0.34, 1.3, 0.34]}>
              <capsuleGeometry args={[0.5, 0.85, 8, 8]} />
            </mesh>
            <mesh material={materials.innerPink} position={[0, 0, 0.16]} scale={[0.22, 1.0, 0.22]}>
              <capsuleGeometry args={[0.5, 0.85, 8, 8]} />
            </mesh>
          </group>
        </group>
      );

    case 'antenna':
      return (
        <group position={[0, headY + 0.04, 0]} scale={[s * 1.1, s * 1.2, s * 1.1]}>
          <mesh material={materials.antennaStem} position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 1.0, 8]} />
          </mesh>
          <mesh material={materials.antennaGlow} position={[0, 1.05, 0]}>
            <sphereGeometry args={[0.28, 14, 14]} />
          </mesh>
        </group>
      );

    case 'bow':
      return (
        <group position={[0.28, headY + 0.06, 0.12]} rotation={[0, 0.22, -0.22]} scale={[s * 1.1, s * 1.1, s * 1.1]}>
          {/* Left wing */}
          <mesh material={materials.bow} position={[-0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.42, 0.72, 6]} />
          </mesh>
          {/* Right wing */}
          <mesh material={materials.bow} position={[0.45, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.42, 0.72, 6]} />
          </mesh>
          {/* Center knot */}
          <mesh material={materials.bow}>
            <sphereGeometry args={[0.24, 8, 8]} />
          </mesh>
        </group>
      );

    case 'hat':
      return (
        <group position={[0, headY + 0.1, 0]} rotation={[0.1, 0, -0.12]} scale={[s * 1.15, s * 1.3, s * 1.15]}>
          {/* Brim */}
          <mesh material={materials.hat}>
            <cylinderGeometry args={[0.9, 0.95, 0.12, 16]} />
          </mesh>
          {/* Cone body */}
          <mesh material={materials.hat} position={[0, 0.75, 0]}>
            <coneGeometry args={[0.62, 1.4, 16]} />
          </mesh>
          {/* Pompom on tip */}
          <mesh material={materials.gem} position={[0, 1.48, 0]}>
            <sphereGeometry args={[0.18, 8, 8]} />
          </mesh>
        </group>
      );

    case 'horns':
      return (
        <group position={[0, headY + 0.04, 0]} scale={[s * 1.0, s * 1.0, s * 1.0]}>
          <mesh material={materials.horns} position={[-0.68, 0.3, 0]} rotation={[0, 0, 0.42]}>
            <coneGeometry args={[0.28, 0.85, 8]} />
          </mesh>
          <mesh material={materials.horns} position={[0.68, 0.3, 0]} rotation={[0, 0, -0.42]}>
            <coneGeometry args={[0.28, 0.85, 8]} />
          </mesh>
        </group>
      );

    case 'mushroom':
      return (
        <group position={[0, headY + 0.08, 0]} rotation={[0.08, 0, 0.1]} scale={[s * 1.25, s * 1.15, s * 1.25]}>
          {/* Red mushroom cap */}
          <mesh material={materials.mushroomRed}>
            <sphereGeometry args={[0.8, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          </mesh>
          {/* White spots */}
          <mesh material={materials.whiteDot} position={[0, 0.62, 0.28]} scale={0.18}>
            <sphereGeometry args={[1, 8, 8]} />
          </mesh>
          <mesh material={materials.whiteDot} position={[-0.38, 0.45, -0.22]} scale={0.16}>
            <sphereGeometry args={[1, 8, 8]} />
          </mesh>
          <mesh material={materials.whiteDot} position={[0.4, 0.4, 0.18]} scale={0.15}>
            <sphereGeometry args={[1, 8, 8]} />
          </mesh>
        </group>
      );
  }
};
