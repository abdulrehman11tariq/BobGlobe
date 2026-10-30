/**
 * Blob Configuration & Sizing Constants
 */
export const BLOB_CONFIG = {
  // Sizing parameters
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
  GLOBAL_SIZE_SCALE: 1.0,     // Constant global sizeScale

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

export type BlobConfig = typeof BLOB_CONFIG;
