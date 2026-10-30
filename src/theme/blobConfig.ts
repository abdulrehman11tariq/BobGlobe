/**
 * Blob Configuration & Sizing Constants
 */
export const BLOB_CONFIG = {
  // Global Sizing Boost (Change this to scale all blobs up or down uniformly)
  BLOB_SIZE_BOOST: 2.0,       // 2x larger blobs (tunable single source of truth)
  GLOBAL_SIZE_SCALE: 2.0,     // Alias for BLOB_SIZE_BOOST

  // Sizing parameters (base values prior to BLOB_SIZE_BOOST)
  MIN_RADIUS: 0.038,       // Minimum blob radius for lowest listeners (~1.5% of planet radius)
  MAX_RADIUS: 0.105,       // Maximum blob radius for #1 global artist (~4.2% of planet radius)

  // Placement & Spacing
  RING_SPACING_FACTOR: 1.35,  // Multiplier on (r1 + r2) to ensure clean air gap between blobs
  MIN_RING_RADIUS: 0.12,      // Minimum distance of peripheral blobs from center
  ISLAND_SNAP_RADIUS: 4.5,    // Degree radius to search for solid land for island countries

  // Phase 3.5 Scatter Constants
  GAP: 0.010,                 // Minimum world clearance gap between blob boundaries (dist > rA + rB + GAP)
  SHRINK_FLOOR: 0.28,         // Maximum shrink limit for narrow/island nations (preserves visibility & kawaii details)
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
  POP_IN_DURATION_MS: 150,     // Pop-in animation duration in ms (no transparency)
  LEAVE_DELAY_MS: 100,         // Delay before hiding after pointer leaves blobs
  CACHE_MAX_COUNTRIES: 8,      // Maximum pre-built country borders cached
} as const;

export type BlobConfig = typeof BLOB_CONFIG;
export type BorderOutlineConfig = typeof BORDER_OUTLINE_CONFIG;
