import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

test('India Feed Data Aggregation Unit Test', () => {
  const fixturePath = path.resolve('scripts/fixtures/in-most-played.json');
  assert.ok(fs.existsSync(fixturePath), 'Fixture scripts/fixtures/in-most-played.json must exist');

  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const results = fixture.feed?.results;
  assert.ok(Array.isArray(results) && results.length > 0, 'Feed results must be a non-empty array');

  const N = results.length;
  const artistMap = new Map();

  results.forEach((song, idx) => {
    const rank = idx + 1;
    // Primary artist grouping ONLY by artistId
    const artistId = String(song.artistId || song.artistName);

    if (!artistMap.has(artistId)) {
      artistMap.set(artistId, {
        id: artistId,
        rawName: song.artistName,
        chartScore: 0,
        songsInChart: 0,
        bestRank: Infinity,
        songs: [],
      });
    }

    const entry = artistMap.get(artistId);
    entry.chartScore += N + 1 - rank;
    entry.songsInChart += 1;
    if (rank < entry.bestRank) entry.bestRank = rank;
    entry.songs.push({ rank, title: song.name });
  });

  const sortedArtists = Array.from(artistMap.values()).sort((a, b) => {
    if (b.chartScore !== a.chartScore) return b.chartScore - a.chartScore;
    if (a.bestRank !== b.bestRank) return a.bestRank - b.bestRank;
    return a.rawName.localeCompare(b.rawName);
  });

  console.log('Top Artists aggregated from India fixture:');
  sortedArtists.slice(0, 6).forEach((a, i) => {
    console.log(`  #${i + 1}: ${a.rawName} (ID: ${a.id}) - Score: ${a.chartScore}`);
  });

  // Assertion 1: Karan Aujla (artistId 914892130) is ranked #1 by chartScore
  assert.strictEqual(
    sortedArtists[0].id,
    '914892130',
    'Karan Aujla (artistId 914892130) must be ranked #1'
  );

  // Assertion 2: Anirudh Ravichander (480976476) is ranked #2
  assert.strictEqual(
    sortedArtists[1].id,
    '480976476',
    'Anirudh Ravichander (artistId 480976476) must be ranked #2'
  );

  // Assertion 3: Karan Aujla, Anirudh Ravichander, Pritam, Sai Abhyankkar and Arijit Singh (or Shashwat Sachdev) appear in top 6
  const top6Ids = sortedArtists.slice(0, 6).map((a) => a.id);
  // Expected artist IDs:
  // Karan Aujla: 914892130
  // Anirudh Ravichander: 480976476
  // Sai Abhyankkar: 1652280551
  // Shashwat Sachdev: 1206967804
  // Pritam: 213157068
  // Arijit Singh: 484568188
  assert.ok(top6Ids.includes('914892130'), 'Karan Aujla must be in top 6');
  assert.ok(top6Ids.includes('480976476'), 'Anirudh Ravichander must be in top 6');
  assert.ok(top6Ids.includes('1652280551'), 'Sai Abhyankkar must be in top 6');
  assert.ok(top6Ids.includes('213157068'), 'Pritam must be in top 6');
  assert.ok(
    top6Ids.includes('484568188') || top6Ids.includes('1206967804'),
    'Arijit Singh or Shashwat Sachdev must be in top 6'
  );

  // Assertion 4: Collaborator names do not create separate artists
  // In the raw feed, Karan Aujla collaborated with "MXRCI". There should be no entry with ID="MXRCI"
  assert.strictEqual(artistMap.has('MXRCI'), false, 'MXRCI collaborator must not create separate artist');
  assert.strictEqual(artistMap.has('HEISENBERG'), false, 'HEISENBERG collaborator must not create separate artist');
});
