/**
 * Earth & Map Configuration
 * Texture: world_map_4096.png (Equirectangular, -180 to 180 left to right, 90 to -90 top to bottom)
 * Mask: land_mask_4096.png (White = land, Black = water)
 * HARD RULE: ZERO TRANSPARENCY IN 3D (All materials transparent: false, depthWrite: true)
 */

export const EARTH_CONFIG = {
  // Planet Geometry
  PLANET_RADIUS: 2.5,
  SPHERE_SEGMENTS: 192,            // 192x192 smooth sphere
  LAND_ELEVATION: 0.02,            // Slight height lift for land vertices/blobs (0.8% of radius)

  // Colors & Outline
  colors: {
    ocean: '#3FA7D6',
    land: '#7BC96F',
    outline: '#1a365d',            // Solid dark-blue cartoon outline
  },

  // Inverted-hull outline scale
  OUTLINE_SCALE: 1.018,            // 1.8% thicker solid inverted-hull outline

  // Opaque 3D Puffy Clouds
  clouds: {
    count: 12,                     // 10 to 14 solid puffy clouds
    altitude: 2.535,               // Floating just above the surface
    speedMin: 0.005,
    speedMax: 0.012,
    hideDistance: 3.5,             // Distance where clouds instantly hide (no fade)
  },

  // Solid Simple Background & Stars
  space: {
    gradientTop: '#0f172a',        // Deep indigo
    gradientBottom: '#2e1065',     // Soft purple-blue
    starCount: 350,                // A few hundred pure white opaque star dots
  },

  // Lighting (Warm directional key + strong hemisphere fill -> NO dark side!)
  lighting: {
    keySunPosition: [8, 6, 8] as [number, number, number],
    keySunIntensity: 1.5,
    keySunColor: '#fff9e6',        // Soft warm key
    hemiSkyColor: '#dbeafe',       // Strong bright sky fill
    hemiGroundColor: '#bbf7d0',    // Bright ground bounce
    hemiIntensity: 1.1,            // Keeps every side bright
    blobKeyIntensity: 1.3,         // Dedicated blob lighting
  },

  // Textures
  textures: {
    worldMap: '/textures/world_map_4096.png',
    worldMapLow: '/textures/world_map_2048.png',
    landMask: '/textures/land_mask_4096.png',
    mask: '/textures/land_mask_4096.png',
    topology: '/textures/earth_topology.png',
  },
} as const;

export type EarthConfig = typeof EARTH_CONFIG;
