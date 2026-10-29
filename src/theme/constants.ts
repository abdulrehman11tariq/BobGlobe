/**
 * BobGlobe World Tuning Constants
 * Easily adjust terrain height, vegetation density, clouds, and islet counts here.
 */
export const GLOBE_CONFIG = {
  // Base Planet Geometry
  PLANET_RADIUS: 2.5,          // Base radius of the planet (Three.js units)
  ICOSPHERE_DETAIL: 5,         // Icosphere subdivision detail (5 = ~20,480 faces, sweet spot for 60fps flat-shading)
  
  // Terrain Displacement & Elevation
  TERRAIN_HEIGHT: 0.14,        // Max height displacement for land hills
  OCEAN_DEPTH: 0.045,          // Inward dip for deep ocean trenches
  NOISE_SCALE: 3.5,            // Spatial frequency of rolling hills
  COASTLINE_WIDTH: 0.06,       // Width of the sandy beach transition zone
  POLAR_SNOW_LAT: 66,          // Latitude threshold above/below which ice caps form
  DESERT_LAT_MIN: 14,          // Latitude start for warm desert biomes
  DESERT_LAT_MAX: 32,          // Latitude end for warm desert biomes

  // Water Layer
  WATER_RADIUS: 2.502,         // Translucent sea-level sphere radius
  WATER_OPACITY: 0.62,         // Water surface translucency (0 = invisible, 1 = opaque)

  // Flora & Vegetation
  TREE_COUNT: 420,             // Total instanced trees on land
  TREE_SCALE_MIN: 0.055,       // Min tree scale
  TREE_SCALE_MAX: 0.095,       // Max tree scale
  BLOSSOM_TREE_RATIO: 0.22,    // Proportion of trees that are pink blossom canopies
  ACACIA_TREE_RATIO: 0.35,     // Proportion of trees that are flat-topped acacia style
  BLOB_CLEARANCE_RADIUS: 0.34, // Minimum distance kept clear around blob coordinates for trees/rocks

  // Foliage & Rocks
  BUSH_COUNT: 220,             // Total small ground bushes
  ROCK_COUNT: 180,             // Total scattered low-poly stones

  // Sky & Atmosphere
  CLOUD_COUNT: 24,             // Number of puffy low-poly cloud clusters
  CLOUD_SHELL_RADIUS_MIN: 3.05,// Min altitude of floating clouds
  CLOUD_SHELL_RADIUS_MAX: 3.35,// Max altitude of floating clouds
  CLOUD_SPEED: 0.04,           // Drift speed of clouds around the planet

  // Floating Islets
  ISLET_COUNT: 5,              // Number of mini orbiting floating rock islands
  ISLET_ORBIT_RADIUS_MIN: 3.6, // Min distance of islets from center
  ISLET_ORBIT_RADIUS_MAX: 4.3, // Max distance of islets from center
  ISLET_SCALE_MIN: 0.16,       // Min scale of floating islet
  ISLET_SCALE_MAX: 0.26,       // Max scale of floating islet
  ISLET_BOB_SPEED: 1.4,        // Gentle idle vertical bobbing speed

  // Determinism
  RNG_SEED: 1337,              // Master seed for deterministic world generation
} as const;
