import fs from 'fs';
import path from 'path';

// Parse CLI flags
const isDry = process.argv.includes('--dry');

const COUNTRIES_PATH = path.resolve('src/data/countries.json');
const LATEST_PATH = path.resolve('public/data/latest.json');
const HISTORY_DIR = path.resolve('public/data/history');
const ITUNES_CACHE_PATH = path.resolve('scripts/cache/itunes.json');
const DEEZER_CACHE_PATH = path.resolve('scripts/cache/deezer.json');

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Ensure directories exist
fs.mkdirSync(path.resolve('public/data'), { recursive: true });
fs.mkdirSync(HISTORY_DIR, { recursive: true });
fs.mkdirSync(path.resolve('scripts/cache'), { recursive: true });

// Load Caches
let itunesCache = { artists: {} };
if (fs.existsSync(ITUNES_CACHE_PATH)) {
  try {
    itunesCache = JSON.parse(fs.readFileSync(ITUNES_CACHE_PATH, 'utf8'));
    if (!itunesCache.artists) itunesCache.artists = {};
  } catch (e) {
    console.warn('[Cache] Could not parse itunes.json, resetting.');
  }
}

let deezerCache = {};
if (fs.existsSync(DEEZER_CACHE_PATH)) {
  try {
    deezerCache = JSON.parse(fs.readFileSync(DEEZER_CACHE_PATH, 'utf8'));
  } catch (e) {
    console.warn('[Cache] Could not parse deezer.json, resetting.');
  }
}

function saveCaches() {
  fs.writeFileSync(ITUNES_CACHE_PATH, JSON.stringify(itunesCache, null, 2), 'utf8');
  fs.writeFileSync(DEEZER_CACHE_PATH, JSON.stringify(deezerCache, null, 2), 'utf8');
}

function normalizeName(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function fallbackCleanName(rawArtistName) {
  if (!rawArtistName) return 'Unknown Artist';
  const first = rawArtistName.split(/\s*(?:&|,|\bfeat\.?\b|\bft\.?\b)\s*/i)[0].trim();
  return first || rawArtistName;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, retries = 2, backoffMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(5000),
      });
      // 404 and 403 on Apple RSS mean "not available / no chart" -> return immediately, no backoff
      if (res.status === 404 || res.status === 403) {
        return res;
      }
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await sleep(backoffMs * Math.pow(2, attempt - 1));
          continue;
        }
      }
      return res;
    } catch (err) {
      if (attempt < retries) {
        await sleep(backoffMs * Math.pow(2, attempt - 1));
        continue;
      }
      return null;
    }
  }
  return null;
}

// 1. Fetch Apple Music Country Chart
async function fetchCountryChart(countryCode) {
  const cc = countryCode.toLowerCase();
  const urls = [
    `https://rss.marketingtools.apple.com/api/v2/${cc}/music/most-played/100/songs.json`,
    `https://rss.applemarketingtools.com/api/v2/${cc}/music/most-played/100/songs.json`,
    `https://rss.marketingtools.apple.com/api/v2/${cc}/music/most-played/50/songs.json`,
  ];

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  for (const url of urls) {
    try {
      const res = await fetchWithRetry(url, { headers }, 2, 1000);
      if (res && res.ok) {
        const json = await res.json();
        const results = json.feed?.results;
        if (Array.isArray(results) && results.length > 0) {
          return results;
        }
      }
    } catch {
      // try next fallback
    }
  }
  return null;
}

// 2. Aggregation per Country
function aggregateChartResults(results) {
  const N = results.length;
  const artistMap = new Map();

  results.forEach((song, idx) => {
    const rank = idx + 1;
    // artistId is PRIMARY artist. Fall back to raw name only if missing
    const artistId = String(song.artistId || song.artistName || `unknown-${rank}`);

    if (!artistMap.has(artistId)) {
      artistMap.set(artistId, {
        artistId,
        rawArtistName: song.artistName || 'Unknown Artist',
        appleArtistUrl: song.artistUrl || '',
        chartScore: 0,
        songsInChart: 0,
        bestRank: Infinity,
        genreCounts: {},
        songs: [],
      });
    }

    const entry = artistMap.get(artistId);
    entry.chartScore += N + 1 - rank;
    entry.songsInChart += 1;
    if (rank < entry.bestRank) {
      entry.bestRank = rank;
      // Prefer URL and primary name from highest charting track
      if (song.artistUrl) entry.appleArtistUrl = song.artistUrl;
    }

    // Genre count (excluding generic "Music")
    if (Array.isArray(song.genres)) {
      for (const g of song.genres) {
        if (g && g.name && g.name !== 'Music') {
          entry.genreCounts[g.name] = (entry.genreCounts[g.name] || 0) + 1;
        }
      }
    }

    // Explicit check: contentAdvisoryRating (Apple often misspells as 'Explict')
    const explicit = Boolean(song.contentAdvisoryRating);
    const albumCoverUrl = (song.artworkUrl100 || '').replace('100x100bb', '300x300bb');

    entry.songs.push({
      rank,
      id: String(song.id),
      title: song.name,
      albumCoverUrl,
      appleUrl: song.url || '',
      explicit,
    });
  });

  // Sort artists: chartScore desc, then bestRank asc, then rawArtistName asc
  const sortedArtists = Array.from(artistMap.values()).sort((a, b) => {
    if (b.chartScore !== a.chartScore) return b.chartScore - a.chartScore;
    if (a.bestRank !== b.bestRank) return a.bestRank - b.bestRank;
    return a.rawArtistName.localeCompare(b.rawArtistName);
  });

  // Keep top 5 artists
  const topArtists = sortedArtists.slice(0, 5).map((a) => {
    // Top 2 most frequent genres
    const sortedGenres = Object.entries(a.genreCounts)
      .sort((g1, g2) => g2[1] - g1[1])
      .map((g) => g[0])
      .slice(0, 2);

    // Keep up to 5 songs sorted by rank
    const sortedSongs = a.songs.sort((s1, s2) => s1.rank - s2.rank).slice(0, 5);

    return {
      artistId: a.artistId,
      rawArtistName: a.rawArtistName,
      appleArtistUrl: a.appleArtistUrl,
      chartScore: a.chartScore,
      songsInChart: a.songsInChart,
      bestRank: a.bestRank,
      genres: sortedGenres,
      songs: sortedSongs,
    };
  });

  return topArtists;
}

// 3. Batch iTunes Lookups (under 15 req/min, batch up to 150 IDs)
async function batchItunesLookups(artistIdsToFetch, songBatches) {
  const now = Date.now();
  const artistResults = new Map(); // artistId -> { name, url }
  const songResults = new Map(); // songId -> { previewUrl, durationSec, explicit, title }

  // Check cached artists
  const neededArtistIds = [];
  for (const id of artistIdsToFetch) {
    const cached = itunesCache.artists[id];
    if (cached && now - cached.cachedAt < FOURTEEN_DAYS_MS) {
      artistResults.set(id, { name: cached.name, url: cached.url });
    } else {
      neededArtistIds.push(id);
    }
  }

  // Helper to chunk arrays
  function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  const itunesHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  };

  // Process a batch of IDs on iTunes
  async function queryItunes(ids, country = 'us') {
    if (ids.length === 0) return [];
    // Throttle: 4100ms per request ensures <= 14.6 requests/minute (< 15 req/min rule)
    await sleep(4100);
    const url = `https://itunes.apple.com/lookup?id=${ids.join(',')}&country=${country}`;
    try {
      const res = await fetchWithRetry(url, { headers: itunesHeaders }, 3, 3000);
      if (res && res.ok) {
        const data = await res.json();
        return data.results || [];
      }
    } catch (e) {
      console.warn(`[iTunes] Lookup failed for country=${country}:`, e.message);
    }
    return [];
  }

  // 1) Fetch uncached Artists with country=us
  const artistChunks = chunkArray(neededArtistIds, 150);
  for (const chunk of artistChunks) {
    const items = await queryItunes(chunk, 'us');
    for (const item of items) {
      if (item.artistId && item.artistName) {
        const idStr = String(item.artistId);
        const name = item.artistName;
        const url = item.artistLinkUrl || '';
        artistResults.set(idStr, { name, url });
        itunesCache.artists[idStr] = { name, url, cachedAt: now };
      }
    }
  }

  // 2) Fetch Songs with country=us
  const allSongIds = songBatches.map((s) => s.id);
  const songChunks = chunkArray(allSongIds, 150);
  for (const chunk of songChunks) {
    const items = await queryItunes(chunk, 'us');
    for (const item of items) {
      if (item.trackId) {
        const sId = String(item.trackId);
        songResults.set(sId, {
          previewUrl: item.previewUrl || '',
          durationSec: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 0,
          explicit: item.trackExplicitness === 'explicit',
          title: item.trackName || '',
        });
      }
    }
  }

  // 3) Retry missing songs by their own country
  const missingSongsByCountry = new Map();
  for (const s of songBatches) {
    if (!songResults.has(s.id) || !songResults.get(s.id).previewUrl) {
      const cc = (s.countryCode || 'us').toLowerCase();
      if (!missingSongsByCountry.has(cc)) missingSongsByCountry.set(cc, []);
      missingSongsByCountry.get(cc).push(s.id);
    }
  }

  for (const [cc, ids] of missingSongsByCountry.entries()) {
    const countryChunks = chunkArray(ids, 150);
    for (const chunk of countryChunks) {
      const items = await queryItunes(chunk, cc);
      for (const item of items) {
        if (item.trackId) {
          const sId = String(item.trackId);
          songResults.set(sId, {
            previewUrl: item.previewUrl || '',
            durationSec: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 0,
            explicit: item.trackExplicitness === 'explicit',
            title: item.trackName || '',
          });
        }
      }
    }
  }

  return { artistResults, songResults };
}

// 4. Deezer Artist Search (~8 req/sec)
async function fetchDeezerPhotos(uniqueCleanNames) {
  const now = Date.now();
  const deezerResults = new Map();
  const headers = { 'User-Agent': 'Mozilla/5.0' };

  for (const name of uniqueCleanNames) {
    const norm = normalizeName(name);
    const cached = deezerCache[norm];
    if (cached && now - cached.cachedAt < FOURTEEN_DAYS_MS) {
      deezerResults.set(norm, cached);
      continue;
    }

    // Throttle to ~8 req/sec (125ms delay)
    await sleep(130);
    const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}`;
    try {
      const res = await fetchWithRetry(url, { headers }, 2, 1000);
      if (res && res.ok) {
        const json = await res.json();
        const data = json.data || [];
        // Exact normalized name match
        const exactMatches = data.filter((d) => normalizeName(d.name) === norm);
        // If multiple, pick highest nb_fan
        exactMatches.sort((a, b) => (b.nb_fan || 0) - (a.nb_fan || 0));

        const match = exactMatches[0];
        if (match && match.picture_xl) {
          const entry = {
            imageUrl: match.picture_xl,
            deezerUrl: match.link || '',
            photoMissing: false,
            cachedAt: now,
          };
          deezerResults.set(norm, entry);
          deezerCache[norm] = entry;
          continue;
        }
      }
    } catch {
      // Fall through to photoMissing
    }

    const fallbackEntry = {
      imageUrl: '/avatars/default.png',
      deezerUrl: '',
      photoMissing: true,
      cachedAt: now,
    };
    deezerResults.set(norm, fallbackEntry);
    deezerCache[norm] = fallbackEntry;
  }

  return deezerResults;
}

// 5. Trends Calculator
function calculateTrends(currentCountriesData) {
  if (!fs.existsSync(HISTORY_DIR)) {
    return { trendAvailable: false, countriesWithTrends: currentCountriesData };
  }

  const historyFiles = fs
    .readdirSync(HISTORY_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (historyFiles.length === 0) {
    return { trendAvailable: false, countriesWithTrends: currentCountriesData };
  }

  const now = Date.now();
  // Find snapshot closest to 7 days ago and at least 5 days old
  let candidateFile = null;
  let minDiff = Infinity;

  for (const f of historyFiles) {
    const dateStr = f.replace('.json', '');
    const date = new Date(dateStr).getTime();
    if (isNaN(date)) continue;
    const age = now - date;
    if (age >= FIVE_DAYS_MS) {
      const diff = Math.abs(age - SEVEN_DAYS_MS);
      if (diff < minDiff) {
        minDiff = diff;
        candidateFile = f;
      }
    }
  }

  if (!candidateFile) {
    // No snapshot at least 5 days old exists -> all 'same', trendAvailable: false
    for (const c of currentCountriesData) {
      for (const a of c.artists) {
        a.trend = 'same';
      }
    }
    return { trendAvailable: false, countriesWithTrends: currentCountriesData };
  }

  let prevData = null;
  try {
    prevData = JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, candidateFile), 'utf8'));
  } catch {
    return { trendAvailable: false, countriesWithTrends: currentCountriesData };
  }

  // Build lookup of previous country -> artistId -> { chartScore, songsInChart }
  const prevMap = new Map();
  for (const c of prevData.countries || []) {
    const artistLookup = new Map();
    for (const a of c.artists || []) {
      artistLookup.set(a.id, { chartScore: a.chartScore, songsInChart: a.songsInChart });
    }
    prevMap.set(c.code, artistLookup);
  }

  for (const c of currentCountriesData) {
    const prevCountry = prevMap.get(c.code);
    for (const a of c.artists) {
      if (!prevCountry || !prevCountry.has(a.id)) {
        a.trend = 'new';
      } else {
        const prevA = prevCountry.get(a.id);
        const scoreChange = (a.chartScore - prevA.chartScore) / Math.max(1, prevA.chartScore);
        const songChange = a.songsInChart - prevA.songsInChart;

        if (scoreChange >= 0.15 || songChange >= 1) {
          a.trend = 'up';
        } else if (scoreChange <= -0.15 || songChange <= -1) {
          a.trend = 'down';
        } else {
          a.trend = 'same';
        }
      }
    }
  }

  return { trendAvailable: true, countriesWithTrends: currentCountriesData };
}

// 6. Main Orchestrator
async function main() {
  const startTime = Date.now();
  console.log(`\n🎵 BobGlobe Real Data Pipeline [Mode: ${isDry ? 'DRY-RUN (5 countries)' : 'PRODUCTION'}]`);
  console.log(`Started at: ${new Date().toISOString()}\n`);

  const allCountries = JSON.parse(fs.readFileSync(COUNTRIES_PATH, 'utf8'));
  let targetCountries = allCountries;

  if (isDry) {
    // 5 sample countries for dry run
    const sampleCodes = ['IN', 'US', 'BR', 'JP', 'GB'];
    targetCountries = allCountries.filter((c) => sampleCodes.includes(c.code));
  }

  const noChart = [];
  const rawCountryAggregates = [];

  console.log(`1️⃣ Fetching Apple Music charts for ${targetCountries.length} countries...`);
  const queue = [...targetCountries];
  let processedCount = 0;

  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length > 0) {
      const c = queue.shift();
      const results = await fetchCountryChart(c.code);
      if (!results || results.length === 0) {
        noChart.push(c.code);
      } else {
        const topArtists = aggregateChartResults(results);
        if (topArtists.length > 0) {
          rawCountryAggregates.push({
            country: c,
            artists: topArtists,
          });
        } else {
          noChart.push(c.code);
        }
      }
      processedCount++;
      if (processedCount % 20 === 0 || processedCount === targetCountries.length) {
        console.log(`   Progress: ${processedCount}/${targetCountries.length} countries probed...`);
      }
      await sleep(30);
    }
  });

  await Promise.all(workers);

  // Preserve deterministic order matching original country list
  rawCountryAggregates.sort((a, b) => a.country.id - b.country.id);
  noChart.sort();

  console.log(`   ✅ Succeeded: ${rawCountryAggregates.length} countries`);
  console.log(`   ⚠️ No chart: ${noChart.length} countries (${noChart.join(', ') || 'none'})`);

  // Gather unique artist IDs and songs to look up
  const artistIdSet = new Set();
  const songsToLookup = [];

  for (const ca of rawCountryAggregates) {
    for (const a of ca.artists) {
      artistIdSet.add(a.artistId);
      for (const s of a.songs) {
        songsToLookup.push({
          id: s.id,
          countryCode: ca.country.code,
        });
      }
    }
  }

  console.log(`\n2️⃣ Resolving iTunes clean names and track previews...`);
  console.log(`   Unique artist IDs: ${artistIdSet.size}`);
  console.log(`   Total tracks to lookup: ${songsToLookup.length}`);

  const { artistResults, songResults } = await batchItunesLookups(
    Array.from(artistIdSet),
    songsToLookup
  );

  let cleanNamesCount = 0;
  let previewsFoundCount = 0;
  let explicitSongsCount = 0;
  const uniqueCleanNamesSet = new Set();

  // Populate clean artist names & fallback
  for (const ca of rawCountryAggregates) {
    for (const a of ca.artists) {
      const itunesArtist = artistResults.get(a.artistId);
      if (itunesArtist && itunesArtist.name) {
        a.name = itunesArtist.name;
        if (itunesArtist.url) a.appleArtistUrl = itunesArtist.url;
        cleanNamesCount++;
      } else {
        a.name = fallbackCleanName(a.rawArtistName);
        console.log(`   [Fallback Name] artistId ${a.artistId}: "${a.rawArtistName}" -> "${a.name}"`);
      }
      uniqueCleanNamesSet.add(a.name);

      // Populate track preview info
      for (const s of a.songs) {
        const itunesSong = songResults.get(s.id);
        if (itunesSong) {
          if (itunesSong.previewUrl) {
            s.previewUrl = itunesSong.previewUrl;
            previewsFoundCount++;
          }
          if (itunesSong.durationSec) s.durationSec = itunesSong.durationSec;
          if (itunesSong.explicit !== undefined) s.explicit = itunesSong.explicit;
          if (itunesSong.title) s.title = itunesSong.title;
        }
        if (s.explicit) explicitSongsCount++;
      }
    }
  }

  console.log(`\n3️⃣ Querying Deezer for artist high-res photos...`);
  console.log(`   Unique clean names to query: ${uniqueCleanNamesSet.size}`);
  const deezerResults = await fetchDeezerPhotos(Array.from(uniqueCleanNamesSet));

  let deezerMatchedCount = 0;
  let deezerMissingCount = 0;
  const unmatchedArtists = [];

  for (const ca of rawCountryAggregates) {
    for (const a of ca.artists) {
      const norm = normalizeName(a.name);
      const photoInfo = deezerResults.get(norm);
      if (photoInfo && !photoInfo.photoMissing) {
        a.imageUrl = photoInfo.imageUrl;
        a.deezerUrl = photoInfo.deezerUrl;
        a.photoMissing = false;
        deezerMatchedCount++;
      } else {
        a.imageUrl = '/avatars/default.png';
        a.deezerUrl = '';
        a.photoMissing = true;
        deezerMissingCount++;
        unmatchedArtists.push(a.name);
      }
    }
  }

  saveCaches();

  // 4. Build output countries array matching target schema
  const formattedCountries = rawCountryAggregates.map(({ country, artists }) => {
    return {
      id: country.id,
      code: country.code,
      name: country.name,
      lastfmName: country.lastfmName,
      lat: country.lat,
      lng: country.lng,
      pop: country.pop,
      areaDeg2: country.areaDeg2,
      artists: artists.map((a) => ({
        id: a.artistId,
        name: a.name,
        imageUrl: a.imageUrl,
        deezerUrl: a.deezerUrl,
        appleArtistUrl: a.appleArtistUrl,
        photoMissing: a.photoMissing,
        genres: a.genres,
        chartScore: a.chartScore,
        songsInChart: a.songsInChart,
        bestRank: a.bestRank,
        trend: 'same', // populated by calculateTrends
        topTracks: a.songs.map((s) => ({
          rank: s.rank,
          title: s.title,
          previewUrl: s.previewUrl || '',
          albumCoverUrl: s.albumCoverUrl,
          appleUrl: s.appleUrl,
          explicit: s.explicit,
          durationSec: s.durationSec || 0,
        })),
        listeners: a.chartScore, // backward compatibility
      })),
    };
  });

  // Calculate trends against history
  const { trendAvailable, countriesWithTrends } = calculateTrends(formattedCountries);

  // 5. Global Top 30 Artists (summed chartScore across all countries, deduped by artistId)
  const globalScoreMap = new Map();
  for (const c of countriesWithTrends) {
    for (const a of c.artists) {
      if (!globalScoreMap.has(a.id)) {
        globalScoreMap.set(a.id, {
          id: a.id,
          name: a.name,
          imageUrl: a.imageUrl,
          deezerUrl: a.deezerUrl,
          appleArtistUrl: a.appleArtistUrl,
          photoMissing: a.photoMissing,
          genres: a.genres,
          totalScore: 0,
          bestCountry: c.code,
          bestRank: a.bestRank,
        });
      }
      const entry = globalScoreMap.get(a.id);
      entry.totalScore += a.chartScore;
      if (a.bestRank < entry.bestRank) {
        entry.bestRank = a.bestRank;
        entry.bestCountry = c.code;
      }
    }
  }

  const globalTop = Array.from(globalScoreMap.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 30)
    .map((g, idx) => ({
      rank: idx + 1,
      id: g.id,
      name: g.name,
      imageUrl: g.imageUrl,
      deezerUrl: g.deezerUrl,
      appleArtistUrl: g.appleArtistUrl,
      photoMissing: g.photoMissing,
      genres: g.genres,
      chartScore: g.totalScore,
      bestCountry: g.bestCountry,
      bestRank: g.bestRank,
    }));

  const nowIso = new Date().toISOString();
  const finalData = {
    updatedAt: nowIso,
    source: 'Apple Music charts + Deezer',
    chartDepth: 100,
    trendAvailable,
    noChart,
    countries: countriesWithTrends,
    globalTop,
  };

  // 6. Validation
  console.log(`\n4️⃣ Validating Dataset...`);
  if (!isDry) {
    const coverageFrac = countriesWithTrends.length / allCountries.length;
    if (coverageFrac < 0.8) {
      throw new Error(
        `Validation failed: Chart coverage ${(coverageFrac * 100).toFixed(1)}% is below 80% threshold!`
      );
    }
  }

  for (const c of countriesWithTrends) {
    if (c.artists.length > 5) {
      throw new Error(`Validation failed: Country ${c.code} has ${c.artists.length} artists (> 5)!`);
    }
    const seenIds = new Set();
    for (const a of c.artists) {
      if (seenIds.has(a.id)) {
        throw new Error(`Validation failed: Duplicate artistId ${a.id} in country ${c.code}!`);
      }
      seenIds.add(a.id);

      if (!a.name || typeof a.name !== 'string') {
        throw new Error(`Validation failed: Artist ${a.id} in ${c.code} is missing a name!`);
      }
      if (isNaN(a.chartScore) || a.chartScore < 0) {
        throw new Error(`Validation failed: Invalid chartScore for ${a.name} in ${c.code}!`);
      }

      // Check strictly increasing ranks in songs
      for (let i = 0; i < a.topTracks.length - 1; i++) {
        if (a.topTracks[i].rank >= a.topTracks[i + 1].rank) {
          throw new Error(
            `Validation failed: Ranks not strictly increasing in ${a.name}'s songs in ${c.code}!`
          );
        }
      }
    }
  }
  console.log(`   ✅ All invariant checks passed!`);

  // 7. Output files
  if (isDry) {
    console.log(`\n[DRY RUN] Skipping file writes.`);
  } else {
    // Atomic write to latest.json
    const tmpPath = `${LATEST_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(finalData, null, 2), 'utf8');
    fs.renameSync(tmpPath, LATEST_PATH);
    console.log(`   💾 Atomically wrote: ${LATEST_PATH}`);

    // Dated copy in public/data/history/YYYY-MM-DD.json
    const todayStr = nowIso.slice(0, 10);
    const historyPath = path.join(HISTORY_DIR, `${todayStr}.json`);
    fs.writeFileSync(historyPath, JSON.stringify(finalData, null, 2), 'utf8');
    console.log(`   💾 Saved history snapshot: ${historyPath}`);

    // Prune history to keep last 30
    const historyFiles = fs
      .readdirSync(HISTORY_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort();
    if (historyFiles.length > 30) {
      const toDelete = historyFiles.slice(0, historyFiles.length - 30);
      for (const f of toDelete) {
        fs.unlinkSync(path.join(HISTORY_DIR, f));
      }
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n============================================================`);
  console.log(`📊 BOBGLOBE DATA PIPELINE SUMMARY [${isDry ? 'DRY RUN' : 'PRODUCTION'}]`);
  console.log(`------------------------------------------------------------`);
  console.log(`Countries processed:   ${countriesWithTrends.length} ok / ${noChart.length} noChart`);
  console.log(`Total artists placed:  ${countriesWithTrends.reduce((acc, c) => acc + c.artists.length, 0)}`);
  console.log(`Clean names resolved:  ${cleanNamesCount}`);
  console.log(`Track previews found:  ${previewsFoundCount} / ${songsToLookup.length}`);
  console.log(`Explicit tracks:       ${explicitSongsCount}`);
  console.log(`Deezer photos matched: ${deezerMatchedCount} (unmatched/fallback: ${deezerMissingCount})`);
  console.log(`Pipeline runtime:      ${durationSec}s`);
  console.log(`============================================================\n`);

  // Show India Top 5
  const india = countriesWithTrends.find((c) => c.code === 'IN');
  if (india) {
    console.log(`🇮🇳 India Top 5 Artists:`);
    india.artists.forEach((a, i) => {
      console.log(
        `  #${i + 1}: ${a.name.padEnd(22)} (ID: ${a.id}) | Score: ${a.chartScore} | Tracks: ${a.songsInChart} | Best: #${a.bestRank} | Photo: ${a.photoMissing ? 'Default Avatar' : 'Deezer HD'}`
      );
    });
    console.log('');
  }

  return { finalData, unmatchedArtists, noChart };
}

main().catch((err) => {
  console.error('\n❌ Fatal error in data pipeline:', err);
  process.exit(1);
});
