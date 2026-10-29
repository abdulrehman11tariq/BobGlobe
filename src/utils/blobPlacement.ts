import type { CountryEntry, BlobInstanceData } from '../types';
import { BLOB_CONFIG } from '../theme/blobConfig';
import { GLOBE_CONFIG } from '../theme/constants';
import { MOCHI_CONFIG } from '../theme/mochiConfig';
import { latLngToVector3 } from './coordinates';
import { getSurfaceRadius, sampleLandOceanMask, isLand } from './terrainSampler';

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
 * Snaps island/coastal countries to nearby solid land if centroid is on ocean water.
 */
export function snapToNearestLand(
  lat: number,
  lng: number,
  searchRadius = BLOB_CONFIG.ISLAND_SNAP_RADIUS
): { lat: number; lng: number } {
  if (isLand(lat, lng, 0.40)) {
    return { lat, lng };
  }

  let bestLat = lat;
  let bestLng = lng;
  let minMask = sampleLandOceanMask(lat, lng);

  const steps = 10;
  const stepSize = searchRadius / steps;

  for (let r = stepSize; r <= searchRadius; r += stepSize) {
    const angleCount = Math.max(8, Math.floor(r * 4));
    for (let a = 0; a < angleCount; a++) {
      const angle = (a / angleCount) * Math.PI * 2;
      const testLat = Math.max(-85, Math.min(85, lat + Math.sin(angle) * r));
      const cosLat = Math.max(0.2, Math.cos((testLat * Math.PI) / 180));
      const testLng = lng + (Math.cos(angle) * r) / cosLat;

      const mask = sampleLandOceanMask(testLat, testLng);
      if (mask < minMask) {
        minMask = mask;
        bestLat = testLat;
        bestLng = testLng;
        if (mask < 0.25) {
          // Deep inland found
          return { lat: bestLat, lng: bestLng };
        }
      }
    }
  }

  return { lat: bestLat, lng: bestLng };
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
 * Places up to 5 blobs for a country around its centroid in a non-overlapping ring,
 * standing directly on the terrain surface.
 */
export function generateCountryBlobs(
  country: CountryEntry,
  maxListeners: number
): BlobInstanceData[] {
  const { artists } = country;
  if (!artists || artists.length === 0) return [];

  // 1. Ensure centroid is on solid land
  const { lat: centerLat, lng: centerLng } = snapToNearestLand(country.lat, country.lng);

  // 2. Compute radii for each artist
  const radii = artists.map((a) => calculateBlobRadius(a.listeners, maxListeners));
  const centerRadius = radii[0];

  const blobInstances: BlobInstanceData[] = [];
  const planetR = GLOBE_CONFIG.PLANET_RADIUS;

  // 3. Place Rank 1 (biggest artist) at the exact centroid
  const centerSurfR = getSurfaceRadius(centerLat, centerLng);
  // Blob center is lifted by its radius so its bottom sits directly on the ground
  const centerLiftedR = centerSurfR + centerRadius;
  const centerPos = latLngToVector3(centerLat, centerLng, centerLiftedR);
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

  // 4. Place remaining artists (ranks 2 to 5) in a spaced ring around the center
  const surroundingCount = artists.length - 1;
  if (surroundingCount === 0) return blobInstances;

  // Calculate ring separation distance based on blob sizes
  const maxSurroundingRadius = Math.max(...radii.slice(1));
  const linearSeparation = Math.max(
    BLOB_CONFIG.MIN_RING_RADIUS,
    (centerRadius + maxSurroundingRadius) * BLOB_CONFIG.RING_SPACING_FACTOR
  );

  // Convert distance to angular spread in degrees
  const angularDistDeg = (linearSeparation / planetR) * (180 / Math.PI);
  const angleStep = (2 * Math.PI) / surroundingCount;
  // Offset angle slightly per country so rings don't all align identically
  const rotOffset = ((country.code.charCodeAt(0) * 17) % 360) * (Math.PI / 180);

  for (let i = 0; i < surroundingCount; i++) {
    const artist = artists[i + 1];
    const r = radii[i + 1];
    const azimuth = i * angleStep + rotOffset;

    // Local tangential offset around center
    const latOffset = angularDistDeg * Math.cos(azimuth);
    const cosLat = Math.max(0.2, Math.cos((centerLat * Math.PI) / 180));
    const lngOffset = (angularDistDeg / cosLat) * Math.sin(azimuth);

    const bLat = Math.max(-85, Math.min(85, centerLat + latOffset));
    const bLng = centerLng + lngOffset;

    const surfR = getSurfaceRadius(bLat, bLng);
    const liftedR = surfR + r;
    const pos = latLngToVector3(bLat, bLng, liftedR);
    const norm = pos.clone().normalize();

    blobInstances.push({
      id: `${country.code}-blob-${i + 2}`,
      artist,
      country,
      rank: i + 2,
      lat: bLat,
      lng: bLng,
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
