import * as THREE from 'three';

/**
 * Converts Geographic Latitude and Longitude to 3D Cartesian Coordinates on a Sphere.
 *
 * For standard equirectangular sphere textures in Three.js (e.g. NASA Blue Marble):
 * - Latitude: -90° (South Pole) to +90° (North Pole)
 * - Longitude: -180° (West) to +180° (East)
 *
 * In standard Three.js SphereGeometry:
 * - phi = (90 - lat) * (Math.PI / 180)
 * - theta = (lng + 180) * (Math.PI / 180)
 *
 * With standard orientation, Greenwich (lng 0) aligns with the texture seam/center.
 */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number,
  altitudeOffset = 0
): THREE.Vector3 {
  const r = radius + altitudeOffset;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.cos(phi);
  const z = r * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

/**
 * Converts a 3D Cartesian Coordinate on a sphere back to Latitude and Longitude.
 * Exact inverse of latLngToVector3.
 */
export function vector3ToLatLng(x: number, y: number, z: number): { lat: number; lng: number } {
  const r = Math.sqrt(x * x + y * y + z * z);
  if (r === 0) return { lat: 0, lng: 0 };

  const phi = Math.acos(Math.max(-1, Math.min(1, y / r)));
  const lat = 90 - (phi * 180) / Math.PI;

  let theta = Math.atan2(z, -x);
  if (theta < 0) theta += 2 * Math.PI;
  let lng = (theta * 180) / Math.PI - 180;
  if (lng > 180) lng -= 360;

  return { lat, lng };
}

/**
 * Calculates a ring of coordinates around a central lat/lng coordinate on the sphere.
 * Spreads up to `count` points evenly in a circle on the tangent plane of the sphere.
 */
export function getRingPositions(
  centerLat: number,
  centerLng: number,
  radius: number,
  count: number,
  spreadAngle = 2.0, // degrees spread from centroid
  altitudeOffset = 0.02
): THREE.Vector3[] {
  if (count <= 1) {
    return [latLngToVector3(centerLat, centerLng, radius, altitudeOffset)];
  }

  const positions: THREE.Vector3[] = [];
  const angleStep = (2 * Math.PI) / count;

  for (let i = 0; i < count; i++) {
    const angle = i * angleStep;
    // Offset lat and lng slightly based on angle and spread
    // Adjust longitude offset by cosine of latitude to keep circle spherical
    const latOffset = spreadAngle * Math.cos(angle);
    const lngOffset = (spreadAngle / Math.max(0.2, Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle);

    const lat = Math.max(-85, Math.min(85, centerLat + latOffset));
    const lng = centerLng + lngOffset;

    positions.push(latLngToVector3(lat, lng, radius, altitudeOffset));
  }

  return positions;
}
