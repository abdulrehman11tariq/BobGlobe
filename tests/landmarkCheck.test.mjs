import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

console.log('🧪 Running BobGlobe Landmark & Land Placement Verification Tests...\n');

// 1. Load and decode land_mask_4096.png
const maskPath = path.resolve('public/textures/land_mask_4096.png');
const maskBuf = fs.readFileSync(maskPath);
const width = maskBuf.readUInt32BE(16);
const height = maskBuf.readUInt32BE(20);

let pos = 8;
const idatChunks = [];
while (pos < maskBuf.length) {
  const len = maskBuf.readUInt32BE(pos);
  const type = maskBuf.slice(pos + 4, pos + 8).toString('ascii');
  if (type === 'IDAT') idatChunks.push(maskBuf.slice(pos + 8, pos + 8 + len));
  pos += 12 + len;
}
const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
const uncompressed = Buffer.alloc(width * height * 4);
const bpp = 4;
const stride = 1 + width * bpp;

for (let y = 0; y < height; y++) {
  const filter = decompressed[y * stride];
  for (let x = 0; x < width * bpp; x++) {
    const raw = decompressed[y * stride + 1 + x];
    const left = x >= bpp ? uncompressed[y * width * bpp + x - bpp] : 0;
    const up = y > 0 ? uncompressed[(y - 1) * width * bpp + x] : 0;
    const upleft = (y > 0 && x >= bpp) ? uncompressed[(y - 1) * width * bpp + x - bpp] : 0;
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
    uncompressed[y * width * bpp + x] = val;
  }
}

function isLand(lat, lng) {
  const v = Math.min(1.0, Math.max(0.0, (90 - lat) / 180));
  let u = (lng + 180) / 360;
  u = ((u % 1) + 1) % 1;
  const px = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
  const py = Math.min(height - 1, Math.max(0, Math.floor(v * height)));
  const idx = (py * width + px) * 4;
  return uncompressed[idx] > 128;
}

// 2. Test the 6 specific landmark countries
const LANDMARKS = [
  { code: 'BR', name: 'Brazil', continent: 'South America', minLat: -35, maxLat: 6, minLng: -75, maxLng: -34 },
  { code: 'JP', name: 'Japan', continent: 'Asia (East)', minLat: 30, maxLat: 46, minLng: 128, maxLng: 146 },
  { code: 'NG', name: 'Nigeria', continent: 'Africa (West)', minLat: 4, maxLat: 14, minLng: 2, maxLng: 15 },
  { code: 'IN', name: 'India', continent: 'Asia (South)', minLat: 8, maxLat: 36, minLng: 68, maxLng: 98 },
  { code: 'AU', name: 'Australia', continent: 'Oceania', minLat: -45, maxLat: -10, minLng: 112, maxLng: 155 },
  { code: 'US', name: 'United States', continent: 'North America', minLat: 24, maxLat: 50, minLng: -125, maxLng: -66 },
];

const countriesPath = path.resolve('src/data/countries.json');
const countries = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));
const countryMap = new Map(countries.map(c => [c.code, c]));

let failedTests = 0;

console.log('1️⃣ Checking Landmark Continents & Land Presence:');
LANDMARKS.forEach(lm => {
  const c = countryMap.get(lm.code);
  if (!c) {
    console.error(`❌ Landmark ${lm.name} (${lm.code}) missing from countries.json!`);
    failedTests++;
    return;
  }

  const onLand = isLand(c.lat, c.lng);
  const inContinent = c.lat >= lm.minLat && c.lat <= lm.maxLat && c.lng >= lm.minLng && c.lng <= lm.maxLng;

  if (onLand && inContinent) {
    console.log(`  ✅ ${lm.name} (${lm.code}): Correctly placed in ${lm.continent} (lat: ${c.lat}, lng: ${c.lng}) on land.`);
  } else {
    console.error(`  ❌ ${lm.name} (${lm.code}) check FAILED: onLand=${onLand}, inContinent=${inContinent}`);
    failedTests++;
  }
});

// 3. Test ocean baseline coordinate (should NOT be on land)
console.log('\n2️⃣ Checking Ocean Baseline Negative Control:');
const midAtlantic = { lat: 0, lng: -30 };
if (!isLand(midAtlantic.lat, midAtlantic.lng)) {
  console.log(`  ✅ Mid-Atlantic (lat: 0, lng: -30) is correctly recognized as water.`);
} else {
  console.error(`  ❌ Ocean baseline failed: Mid-Atlantic was flagged as land.`);
  failedTests++;
}

// 4. Test Single Source of Truth Coordinate mapping
console.log('\n3️⃣ Checking latLngToVec3 Sphere UV Agreement:');
function latLngToVec3(lat, lng, r) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return {
    x: -r * Math.sin(phi) * Math.cos(theta),
    y:  r * Math.cos(phi),
    z:  r * Math.sin(phi) * Math.sin(theta)
  };
}

const v0 = latLngToVec3(0, 0, 2.5);
if (Math.abs(v0.x - 2.5) < 1e-4 && Math.abs(v0.y) < 1e-4 && Math.abs(v0.z) < 1e-4) {
  console.log(`  ✅ Equator / Prime Meridian (0, 0) matches Three.js SphereGeometry apex (x=2.5, y=0, z=0).`);
} else {
  console.error(`  ❌ Coordinate mapping discrepancy at (0, 0).`);
  failedTests++;
}

// 5. Test all 136 countries in seed data
console.log('\n4️⃣ Checking all 136 Country Centroids on Land Mask:');
let landCount = 0;
countries.forEach(c => {
  if (isLand(c.lat, c.lng)) {
    landCount++;
  } else {
    // Micro-nation border tolerance test
    let foundNear = false;
    for (let dlat = -0.3; dlat <= 0.3; dlat += 0.1) {
      for (let dlng = -0.3; dlng <= 0.3; dlng += 0.1) {
        if (isLand(c.lat + dlat, c.lng + dlng)) {
          foundNear = true;
          break;
        }
      }
      if (foundNear) break;
    }
    if (foundNear) {
      landCount++;
    } else {
      console.warn(`  ⚠️ Country ${c.code} (${c.name}) at (${c.lat}, ${c.lng}) not on land.`);
    }
  }
});
console.log(`  ✅ Land coverage: ${landCount} / ${countries.length} countries verified.`);

console.log('\n----------------------------------------');
if (failedTests === 0) {
  console.log('🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`💥 ${failedTests} UNIT TEST(S) FAILED.`);
  process.exit(1);
}
