import { useMemo, useRef, type FC } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLOBE_CONFIG } from '../../theme/constants';
import { PALETTE } from '../../theme/palette';
import { vector3ToLatLng } from '../../utils/coordinates';
import {
  initLandOceanMask,
  getBiomeInfo,
  getSurfaceRadius,
} from '../../utils/terrainSampler';

export const LowPolyPlanet: FC = () => {
  const waterRef = useRef<THREE.Mesh>(null);

  // 1. Load the earth specular mask
  const specularTexture = useLoader(THREE.TextureLoader, '/textures/earth_specular.jpg');

  // 2. Generate the low-poly terrain mesh with flat shading and vertex colors
  const terrainGeometry = useMemo(() => {
    if (specularTexture && specularTexture.image) {
      initLandOceanMask(specularTexture.image);
    }

    // Base icosphere
    const baseGeom = new THREE.IcosahedronGeometry(
      GLOBE_CONFIG.PLANET_RADIUS,
      GLOBE_CONFIG.ICOSPHERE_DETAIL
    );

    // Convert to non-indexed so each triangle has unique vertices and distinct flat normals
    const nonIndexed = baseGeom.toNonIndexed();
    baseGeom.dispose();

    const posAttr = nonIndexed.getAttribute('position') as THREE.BufferAttribute;
    const vertexCount = posAttr.count;
    const faceCount = Math.floor(vertexCount / 3);

    const colors = new Float32Array(vertexCount * 3);

    // Process face by face
    for (let f = 0; f < faceCount; f++) {
      const idx0 = f * 3;
      const idx1 = f * 3 + 1;
      const idx2 = f * 3 + 2;

      // Vertex coordinates
      const x0 = posAttr.getX(idx0);
      const y0 = posAttr.getY(idx0);
      const z0 = posAttr.getZ(idx0);

      const x1 = posAttr.getX(idx1);
      const y1 = posAttr.getY(idx1);
      const z1 = posAttr.getZ(idx1);

      const x2 = posAttr.getX(idx2);
      const y2 = posAttr.getY(idx2);
      const z2 = posAttr.getZ(idx2);

      // Face centroid
      const cx = (x0 + x1 + x2) / 3;
      const cy = (y0 + y1 + y2) / 3;
      const cz = (z0 + z1 + z2) / 3;

      const { lat, lng } = vector3ToLatLng(cx, cy, cz);
      const biome = getBiomeInfo(lat, lng, f);

      // Displace each vertex of this face
      const vertices = [
        { idx: idx0, x: x0, y: y0, z: z0 },
        { idx: idx1, x: x1, y: y1, z: z1 },
        { idx: idx2, x: x2, y: y2, z: z2 },
      ];

      for (const v of vertices) {
        const vLatLng = vector3ToLatLng(v.x, v.y, v.z);
        const r = getSurfaceRadius(vLatLng.lat, vLatLng.lng);
        const currentLen = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        const factor = r / currentLen;

        posAttr.setXYZ(v.idx, v.x * factor, v.y * factor, v.z * factor);

        // Assign face color to all 3 vertices
        colors[v.idx * 3] = biome.color.r;
        colors[v.idx * 3 + 1] = biome.color.g;
        colors[v.idx * 3 + 2] = biome.color.b;
      }
    }

    nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    nonIndexed.computeVertexNormals();

    return nonIndexed;
  }, [specularTexture]);

  // Gentle flat-shaded water animation
  useFrame(({ clock }) => {
    if (waterRef.current) {
      const t = clock.getElapsedTime();
      // Subtle rhythmic pulse
      const scale = 1.0 + Math.sin(t * 1.5) * 0.0015;
      waterRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group name="low-poly-planet">
      {/* Faceted Low-Poly Terrain */}
      <mesh geometry={terrainGeometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          flatShading
          roughness={0.78}
          metalness={0.05}
        />
      </mesh>

      {/* Translucent Flat-Shaded Water Surface */}
      <mesh ref={waterRef} receiveShadow>
        <icosahedronGeometry args={[GLOBE_CONFIG.WATER_RADIUS, 4]} />
        <meshStandardMaterial
          color={PALETTE.water.surface}
          transparent
          opacity={GLOBE_CONFIG.WATER_OPACITY}
          flatShading
          roughness={0.25}
          metalness={0.12}
        />
      </mesh>
    </group>
  );
};
