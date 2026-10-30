export type TrendDirection = 'up' | 'down' | 'new' | 'same';

export interface TopTrack {
  rank: number;
  title: string;
  previewUrl: string;
  albumCoverUrl: string;
  appleUrl: string;
  explicit: boolean;
  durationSec: number;
}

export interface Artist {
  id: string;
  name: string;
  imageUrl?: string;
  deezerUrl?: string;
  appleArtistUrl?: string;
  photoMissing?: boolean;
  genres?: string[];
  genre?: string;
  chartScore: number;
  songsInChart: number;
  bestRank: number;
  listeners: number; // backward compatibility: listeners = chartScore
  trend: TrendDirection;
  topTracks: TopTrack[];
}

export interface CountryEntry {
  id?: number;
  code: string;
  name: string;
  lat: number;
  lng: number;
  lastfmName?: string;
  pop?: number;
  areaDeg2?: number;
  artists: Artist[]; // up to 5 per country, sorted by chartScore
}

export interface GlobalTopArtist {
  rank: number;
  id: string;
  name: string;
  imageUrl?: string;
  deezerUrl?: string;
  appleArtistUrl?: string;
  photoMissing?: boolean;
  genres?: string[];
  chartScore: number;
  bestCountry: string;
  bestRank: number;
}

export interface DataFile {
  updatedAt: string;
  source?: string;
  chartDepth?: number;
  trendAvailable?: boolean;
  noChart?: string[];
  countries: CountryEntry[];
  globalTop?: GlobalTopArtist[];
}

/**
 * 3D Placement and runtime state for an individual blob
 */
export interface BlobInstanceData {
  id: string;
  artist: Artist;
  country: CountryEntry;
  rank: number; // 1 to 5
  lat: number;
  lng: number;
  position: [number, number, number];
  normal: [number, number, number];
  radius: number;
  targetRadius: number;
  currentRadius: number;
  color: string;
}
