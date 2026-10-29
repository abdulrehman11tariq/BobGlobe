import { useMemo, useRef, type FC } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLOBE_CONFIG } from '../../theme/constants';
import { PALETTE } from '../../theme/palette';
import { SeededRandom } from '../../utils/seededRandom';

export const Clouds: FC = () => {
  const cloudsGroupRef = useRef<THREE.Group>(null);

  // Construct merged low-poly cloud meshes
  const mergedCloudsGeometry = useMemo(() => {
    const rng = new SeededRandom(GLOBE_CONFIG.RNG_SEED + 999);
    const cloudGeometries: THREE.BufferGeometry[] = [];

    const baseSphereGeom = new THREE.DodecahedronGeometry(0.18, 0);

    for (let c = 0; c < GLOBE_CONFIG.CLOUD_COUNT; c++) {
      // Random position on the cloud altitude shell
      const u = rng.range(-0.85, 0.85); // Avoid exact poles for cleaner cloud distribution
      const theta = rng.range(0, Math.PI * 2);
      const radiusAtY = Math.sqrt(1 - u * u);
      const nx = radiusAtY * Math.cos(theta);
      const ny = u;
      const nz = radiusAtY * Math.sin(theta);

      const alt = rng.range(GLOBE_CONFIG.CLOUD_SHELL_RADIUS_MIN, GLOBE_CONFIG.CLOUD_SHELL_RADIUS_MAX);
      const cloudCenter = new THREE.Vector3(nx, ny, nz).multiplyScalar(alt);

      // Create a puffy cluster of 3 to 5 overlapping low-poly puffs
      const puffCount = Math.floor(rng.range(3, 6));
      const up = new THREE.Vector3(0, 1, 0);
      const normal = cloudCenter.clone().normalize();
      const alignQuat = new THREE.Quaternion().setFromUnitVectors(up, normal);

      for (let p = 0; p < puffCount; p++) {
        const puffGeom = baseSphereGeom.clone();

        // Offset slightly in the tangent plane of the cloud center
        const tangentOffset = new THREE.Vector3(
          rng.range(-0.16, 0.16),
          rng.range(-0.06, 0.06),
          rng.range(-0.16, 0.16)
        );

        // Center puff is larger, peripheral puffs smaller
        const puffScale = p === 0 ? rng.range(1.1, 1.4) : rng.range(0.7, 1.05);
        puffGeom.scale(puffScale, puffScale * 0.75, puffScale);

        // Position and rotate
        puffGeom.applyQuaternion(alignQuat);
        puffGeom.translate(
          cloudCenter.x + tangentOffset.x,
          cloudCenter.y + tangentOffset.y,
          cloudCenter.z + tangentOffset.z
        );

        cloudGeometries.push(puffGeom);
      }
    }

    // Merge into single draw call for max performance
    const merged = BufferGeometryUtils.mergeGeometries(cloudGeometries, false);
    cloudGeometries.forEach((g) => g.dispose());
    baseSphereGeom.dispose();

    merged.computeVertexNormals();
    return merged;
  }, []);

  // Slowly drift clouds around the planet
  useFrame((_, delta) => {
    if (cloudsGroupRef.current) {
      cloudsGroupRef.current.rotation.y += delta * GLOBE_CONFIG.CLOUD_SPEED;
    }
  });

  return (
    <group ref={cloudsGroupRef} name="puffy-clouds">
      <mesh geometry={mergedCloudsGeometry} castShadow>
        <meshStandardMaterial
          color={PALETTE.cloud.base}
          flatShading
          roughness={0.85}
          metalness={0.02}
        />
      </mesh>
    </group>
  );
};
