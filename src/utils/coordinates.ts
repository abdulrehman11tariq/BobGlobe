import * as THREE from 'three';

/**
 * Single source of truth for converting Geographic Latitude and Longitude
 * to 3D Cartesian Coordinates on a Sphere.
 *
 * Matches Three.js SphereGeometry UV mapping exactly:
 * - phi = degToRad(90 - lat)
 * - theta = degToRad(lng + 180)
 *
 * x = -r * sin(phi) * cos(theta)
 * y =  r * cos(phi)
 * z =  r * sin(phi) * sin(theta)
 */
export function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

/**
 * Backward-compatible alias for existing callers.
 */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number,
  altitudeOffset = 0
): THREE.Vector3 {
  return latLngToVec3(lat, lng, radius + altitudeOffset);
}

/**
 * Converts a 3D Cartesian Coordinate on a sphere back to Latitude and Longitude.
 * Exact inverse of latLngToVec3.
 */
export function vector3ToLatLng(x: number, y: number, z: number): { lat: number; lng: number } {
  const r = Math.sqrt(x * x + y * y + z * z);
  if (r === 0) return { lat: 0, lng: 0 };

  const phi = Math.acos(Math.max(-1, Math.min(1, y / r)));
  const lat = 90 - THREE.MathUtils.radToDeg(phi);

  let theta = Math.atan2(z, -x);
  if (theta < 0) theta += 2 * Math.PI;
  let lng = THREE.MathUtils.radToDeg(theta) - 180;
  if (lng > 180) lng -= 360;

  return { lat, lng };
}
