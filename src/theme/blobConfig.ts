/**
 * Blob Configuration & Sizing Constants
 */
export const BLOB_CONFIG = {
  // Global Sizing Boost (Change this to scale all blobs up or down uniformly)
  BLOB_SIZE_BOOST: 1.5,       // Tuned from 2.0 to 1.5 for optimal international coverage
  GLOBAL_SIZE_SCALE: 1.5,     // Alias for BLOB_SIZE_BOOST

  // Sizing parameters (base values prior to BLOB_SIZE_BOOST)
  MIN_RADIUS: 0.038,       // Minimum blob radius (~1.5% of planet radius)
  MAX_RADIUS: 0.105,       // Maximum blob radius for #1 global artist (~4.2% of planet radius)
  COUNTRY_WEIGHT_STRENGTH: 0.5, // 0.5 weight balancing in-country dominance vs global market power

  // Placement & Spacing
  RING_SPACING_FACTOR: 1.35,  // Multiplier on (r1 + r2) to ensure clean air gap between blobs
  MIN_RING_RADIUS: 0.12,      // Minimum distance of peripheral blobs from center
  ISLAND_SNAP_RADIUS: 4.5,    // Degree radius to search for solid land for island countries

  // Phase 3.5 Scatter Constants
  GAP: 0.005,                 // Reduced clearance gap for tighter deterministic packing
  SHRINK_FLOOR: 0.20,         // Extended shrink limit for narrow/island nations
  HARD_MIN_RADIUS: 0.008,     // Sensible minimum on-screen size for guaranteed #1 placement
  JITTER_MAX_FACTOR: 0.15,    // Subtle organic jitter (up to 15% of blob radius, only if footprint passes)

  // Spring animation
  SPRING_TENSION: 180,
  SPRING_FRICTION: 18,

  // Camera fly-to distances
  CAMERA_FOCUS_DISTANCE: 1.15, // Distance from blob center when clicking to focus
  CAMERA_FLY_DURATION: 0.85,   // Seconds for smooth camera transition

  // Color palette for plain spheres (Phase 2)
  BLOB_COLORS: [
    '#f472b6', // Coral Pink
    '#38bdf8', // Sky Cyan
    '#fbbf24', // Sun Amber
    '#a855f7', // Electric Violet
    '#34d399', // Mint Emerald
    '#fb7185', // Rose Peach
    '#818cf8', // Indigo Blue
  ],
} as const;

/**
 * Country Outline on Hover Configuration
 */
export const BORDER_OUTLINE_CONFIG = {
  NAVY_COLOR: '#1B2A5C',       // Solid navy outline color
  NAVY_WIDTH: 3,               // Line width for navy line (in pixels)
  WHITE_COLOR: '#FFFFFF',      // High-contrast white border underneath
  WHITE_WIDTH: 5,              // Slightly wider white line underneath
  OFFSET_RATIO: 0.004,         // 0.4% of planet radius (0.010 world units for R=2.5)
  NAVY_OFFSET: 0.010,          // Surface radius + 0.010
  WHITE_OFFSET: 0.009,         // Surface radius + 0.009 (underneath navy)
  DENSIFY_MAX_STEP_DEG: 0.5,   // Maximum degree step for segment densification
  POP_IN_DURATION_MS: 0,       // Instant flush display (no underground lag)
  LEAVE_DELAY_MS: 50,          // Snappy delay before hiding outline
  CACHE_MAX_COUNTRIES: 150,    // Cache all 136 countries permanently in memory
} as const;

/**
 * Audio Engine Tuning Constants (Part B)
 */
export const AUDIO_CONFIG = {
  HOVER_DELAY_MS: 350,         // 350ms rest before audio begins fading in
  FADE_IN_MS: 300,            // ~300ms fade in duration
  FADE_OUT_MS: 250,           // ~250ms fade out duration
  DEFAULT_VOLUME: 0.6,        // Default volume (0.0 to 1.0)
  BEAT_BPM: 100,              // Fixed 100 BPM beat clock for dance & equalizer
  COUNTRY_WEIGHT_STRENGTH: 0.5, // Equal weight to local rank vs global market score
} as const;

export type BlobConfig = typeof BLOB_CONFIG;
export type BorderOutlineConfig = typeof BORDER_OUTLINE_CONFIG;
export type AudioConfig = typeof AUDIO_CONFIG;
