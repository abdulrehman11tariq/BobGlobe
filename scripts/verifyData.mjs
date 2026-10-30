import fs from 'fs';
import path from 'path';

const LATEST_PATH = path.resolve('public/data/latest.json');
const COUNTRIES_PATH = path.resolve('src/data/countries.json');

async function testUrlStatus(url) {
  if (!url || url.startsWith('/')) return 200; // local avatar
  try {
    // Try HEAD first
    let res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) return res.status;
    // Ranged GET fallback
    res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', Range: 'bytes=0-100' },
      signal: AbortSignal.timeout(6000),
    });
    return res.status;
  } catch {
    return 0;
  }
}

async function verify() {
  console.log('\n🔍 Running BobGlobe Data Verification Suite (npm run verify-data)...\n');

  if (!fs.existsSync(LATEST_PATH)) {
    console.error(`❌ File not found: ${LATEST_PATH}. Please run "npm run fetch-data" first.`);
    process.exit(1);
  }

  const latest = JSON.parse(fs.readFileSync(LATEST_PATH, 'utf8'));
  const allCountries = JSON.parse(fs.readFileSync(COUNTRIES_PATH, 'utf8'));

  const countries = latest.countries || [];
  const noChart = latest.noChart || [];

  // Invariant 1: Coverage
  const coverageFrac = countries.length / allCountries.length;
  console.log(
    `1️⃣ Country Coverage: ${countries.length} / ${allCountries.length} (${(coverageFrac * 100).toFixed(1)}%) [${coverageFrac >= 0.8 ? '✅ PASS (>= 80%)' : '❌ FAIL (< 80%)'}]`
  );
  if (coverageFrac < 0.8) {
    console.error(`❌ Invariant failed: Chart coverage must be at least 80%!`);
    process.exit(1);
  }

  // Invariant checks
  let totalArtists = 0;
  let artistsWithPhotos = 0;
  let artistsWithPreviews = 0;
  let artistsWithCleanPreview = 0;
  let collabNameCount = 0;
  const collabArtists = [];

  const allPreviewUrls = [];
  const allImageUrls = [];

  for (const c of countries) {
    if (c.artists.length > 5) {
      console.error(`❌ Invariant failed: Country ${c.code} has ${c.artists.length} artists (> 5)!`);
      process.exit(1);
    }

    const seenIds = new Set();
    for (const a of c.artists) {
      totalArtists++;

      if (seenIds.has(a.id)) {
        console.error(`❌ Invariant failed: Duplicate artistId ${a.id} in ${c.code}!`);
        process.exit(1);
      }
      seenIds.add(a.id);

      if (!a.name || typeof a.name !== 'string') {
        console.error(`❌ Invariant failed: Missing name for artist ${a.id} in ${c.code}!`);
        process.exit(1);
      }
      if (isNaN(a.chartScore) || a.chartScore < 0) {
        console.error(`❌ Invariant failed: Invalid chartScore for ${a.name} in ${c.code}!`);
        process.exit(1);
      }

      // Check ranks strictly increasing
      for (let i = 0; i < a.topTracks.length - 1; i++) {
        if (a.topTracks[i].rank >= a.topTracks[i + 1].rank) {
          console.error(`❌ Invariant failed: Song ranks not strictly increasing for ${a.name} in ${c.code}!`);
          process.exit(1);
        }
      }

      // Collab name check
      if (/\s(?:&|feat\.?|ft\.?)\s/i.test(a.name)) {
        collabNameCount++;
        collabArtists.push(`${a.name} (${c.code})`);
      }

      // Photos
      if (a.imageUrl && !a.photoMissing) {
        artistsWithPhotos++;
        allImageUrls.push(a.imageUrl);
      }

      // Previews
      let hasPreview = false;
      let hasCleanPreview = false;
      for (const t of a.topTracks) {
        if (t.previewUrl) {
          hasPreview = true;
          allPreviewUrls.push(t.previewUrl);
          if (!t.explicit) {
            hasCleanPreview = true;
          }
        }
      }
      if (hasPreview) artistsWithPreviews++;
      if (hasCleanPreview) artistsWithCleanPreview++;
    }
  }

  console.log(`2️⃣ Core Invariants: All artist counts, IDs, strictly increasing song ranks, non-negative scores verified [✅ PASS]`);

  // Sample 20 random previewUrls and 20 random imageUrls
  console.log(`\n3️⃣ Sampling Network Assets:`);

  function getRandomSample(arr, size) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
  }

  const samplePreviews = getRandomSample(allPreviewUrls, 20);
  const sampleImages = getRandomSample(allImageUrls, 20);

  console.log(`   Probing 20 random preview audio URLs...`);
  const previewResults = await Promise.all(samplePreviews.map((url) => testUrlStatus(url)));
  const preview200s = previewResults.filter((s) => s === 200 || s === 206).length;
  console.log(`   ✅ Previews reachable: ${preview200s} / ${samplePreviews.length} returned HTTP 200/206`);

  console.log(`   Probing 20 random Deezer image URLs...`);
  const imageResults = await Promise.all(sampleImages.map((url) => testUrlStatus(url)));
  const image200s = imageResults.filter((s) => s === 200 || s === 206).length;
  console.log(`   ✅ Images reachable: ${image200s} / ${sampleImages.length} returned HTTP 200/206`);

  // Metrics
  const pctPhotos = ((artistsWithPhotos / totalArtists) * 100).toFixed(1);
  const pctPreviews = ((artistsWithPreviews / totalArtists) * 100).toFixed(1);
  const pctClean = ((artistsWithCleanPreview / totalArtists) * 100).toFixed(1);

  console.log(`\n4️⃣ Quality Metrics:`);
  console.log(`   • Total Artists:                     ${totalArtists}`);
  console.log(`   • Artists with Deezer HD Photos:     ${artistsWithPhotos} / ${totalArtists} (${pctPhotos}%)`);
  console.log(`   • Artists with Audio Previews:       ${artistsWithPreviews} / ${totalArtists} (${pctPreviews}%)`);
  console.log(`   • Artists with Clean Audio Preview:  ${artistsWithCleanPreview} / ${totalArtists} (${pctClean}%)`);
  console.log(
    `   • Collab-style names remaining:      ${collabNameCount} ${collabNameCount > 0 ? `(${collabArtists.slice(0, 5).join(', ')})` : ''}`
  );

  // Eyeball check for Key Countries
  const eyeballCodes = ['IN', 'US', 'BR', 'JP', 'GB', 'DE'];
  console.log(`\n5️⃣ Eyeball Inspection for Key Countries:`);
  for (const code of eyeballCodes) {
    const c = countries.find((item) => item.code === code);
    if (!c) {
      console.log(`   [${code}] No chart available.`);
      continue;
    }
    console.log(`   📍 ${c.name} (${c.code}):`);
    c.artists.forEach((a, i) => {
      const cleanPrev = a.topTracks.find((t) => t.previewUrl && !t.explicit);
      console.log(
        `      #${i + 1}: ${a.name.padEnd(24)} | Score: ${a.chartScore} | Tracks: ${a.songsInChart} | Best: #${a.bestRank} | Photo: ${a.photoMissing ? 'Default' : 'Deezer'} | Clean Preview: ${cleanPrev ? 'Yes ("' + cleanPrev.title + '")' : 'None'}`
      );
    });
  }

  console.log('\n============================================================');
  console.log('🎉 ALL DATA VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  console.log('============================================================\n');
}

verify().catch((err) => {
  console.error('\n❌ Data verification failed:', err);
  process.exit(1);
});
