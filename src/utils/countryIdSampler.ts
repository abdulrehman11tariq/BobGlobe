import { EARTH_CONFIG } from '../theme/earthConfig';

/**
 * Country ID Texture Sampler (CPU-side offscreen lookup only)
 * Texture: /textures/country_id_4096.png (1024x512 8-bit PNG)
 * Pixel value (Red channel) = country id from src/data/countries.json (1..136)
 * 0 = Water / unassigned
 */

let idData: Uint8ClampedArray | null = null;
let idWidth = 0;
let idHeight = 0;
let loadPromise: Promise<void> | null = null;

export function isCountryIdMaskReady(): boolean {
  return idData !== null && idWidth > 0 && idHeight > 0;
}

export function setCountryIdData(data: Uint8ClampedArray, width: number, height: number): void {
  idData = data;
  idWidth = width;
  idHeight = height;
}

/**
 * Loads the country ID map into an offscreen canvas and extracts pixel buffer
 */
export function loadCountryIdMask(url = '/textures/country_id_4096.png'): Promise<void> {
  if (idData) return Promise.resolve();
  if (loadPromise) return loadPromise;

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
            idData = imgData.data;
            idWidth = canvas.width;
            idHeight = canvas.height;
          }
        } catch (e) {
          console.warn('[countryIdSampler] Could not read offscreen country ID canvas:', e);
        }
        resolve();
      };
      img.onerror = (err) => {
        console.warn('[countryIdSampler] Failed to load country ID texture:', err);
        resolve();
      };
    });
    return loadPromise;
  }

  return Promise.resolve();
}

/**
 * Returns the country ID (0..136) at given (lat, lng)
 * Equirectangular:
 * Longitude: -180 (left) to 180 (right)
 * Latitude: 90 (top) to -90 (bottom)
 */
export function getCountryIdAt(lat: number, lng: number): number {
  if (!idData || idWidth === 0 || idHeight === 0) {
    return 0;
  }

  const v = Math.min(1.0, Math.max(0.0, (90 - lat) / 180));
  let u = (lng + 180) / 360;
  u = ((u % 1) + 1) % 1; // Wrap longitude horizontally

  const px = Math.min(idWidth - 1, Math.max(0, Math.floor(u * idWidth)));
  const py = Math.min(idHeight - 1, Math.max(0, Math.floor(v * idHeight)));

  const idx = (py * idWidth + px) * 4;
  return idData[idx]; // Red channel contains the 8-bit integer country ID
}

/**
 * Calculates accurate spherical destination point from (lat, lng) given angular distance (degrees) and bearing
 */
export function getSpherePoint(
  latDeg: number,
  lngDeg: number,
  thetaDeg: number,
  bearingRad: number
): { lat: number; lng: number } {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const lat1 = latDeg * toRad;
  const lng1 = lngDeg * toRad;
  const delta = thetaDeg * toRad;

  const sinLat2 =
    Math.sin(lat1) * Math.cos(delta) +
    Math.cos(lat1) * Math.sin(delta) * Math.cos(bearingRad);
  const lat2 = Math.asin(Math.max(-1, Math.min(1, sinLat2)));
  const y = Math.sin(bearingRad) * Math.sin(delta) * Math.cos(lat1);
  const x = Math.cos(delta) - Math.sin(lat1) * Math.sin(lat2);
  const lng2 = lng1 + Math.atan2(y, x);

  let finalLng = (lng2 * toDeg) % 360;
  if (finalLng > 180) finalLng -= 360;
  if (finalLng < -180) finalLng += 360;

  return { lat: Math.max(-89.9, Math.min(89.9, lat2 * toDeg)), lng: finalLng };
}

/**
 * Calculates great-circle arc distance between two points on the globe surface
 */
export function greatCircleDist(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  planetRadius = EARTH_CONFIG.PLANET_RADIUS
): number {
  const toRad = Math.PI / 180;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const dphi = (lat2 - lat1) * toRad;
  const dlambda = (lng2 - lng1) * toRad;

  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * (Math.sin(dlambda / 2) ** 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return planetRadius * c;
}

/**
 * Validates that a blob's footprint is 100% inside its own country.
 * Samples:
 * 1. Center (lat, lng)
 * 2. 8 evenly spaced points on the outer circle at thetaDeg
 * 3. 8 evenly spaced points on the inner circle at 0.6 * thetaDeg
 * Total = 17 samples. All 17 MUST equal countryId.
 */
export function validateBlobFootprint(
  lat: number,
  lng: number,
  radiusWorld: number,
  countryId: number,
  planetRadius = EARTH_CONFIG.PLANET_RADIUS
): boolean {
  // Center check
  if (getCountryIdAt(lat, lng) !== countryId) {
    return false;
  }

  // Angular radius in degrees
  const thetaDeg = (radiusWorld / planetRadius) * (180 / Math.PI);

  // Outer ring (100% radius) and Inner ring (60% radius)
  const rings = [thetaDeg, thetaDeg * 0.6];
  for (const rDeg of rings) {
    for (let i = 0; i < 8; i++) {
      const bearing = (i * Math.PI) / 4;
      const pt = getSpherePoint(lat, lng, rDeg, bearing);
      if (getCountryIdAt(pt.lat, pt.lng) !== countryId) {
        return false;
      }
    }
  }

  return true;
}
