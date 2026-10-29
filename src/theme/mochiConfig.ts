/**
 * Kawaii Mochi Blob Character Tuning Constants
 * Fine-tuned for huge, readable, ultra-adorable facial features.
 */
export const MOCHI_CONFIG = {
  // Body Dimensions (W = 1.0)
  BODY_WIDTH: 1.0,           // W
  BODY_HEIGHT: 0.88,         // Rounder, softer mochi height
  BODY_DEPTH: 0.96,          // Deep, chubby roundness
  BASE_FLATTEN_Y: -0.32,     // Base flattening threshold

  // Inverted-Hull Cartoon Outline
  OUTLINE_SCALE: 1.038,      // Thickness of cartoon silhouette outline
  OUTLINE_COLOR: '#2e1828',  // Soft dark plum/violet outline
  OUTLINE_OPACITY: 1.0,      // Fully opaque

  // Face Proportions (as a fraction of body width W)
  FACE_WIDTH_SPAN: 0.76,     // Whole face spans ~76% of body width (HUGE & clear!)
  EYE_WIDTH: 0.22,           // 0.22 W
  EYE_HEIGHT: 0.28,          // 0.28 W
  EYE_SPACING: 0.42,         // Centers 0.42 W apart (21% left, 21% right of center)
  EYE_Y_POS: -0.10,          // ~40% up from bottom of body
  EYE_LARGE_HIGHLIGHT: 0.35, // Large highlight is ~35% of eye width
  MOUTH_WIDTH: 0.12,         // 0.12 W
  BLUSH_WIDTH: 0.14,         // 0.14 W (just below and outside eyes)
  BLUSH_OPACITY: 1.0,        // 100% solid pink (no transparency)

  // Distance Level of Detail (LOD)
  LOD_FAR_DISTANCE: 4.5,     // Distance at which face starts scaling up
  LOD_MAX_SCALE: 1.40,       // Enlarges face up to 1.4x at planetary camera distances

  // Camera Tracking
  MAX_HEAD_TURN_RAD: 1.22,   // ~70 degrees limit for camera tracking

  // Animation Timings
  BREATHE_SPEED: 2.0,        // Calm breathing frequency
  BREATHE_SQUASH_Y: 0.03,    // Vertical squash amplitude
  BREATHE_STRETCH_XZ: 0.015, // Horizontal stretch amplitude
  BLINK_MIN_INTERVAL: 2.2,   // Min seconds between blinks
  BLINK_MAX_INTERVAL: 5.5,   // Max seconds between blinks
  BLINK_DURATION: 0.12,      // 0.12 seconds eye squash duration

  // Jelly Boing Physics
  BOING_ANTICIPATION: 0.76,  // Initial squash scale
  BOING_OVERSHOOT: 1.30,     // High bounce stretch
  SPRING_DAMPING: 0.18,      // Wobble settle damping

  // Contact Shadow
  SHADOW_SCALE: 0.95,
  SHADOW_OPACITY: 1.0,

  // Soft Pastel Body Palette (Lighter, sweeter tones)
  PASTEL_COLORS: [
    '#ffc2d4', // Sweet Strawberry Milk Pink
    '#bbf2f0', // Pastel Mint Lagoon
    '#c8f7d4', // Sweet Honeydew Melon
    '#fef0d2', // Soft Vanilla Cream Butter
    '#dcd2ff', // Light Lilac Cotton Candy
    '#ffe0cc', // Pastel Peach Mochi
    '#bde2ff', // Soft Powder Sky Blue
    '#ffd6f4', // Cherry Blossom Blush
  ],

  // Belly & Highlight Accents
  BELLY_COLOR: '#ffffff',
  BELLY_OPACITY: 1.0,
  HIGHLIGHT_COLOR: '#ffffff',
  HIGHLIGHT_OPACITY: 1.0,

  // Accessory Scale (prominent ~28% of body width)
  ACCESSORY_SCALE: 0.28,
} as const;

export type MochiConfig = typeof MOCHI_CONFIG;
