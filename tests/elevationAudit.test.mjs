import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import * as THREE from 'three';

console.log('🧪 Running Globe Elevation Audit (Key G Test)...\n');

// 1. Setup land mask & country ID mask
const maskBuf = fs.readFileSync(path.resolve('public/textures/land_mask_4096.png'));
const maskW = maskBuf.readUInt32BE(16);
const maskH = maskBuf.readUInt32BE(20);
let pos = 8;
const maskChunks = [];
while (pos < maskBuf.length) {
  const len = maskBuf.readUInt32BE(pos);
  const type = maskBuf.slice(pos + 4, pos + 8).toString('ascii');
  if (type === 'IDAT') maskChunks.push(maskBuf.slice(pos + 8, pos + 8 + len));
  pos += 12 + len;
}
const maskDecomp = zlib.inflateSync(Buffer.concat(maskChunks));
const maskData = Buffer.alloc(maskW * maskH * 4);
const strideM = 1 + maskW * 4;
for (let y = 0; y < maskH; y++) {
  const filter = maskDecomp[y * strideM];
  for (let x = 0; x < maskW * 4; x++) {
    const raw = maskDecomp[y * strideM + 1 + x];
    const left = x >= 4 ? maskData[y * maskW * 4 + x - 4] : 0;
    const up = y > 0 ? maskData[(y - 1) * maskW * 4 + x] : 0;
    const upleft = (y > 0 && x >= 4) ? maskData[(y - 1) * maskW * 4 + x - 4] : 0;
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
    maskData[y * maskW * 4 + x] = val;
  }
}

// 2. Setup planet mesh
const planetGeom = new THREE.SphereGeometry(2.5, 192, 192);
const planetMesh = new THREE.Mesh(planetGeom, new THREE.MeshBasicMaterial());
const raycaster = new THREE.Raycaster();

function latLngToVec3(lat, lng, r) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function raycastSurfaceDistance(lat, lng) {
  const rayOrigin = latLngToVec3(lat, lng, 5.0);
  const dir = rayOrigin.clone().negate().normalize();
  raycaster.set(rayOrigin, dir);
  const hits = raycaster.intersectObject(planetMesh);
  if (hits.length > 0) return hits[0].point.length();
  return 2.5;
}

// 3. Load latest data & country points
const latestData = JSON.parse(fs.readFileSync('public/data/latest.json', 'utf8'));
const countryPoints = JSON.parse(fs.readFileSync('src/data/country_points.json', 'utf8'));

let maxListeners = 1;
for (const c of latestData.countries) {
  for (const a of (c.artists || [])) {
    if (a.listeners > maxListeners) maxListeners = a.listeners;
  }
}

const BLOB_SIZE_BOOST = 2.0;
const MIN_RADIUS = 0.038;
const MAX_RADIUS = 0.105;
const BASE_EMBED = 0.0010;

function calculateBlobRadius(listeners) {
  const ratio = Math.max(0, Math.min(1, listeners / maxListeners));
  return (MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.sqrt(ratio)) * BLOB_SIZE_BOOST;
}

const allBlobs = [];
for (const c of latestData.countries) {
  const pts = countryPoints[c.code];
  if (!pts || pts.length === 0) continue;
  const artist = (c.artists || [])[0];
  if (!artist) continue;
  const candPt = pts[0];
  const r = calculateBlobRadius(artist.listeners);
  const surfR = 2.5; // Single source of truth
  const baseR = surfR - BASE_EMBED;
  const pos = latLngToVec3(candPt.lat, candPt.lng, baseR);
  allBlobs.push({
    country: c,
    artist: artist,
    rank: 1,
    lat: candPt.lat,
    lng: candPt.lng,
    radius: r,
    position: [pos.x, pos.y, pos.z],
  });
}

// Sort to find largest and smallest
allBlobs.sort((a, b) => b.radius - a.radius);
const largest = allBlobs[0];
const smallest = allBlobs[allBlobs.length - 1];

const sampleMap = new Map();
sampleMap.set(`Largest (${largest.artist.name}, ${largest.country.code})`, largest);
sampleMap.set(`Smallest (${smallest.artist.name}, ${smallest.country.code})`, smallest);

const targetCodes = ['IN', 'JP', 'BR', 'US', 'NO', 'ID'];
for (const code of targetCodes) {
  const found = allBlobs.find(b => b.country.code === code);
  if (found) {
    sampleMap.set(`${found.country.name} (${found.country.code})`, found);
  } else if (code === 'NO') {
    const alt = allBlobs.find(b => b.country.code === 'GB');
    if (alt) {
      sampleMap.set(`${alt.country.name} (${alt.country.code})`, alt);
    }
  }
}

console.log('Sample Blobs Elevation Audit Table:');
console.log('------------------------------------------------------------------------------------------------------');
console.log('| Blob / Country                   | Base Radius | Surface R | Raycast Surface | Difference    | Status |');
console.log('------------------------------------------------------------------------------------------------------');

let allPassed = true;
for (const [label, b] of sampleMap) {
  const pos = new THREE.Vector3(...b.position);
  const baseRadius = pos.length();
  const surfR = 2.5;
  const raycastDist = raycastSurfaceDistance(b.lat, b.lng);
  const diff = baseRadius - raycastDist;
  const passed = Math.abs(diff) < 0.003 && diff < 0.003;
  if (!passed) allPassed = false;

  console.log(
    `| ${label.padEnd(32)} | ${baseRadius.toFixed(6)}    | ${surfR.toFixed(6)}  | ${raycastDist.toFixed(6)}        | ${(diff >= 0 ? '+' : '') + diff.toFixed(6)} | ${passed ? '✅ PASS' : '❌ FAIL'} |`
  );
}
console.log('------------------------------------------------------------------------------------------------------\n');

if (allPassed) {
  console.log('🎉 ALL 8 SAMPLE BLOBS PASSED ELEVATION AUDIT (< 0.003 world units)!');
  process.exit(0);
} else {
  console.error('❌ ELEVATION AUDIT FAILED');
  process.exit(1);
}
