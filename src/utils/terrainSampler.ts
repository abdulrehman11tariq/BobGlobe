import * as THREE from 'three';
import { GLOBE_CONFIG } from '../theme/constants';
import { EARTH_CONFIG } from '../theme/earthConfig';
import { PALETTE } from '../theme/palette';
import { latLngToVector3 } from './coordinates';

/**
 * 3D Simplex / Value Noise implementation for smooth rolling hills.
 */
function hash(x: number, y: number, z: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 912345671);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function noise3D(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);

  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;

  const ux = smoothstep(fx);
  const uy = smoothstep(fy);
  const uz = smoothstep(fz);

  const n000 = hash(ix, iy, iz);
  const n100 = hash(ix + 1, iy, iz);
  const n010 = hash(ix, iy + 1, iz);
  const n110 = hash(ix + 1, iy + 1, iz);
  const n001 = hash(ix, iy, iz + 1);
  const n101 = hash(ix + 1, iy, iz + 1);
  const n011 = hash(ix, iy + 1, iz + 1);
  const n111 = hash(ix + 1, iy + 1, iz + 1);

  const x00 = n000 + ux * (n100 - n000);
  const x10 = n010 + ux * (n110 - n010);
  const x01 = n001 + ux * (n101 - n001);
  const x11 = n011 + ux * (n111 - n011);

  const y0 = x00 + uy * (x10 - x00);
  const y1 = x01 + uy * (x11 - x01);

  return y0 + uz * (y1 - y0);
}

/**
 * Multi-octave fractal brownian motion (fBm) for natural terrain elevations.
 */
export function getTerrainNoise(x: number, y: number, z: number, scale = GLOBE_CONFIG.NOISE_SCALE): number {
  const nx = x * scale;
  const ny = y * scale;
  const nz = z * scale;

  let total = 0;
  total += noise3D(nx, ny, nz) * 0.65;
  total += noise3D(nx * 2.2, ny * 2.2, nz * 2.2) * 0.25;
  total += noise3D(nx * 4.4, ny * 4.4, nz * 4.4) * 0.10;

  return total;
}

/**
 * Singleton state storing sampled specular land/ocean mask pixels.
 */
let maskData: Uint8ClampedArray | null = null;
let maskWidth = 0;
let maskHeight = 0;

/**
 * Initializes the land/ocean mask from an HTMLImageElement or Canvas.
 */
export function initLandOceanMask(img: HTMLImageElement | HTMLCanvasElement): void {
  const canvas = document.createElement('canvas');
  // 512x256 is optimal: instant to parse and accurate enough for continent & island silhouettes
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  maskData = imgData.data;
  maskWidth = canvas.width;
  maskHeight = canvas.height;
}

/**
 * Returns raw mask brightness at (lat, lng): 0.0 (Land) to 1.0 (Ocean).
 */
export function sampleLandOceanMask(lat: number, lng: number): number {
  if (!maskData || maskWidth === 0 || maskHeight === 0) {
    // Fallback if mask not yet initialized: assume sea level
    return 0.5;
  }

  // Latitude: 90 (top, v=0) to -90 (bottom, v=1)
  const v = (90 - lat) / 180;
  // Longitude: -180 (left, u=0) to +180 (right, u=1)
  let u = (lng + 180) / 360;
  u = ((u % 1) + 1) % 1; // Wrap horizontally

  const px = Math.min(maskWidth - 1, Math.max(0, Math.floor(u * maskWidth)));
  const py = Math.min(maskHeight - 1, Math.max(0, Math.floor(v * maskHeight)));

  const idx = (py * maskWidth + px) * 4;
  // White in specular map = ocean (~255), Black = land (~0)
  return maskData[idx] / 255.0;
}

/**
 * Returns true if the coordinate is on land.
 */
export function isLand(lat: number, lng: number, threshold = 0.45): boolean {
  return sampleLandOceanMask(lat, lng) < threshold;
}

/**
 * Shared function: calculates the exact surface radius at any given lat, lng.
 * Blobs, trees, rocks, and UI markers use this so they sit flush on the low-poly terrain.
 */
export function getSurfaceRadius(lat: number, lng: number): number {
  const mask = sampleLandOceanMask(lat, lng);
  const rBase = EARTH_CONFIG.PLANET_RADIUS;

  if (mask < 0.45) {
    // Land vertex: elevated hills & mountain relief matching the bump displacement
    const v = latLngToVector3(lat, lng, 1.0);
    const noise = getTerrainNoise(v.x, v.y, v.z);
    
    // Smooth coastline transition
    const coastFactor = Math.min(1.0, Math.max(0.0, (0.45 - mask) / GLOBE_CONFIG.COASTLINE_WIDTH));
    const elevation = EARTH_CONFIG.DISPLACEMENT_SCALE * (0.35 + 0.65 * noise) * coastFactor;
    return rBase + elevation;
  } else {
    // Ocean sits at base sea level
    return rBase;
  }
}

export interface BiomeInfo {
  color: THREE.Color;
  elevation: number;
  isLand: boolean;
  isBeach: boolean;
  isSnow: boolean;
  isDesert: boolean;
}

/**
 * Determines biome characteristics and color for a specific face or coordinate.
 */
export function getBiomeInfo(lat: number, lng: number, faceId = 0): BiomeInfo {
  const mask = sampleLandOceanMask(lat, lng);
  const isLandArea = mask < 0.45;
  const absLat = Math.abs(lat);

  if (!isLandArea) {
    // Ocean
    const shallow = mask < 0.55;
    const oceanColor = new THREE.Color(shallow ? PALETTE.water.shallow : PALETTE.water.deep);
    // Subtle face variation
    oceanColor.offsetHSL(0, 0, ((faceId % 5) - 2) * 0.012);
    return {
      color: oceanColor,
      elevation: -GLOBE_CONFIG.OCEAN_DEPTH,
      isLand: false,
      isBeach: false,
      isSnow: false,
      isDesert: false,
    };
  }

  // Land
  const v = latLngToVector3(lat, lng, 1.0);
  const noise = getTerrainNoise(v.x, v.y, v.z);
  const coastDist = (0.45 - mask) / GLOBE_CONFIG.COASTLINE_WIDTH;
  const coastFactor = Math.min(1.0, Math.max(0.0, coastDist));
  const elevation = GLOBE_CONFIG.TERRAIN_HEIGHT * noise * (0.3 + 0.7 * coastFactor);

  // 1. Polar Snow caps
  if (absLat > GLOBE_CONFIG.POLAR_SNOW_LAT) {
    const snowColor = new THREE.Color(faceId % 2 === 0 ? PALETTE.terrain.snow : PALETTE.terrain.snowTint);
    return {
      color: snowColor,
      elevation,
      isLand: true,
      isBeach: false,
      isSnow: true,
      isDesert: false,
    };
  }

  // 2. Sandy coastline strip
  if (mask >= 0.38 && mask < 0.45 && absLat < 60) {
    const sandColor = new THREE.Color(PALETTE.terrain.sand);
    sandColor.offsetHSL(0, 0, ((faceId % 3) - 1) * 0.015);
    return {
      color: sandColor,
      elevation,
      isLand: true,
      isBeach: true,
      isSnow: false,
      isDesert: false,
    };
  }

  // 3. Desert regions (Sahara, Arabian Peninsula, Australian Outback)
  const isDesertRegion =
    (lat >= GLOBE_CONFIG.DESERT_LAT_MIN && lat <= GLOBE_CONFIG.DESERT_LAT_MAX && lng >= -15 && lng <= 60) ||
    (lat <= -20 && lat >= -30 && lng >= 115 && lng <= 145);

  if (isDesertRegion) {
    const desertColor = new THREE.Color(
      faceId % 3 === 0 ? PALETTE.terrain.desertDune : PALETTE.terrain.desert
    );
    desertColor.offsetHSL(0, 0, ((faceId % 4) - 1.5) * 0.015);
    return {
      color: desertColor,
      elevation,
      isLand: true,
      isBeach: false,
      isSnow: false,
      isDesert: true,
    };
  }

  // 4. Highlands and Mountain Peaks
  if (elevation > GLOBE_CONFIG.TERRAIN_HEIGHT * 0.78) {
    const highlandColor = new THREE.Color(PALETTE.terrain.highlands);
    return {
      color: highlandColor,
      elevation,
      isLand: true,
      isBeach: false,
      isSnow: false,
      isDesert: false,
    };
  }

  // 5. Lush Grassland
  const grassPalette = PALETTE.terrain.greens;
  const pickedColor = grassPalette[Math.abs(faceId) % grassPalette.length];
  const color = new THREE.Color(pickedColor);
  // Slight facet variation to enhance low-poly beauty
  color.offsetHSL(0, 0, ((faceId % 5) - 2) * 0.02);

  return {
    color,
    elevation,
    isLand: true,
    isBeach: false,
    isSnow: false,
    isDesert: false,
  };
}
