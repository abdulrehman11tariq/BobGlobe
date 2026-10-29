export type TrendDirection = 'up' | 'down' | 'new' | 'same';

export interface Track {
  id: string | number;
  title: string;
  duration?: number;
  previewUrl?: string;
  link?: string;
}

export interface Artist {
  id: string;
  name: string;
  listeners: number;
  playcount?: number;
  pictureUrl?: string;
  deezerUrl?: string;
  previewUrl?: string;
  topTracks?: Track[];
  trend: TrendDirection;
  rank: number;
  genre?: string;
}

export interface CountryData {
  country: string;
  code: string;
  lat: number;
  lng: number;
  artists: Artist[];
}

export interface GlobeData {
  lastUpdated: string;
  totalCountries: number;
  countries: Record<string, CountryData>;
  globalTop?: Artist[];
}

export interface LatLng {
  lat: number;
  lng: number;
}
