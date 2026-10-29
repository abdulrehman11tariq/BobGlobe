import * as THREE from 'three';
import type { CountryEntry, BlobInstanceData } from '../types';
import { BLOB_CONFIG } from '../theme/blobConfig';
import { MOCHI_CONFIG } from '../theme/mochiConfig';
import { latLngToVec3 } from './coordinates';
import { getSurfaceRadius, isLand, snapToNearestLand } from './terrainSampler';

/**
 * Calculates blob radius according to listener count:
 * radius = minR + (maxR - minR) * sqrt(listeners / maxListeners)
 */
export function calculateBlobRadius(listeners: number, maxListeners: number): number {
  const safeMax = Math.max(1, maxListeners);
  const ratio = Math.max(0, Math.min(1, listeners / safeMax));
  const { MIN_RADIUS, MAX_RADIUS } = BLOB_CONFIG;
  return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.sqrt(ratio);
}

/**
 * Derives a consistent, pleasing pastel color for a mochi blob based on artist name hash.
 */
export function getArtistColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  }
  const colors = MOCHI_CONFIG.PASTEL_COLORS;
  return colors[Math.abs(h) % colors.length];
}

/**
 * Places blobs for a country:
 * - #1 artist at the exact lat/lng from countries.json
 * - Remaining artists in a spaced ring around it
 * - Ring is shrunk for small countries
 * - Ring positions falling in water are stepped toward center until on land
 * - Never place a blob in the ocean
 */
export function generateCountryBlobs(
  country: CountryEntry,
  maxListeners: number
): BlobInstanceData[] {
  const { artists } = country;
  if (!artists || artists.length === 0) return [];

  // 1. Center coordinate from countries.json (guaranteed on land)
  let centerLat = country.lat;
  let centerLng = country.lng;

  // Safety snap in case of rasterization edge cases for tiny micro-nations
  if (!isLand(centerLat, centerLng)) {
    const snapped = snapToNearestLand(centerLat, centerLng, 1.2);
    centerLat = snapped.lat;
    centerLng = snapped.lng;
  }

  // 2. Compute radii for each artist
  const radii = artists.map((a) => calculateBlobRadius(a.listeners, maxListeners));
  const centerRadius = radii[0];

  const blobInstances: BlobInstanceData[] = [];

  // 3. Place Rank 1 (biggest artist) at the exact lat/lng
  const centerSurfR = getSurfaceRadius(centerLat, centerLng);
  // Center is lifted slightly so blob bottom rests flush on the ground
  const centerLiftedR = centerSurfR + centerRadius * 0.72;
  const centerPos = latLngToVec3(centerLat, centerLng, centerLiftedR);
  const centerNormal = centerPos.clone().normalize();

  blobInstances.push({
    id: `${country.code}-blob-1`,
    artist: artists[0],
    country,
    rank: 1,
    lat: centerLat,
    lng: centerLng,
    position: [centerPos.x, centerPos.y, centerPos.z],
    normal: [centerNormal.x, centerNormal.y, centerNormal.z],
    radius: centerRadius,
    targetRadius: centerRadius,
    currentRadius: centerRadius,
    color: getArtistColor(artists[0].name),
  });

  // 4. Place remaining artists in a spaced ring around the center
  const surroundingCount = artists.length - 1;
  if (surroundingCount === 0) return blobInstances;

  // Determine ring radius based on country size (areaDeg2)
  const area = country.areaDeg2 ?? 50;
  let baseRingDeg = 1.35;
  if (area < 1.0) {
    baseRingDeg = 0.28; // Tiny island / city state (Singapore, Hong Kong, etc.)
  } else if (area < 10.0) {
    baseRingDeg = 0.55; // Small country (Netherlands, Israel, etc.)
  } else if (area < 35.0) {
    baseRingDeg = 0.95; // Medium-small country (UK, Japan, etc.)
  } else if (area < 100.0) {
    baseRingDeg = 1.45; // Medium country (Germany, France, Spain, etc.)
  } else {
    baseRingDeg = 2.40; // Large continent-sized country (USA, Brazil, Australia, China)
  }

  const angleStep = (2 * Math.PI) / surroundingCount;
  // Deterministic rotation offset per country
  const rotOffset = ((country.code.charCodeAt(0) * 23) % 360) * (Math.PI / 180);

  for (let i = 0; i < surroundingCount; i++) {
    const artist = artists[i + 1];
    const r = radii[i + 1];
    const azimuth = i * angleStep + rotOffset;

    const cosLat = Math.max(0.15, Math.cos(THREE.MathUtils.degToRad(centerLat)));

    // Candidate position on ring
    let testLat = centerLat + baseRingDeg * Math.cos(azimuth);
    let testLng = centerLng + (baseRingDeg * Math.sin(azimuth)) / cosLat;

    // Check if test position is on land
    // If in water, step toward country center until it is on land
    if (!isLand(testLat, testLng)) {
      let foundLand = false;
      for (let step = 1; step <= 20; step++) {
        const factor = 1.0 - step * 0.048; // 0.952, 0.904, ..., 0.04
        const candLat = centerLat + (testLat - centerLat) * factor;
        const candLng = centerLng + (testLng - centerLng) * factor;
        if (isLand(candLat, candLng)) {
          testLat = candLat;
          testLng = candLng;
          foundLand = true;
          break;
        }
      }

      if (!foundLand) {
        // Fallback: stay very close to center on land
        const nudge = 0.04;
        testLat = centerLat + nudge * Math.cos(azimuth);
        testLng = centerLng + (nudge * Math.sin(azimuth)) / cosLat;
        if (!isLand(testLat, testLng)) {
          testLat = centerLat;
          testLng = centerLng;
        }
      }
    }

    const surfR = getSurfaceRadius(testLat, testLng);
    const liftedR = surfR + r * 0.72;
    const pos = latLngToVec3(testLat, testLng, liftedR);
    const norm = pos.clone().normalize();

    blobInstances.push({
      id: `${country.code}-blob-${i + 2}`,
      artist,
      country,
      rank: i + 2,
      lat: testLat,
      lng: testLng,
      position: [pos.x, pos.y, pos.z],
      normal: [norm.x, norm.y, norm.z],
      radius: r,
      targetRadius: r,
      currentRadius: r,
      color: getArtistColor(artist.name),
    });
  }

  return blobInstances;
}
