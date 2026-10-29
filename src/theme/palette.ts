/**
 * BobGlobe Visual Theme Palette
 * Stylized, bright, low-poly, and cheerful color definitions.
 * Tweak any color here to adjust the entire world aesthetic.
 */

export const PALETTE = {
  // Sky & Environment
  sky: {
    gradientTop: '#3b8ecc',     // Rich soft sky blue
    gradientMiddle: '#7bc8f6',  // Bright cheerful sky
    gradientBottom: '#d6f0fd',  // Pale pastel cyan horizon
    fog: '#cae9fa',             // Atmospheric distance blend
  },

  // Ocean & Water
  water: {
    deep: '#158390',            // Deep ocean bed
    shallow: '#2cc0b9',         // Vibrant coastal turquoise
    surface: '#45dbd4',         // Translucent water surface layer
    shoreFoam: '#bbfdf3',       // Sandy beach foam line
  },

  // Terrain Palette
  terrain: {
    sand: '#fae39b',            // Warm golden coastline sand
    greens: [
      '#56c54a',                // Vibrant meadow green
      '#48b33d',                // Medium valley green
      '#6cdb5a',                // Sunny lime meadow
      '#3f9f35',                // Forest green
    ],
    highlands: '#85ec6d',       // Lighter sunny hilltop
    rockyHills: '#8091a1',      // Exposed rock faces on steep ridges
    snow: '#ffffff',            // Polar icecaps & mountain summits
    snowTint: '#ebf6fd',        // Slight icy shadow
    desert: '#e5ad5b',          // Warm Sahara / Australian outback
    desertDune: '#cf9745',      // Warm desert ridge
  },

  // Vegetation
  vegetation: {
    trunk: '#6d4529',           // Woody bark
    trunkAcacia: '#7b5336',     // Savannah acacia bark
    roundCanopy: [
      '#46b53e',
      '#5ccb48',
      '#399f34',
    ],
    acaciaCanopy: [
      '#72bd2c',
      '#8bc435',
      '#63a925',
    ],
    blossomCanopy: [
      '#ffa0cb',                // Cherry blossom pink
      '#ffb5d7',                // Pastel blossom
      '#f584b4',                // Rose bloom
    ],
    bush: [
      '#3eaf40',
      '#53c246',
      '#339735',
    ],
  },

  // Rocks & Stones
  rock: [
    '#808f9f',
    '#97a7b7',
    '#6c7a89',
    '#a8b7c5',
  ],

  // Clouds
  cloud: {
    base: '#ffffff',            // Pure puffy white
    shadow: '#e4f1fc',          // Pale blue undershadow
  },

  // Floating Islets
  islet: {
    grass: '#56c54a',           // Lush islet surface
    rock: '#6b472e',            // Faceted inverted rocky underside
    rockLight: '#805739',
  },

  // Lighting Colors
  lighting: {
    hemiSky: '#c6e8ff',         // Sky illumination
    hemiGround: '#98e59b',      // Grass upward bounce
    sun: '#fff9ed',             // Warm sunlight
  },
} as const;

export type ThemePalette = typeof PALETTE;
