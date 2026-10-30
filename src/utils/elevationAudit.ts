import * as THREE from 'three';
import type { BlobInstanceData } from '../types';
import { EARTH_CONFIG } from '../theme/earthConfig';
import { getSurfaceRadius } from './terrainSampler';
import { latLngToVec3 } from './coordinates';

// Shared reference planet geometry for raycasting against the exact 192x192 mesh
let auditMesh: THREE.Mesh | null = null;
let auditRaycaster: THREE.Raycaster | null = null;

function getAuditMesh(): THREE.Mesh {
  if (!auditMesh) {
    const geom = new THREE.SphereGeometry(
      EARTH_CONFIG.PLANET_RADIUS,
      EARTH_CONFIG.SPHERE_SEGMENTS,
      EARTH_CONFIG.SPHERE_SEGMENTS
    );
    auditMesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
  }
  return auditMesh;
}

export function raycastMeshSurfaceDistance(lat: number, lng: number): number {
  if (!auditRaycaster) {
    auditRaycaster = new THREE.Raycaster();
  }
  const mesh = getAuditMesh();
  const origin = latLngToVec3(lat, lng, 5.0);
  const dir = origin.clone().negate().normalize();
  auditRaycaster.set(origin, dir);
  const hits = auditRaycaster.intersectObject(mesh);
  if (hits.length > 0) {
    return hits[0].point.length();
  }
  return EARTH_CONFIG.PLANET_RADIUS;
}

export interface BlobElevationAuditResult {
  label: string;
  artist: string;
  countryCode: string;
  countryName: string;
  lat: number;
  lng: number;
  radius: number;
  blobBaseRadius: number;
  getSurfaceRadius: number;
  raycastSurfaceDistance: number;
  difference: number;
  passed: boolean;
}

export function runElevationAudit(blobs: BlobInstanceData[]): BlobElevationAuditResult[] {
  if (blobs.length === 0) {
    console.warn('[Elevation Audit] No blobs available to test.');
    return [];
  }

  // Find 8 sample blobs:
  // 1. Largest blob (by radius)
  // 2. Smallest blob (by radius)
  // 3. India ('IN')
  // 4. Japan ('JP')
  // 5. Brazil ('BR')
  // 6. USA ('US')
  // 7. Norway ('NO')
  // 8. Indonesia ('ID')

  const sortedByRadius = [...blobs].sort((a, b) => b.radius - a.radius);
  const largest = sortedByRadius[0];
  const smallest = sortedByRadius[sortedByRadius.length - 1];

  const targetCodes: { code: string; label: string }[] = [
    { code: 'IN', label: 'India' },
    { code: 'JP', label: 'Japan' },
    { code: 'BR', label: 'Brazil' },
    { code: 'US', label: 'USA' },
    { code: 'NO', label: 'Norway' },
    { code: 'ID', label: 'Indonesia' },
  ];

  const samples: { blob: BlobInstanceData; label: string }[] = [
    { blob: largest, label: `Largest (${largest.artist.name}, ${largest.country.code})` },
    { blob: smallest, label: `Smallest (${smallest.artist.name}, ${smallest.country.code})` },
  ];

  for (const target of targetCodes) {
    const found = blobs.find((b) => b.country.code === target.code && b.rank === 1) ||
                  blobs.find((b) => b.country.code === target.code);
    if (found) {
      samples.push({ blob: found, label: `${target.label} (${target.code})` });
    } else if (target.code === 'NO') {
      // Fallback for Norway when no chart is returned by Apple: pick UK ('GB')
      const alt = blobs.find((b) => b.country.code === 'GB' && b.rank === 1) ||
                  blobs.find((b) => b.country.code === 'GB');
      if (alt) {
        samples.push({ blob: alt, label: `${alt.country.name} (${alt.country.code})` });
      }
    }
  }

  const results: BlobElevationAuditResult[] = [];
  let allPassed = true;

  console.log('\n============================================================');
  console.log('🌍 GLOBE ELEVATION AUDIT (Key G Toggle)');
  console.log('Testing 8 sample blobs against rendered 192x192 planet mesh:');
  console.log('Pass criteria: difference = (blob base radius - raycast surface distance) < 0.003');
  console.log('------------------------------------------------------------');

  for (const sample of samples) {
    const b = sample.blob;
    const blobPos = new THREE.Vector3(...b.position);
    // In MochiBlob, bottom of the body geometry is anchored at Y = 0 (relative to root group)
    // Distance from planet center to lowest vertex of blob is |blobPos|
    const blobBaseRadius = blobPos.length();
    const surfR = getSurfaceRadius(b.lat, b.lng);
    const raycastDist = raycastMeshSurfaceDistance(b.lat, b.lng);
    const diff = blobBaseRadius - raycastDist;
    const passed = Math.abs(diff) < 0.003 && diff < 0.003;

    if (!passed) {
      allPassed = false;
      console.warn(
        `⚠️ [WARNING] Blob elevation exceeded threshold for ${sample.label}! Diff = ${diff.toFixed(6)} >= 0.003`
      );
    }

    results.push({
      label: sample.label,
      artist: b.artist.name,
      countryCode: b.country.code,
      countryName: b.country.name,
      lat: b.lat,
      lng: b.lng,
      radius: b.radius,
      blobBaseRadius,
      getSurfaceRadius: surfR,
      raycastSurfaceDistance: raycastDist,
      difference: diff,
      passed,
    });

    console.log(
      `📍 ${sample.label.padEnd(32)} | Base: ${blobBaseRadius.toFixed(6)} | Surf: ${surfR.toFixed(6)} | Raycast: ${raycastDist.toFixed(6)} | Diff: ${(diff >= 0 ? '+' : '') + diff.toFixed(6)} [${passed ? '✅ PASS' : '❌ FAIL'}]`
    );
  }

  console.log('------------------------------------------------------------');
  if (allPassed) {
    console.log('🎉 [Elevation Audit] ALL 8 SAMPLE BLOBS PASSED (< 0.003 world units)!');
  } else {
    console.warn('⚠️ [Elevation Audit] Some blobs failed elevation threshold (< 0.003 world units).');
  }
  console.log('============================================================\n');

  return results;
}
