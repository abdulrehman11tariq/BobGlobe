export type TrendDirection = 'up' | 'down' | 'new' | 'same';

export interface TrackInfo {
  title: string;
  previewUrl?: string;
}

export interface Artist {
  id: string;
  name: string;
  imageUrl?: string;
  deezerUrl?: string;
  genre?: string;
  listeners: number;
  trend: TrendDirection;
  topTracks: TrackInfo[];
}

export interface CountryEntry {
  code: string;
  name: string;
  lat: number;
  lng: number;
  lastfmName?: string;
  pop?: number;
  areaDeg2?: number;
  artists: Artist[]; // up to 5 per country, sorted by listeners
}

export interface DataFile {
  updatedAt: string;
  countries: CountryEntry[];
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
