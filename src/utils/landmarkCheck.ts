import * as THREE from 'three';
import { isLand, getSurfaceRadius } from './terrainSampler';
import { latLngToVec3 } from './coordinates';
import type { BlobInstanceData } from '../types';

interface LandmarkSpec {
  code: string;
  name: string;
  continent: string;
  expectedMinLat: number;
  expectedMaxLat: number;
  expectedMinLng: number;
  expectedMaxLng: number;
}

const LANDMARKS: LandmarkSpec[] = [
  { code: 'BR', name: 'Brazil', continent: 'South America', expectedMinLat: -35, expectedMaxLat: 6, expectedMinLng: -75, expectedMaxLng: -34 },
  { code: 'JP', name: 'Japan', continent: 'Asia (East)', expectedMinLat: 30, expectedMaxLat: 46, expectedMinLng: 128, expectedMaxLng: 146 },
  { code: 'NG', name: 'Nigeria', continent: 'Africa (West)', expectedMinLat: 4, expectedMaxLat: 14, expectedMinLng: 2, expectedMaxLng: 15 },
  { code: 'IN', name: 'India', continent: 'Asia (South)', expectedMinLat: 8, expectedMaxLat: 36, expectedMinLng: 68, expectedMaxLng: 98 },
  { code: 'AU', name: 'Australia', continent: 'Oceania', expectedMinLat: -45, expectedMaxLat: -10, expectedMinLng: 112, expectedMaxLng: 155 },
  { code: 'US', name: 'United States', continent: 'North America', expectedMinLat: 24, expectedMaxLat: 50, expectedMinLng: -125, expectedMaxLng: -66 },
];

/**
 * Startup verification check (dev only).
 * Validates that all blobs are on land and landmark countries appear on their correct continents.
 */
export function runLandmarkStartupCheck(blobs: BlobInstanceData[]): void {
  if (blobs.length === 0) return;

  console.group('🌍 [BobGlobe Startup Check] Verifying Land Placement & Continents');

  // 1. Check all blobs against the land mask
  let waterCount = 0;
  for (const blob of blobs) {
    if (!isLand(blob.lat, blob.lng)) {
      waterCount++;
      console.warn(
        `⚠️ [BobGlobe Land Warning] Blob "${blob.artist.name}" (${blob.country.code}) is not on land: lat=${blob.lat.toFixed(3)}, lng=${blob.lng.toFixed(3)}`
      );
    }
  }

  if (waterCount === 0) {
    console.info(`✅ Land check PASSED: All ${blobs.length} blobs are placed on solid land.`);
  } else {
    console.warn(`⚠️ Land check: ${waterCount} out of ${blobs.length} blobs detected in water.`);
  }

  // 2. Check 6 specific landmark countries
  let passedLandmarks = 0;
  for (const lm of LANDMARKS) {
    const countryBlobs = blobs.filter((b) => b.country.code === lm.code);
    if (countryBlobs.length === 0) {
      console.warn(`⚠️ Landmark ${lm.name} (${lm.code}) not found in active blobs.`);
      continue;
    }

    const rank1 = countryBlobs.find((b) => b.rank === 1) || countryBlobs[0];
    const onLand = isLand(rank1.lat, rank1.lng);
    const inContinent =
      rank1.lat >= lm.expectedMinLat &&
      rank1.lat <= lm.expectedMaxLat &&
      rank1.lng >= lm.expectedMinLng &&
      rank1.lng <= lm.expectedMaxLng;

    const surfR = getSurfaceRadius(rank1.lat, rank1.lng);
    const expectedPos = latLngToVec3(rank1.lat, rank1.lng, surfR + rank1.radius * 0.72);
    const actualPos = new THREE.Vector3(...rank1.position);
    const posMatches = actualPos.distanceTo(expectedPos) < 0.01;

    if (onLand && inContinent && posMatches) {
      passedLandmarks++;
      console.info(
        `✅ Landmark ${lm.name} (${lm.code}): verified in ${lm.continent} at lat=${rank1.lat.toFixed(2)}, lng=${rank1.lng.toFixed(2)} on land.`
      );
    } else {
      console.error(
        `❌ Landmark ${lm.name} (${lm.code}) verification FAILED! onLand=${onLand}, inContinent=${inContinent}, posMatches=${posMatches}`
      );
    }
  }

  if (passedLandmarks === LANDMARKS.length) {
    console.info(
      `🎉 All 6 landmarks (Brazil, Japan, Nigeria, India, Australia, United States) verified on correct continents and on land.`
    );
  }

  console.groupEnd();
}
