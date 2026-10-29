import { useMemo, type FC } from 'react';
import * as THREE from 'three';
import countriesData from '../../data/countries.json';
import { GLOBE_CONFIG } from '../../theme/constants';
import { PALETTE } from '../../theme/palette';
import { latLngToVector3 } from '../../utils/coordinates';
import { SeededRandom } from '../../utils/seededRandom';
import { getSurfaceRadius, sampleLandOceanMask } from '../../utils/terrainSampler';

export const Vegetation: FC = () => {
  // Pre-compute country centroid positions to avoid blob collision
  const blobCentroids = useMemo(() => {
    return countriesData.map((c) => {
      const r = GLOBE_CONFIG.PLANET_RADIUS;
      return latLngToVector3(c.lat, c.lng, r);
    });
  }, []);

  // Compute deterministic placement of trees, rocks, and bushes on land
  const {
    roundTrees,
    acaciaTrees,
    blossomTrees,
    rocks,
    bushes,
  } = useMemo(() => {
    const rng = new SeededRandom(GLOBE_CONFIG.RNG_SEED);

    const roundList: { pos: THREE.Vector3; normal: THREE.Vector3; scale: number; rotY: number; color: string }[] = [];
    const acaciaList: { pos: THREE.Vector3; normal: THREE.Vector3; scale: number; rotY: number; color: string }[] = [];
    const blossomList: { pos: THREE.Vector3; normal: THREE.Vector3; scale: number; rotY: number; color: string }[] = [];
    const rockList: { pos: THREE.Vector3; normal: THREE.Vector3; scale: THREE.Vector3; rot: THREE.Euler; color: string }[] = [];
    const bushList: { pos: THREE.Vector3; normal: THREE.Vector3; scale: number; color: string }[] = [];

    // Helper to test if a candidate position is too close to a country blob site
    const isNearBlobSite = (candidatePos: THREE.Vector3): boolean => {
      for (const centroid of blobCentroids) {
        if (candidatePos.distanceTo(centroid) < GLOBE_CONFIG.BLOB_CLEARANCE_RADIUS) {
          return true;
        }
      }
      return false;
    };

    // 1. Plant Trees
    let attempts = 0;
    while (
      (roundList.length + acaciaList.length + blossomList.length) < GLOBE_CONFIG.TREE_COUNT &&
      attempts < 6000
    ) {
      attempts++;
      // Uniform random point on sphere
      const u = rng.range(-1, 1);
      const theta = rng.range(0, Math.PI * 2);
      const radiusAtY = Math.sqrt(1 - u * u);
      const nx = radiusAtY * Math.cos(theta);
      const ny = u;
      const nz = radiusAtY * Math.sin(theta);

      // Lat/lng from normal
      const lat = (Math.asin(ny) * 180) / Math.PI;
      let lng = (Math.atan2(nz, -nx) * 180) / Math.PI - 180;
      if (lng < -180) lng += 360;

      const mask = sampleLandOceanMask(lat, lng);
      // Trees only grow on solid land (not deep ocean or beach/snow)
      if (mask < 0.38 && Math.abs(lat) < GLOBE_CONFIG.POLAR_SNOW_LAT - 4) {
        const r = getSurfaceRadius(lat, lng);
        const normal = new THREE.Vector3(nx, ny, nz);
        const pos = normal.clone().multiplyScalar(r);

        if (!isNearBlobSite(pos)) {
          const scale = rng.range(GLOBE_CONFIG.TREE_SCALE_MIN, GLOBE_CONFIG.TREE_SCALE_MAX);
          const rotY = rng.range(0, Math.PI * 2);
          const treeTypeRoll = rng.next();

          if (treeTypeRoll < GLOBE_CONFIG.BLOSSOM_TREE_RATIO) {
            blossomList.push({
              pos,
              normal,
              scale,
              rotY,
              color: rng.pick(PALETTE.vegetation.blossomCanopy as unknown as string[]),
            });
          } else if (treeTypeRoll < GLOBE_CONFIG.BLOSSOM_TREE_RATIO + GLOBE_CONFIG.ACACIA_TREE_RATIO) {
            acaciaList.push({
              pos,
              normal,
              scale,
              rotY,
              color: rng.pick(PALETTE.vegetation.acaciaCanopy as unknown as string[]),
            });
          } else {
            roundList.push({
              pos,
              normal,
              scale,
              rotY,
              color: rng.pick(PALETTE.vegetation.roundCanopy as unknown as string[]),
            });
          }
        }
      }
    }

    // 2. Scatter Rocks
    attempts = 0;
    while (rockList.length < GLOBE_CONFIG.ROCK_COUNT && attempts < 3000) {
      attempts++;
      const u = rng.range(-1, 1);
      const theta = rng.range(0, Math.PI * 2);
      const radiusAtY = Math.sqrt(1 - u * u);
      const nx = radiusAtY * Math.cos(theta);
      const ny = u;
      const nz = radiusAtY * Math.sin(theta);

      const lat = (Math.asin(ny) * 180) / Math.PI;
      let lng = (Math.atan2(nz, -nx) * 180) / Math.PI - 180;
      if (lng < -180) lng += 360;

      const mask = sampleLandOceanMask(lat, lng);
      // Rocks can appear anywhere on land or along beaches
      if (mask < 0.44) {
        const r = getSurfaceRadius(lat, lng);
        const normal = new THREE.Vector3(nx, ny, nz);
        const pos = normal.clone().multiplyScalar(r - 0.008);

        if (!isNearBlobSite(pos)) {
          const s = rng.range(0.04, 0.08);
          rockList.push({
            pos,
            normal,
            scale: new THREE.Vector3(s * rng.range(0.8, 1.3), s * rng.range(0.7, 1.2), s * rng.range(0.8, 1.3)),
            rot: new THREE.Euler(rng.range(0, Math.PI), rng.range(0, Math.PI), rng.range(0, Math.PI)),
            color: rng.pick(PALETTE.rock as unknown as string[]),
          });
        }
      }
    }

    // 3. Scatter Bushes
    attempts = 0;
    while (bushList.length < GLOBE_CONFIG.BUSH_COUNT && attempts < 3000) {
      attempts++;
      const u = rng.range(-1, 1);
      const theta = rng.range(0, Math.PI * 2);
      const radiusAtY = Math.sqrt(1 - u * u);
      const nx = radiusAtY * Math.cos(theta);
      const ny = u;
      const nz = radiusAtY * Math.sin(theta);

      const lat = (Math.asin(ny) * 180) / Math.PI;
      let lng = (Math.atan2(nz, -nx) * 180) / Math.PI - 180;
      if (lng < -180) lng += 360;

      const mask = sampleLandOceanMask(lat, lng);
      if (mask < 0.38 && Math.abs(lat) < GLOBE_CONFIG.POLAR_SNOW_LAT - 6) {
        const r = getSurfaceRadius(lat, lng);
        const normal = new THREE.Vector3(nx, ny, nz);
        const pos = normal.clone().multiplyScalar(r);

        if (!isNearBlobSite(pos)) {
          bushList.push({
            pos,
            normal,
            scale: rng.range(0.04, 0.075),
            color: rng.pick(PALETTE.vegetation.bush as unknown as string[]),
          });
        }
      }
    }

    return {
      roundTrees: roundList,
      acaciaTrees: acaciaList,
      blossomTrees: blossomList,
      rocks: rockList,
      bushes: bushList,
    };
  }, [blobCentroids]);

  // Shared Geometries & Materials
  const trunkGeom = useMemo(() => new THREE.CylinderGeometry(0.12, 0.22, 1.0, 5), []);
  const roundCanopyGeom = useMemo(() => new THREE.DodecahedronGeometry(0.85, 0), []);
  const acaciaCanopyGeom = useMemo(() => new THREE.CylinderGeometry(1.2, 0.7, 0.35, 6), []);
  const blossomCanopyGeom = useMemo(() => new THREE.DodecahedronGeometry(0.9, 0), []);
  const rockGeom = useMemo(() => new THREE.IcosahedronGeometry(1.0, 0), []);
  const bushGeom = useMemo(() => new THREE.DodecahedronGeometry(0.65, 0), []);

  const trunkMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: PALETTE.vegetation.trunk, flatShading: true, roughness: 0.9 }),
    []
  );

  // Instanced Meshes Builder Helper
  const setupTreeInstances = (
    treeList: typeof roundTrees,
    canopyGeom: THREE.BufferGeometry,
    canopyMaterialColor: string,
    canopyOffset: number
  ) => {
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);

    const trunkMesh = new THREE.InstancedMesh(trunkGeom, trunkMaterial, treeList.length);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: canopyMaterialColor,
      flatShading: true,
      roughness: 0.75,
    });
    const canopyMesh = new THREE.InstancedMesh(canopyGeom, canopyMat, treeList.length);

    trunkMesh.castShadow = true;
    canopyMesh.castShadow = true;

    treeList.forEach((t, i) => {
      // Orient along planet surface normal
      const quat = new THREE.Quaternion().setFromUnitVectors(up, t.normal);
      const rotY = new THREE.Quaternion().setFromAxisAngle(t.normal, t.rotY);
      quat.premultiply(rotY);

      // Trunk
      dummy.position.copy(t.pos);
      dummy.quaternion.copy(quat);
      dummy.scale.set(t.scale, t.scale, t.scale);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);

      // Canopy positioned at the top of the trunk
      const canopyPos = t.pos.clone().add(t.normal.clone().multiplyScalar(t.scale * canopyOffset));
      dummy.position.copy(canopyPos);
      dummy.updateMatrix();
      canopyMesh.setMatrixAt(i, dummy.matrix);
      canopyMesh.setColorAt(i, new THREE.Color(t.color));
    });

    trunkMesh.instanceMatrix.needsUpdate = true;
    canopyMesh.instanceMatrix.needsUpdate = true;
    if (canopyMesh.instanceColor) canopyMesh.instanceColor.needsUpdate = true;

    return { trunkMesh, canopyMesh };
  };

  const roundTreeMeshes = useMemo(
    () => setupTreeInstances(roundTrees, roundCanopyGeom, PALETTE.vegetation.roundCanopy[0], 0.95),
    [roundTrees, roundCanopyGeom, trunkGeom, trunkMaterial]
  );

  const acaciaTreeMeshes = useMemo(
    () => setupTreeInstances(acaciaTrees, acaciaCanopyGeom, PALETTE.vegetation.acaciaCanopy[0], 0.9),
    [acaciaTrees, acaciaCanopyGeom, trunkGeom, trunkMaterial]
  );

  const blossomTreeMeshes = useMemo(
    () => setupTreeInstances(blossomTrees, blossomCanopyGeom, PALETTE.vegetation.blossomCanopy[0], 0.98),
    [blossomTrees, blossomCanopyGeom, trunkGeom, trunkMaterial]
  );

  // Rock Instanced Mesh
  const rockMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      rockGeom,
      new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.85 }),
      rocks.length
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);

    rocks.forEach((r, i) => {
      const quat = new THREE.Quaternion().setFromUnitVectors(up, r.normal);
      dummy.position.copy(r.pos);
      dummy.quaternion.copy(quat);
      dummy.rotation.copy(r.rot);
      dummy.scale.copy(r.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(r.color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }, [rocks, rockGeom]);

  // Bush Instanced Mesh
  const bushMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      bushGeom,
      new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8 }),
      bushes.length
    );
    mesh.castShadow = true;

    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);

    bushes.forEach((b, i) => {
      const quat = new THREE.Quaternion().setFromUnitVectors(up, b.normal);
      dummy.position.copy(b.pos);
      dummy.quaternion.copy(quat);
      dummy.scale.set(b.scale, b.scale * 0.8, b.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(b.color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }, [bushes, bushGeom]);

  return (
    <group name="low-poly-decorations">
      <primitive object={roundTreeMeshes.trunkMesh} />
      <primitive object={roundTreeMeshes.canopyMesh} />

      <primitive object={acaciaTreeMeshes.trunkMesh} />
      <primitive object={acaciaTreeMeshes.canopyMesh} />

      <primitive object={blossomTreeMeshes.trunkMesh} />
      <primitive object={blossomTreeMeshes.canopyMesh} />

      <primitive object={rockMesh} />
      <primitive object={bushMesh} />
    </group>
  );
};
