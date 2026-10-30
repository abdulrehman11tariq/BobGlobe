import countryBordersData from '../data/country_borders.json';
import { latLngToVec3 } from './coordinates';
import { getSurfaceRadius } from './terrainSampler';
import { BORDER_OUTLINE_CONFIG } from '../theme/blobConfig';

export interface BorderSegmentPoints {
  navyPoints: [number, number, number][];
  whitePoints: [number, number, number][];
}

export interface CountryBorderData {
  countryCode: string;
  segments: BorderSegmentPoints[];
}

const bordersRecord = countryBordersData as unknown as Record<string, number[][][]>;

// LRU Cache for up to 8 countries' 3D border geometries
const borderCache = new Map<string, CountryBorderData>();

/**
 * Densifies a polygon ring:
 * - Splits segments that cross the +-180 degree antimeridian jump
 * - Subdivides segments so no piece spans > DENSIFY_MAX_STEP_DEG (~0.5 deg)
 * - Samples getSurfaceRadius at each point and computes 3D coordinates
 */
function buildCountryBorderData(countryCode: string): CountryBorderData | null {
  const rings = bordersRecord[countryCode];
  if (!rings || rings.length === 0) return null;

  const segments: BorderSegmentPoints[] = [];
  const maxStepDeg = BORDER_OUTLINE_CONFIG.DENSIFY_MAX_STEP_DEG;
  const navyOffset = BORDER_OUTLINE_CONFIG.NAVY_OFFSET;
  const whiteOffset = BORDER_OUTLINE_CONFIG.WHITE_OFFSET;

  for (const ring of rings) {
    if (ring.length < 2) continue;

    let currentLngLatList: [number, number][] = [];

    for (let i = 0; i < ring.length - 1; i++) {
      const [lng1, lat1] = ring[i];
      const [lng2, lat2] = ring[i + 1];

      // Detect antimeridian jump (+-180 jump across dateline)
      // When points jump across 180 deg, finish current segment to avoid globe-spanning streak
      if (Math.abs(lng2 - lng1) > 180) {
        if (currentLngLatList.length > 1) {
          segments.push(convertLngLatsTo3D(currentLngLatList, navyOffset, whiteOffset));
        }
        currentLngLatList = [];
        continue;
      }

      const dLat = lat2 - lat1;
      const latMidRad = ((lat1 + lat2) / 2) * (Math.PI / 180);
      const dLngCos = (lng2 - lng1) * Math.cos(latMidRad);
      const spanDeg = Math.sqrt(dLat * dLat + dLngCos * dLngCos);

      const steps = Math.max(1, Math.ceil(spanDeg / maxStepDeg));

      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        currentLngLatList.push([lng1 + t * (lng2 - lng1), lat1 + t * (lat2 - lat1)]);
      }
    }

    // Add final point of ring
    const lastPt = ring[ring.length - 1];
    currentLngLatList.push([lastPt[0], lastPt[1]]);

    if (currentLngLatList.length > 1) {
      segments.push(convertLngLatsTo3D(currentLngLatList, navyOffset, whiteOffset));
    }
  }

  return {
    countryCode,
    segments,
  };
}

function convertLngLatsTo3D(
  coords: [number, number][],
  navyOffset: number,
  whiteOffset: number
): BorderSegmentPoints {
  const navyPoints: [number, number, number][] = [];
  const whitePoints: [number, number, number][] = [];

  for (let i = 0; i < coords.length; i++) {
    const [lng, lat] = coords[i];
    const surfR = getSurfaceRadius(lat, lng);

    const posNavy = latLngToVec3(lat, lng, surfR + navyOffset);
    navyPoints.push([posNavy.x, posNavy.y, posNavy.z]);

    const posWhite = latLngToVec3(lat, lng, surfR + whiteOffset);
    whitePoints.push([posWhite.x, posWhite.y, posWhite.z]);
  }

  return {
    navyPoints,
    whitePoints,
  };
}

/**
 * Returns cached 3D border lines for the given country code (LRU cache size = 8).
 */
export function getCountryBorderLines(countryCode: string): CountryBorderData | null {
  if (!countryCode) return null;

  if (borderCache.has(countryCode)) {
    const data = borderCache.get(countryCode)!;
    // Move to most-recently-used
    borderCache.delete(countryCode);
    borderCache.set(countryCode, data);
    return data;
  }

  const borderData = buildCountryBorderData(countryCode);
  if (!borderData) return null;

  // Enforce max cache size (8 countries)
  if (borderCache.size >= BORDER_OUTLINE_CONFIG.CACHE_MAX_COUNTRIES) {
    const oldestKey = borderCache.keys().next().value;
    if (oldestKey) {
      borderCache.delete(oldestKey);
    }
  }

  borderCache.set(countryCode, borderData);
  return borderData;
}
