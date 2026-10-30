import type { CountryEntry, BlobInstanceData, Artist } from '../types';
import { BLOB_CONFIG } from '../theme/blobConfig';
import { MOCHI_CONFIG } from '../theme/mochiConfig';
import { EARTH_CONFIG } from '../theme/earthConfig';
import { latLngToVec3 } from './coordinates';
import { getSurfaceRadius } from './terrainSampler';
import {
  validateBlobFootprint,
  greatCircleDist,
  getSpherePoint,
} from './countryIdSampler';
import { SeededRandom, stringToSeed } from './seededRandom';
import countryPointsData from '../data/country_points.json';
import countriesData from '../data/countries.json';

export interface CandidatePoint {
  lat: number;
  lng: number;
  clearanceDeg: number;
}

export interface CandidateMarker {
  lat: number;
  lng: number;
  clearanceDeg: number;
  countryCode: string;
  isUsed: boolean;
  radius?: number;
  isValid?: boolean;
}

export interface LayoutStats {
  totalPlaced: number;
  totalHidden: number;
  totalShrunk: number;
  totalReassigned: number;
  footprintFailures: number;
  overlapCollisions: number;
}

// Global cache for candidate markers & layout stats for Debug Mode ('M')
let cachedCandidateMarkers: CandidateMarker[] = [];
let cachedLayoutStats: LayoutStats = {
  totalPlaced: 0,
  totalHidden: 0,
  totalShrunk: 0,
  totalReassigned: 0,
  footprintFailures: 0,
  overlapCollisions: 0,
};

// Map of countryCode -> list of unplaced (hidden) artists
const unplacedArtistsMap = new Map<string, Artist[]>();

export function getLayoutStats(): LayoutStats {
  return cachedLayoutStats;
}

export function getAllCandidateMarkers(): CandidateMarker[] {
  return cachedCandidateMarkers;
}

export function getUnplacedArtists(countryCode: string): Artist[] {
  return unplacedArtistsMap.get(countryCode) || [];
}

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
 * Computes deterministic scattered blob layout for all countries in data.
 * Adheres strictly to Phase 3.5 rules:
 * - Deterministic, seeded by country code
 * - Rank 1 gets point with largest clearanceDeg
 * - Ranks 2-5 get remaining points in seeded shuffle
 * - Footprint 17-point check: center + 8 outer + 8 inner all inside own country
 * - Zero overlaps across all blobs (dist > rA + rB + GAP)
 * - Country shared shrink factor + monotonic lower-rank floor check
 * - Unfit blobs hidden and listed under "+N more"
 */
export function computeGlobalBlobLayout(
  countries: CountryEntry[],
  maxListeners: number
): BlobInstanceData[] {
  unplacedArtistsMap.clear();
  const allPlaced: BlobInstanceData[] = [];
  const candidateMarkers: CandidateMarker[] = [];

  let totalPlaced = 0;
  let totalHidden = 0;
  let totalShrunk = 0;
  let totalReassigned = 0;

  // Build country id map from countries.json
  const countryIdMap = new Map<string, number>();
  for (const c of countriesData) {
    countryIdMap.set(c.code, c.id);
  }

  const countryPointsRecord = countryPointsData as Record<string, CandidatePoint[]>;

  for (const country of countries) {
    const countryId = countryIdMap.get(country.code) ?? 0;
    const rawPoints = countryPointsRecord[country.code] || [];
    const artists = (country.artists || []).slice(0, 5);

    if (artists.length === 0 || rawPoints.length === 0 || countryId === 0) {
      if (artists.length > 0) {
        unplacedArtistsMap.set(country.code, artists);
        totalHidden += artists.length;
      }
      continue;
    }

    const rng = new SeededRandom(stringToSeed(country.code));
    const baseRadii = artists.map((a) => calculateBlobRadius(a.listeners, maxListeners));

    // 1. Organize Candidate Points:
    // Rank 1 gets the point with largest clearanceDeg
    // Remaining ranks get other points in a seeded shuffle
    const ptsCopy = rawPoints.map((p, idx) => ({ ...p, origIdx: idx }));
    let maxClearanceIdx = 0;
    for (let i = 1; i < ptsCopy.length; i++) {
      if (ptsCopy[i].clearanceDeg > ptsCopy[maxClearanceIdx].clearanceDeg) {
        maxClearanceIdx = i;
      }
    }
    const rank1Pt = ptsCopy[maxClearanceIdx];
    const otherPts = ptsCopy.filter((_, i) => i !== maxClearanceIdx);

    // Seeded shuffle of remaining points
    for (let i = otherPts.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const temp = otherPts[i];
      otherPts[i] = otherPts[j];
      otherPts[j] = temp;
    }

    const candidatePool = [rank1Pt, ...otherPts];

    // 2. Try shared shrink factors
    const shrinkFactors = [1.0, 0.90, 0.80, 0.70, 0.60, 0.50, 0.42, 0.35, BLOB_CONFIG.SHRINK_FLOOR];
    let bestPlacedThisCountry: {
      artist: Artist;
      rank: number;
      lat: number;
      lng: number;
      radius: number;
      candPt: CandidatePoint;
    }[] = [];
    let bestFactor = 1.0;

    for (const factor of shrinkFactors) {
      const placedInAttempt: {
        artist: Artist;
        rank: number;
        lat: number;
        lng: number;
        radius: number;
        candPt: CandidatePoint;
      }[] = [];
      const usedPointIndices = new Set<number>();

      for (let rankIdx = 0; rankIdx < artists.length; rankIdx++) {
        const artist = artists[rankIdx];
        let r = baseRadii[rankIdx] * factor;

        // Ensure monotonicity with previously placed higher ranks in this country
        if (placedInAttempt.length > 0) {
          const prevR = placedInAttempt[placedInAttempt.length - 1].radius;
          if (r > prevR) {
            r = prevR;
          }
        }

        let chosenPt: CandidatePoint | null = null;
        let chosenIdx = -1;
        let chosenR = r;

        // Try candidate points
        for (let pIdx = 0; pIdx < candidatePool.length; pIdx++) {
          if (usedPointIndices.has(pIdx)) continue;
          const cand = candidatePool[pIdx];

          // Check if candidate point passes footprint check
          let testR = r;
          let passes = validateBlobFootprint(cand.lat, cand.lng, testR, countryId);

          // If fails, try monotonic shrink down to shrink floor for this point
          if (!passes && factor === shrinkFactors[shrinkFactors.length - 1]) {
            const minAllowed = baseRadii[rankIdx] * BLOB_CONFIG.SHRINK_FLOOR;
            const stepDown = [testR * 0.85, testR * 0.70, minAllowed];
            for (const subR of stepDown) {
              if (subR >= minAllowed && validateBlobFootprint(cand.lat, cand.lng, subR, countryId)) {
                testR = subR;
                passes = true;
                break;
              }
            }
          }

          if (!passes) continue;

          // Check overlap with already placed blobs in this attempt
          let overlaps = false;
          for (const pb of placedInAttempt) {
            const dist = greatCircleDist(cand.lat, cand.lng, pb.lat, pb.lng);
            if (dist <= testR + pb.radius + BLOB_CONFIG.GAP) {
              overlaps = true;
              break;
            }
          }
          if (overlaps) continue;

          // Check overlap with globally placed blobs from previous countries
          for (const gb of allPlaced) {
            const dist = greatCircleDist(cand.lat, cand.lng, gb.lat, gb.lng);
            if (dist <= testR + gb.radius + BLOB_CONFIG.GAP) {
              overlaps = true;
              break;
            }
          }
          if (overlaps) continue;

          chosenPt = cand;
          chosenIdx = pIdx;
          chosenR = testR;
          break;
        }

        if (chosenPt) {
          usedPointIndices.add(chosenIdx);

          // 3. Optional small seeded jitter (up to 15% of radius)
          let finalLat = chosenPt.lat;
          let finalLng = chosenPt.lng;
          if (BLOB_CONFIG.JITTER_MAX_FACTOR > 0) {
            const jitterRWorld = rng.next() * BLOB_CONFIG.JITTER_MAX_FACTOR * chosenR;
            const jitterBearing = rng.next() * Math.PI * 2;
            const jitterDeg = (jitterRWorld / EARTH_CONFIG.PLANET_RADIUS) * (180 / Math.PI);
            const jpt = getSpherePoint(chosenPt.lat, chosenPt.lng, jitterDeg, jitterBearing);

            if (validateBlobFootprint(jpt.lat, jpt.lng, chosenR, countryId)) {
              let jOverlaps = false;
              for (const pb of placedInAttempt) {
                if (greatCircleDist(jpt.lat, jpt.lng, pb.lat, pb.lng) <= chosenR + pb.radius + BLOB_CONFIG.GAP) {
                  jOverlaps = true;
                  break;
                }
              }
              if (!jOverlaps) {
                for (const gb of allPlaced) {
                  if (greatCircleDist(jpt.lat, jpt.lng, gb.lat, gb.lng) <= chosenR + gb.radius + BLOB_CONFIG.GAP) {
                    jOverlaps = true;
                    break;
                  }
                }
              }
              if (!jOverlaps) {
                finalLat = jpt.lat;
                finalLng = jpt.lng;
              }
            }
          }

          placedInAttempt.push({
            artist,
            rank: rankIdx + 1,
            lat: finalLat,
            lng: finalLng,
            radius: chosenR,
            candPt: chosenPt,
          });
        }
      }

      // Selection heuristic: Maximize placed blobs count; prioritize placing Rank 1
      const attemptScore =
        placedInAttempt.length * 10 +
        (placedInAttempt.some((b) => b.rank === 1) ? 5 : 0);
      const bestScore =
        bestPlacedThisCountry.length * 10 +
        (bestPlacedThisCountry.some((b) => b.rank === 1) ? 5 : 0);

      if (attemptScore > bestScore) {
        bestPlacedThisCountry = placedInAttempt;
        bestFactor = factor;
      }

      if (placedInAttempt.length === artists.length) {
        break; // Placed all 5 artists
      }
    }

    if (bestFactor < 1.0) totalShrunk++;
    totalPlaced += bestPlacedThisCountry.length;
    const hiddenCount = artists.length - bestPlacedThisCountry.length;
    totalHidden += hiddenCount;

    // Track unplaced artists for "+N more" UI
    const placedArtistIds = new Set(bestPlacedThisCountry.map((b) => b.artist.id));
    const unplacedArtists = artists.filter((a) => !placedArtistIds.has(a.id));
    if (unplacedArtists.length > 0) {
      unplacedArtistsMap.set(country.code, unplacedArtists);
    }

    // Convert placed items to BlobInstanceData
    for (const item of bestPlacedThisCountry) {
      const surfR = getSurfaceRadius(item.lat, item.lng);
      const liftedR = surfR + item.radius * 0.72;
      const pos = latLngToVec3(item.lat, item.lng, liftedR);
      const norm = pos.clone().normalize();

      allPlaced.push({
        id: `${country.code}-blob-${item.rank}`,
        artist: item.artist,
        country,
        rank: item.rank,
        lat: item.lat,
        lng: item.lng,
        position: [pos.x, pos.y, pos.z],
        normal: [norm.x, norm.y, norm.z],
        radius: item.radius,
        targetRadius: item.radius,
        currentRadius: item.radius,
        color: getArtistColor(item.artist.name),
      });
    }

    // Record candidate markers for debug mode
    const placedPtCoords = new Set(
      bestPlacedThisCountry.map((b) => `${b.candPt.lat.toFixed(4)},${b.candPt.lng.toFixed(4)}`)
    );
    for (const cp of rawPoints) {
      const key = `${cp.lat.toFixed(4)},${cp.lng.toFixed(4)}`;
      const isUsed = placedPtCoords.has(key);
      const placedBlob = bestPlacedThisCountry.find(
        (b) => `${b.candPt.lat.toFixed(4)},${b.candPt.lng.toFixed(4)}` === key
      );

      candidateMarkers.push({
        lat: cp.lat,
        lng: cp.lng,
        clearanceDeg: cp.clearanceDeg,
        countryCode: country.code,
        isUsed,
        radius: placedBlob?.radius,
        isValid: placedBlob ? validateBlobFootprint(placedBlob.lat, placedBlob.lng, placedBlob.radius, countryId) : undefined,
      });
    }
  }

  // Verification & collision checks
  let footprintFailures = 0;
  for (const blob of allPlaced) {
    const cId = countryIdMap.get(blob.country.code) ?? 0;
    if (!validateBlobFootprint(blob.lat, blob.lng, blob.radius, cId)) {
      footprintFailures++;
    }
  }

  let overlapCollisions = 0;
  for (let i = 0; i < allPlaced.length; i++) {
    for (let j = i + 1; j < allPlaced.length; j++) {
      const a = allPlaced[i];
      const b = allPlaced[j];
      const d = greatCircleDist(a.lat, a.lng, b.lat, b.lng);
      if (d <= a.radius + b.radius + BLOB_CONFIG.GAP * 0.98) {
        overlapCollisions++;
      }
    }
  }

  cachedCandidateMarkers = candidateMarkers;
  cachedLayoutStats = {
    totalPlaced,
    totalHidden,
    totalShrunk,
    totalReassigned,
    footprintFailures,
    overlapCollisions,
  };

  return allPlaced;
}

/**
 * Backward compatibility wrapper for single country generation
 */
export function generateCountryBlobs(
  country: CountryEntry,
  maxListeners: number
): BlobInstanceData[] {
  return computeGlobalBlobLayout([country], maxListeners);
}
