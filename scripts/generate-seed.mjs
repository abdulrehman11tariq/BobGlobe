import fs from 'fs';
import path from 'path';

const countriesPath = path.join(process.cwd(), 'src', 'data', 'countries.json');
const countries = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));

// Curated top regional artists database for realistic feel
const REGIONAL_ARTISTS = {
  US: [
    { name: "Taylor Swift", listeners: 4820000, genre: "Pop", trend: "same" },
    { name: "Kendrick Lamar", listeners: 3410000, genre: "Hip-Hop", trend: "up" },
    { name: "Drake", listeners: 3290000, genre: "Hip-Hop", trend: "down" },
    { name: "Billie Eilish", listeners: 2980000, genre: "Alternative", trend: "up" },
    { name: "SZA", listeners: 2650000, genre: "R&B", trend: "up" },
  ],
  GB: [
    { name: "Arctic Monkeys", listeners: 3950000, genre: "Indie Rock", trend: "same" },
    { name: "Coldplay", listeners: 3450000, genre: "Rock", trend: "same" },
    { name: "Dua Lipa", listeners: 3250000, genre: "Pop", trend: "up" },
    { name: "Ed Sheeran", listeners: 3120000, genre: "Pop", trend: "down" },
    { name: "Harry Styles", listeners: 2890000, genre: "Pop", trend: "same" },
  ],
  BR: [
    { name: "Anitta", listeners: 2840000, genre: "Funk Carioca", trend: "up" },
    { name: "Alok", listeners: 2120000, genre: "Electronic", trend: "same" },
    { name: "Ludmilla", listeners: 1940000, genre: "Pagode", trend: "same" },
    { name: "Luísa Sonza", listeners: 1780000, genre: "Pop", trend: "up" },
    { name: "Matuê", listeners: 1520000, genre: "Trap", trend: "up" },
  ],
  JP: [
    { name: "YOASOBI", listeners: 2450000, genre: "J-Pop", trend: "up" },
    { name: "Kenshi Yonezu", listeners: 2180000, genre: "J-Pop", trend: "same" },
    { name: "Fujii Kaze", listeners: 1950000, genre: "Soul", trend: "up" },
    { name: "King Gnu", listeners: 1640000, genre: "J-Rock", trend: "down" },
    { name: "Ado", listeners: 1580000, genre: "J-Pop", trend: "up" },
  ],
  KR: [
    { name: "BTS", listeners: 3890000, genre: "K-Pop", trend: "same" },
    { name: "NewJeans", listeners: 2680000, genre: "K-Pop", trend: "up" },
    { name: "BLACKPINK", listeners: 2540000, genre: "K-Pop", trend: "down" },
    { name: "Stray Kids", listeners: 2150000, genre: "K-Pop", trend: "up" },
    { name: "IU", listeners: 1980000, genre: "Ballad", trend: "same" },
  ],
  CA: [
    { name: "The Weeknd", listeners: 4410000, genre: "R&B", trend: "up" },
    { name: "Drake", listeners: 3810000, genre: "Hip-Hop", trend: "down" },
    { name: "Justin Bieber", listeners: 3490000, genre: "Pop", trend: "same" },
    { name: "Shawn Mendes", listeners: 2680000, genre: "Pop", trend: "down" },
    { name: "Tate McRae", listeners: 2420000, genre: "Pop", trend: "up" },
  ],
  FR: [
    { name: "Daft Punk", listeners: 3650000, genre: "Electronic", trend: "same" },
    { name: "David Guetta", listeners: 3120000, genre: "Dance", trend: "up" },
    { name: "Jul", listeners: 2180000, genre: "Rap", trend: "same" },
    { name: "Aya Nakamura", listeners: 1940000, genre: "Afrobeat", trend: "up" },
    { name: "PNL", listeners: 1820000, genre: "Cloud Rap", trend: "same" },
  ],
  DE: [
    { name: "Rammstein", listeners: 3410000, genre: "Industrial Metal", trend: "same" },
    { name: "Robin Schulz", listeners: 2210000, genre: "Deep House", trend: "down" },
    { name: "Apache 207", listeners: 1890000, genre: "Hip-Hop", trend: "up" },
    { name: "Milky Chance", listeners: 1750000, genre: "Indie Pop", trend: "same" },
    { name: "Kraftwerk", listeners: 1620000, genre: "Electronic", trend: "same" },
  ],
  AU: [
    { name: "Tame Impala", listeners: 3320000, genre: "Psychedelic", trend: "same" },
    { name: "AC/DC", listeners: 3190000, genre: "Hard Rock", trend: "same" },
    { name: "Sia", listeners: 2980000, genre: "Pop", trend: "down" },
    { name: "Troye Sivan", listeners: 2410000, genre: "Pop", trend: "up" },
    { name: "The Kid LAROI", listeners: 2180000, genre: "Hip-Hop", trend: "same" },
  ],
  MX: [
    { name: "Peso Pluma", listeners: 3150000, genre: "Corridos", trend: "up" },
    { name: "Natanael Cano", listeners: 2320000, genre: "Corridos", trend: "up" },
    { name: "Christian Nodal", listeners: 1940000, genre: "Regional", trend: "same" },
    { name: "Julieta Venegas", listeners: 1780000, genre: "Latin Pop", trend: "same" },
    { name: "Carin Leon", listeners: 1690000, genre: "Banda", trend: "up" },
  ],
  IN: [
    { name: "Arijit Singh", listeners: 3680000, genre: "Bollywood", trend: "up" },
    { name: "A.R. Rahman", listeners: 2980000, genre: "Soundtrack", trend: "same" },
    { name: "Diljit Dosanjh", listeners: 2540000, genre: "Punjabi", trend: "up" },
    { name: "Pritam", listeners: 2180000, genre: "Bollywood", trend: "same" },
    { name: "Sidhu Moose Wala", listeners: 2050000, genre: "Punjabi", trend: "same" },
  ],
  NG: [
    { name: "Burna Boy", listeners: 2890000, genre: "Afrobeats", trend: "up" },
    { name: "Wizkid", listeners: 2410000, genre: "Afrobeats", trend: "same" },
    { name: "Rema", listeners: 2350000, genre: "Afrorave", trend: "up" },
    { name: "Asake", listeners: 1840000, genre: "Amapiano", trend: "up" },
    { name: "Tems", listeners: 1720000, genre: "R&B", trend: "up" },
  ],
};

const GLOBAL_POOL = [
  { name: "Bad Bunny", genre: "Reggaeton", base: 3600000 },
  { name: "Rihanna", genre: "Pop", base: 3100000 },
  { name: "Gorillaz", genre: "Alternative", base: 2800000 },
  { name: "Post Malone", genre: "Hip-Hop", base: 2750000 },
  { name: "Queen", genre: "Classic Rock", base: 2600000 },
  { name: "Shakira", genre: "Latin", base: 2500000 },
  { name: "Radiohead", genre: "Art Rock", base: 2450000 },
  { name: "Red Hot Chili Peppers", genre: "Rock", base: 2400000 },
  { name: "Imagine Dragons", genre: "Pop Rock", base: 2300000 },
  { name: "Adele", genre: "Soul", base: 2200000 },
  { name: "Bruno Mars", genre: "Funk", base: 2150000 },
  { name: "Lady Gaga", genre: "Dance Pop", base: 2100000 },
  { name: "Lana Del Rey", genre: "Indie Pop", base: 2050000 },
  { name: "Rosalía", genre: "Flamenco Pop", base: 1950000 },
  { name: "Linkin Park", genre: "Nu Metal", base: 1900000 },
  { name: "Calvin Harris", genre: "Dance", base: 1850000 },
  { name: "Kygo", genre: "Tropical House", base: 1800000 },
  { name: "Avicii", genre: "EDM", base: 1750000 },
  { name: "Stromae", genre: "Chanson", base: 1650000 },
  { name: "Zaho de Sagazan", genre: "Electro", base: 1550000 },
];

const TRENDS = ["up", "down", "same", "new"];

// Simple seeded hash for consistent artist generation per country
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const countryEntries = countries.map((c) => {
  let artists = [];

  if (REGIONAL_ARTISTS[c.code]) {
    artists = REGIONAL_ARTISTS[c.code].map((a, idx) => ({
      id: `${c.code.toLowerCase()}-${idx + 1}`,
      name: a.name,
      imageUrl: `https://images.unsplash.com/photo-${1510000000000 + idx * 10000}?auto=format&fit=crop&w=300&q=80`,
      deezerUrl: `https://www.deezer.com/search/${encodeURIComponent(a.name)}`,
      genre: a.genre,
      listeners: a.listeners,
      trend: a.trend,
      topTracks: [
        { title: `Top Track 1`, previewUrl: "" },
        { title: `Top Track 2`, previewUrl: "" },
        { title: `Top Track 3`, previewUrl: "" },
      ],
    }));
  } else {
    // Generate 5 distinct artists for this country
    const seed = hashCode(c.code + c.name);
    const poolCopy = [...GLOBAL_POOL];
    const picked = [];

    for (let k = 0; k < 5; k++) {
      const idx = (seed + k * 7) % poolCopy.length;
      const baseArtist = poolCopy.splice(idx, 1)[0];
      const variance = 0.65 + ((seed * (k + 1)) % 100) / 250;
      const listeners = Math.floor(baseArtist.base * variance);
      const trend = TRENDS[(seed + k) % TRENDS.length];

      picked.push({
        id: `${c.code.toLowerCase()}-${k + 1}`,
        name: baseArtist.name,
        imageUrl: `https://images.unsplash.com/photo-${1510000000000 + k * 10000}?auto=format&fit=crop&w=300&q=80`,
        deezerUrl: `https://www.deezer.com/search/${encodeURIComponent(baseArtist.name)}`,
        genre: baseArtist.genre,
        listeners,
        trend,
        topTracks: [
          { title: `${baseArtist.name} Hit Single`, previewUrl: "" },
          { title: `Acoustic Session`, previewUrl: "" },
          { title: `Live in Concert`, previewUrl: "" },
        ],
      });
    }

    // Sort by listeners descending
    picked.sort((a, b) => b.listeners - a.listeners);
    artists = picked;
  }

  return {
    code: c.code,
    name: c.name,
    lat: c.lat,
    lng: c.lng,
    artists,
  };
});

const dataFile = {
  updatedAt: new Date().toISOString(),
  countries: countryEntries,
};

const outputPath = path.join(process.cwd(), 'public', 'data', 'latest.json');
fs.writeFileSync(outputPath, JSON.stringify(dataFile, null, 2));
console.log(`Successfully generated seed data for ${countryEntries.length} countries at ${outputPath}`);
