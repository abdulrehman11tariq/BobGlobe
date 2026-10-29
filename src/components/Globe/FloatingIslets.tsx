import { useMemo, useRef, type FC } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLOBE_CONFIG } from '../../theme/constants';
import { PALETTE } from '../../theme/palette';
import { SeededRandom } from '../../utils/seededRandom';

export const FloatingIslets: FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const isletsRef = useRef<THREE.Group[]>([]);

  // Generate deterministic islet parameters
  const isletsData = useMemo(() => {
    const rng = new SeededRandom(GLOBE_CONFIG.RNG_SEED + 555);
    const list = [];

    for (let i = 0; i < GLOBE_CONFIG.ISLET_COUNT; i++) {
      // Orbital distribution around the equatorial / temperate zone
      const angle = (i / GLOBE_CONFIG.ISLET_COUNT) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const orbitRadius = rng.range(GLOBE_CONFIG.ISLET_ORBIT_RADIUS_MIN, GLOBE_CONFIG.ISLET_ORBIT_RADIUS_MAX);
      const heightY = rng.range(-0.8, 0.8);

      const basePos = new THREE.Vector3(
        Math.cos(angle) * orbitRadius,
        heightY,
        Math.sin(angle) * orbitRadius
      );

      const scale = rng.range(GLOBE_CONFIG.ISLET_SCALE_MIN, GLOBE_CONFIG.ISLET_SCALE_MAX);
      const bobPhase = rng.range(0, Math.PI * 2);
      const bobSpeed = rng.range(1.2, 1.8);
      const rotSpeed = rng.range(0.2, 0.6);

      list.push({
        basePos,
        scale,
        bobPhase,
        bobSpeed,
        rotSpeed,
      });
    }

    return list;
  }, []);

  // Shared geometries
  const grassTopGeom = useMemo(() => new THREE.CylinderGeometry(0.85, 0.7, 0.22, 6), []);
  const rockBaseGeom = useMemo(() => {
    const geom = new THREE.ConeGeometry(0.72, 1.3, 6);
    // Invert cone so sharp tip points downward
    geom.rotateX(Math.PI);
    geom.translate(0, -0.65, 0);
    return geom;
  }, []);
  const miniCanopyGeom = useMemo(() => new THREE.DodecahedronGeometry(0.3, 0), []);
  const miniTrunkGeom = useMemo(() => new THREE.CylinderGeometry(0.04, 0.08, 0.35, 4), []);

  // Materials
  const grassMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: PALETTE.islet.grass, flatShading: true, roughness: 0.8 }),
    []
  );
  const rockMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: PALETTE.islet.rock, flatShading: true, roughness: 0.9 }),
    []
  );
  const miniTrunkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: PALETTE.vegetation.trunk, flatShading: true }),
    []
  );
  const miniCanopyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: PALETTE.vegetation.roundCanopy[1], flatShading: true }),
    []
  );

  // Bobbing and gentle orbit animation
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Slow orbital rotation of the entire islet system
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.02;
    }

    // Individual vertical bobbing and gentle tilting
    isletsRef.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const data = isletsData[idx];
      const bob = Math.sin(t * data.bobSpeed + data.bobPhase) * 0.06;
      mesh.position.y = data.basePos.y + bob;
      mesh.rotation.y = t * data.rotSpeed * 0.2;
    });
  });

  return (
    <group ref={groupRef} name="floating-islets">
      {isletsData.map((data, idx) => (
        <group
          key={idx}
          ref={(el) => {
            if (el) isletsRef.current[idx] = el;
          }}
          position={data.basePos}
          scale={[data.scale, data.scale, data.scale]}
        >
          {/* Grassy Top Plateau */}
          <mesh geometry={grassTopGeom} material={grassMat} castShadow receiveShadow position={[0, 0.1, 0]} />

          {/* Faceted Rocky Underside */}
          <mesh geometry={rockBaseGeom} material={rockMat} castShadow receiveShadow />

          {/* Mini tree on the islet */}
          <group position={[0.2, 0.25, -0.1]}>
            <mesh geometry={miniTrunkGeom} material={miniTrunkMat} position={[0, 0.15, 0]} castShadow />
            <mesh geometry={miniCanopyGeom} material={miniCanopyMat} position={[0, 0.42, 0]} castShadow />
          </group>
        </group>
      ))}
    </group>
  );
};
