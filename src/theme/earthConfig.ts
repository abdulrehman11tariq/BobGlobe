/**
 * Simple Green + Blue Cartoon Earth Tuning Configuration
 * HARD RULE: ZERO TRANSPARENCY IN 3D (All materials transparent: false, depthWrite: true)
 */

export const EARTH_CONFIG = {
  // Planet Geometry
  PLANET_RADIUS: 2.5,
  SPHERE_SEGMENTS: 192,            // 192x192 smooth sphere

  // Two Main Colors + Accents (Toon Hard-Edged Bands)
  colors: {
    ocean: '#3FA7D6',              // Solid friendly blue
    oceanShallow: '#6CC4EC',       // Lighter blue shallow coast band
    land: '#7BC96F',               // Solid fresh green
    mountain: '#5FB35A',           // Darker green for high ground/mountains
    sand: '#F2E2A0',               // Light sand-yellow coastline strip
    pole: '#FFFFFF',               // Solid white polar caps
    poleLatitude: 75,              // Latitude threshold for polar ice caps
    outline: '#1a365d',            // Solid dark-blue cartoon outline
  },

  // Surface Relief
  RELIEF_BUMP_STRENGTH: 0.15,      // Very gentle elevation bump (faintly visible)
  DISPLACEMENT_SCALE: 0.024,       // Subtle mountain relief displacement
  OUTLINE_SCALE: 1.018,            // 1.8% thicker solid inverted-hull outline

  // Opaque 3D Puffy Clouds
  clouds: {
    count: 12,                     // 10 to 14 solid puffy clouds
    altitude: 2.525,               // Floating just above the surface
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
    mask: '/textures/earth_specular.jpg',
    topology: '/textures/earth_topology.png',
  },
} as const;

export type EarthConfig = typeof EARTH_CONFIG;
