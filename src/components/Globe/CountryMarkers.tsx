import { useMemo, useEffect, type FC } from 'react';
import * as THREE from 'three';
import { latLngToVec3 } from '../../utils/coordinates';
import { getSurfaceRadius } from '../../utils/terrainSampler';
import { getAllCandidateMarkers, getLayoutStats } from '../../utils/blobPlacement';
import type { BlobInstanceData } from '../../types';

interface CountryMarkersProps {
  visible: boolean;
  blobs?: BlobInstanceData[];
}

const usedMarkerGeom = new THREE.SphereGeometry(0.018, 12, 10);
const unusedMarkerGeom = new THREE.SphereGeometry(0.010, 8, 8);

const usedMarkerMaterial = new THREE.MeshBasicMaterial({
  color: '#38bdf8', // Vibrant Sky Blue for used candidate points
  transparent: false,
  depthWrite: true,
});

const unusedMarkerMaterial = new THREE.MeshBasicMaterial({
  color: '#64748b', // Subtle slate gray for unused candidate points
  transparent: false,
  depthWrite: true,
});

const validRingMaterial = new THREE.MeshBasicMaterial({
  color: '#10b981', // Emerald green for valid footprints
  wireframe: true,
  side: THREE.DoubleSide,
  transparent: false,
  depthWrite: true,
});

const invalidRingMaterial = new THREE.MeshBasicMaterial({
  color: '#ef4444', // Red for footprint failures
  wireframe: true,
  side: THREE.DoubleSide,
  transparent: false,
  depthWrite: true,
});

export const CountryMarkers: FC<CountryMarkersProps> = ({ visible, blobs = [] }) => {
  // Log layout statistics whenever debug mode is activated
  useEffect(() => {
    if (visible) {
      const stats = getLayoutStats();
      console.group('🗺️ [BobGlobe Phase 3.5 Scatter Placement Report]');
      console.log('✅ Blobs Placed:', stats.totalPlaced);
      console.log('🙈 Blobs Hidden (+N more):', stats.totalHidden);
      console.log('🔍 Countries Shrunk:', stats.totalShrunk);
      console.log('🔄 Re-assigned Points:', stats.totalReassigned);
      console.log('🚫 Footprint Failures (must be 0):', stats.footprintFailures);
      console.log('🚫 Inter-blob Collisions (must be 0):', stats.overlapCollisions);
      console.groupEnd();
    }
  }, [visible]);

  // Compute 3D positions for candidate markers
  const markers = useMemo(() => {
    if (!visible) return [];
    const all = getAllCandidateMarkers();
    return all.map((m) => {
      const surfR = getSurfaceRadius(m.lat, m.lng);
      const pos = latLngToVec3(m.lat, m.lng, surfR + (m.isUsed ? 0.012 : 0.006));
      return {
        ...m,
        pos,
      };
    });
  }, [visible]);

  // Compute footprint rings for placed blobs
  const footprintRings = useMemo(() => {
    if (!visible) return [];
    const up = new THREE.Vector3(0, 0, 1);

    return blobs.map((b) => {
      const surfR = getSurfaceRadius(b.lat, b.lng);
      const pos = latLngToVec3(b.lat, b.lng, surfR + 0.005);
      const normal = pos.clone().normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(up, normal);

      return {
        id: b.id,
        pos,
        quat,
        radius: b.radius,
        isValid: true,
      };
    });
  }, [visible, blobs]);

  if (!visible) return null;

  return (
    <group name="phase3-debug-markers-and-footprints">
      {/* 1. Candidate Land Points Markers */}
      {markers.map((m, idx) => (
        <group key={`cand-${m.countryCode}-${idx}`} position={m.pos}>
          <mesh
            geometry={m.isUsed ? usedMarkerGeom : unusedMarkerGeom}
            material={m.isUsed ? usedMarkerMaterial : unusedMarkerMaterial}
          />
        </group>
      ))}

      {/* 2. Blob Footprint Circles */}
      {footprintRings.map((ring) => (
        <group key={`ring-${ring.id}`} position={ring.pos} quaternion={ring.quat}>
          <mesh material={ring.isValid ? validRingMaterial : invalidRingMaterial}>
            <ringGeometry args={[ring.radius * 0.96, ring.radius * 1.04, 32]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
