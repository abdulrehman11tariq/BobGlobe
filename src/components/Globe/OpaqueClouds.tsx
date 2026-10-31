import { useMemo, useRef, type FC } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EARTH_CONFIG } from '../../theme/earthConfig';
import { latLngToVec3 } from '../../utils/coordinates';

interface CloudClusterData {
  basePos: THREE.Vector3;
  orbitAxis: THREE.Vector3;
  orbitSpeed: number;
}

export const OpaqueClouds: FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const cloudMeshesRef = useRef<THREE.Mesh[]>([]);

  // 1. Construct single merged puffy cloud geometry with blue-gray underside vertex colors
  const cloudGeom = useMemo(() => {
    const puffCount = 4;
    const geoms: THREE.BufferGeometry[] = [];
    const baseSphere = new THREE.SphereGeometry(0.18, 14, 10);

    // Arrange 4 overlapping spheres to form a chubby 3D cloud
    const offsets = [
      { x: 0, y: 0, z: 0, scale: 1.25 },
      { x: -0.16, y: -0.02, z: 0.04, scale: 0.95 },
      { x: 0.16, y: -0.01, z: -0.03, scale: 1.0 },
      { x: 0.04, y: 0.07, z: 0.02, scale: 0.85 },
    ];

    for (let i = 0; i < puffCount; i++) {
      const g = baseSphere.clone();
      const o = offsets[i];
      g.scale(o.scale, o.scale * 0.75, o.scale * 0.9);
      g.translate(o.x, o.y, o.z);
      geoms.push(g);
    }

    const merged = BufferGeometryUtils.mergeGeometries(geoms, false);
    geoms.forEach((g) => g.dispose());
    baseSphere.dispose();

    // Assign vertex colors: Pure white on top, faint blue-gray tint on underside
    const posAttr = merged.getAttribute('position') as THREE.BufferAttribute;
    const vertexCount = posAttr.count;
    const colors = new Float32Array(vertexCount * 3);

    const cWhite = new THREE.Color('#ffffff');
    const cUnderside = new THREE.Color('#cbd5e1'); // Faint blue-gray

    for (let i = 0; i < vertexCount; i++) {
      const y = posAttr.getY(i);
      // Underside shading factor
      const factor = Math.max(0.0, Math.min(1.0, (y + 0.12) / 0.24));
      const col = cUnderside.clone().lerp(cWhite, factor);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    merged.computeVertexNormals();
    return merged;
  }, []);

  // Shared 100% OPAQUE cloud material
  const cloudMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.0,
      transparent: false,
      depthWrite: true,
    });
  }, []);

  // 2. Generate 12 cloud positions distributed across oceans & open skies
  const cloudsData: CloudClusterData[] = useMemo(() => {
    const list: CloudClusterData[] = [];
    const count = EARTH_CONFIG.clouds.count;
    const alt = EARTH_CONFIG.clouds.altitude;

    // Distribute clouds mainly over oceans away from key land blob clusters
    const lats = [-45, -30, -15, 0, 15, 30, 48, -52, 22, -10, 38, -35];
    const lngs = [-140, -110, -35, -25, -160, 170, -145, 80, -40, 105, -170, -75];

    for (let i = 0; i < count; i++) {
      const lat = lats[i % lats.length];
      const lng = lngs[i % lngs.length];

      const basePos = latLngToVec3(lat, lng, alt);
      const orbitAxis = new THREE.Vector3(0, 1, 0).applyAxisAngle(
        new THREE.Vector3(1, 0, 0),
        ((i % 3) - 1) * 0.2
      );
      const orbitSpeed = EARTH_CONFIG.clouds.speedMin + (i % 4) * 0.002;

      list.push({ basePos, orbitAxis, orbitSpeed });
    }

    return list;
  }, []);

  // 3. Animation: Slow orbit + Instant Hide in close view / walk mode (No fade!)
  useFrame(({ camera, clock }) => {
    const camDist = camera.position.length();
    const isClose = camDist < EARTH_CONFIG.clouds.hideDistance;

    // Toggle visibility instantly without transparency
    if (groupRef.current) {
      groupRef.current.visible = !isClose;
    }

    if (!isClose) {
      const t = clock.getElapsedTime();
      cloudMeshesRef.current.forEach((mesh, idx) => {
        if (!mesh) return;
        const d = cloudsData[idx];
        // Orbit around Earth center
        const angle = t * d.orbitSpeed;
        mesh.position.copy(d.basePos).applyAxisAngle(d.orbitAxis, angle);

        // Align tangent to sphere surface
        mesh.lookAt(0, 0, 0);
        mesh.rotateY(Math.PI);
      });
    }
  });

  return (
    <group ref={groupRef} name="opaque-3d-clouds">
      {cloudsData.map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            if (el) cloudMeshesRef.current[idx] = el;
          }}
          geometry={cloudGeom}
          material={cloudMaterial}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
};
