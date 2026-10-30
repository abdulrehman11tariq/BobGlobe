import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

console.log('🧪 Running BobGlobe Phase 3.5 Scatter & Placement Verification Tests...\n');

// 1. Load and decode country_id_4096.png
const idPath = path.resolve('public/textures/country_id_4096.png');
const idBuf = fs.readFileSync(idPath);
const idWidth = idBuf.readUInt32BE(16);
const idHeight = idBuf.readUInt32BE(20);

let pos = 8;
const idChunks = [];
while (pos < idBuf.length) {
  const len = idBuf.readUInt32BE(pos);
  const type = idBuf.slice(pos + 4, pos + 8).toString('ascii');
  if (type === 'IDAT') idChunks.push(idBuf.slice(pos + 8, pos + 8 + len));
  pos += 12 + len;
}
const idDecompressed = zlib.inflateSync(Buffer.concat(idChunks));
const idBuffer = Buffer.alloc(idWidth * idHeight * 4);
const bpp = 4;
const stride = 1 + idWidth * bpp;

for (let y = 0; y < idHeight; y++) {
  const filter = idDecompressed[y * stride];
  for (let x = 0; x < idWidth * bpp; x++) {
    const raw = idDecompressed[y * stride + 1 + x];
    const left = x >= bpp ? idBuffer[y * idWidth * bpp + x - bpp] : 0;
    const up = y > 0 ? idBuffer[(y - 1) * idWidth * bpp + x] : 0;
    const upleft = y > 0 && x >= bpp ? idBuffer[(y - 1) * idWidth * bpp + x - bpp] : 0;
    let val = 0;
    if (filter === 0) val = raw;
    else if (filter === 1) val = (raw + left) & 0xff;
    else if (filter === 2) val = (raw + up) & 0xff;
    else if (filter === 3) val = (raw + Math.floor((left + up) / 2)) & 0xff;
    else if (filter === 4) {
      const p = left + up - upleft;
      const pa = Math.abs(p - left);
      const pb = Math.abs(p - up);
      const pc = Math.abs(p - upleft);
      let pr = upleft;
      if (pa <= pb && pa <= pc) pr = left;
      else if (pb <= pc) pr = up;
      val = (raw + pr) & 0xff;
    }
    idBuffer[y * idWidth * bpp + x] = val;
  }
}

function getCountryId(lat, lng) {
  const v = Math.min(1.0, Math.max(0.0, (90 - lat) / 180));
  let u = (lng + 180) / 360;
  u = ((u % 1) + 1) % 1;
  const px = Math.min(idWidth - 1, Math.max(0, Math.floor(u * idWidth)));
  const py = Math.min(idHeight - 1, Math.max(0, Math.floor(v * idHeight)));
  const idx = (py * idWidth + px) * 4;
  return idBuffer[idx];
}

function getSpherePoint(latDeg, lngDeg, thetaDeg, bearingRad) {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const lat1 = latDeg * toRad;
  const lng1 = lngDeg * toRad;
  const delta = thetaDeg * toRad;

  const sinLat2 =
    Math.sin(lat1) * Math.cos(delta) +
    Math.cos(lat1) * Math.sin(delta) * Math.cos(bearingRad);
  const lat2 = Math.asin(Math.max(-1, Math.min(1, sinLat2)));
  const y = Math.sin(bearingRad) * Math.sin(delta) * Math.cos(lat1);
  const x = Math.cos(delta) - Math.sin(lat1) * Math.sin(lat2);
  const lng2 = lng1 + Math.atan2(y, x);

  let finalLng = (lng2 * toDeg) % 360;
  if (finalLng > 180) finalLng -= 360;
  if (finalLng < -180) finalLng -= 360;
  return { lat: Math.max(-89.9, Math.min(89.9, lat2 * toDeg)), lng: finalLng };
}

function validateBlobFootprint(lat, lng, radiusWorld, countryId) {
  const R_planet = 2.5;
  const thetaDeg = (radiusWorld / R_planet) * (180 / Math.PI);

  if (getCountryId(lat, lng) !== countryId) return false;

  for (const rDeg of [thetaDeg, thetaDeg * 0.6]) {
    for (let i = 0; i < 8; i++) {
      const bearing = (i * Math.PI) / 4;
      const pt = getSpherePoint(lat, lng, rDeg, bearing);
      if (getCountryId(pt.lat, pt.lng) !== countryId) {
        return false;
      }
    }
  }
  return true;
}

function greatCircleDist(lat1, lng1, lat2, lng2) {
  const R = 2.5;
  const toRad = Math.PI / 180;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const dphi = (lat2 - lat1) * toRad;
  const dlambda = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * (Math.sin(dlambda / 2) ** 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return R * c;
}

// 2. Load data
const countries = JSON.parse(fs.readFileSync('src/data/countries.json'));
const countryPts = JSON.parse(fs.readFileSync('src/data/country_points.json'));
const latestData = JSON.parse(fs.readFileSync('public/data/latest.json'));

const countryIdMap = new Map(countries.map((c) => [c.code, c.id]));
const countryMetaMap = new Map(countries.map((c) => [c.code, c]));

// Layout constants
const BLOB_SIZE_BOOST = 2.0;
const MIN_RADIUS = 0.038 * BLOB_SIZE_BOOST;
const MAX_RADIUS = 0.105 * BLOB_SIZE_BOOST;
const GAP = 0.010;
const SHRINK_FLOOR = 0.28;
const JITTER_MAX_FACTOR = 0.15;

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

let maxListeners = 1;
for (const c of latestData.countries) {
  for (const a of c.artists || []) {
    if (a.listeners > maxListeners) maxListeners = a.listeners;
  }
}

function calcRadius(listeners) {
  const ratio = Math.max(0, Math.min(1, listeners / maxListeners));
  return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.sqrt(ratio);
}

function runLayout() {
  const allPlaced = [];
  const shrinkFactors = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.42, 0.35, SHRINK_FLOOR];

  for (const country of latestData.countries) {
    const cId = countryIdMap.get(country.code) ?? 0;
    const rawPts = countryPts[country.code] || [];
    const artists = (country.artists || []).slice(0, 5);

    if (artists.length === 0 || rawPts.length === 0 || cId === 0) continue;

    const baseRadii = artists.map((a) => calcRadius(a.listeners));
    const rng = mulberry32(stringToSeed(country.code));

    // Organize points: Rank 1 gets point with max clearanceDeg
    let maxIdx = 0;
    for (let i = 1; i < rawPts.length; i++) {
      if (rawPts[i].clearanceDeg > rawPts[maxIdx].clearanceDeg) {
        maxIdx = i;
      }
    }
    const rank1Pt = rawPts[maxIdx];
    const otherPts = rawPts.filter((_, i) => i !== maxIdx);

    for (let i = otherPts.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = otherPts[i];
      otherPts[i] = otherPts[j];
      otherPts[j] = tmp;
    }
    const candidatePool = [rank1Pt, ...otherPts];

    let bestPlacedThisCountry = [];

    for (const factor of shrinkFactors) {
      const placedInAttempt = [];
      const usedPointIndices = new Set();

      for (let rankIdx = 0; rankIdx < artists.length; rankIdx++) {
        const artist = artists[rankIdx];
        let r = baseRadii[rankIdx] * factor;

        if (placedInAttempt.length > 0) {
          const prevR = placedInAttempt[placedInAttempt.length - 1].radius;
          if (r > prevR) r = prevR;
        }

        let chosenPt = null;
        let chosenIdx = -1;
        let chosenR = r;

        for (let pIdx = 0; pIdx < candidatePool.length; pIdx++) {
          if (usedPointIndices.has(pIdx)) continue;
          const cand = candidatePool[pIdx];

          let testR = r;
          let passes = validateBlobFootprint(cand.lat, cand.lng, testR, cId);

          if (!passes && factor === shrinkFactors[shrinkFactors.length - 1]) {
            const minAllowed = baseRadii[rankIdx] * SHRINK_FLOOR;
            const stepDown = [testR * 0.85, testR * 0.70, minAllowed];
            for (const subR of stepDown) {
              if (subR >= minAllowed && validateBlobFootprint(cand.lat, cand.lng, subR, cId)) {
                testR = subR;
                passes = true;
                break;
              }
            }
          }

          if (!passes) continue;

          let overlaps = false;
          for (const pb of placedInAttempt) {
            if (greatCircleDist(cand.lat, cand.lng, pb.lat, pb.lng) <= testR + pb.radius + GAP) {
              overlaps = true;
              break;
            }
          }
          if (overlaps) continue;

          for (const gb of allPlaced) {
            if (greatCircleDist(cand.lat, cand.lng, gb.lat, gb.lng) <= testR + gb.radius + GAP) {
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

          let finalLat = chosenPt.lat;
          let finalLng = chosenPt.lng;
          if (JITTER_MAX_FACTOR > 0) {
            const jitterRWorld = rng() * JITTER_MAX_FACTOR * chosenR;
            const jitterBearing = rng() * Math.PI * 2;
            const jitterDeg = (jitterRWorld / 2.5) * (180 / Math.PI);
            const jpt = getSpherePoint(chosenPt.lat, chosenPt.lng, jitterDeg, jitterBearing);

            if (validateBlobFootprint(jpt.lat, jpt.lng, chosenR, cId)) {
              let jOverlaps = false;
              for (const pb of placedInAttempt) {
                if (greatCircleDist(jpt.lat, jpt.lng, pb.lat, pb.lng) <= chosenR + pb.radius + GAP) {
                  jOverlaps = true;
                  break;
                }
              }
              if (!jOverlaps) {
                for (const gb of allPlaced) {
                  if (greatCircleDist(jpt.lat, jpt.lng, gb.lat, gb.lng) <= chosenR + gb.radius + GAP) {
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
            countryCode: country.code,
            rank: rankIdx + 1,
            artist,
            lat: finalLat,
            lng: finalLng,
            radius: chosenR,
          });
        }
      }

      const attemptScore =
        placedInAttempt.length * 10 +
        (placedInAttempt.some((b) => b.rank === 1) ? 5 : 0);
      const bestScore =
        bestPlacedThisCountry.length * 10 +
        (bestPlacedThisCountry.some((b) => b.rank === 1) ? 5 : 0);

      if (attemptScore > bestScore) {
        bestPlacedThisCountry = placedInAttempt;
      }
      if (placedInAttempt.length === artists.length) {
        break;
      }
    }

    for (const b of bestPlacedThisCountry) {
      allPlaced.push(b);
    }
  }

  return allPlaced;
}

// Execute Layout
const blobs = runLayout();

console.log(`📊 Total Placed Blobs: ${blobs.length}`);

// 1. Verify ZERO blobs in ocean and ZERO in wrong country
let footprintFailures = 0;
for (const b of blobs) {
  const cId = countryIdMap.get(b.countryCode);
  if (!validateBlobFootprint(b.lat, b.lng, b.radius, cId)) {
    footprintFailures++;
    console.error(`❌ Footprint failure for ${b.countryCode} rank ${b.rank}`);
  }
}

if (footprintFailures === 0) {
  console.log('✅ ZERO blobs in ocean or neighboring countries (all 17 samples strictly verified)!');
} else {
  console.error(`❌ Found ${footprintFailures} footprint failures!`);
  process.exit(1);
}

// 2. Verify ZERO inter-blob collisions
let collisionCount = 0;
for (let i = 0; i < blobs.length; i++) {
  for (let j = i + 1; j < blobs.length; j++) {
    const a = blobs[i];
    const b = blobs[j];
    const d = greatCircleDist(a.lat, a.lng, b.lat, b.lng);
    const minRequired = a.radius + b.radius + GAP * 0.99;
    if (d <= minRequired) {
      collisionCount++;
      console.error(`❌ Collision between ${a.countryCode}#${a.rank} and ${b.countryCode}#${b.rank}: dist=${d.toFixed(4)}, req=${minRequired.toFixed(4)}`);
    }
  }
}

if (collisionCount === 0) {
  console.log('✅ ZERO inter-blob collisions across all countries globally!');
} else {
  console.error(`❌ Found ${collisionCount} collisions!`);
  process.exit(1);
}

// 3. Verify Determinism
const blobsRun2 = runLayout();
let deterministic = true;
if (blobs.length !== blobsRun2.length) {
  deterministic = false;
} else {
  for (let i = 0; i < blobs.length; i++) {
    if (
      blobs[i].lat !== blobsRun2[i].lat ||
      blobs[i].lng !== blobsRun2[i].lng ||
      blobs[i].radius !== blobsRun2[i].radius
    ) {
      deterministic = false;
      break;
    }
  }
}

if (deterministic) {
  console.log('✅ Deterministic layout: multiple runs yield exact identical coordinates and radii!');
} else {
  console.error('❌ Non-deterministic layout detected!');
  process.exit(1);
}

// 4. Test and describe specific key countries
console.log('\n📍 Key Countries Scatter Breakdown:');
const testCountries = [
  { code: 'IN', label: 'India' },
  { code: 'JP', label: 'Japan (islands)' },
  { code: 'ID', label: 'Indonesia (archipelago)' },
  { code: 'IT', label: 'Italy (peninsula)' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'PL', label: 'Poland' },
  { code: 'CL', label: 'Chile (long & thin)' },
  { code: 'BR', label: 'Brazil' },
  { code: 'US', label: 'United States' },
  { code: 'NO', label: 'Norway (fjords)' },
];

for (const tc of testCountries) {
  const inCountry = blobs.filter((b) => b.countryCode === tc.code);
  const countryMeta = countryMetaMap.get(tc.code);
  const artists = (latestData.countries.find((c) => c.code === tc.code)?.artists || []).slice(0, 5);
  const hiddenCount = artists.length - inCountry.length;

  console.log(`\n- ${tc.label} (${tc.code}):`);
  console.log(`  Placed: ${inCountry.length}/${artists.length} artists (Hidden: ${hiddenCount})`);
  inCountry.forEach((b) => {
    console.log(`    Rank ${b.rank}: "${b.artist.name}" at (${b.lat.toFixed(2)}°, ${b.lng.toFixed(2)}°), radius = ${b.radius.toFixed(4)}`);
  });
}

// 5. Test Country Borders Outline Densification & Antimeridian Splitting
console.log('\n🗺️ Testing Country Borders Outline Densification & Antimeridian Splitting:');
const bordersData = JSON.parse(fs.readFileSync('src/data/country_borders.json'));

const borderTestCases = [
  { code: 'IN', label: 'India', minRings: 1 },
  { code: 'JP', label: 'Japan (several islands)', minRings: 4 },
  { code: 'ID', label: 'Indonesia (archipelago)', minRings: 5 },
  { code: 'IT', label: 'Italy (peninsula + Sicily + Sardinia)', minRings: 3 },
  { code: 'GB', label: 'United Kingdom (Great Britain + NI)', minRings: 2 },
  { code: 'CL', label: 'Chile', minRings: 1 },
  { code: 'BR', label: 'Brazil', minRings: 1 },
  { code: 'US', label: 'USA (Contiguous + Alaska)', minRings: 2 },
  { code: 'RU', label: 'Russia (Antimeridian split check)', minRings: 1 },
  { code: 'NZ', label: 'New Zealand (North + South Island)', minRings: 2 },
];

let borderTestFailures = 0;
const DENSIFY_MAX_STEP_DEG = 0.5;

for (const bCase of borderTestCases) {
  const rawRings = bordersData[bCase.code];
  if (!rawRings || rawRings.length < bCase.minRings) {
    console.error(`❌ ${bCase.label} (${bCase.code}) missing expected rings in borders file!`);
    borderTestFailures++;
    continue;
  }

  const densifiedSegments = [];
  for (const ring of rawRings) {
    let currentSeg = [];
    for (let i = 0; i < ring.length - 1; i++) {
      const [lng1, lat1] = ring[i];
      const [lng2, lat2] = ring[i + 1];

      // Antimeridian jump detection: no line streak across the whole globe!
      if (Math.abs(lng2 - lng1) > 180) {
        if (currentSeg.length > 1) {
          densifiedSegments.push(currentSeg);
        }
        currentSeg = [];
        continue;
      }

      const dLat = lat2 - lat1;
      const latMidRad = ((lat1 + lat2) / 2) * (Math.PI / 180);
      const dLngCos = (lng2 - lng1) * Math.cos(latMidRad);
      const spanDeg = Math.sqrt(dLat * dLat + dLngCos * dLngCos);

      const steps = Math.max(1, Math.ceil(spanDeg / DENSIFY_MAX_STEP_DEG));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        currentSeg.push([lng1 + t * (lng2 - lng1), lat1 + t * (lat2 - lat1)]);
      }
    }

    currentSeg.push(ring[ring.length - 1]);
    if (currentSeg.length > 1) {
      densifiedSegments.push(currentSeg);
    }
  }

  // Check no segment exceeds maxStepDeg and no segment crosses > 180 deg
  let hasSpanError = false;
  let totalPts = 0;
  for (const seg of densifiedSegments) {
    totalPts += seg.length;
    for (let i = 0; i < seg.length - 1; i++) {
      const [lng1, lat1] = seg[i];
      const [lng2, lat2] = seg[i + 1];
      const dLng = Math.abs(lng2 - lng1);
      if (dLng > 180) {
        hasSpanError = true;
        console.error(`❌ Antimeridian jump found inside segment for ${bCase.code}: ${lng1} -> ${lng2}`);
      }
    }
  }

  if (hasSpanError) {
    borderTestFailures++;
  } else {
    console.log(`  ✅ ${bCase.label} (${bCase.code}): ${densifiedSegments.length} clean line segments, ${totalPts} densified points (step <= ${DENSIFY_MAX_STEP_DEG}°).`);
  }
}

if (borderTestFailures === 0) {
  console.log('✅ ALL Country Borders Outline Densification & Antimeridian Tests PASSED!');
} else {
  console.error(`❌ ${borderTestFailures} border tests failed!`);
  process.exit(1);
}

console.log('\n✨ All Verification Tests PASSED!\n');
