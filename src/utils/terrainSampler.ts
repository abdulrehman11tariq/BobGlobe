import * as THREE from 'three';
import { EARTH_CONFIG } from '../theme/earthConfig';

/**
 * Land Mask Sampler
 * Texture: /textures/land_mask_4096.png (or fallback canvas)
 * White (255) = Land
 * Black (0) = Water
 */
let maskData: Uint8ClampedArray | null = null;
let maskWidth = 0;
let maskHeight = 0;
let loadPromise: Promise<void> | null = null;

// Backward-compatibility stubs for earlier low-poly phase components
export const sampleLandOceanMask = (lat: number, lng: number): number => 1.0 - sampleLandMask(lat, lng);
export const initLandOceanMask = (_img: unknown): void => {};
export const getBiomeInfo = (_lat: number, _lng: number, _faceId?: number) => ({
  color: new THREE.Color('#7BC96F'),
  elevation: 0,
  isLand: true,
  isBeach: false,
  isSnow: false,
  isDesert: false,
});

/**
 * Initializes the land mask from an Image / Canvas or loads /textures/land_mask_4096.png.
 */
export function loadLandMask(url = EARTH_CONFIG.textures.landMask): Promise<void> {
  if (maskData) return Promise.resolve();
  if (loadPromise) return loadPromise;

  // Check if running in browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    loadPromise = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            maskData = imgData.data;
            maskWidth = canvas.width;
            maskHeight = canvas.height;
          }
        } catch (e) {
          console.warn('[terrainSampler] Could not read land mask canvas:', e);
        }
        resolve();
      };
      img.onerror = (err) => {
        console.warn('[terrainSampler] Failed to load land mask image:', err);
        resolve();
      };
    });
    return loadPromise;
  }

  // Node environment fallback (for CLI scripts / tests)
  return Promise.resolve();
}

/**
 * Allows setting mask data directly (e.g. from Node tests or pre-decoded buffer).
 */
export function setLandMaskData(data: Uint8ClampedArray, width: number, height: number): void {
  maskData = data;
  maskWidth = width;
  maskHeight = height;
}

export function isLandMaskReady(): boolean {
  return maskData !== null && maskWidth > 0 && maskHeight > 0;
}

/**
 * Returns raw brightness at (lat, lng): 0.0 (Water) to 1.0 (Land).
 * Equirectangular:
 * Longitude: -180 (left) to 180 (right)
 * Latitude: 90 (top) to -90 (bottom)
 */
export function sampleLandMask(lat: number, lng: number): number {
  if (!maskData || maskWidth === 0 || maskHeight === 0) {
    return 1.0; // Default to land before mask loads
  }

  const v = Math.min(1.0, Math.max(0.0, (90 - lat) / 180));
  let u = (lng + 180) / 360;
  u = ((u % 1) + 1) % 1; // Wrap longitude horizontally

  const px = Math.min(maskWidth - 1, Math.max(0, Math.floor(u * maskWidth)));
  const py = Math.min(maskHeight - 1, Math.max(0, Math.floor(v * maskHeight)));

  const idx = (py * maskWidth + px) * 4;
  return maskData[idx] / 255.0;
}

/**
 * Returns true if (lat, lng) is on land according to land_mask_4096.png.
 * White = land (> 128), Black = water (<= 128).
 */
export function isLand(lat: number, lng: number, threshold = 0.5): boolean {
  return sampleLandMask(lat, lng) >= threshold;
}

/**
 * Calculates the exact surface radius at any given lat, lng.
 * Water = base radius (2.5)
 * Land = base radius + a small height from the mask/elevation (2.52)
 */
export function getSurfaceRadius(lat: number, lng: number): number {
  const rBase = EARTH_CONFIG.PLANET_RADIUS;
  if (isLand(lat, lng)) {
    return rBase + EARTH_CONFIG.LAND_ELEVATION;
  }
  return rBase;
}

/**
 * Snaps a coordinate to the nearest land pixel if it happens to be on water.
 */
export function snapToNearestLand(
  lat: number,
  lng: number,
  searchRadius = 1.0
): { lat: number; lng: number } {
  if (isLand(lat, lng)) {
    return { lat, lng };
  }

  let bestLat = lat;
  let bestLng = lng;
  let maxMaskVal = -1;

  const steps = 12;
  const stepSize = searchRadius / steps;

  for (let r = stepSize; r <= searchRadius; r += stepSize) {
    const angleCount = Math.max(8, Math.floor(r * 8));
    for (let a = 0; a < angleCount; a++) {
      const angle = (a / angleCount) * Math.PI * 2;
      const testLat = Math.max(-85, Math.min(85, lat + Math.sin(angle) * r));
      const cosLat = Math.max(0.15, Math.cos((testLat * Math.PI) / 180));
      const testLng = lng + (Math.cos(angle) * r) / cosLat;

      const maskVal = sampleLandMask(testLat, testLng);
      if (maskVal > maxMaskVal) {
        maxMaskVal = maskVal;
        bestLat = testLat;
        bestLng = testLng;
        if (maskVal >= 0.5) {
          return { lat: bestLat, lng: bestLng };
        }
      }
    }
  }

  return { lat: bestLat, lng: bestLng };
}
