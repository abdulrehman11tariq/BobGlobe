import type { DataFile } from '../types';

export const fallbackSeedData: DataFile = {
  updatedAt: new Date().toISOString(),
  source: 'Apple Music Country Charts + Deezer (Seed Fallback)',
  chartDepth: 100,
  trendAvailable: false,
  noChart: [],
  countries: [
    {
      code: 'US',
      name: 'United States',
      lat: 38.0,
      lng: -97.0,
      artists: [
        {
          id: '1',
          name: 'Taylor Swift',
          imageUrl: '/avatars/default.png',
          chartScore: 420,
          songsInChart: 8,
          bestRank: 1,
          listeners: 420,
          trend: 'same',
          genres: ['Pop'],
          genre: 'Pop',
          topTracks: [
            {
              rank: 1,
              title: 'Cruel Summer',
              previewUrl: '',
              albumCoverUrl: '',
              appleUrl: 'https://music.apple.com',
              explicit: false,
              durationSec: 30,
            },
          ],
        },
      ],
    },
  ],
  globalTop: [],
};
