import * as THREE from 'three';

export type BlobExpression =
  | 'idle'
  | 'hover'
  | 'selected'
  | 'trend_up'
  | 'trend_down'
  | 'trend_new'
  | 'blink';

export type CheekMark = 'blush' | 'heart' | 'star' | 'freckles';

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Draws solid soft pink blush oval (100% opaque, no semi-transparent fade)
 */
function drawBlush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx = 48,
  ry = 28,
  mark: CheekMark = 'blush'
) {
  ctx.save();
  ctx.translate(x, y);

  // Solid soft pink blush oval (100% opaque)
  ctx.fillStyle = '#ff8fab';
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  if (mark === 'freckles') {
    ctx.fillStyle = '#b84462';
    ctx.beginPath();
    ctx.arc(-12, -3, 3, 0, Math.PI * 2);
    ctx.arc(0, 4, 3, 0, Math.PI * 2);
    ctx.arc(12, -2, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (mark === 'heart') {
    ctx.fillStyle = '#ff3366';
    ctx.beginPath();
    const d = 18;
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-d / 2, -d / 2, -d, d / 3, 0, d);
    ctx.bezierCurveTo(d, d / 3, d / 2, -d / 2, 0, 0);
    ctx.fill();
  } else if (mark === 'star') {
    ctx.fillStyle = '#ffbe0b';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(
        Math.cos(((18 + i * 72) * Math.PI) / 180) * 16,
        -Math.sin(((18 + i * 72) * Math.PI) / 180) * 16
      );
      ctx.lineTo(
        Math.cos(((54 + i * 72) * Math.PI) / 180) * 7,
        -Math.sin(((54 + i * 72) * Math.PI) / 180) * 7
      );
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws HUGE, glossy solid black eye with solid cyan/blue iris accent & white sparkle highlights
 * Eye width: ~0.22W (rx ~ 70px), Eye height: ~0.28W (ry ~ 90px)
 */
function drawGlossyHugeEye(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx = 70,
  ry = 90,
  sparkleType: 'normal' | 'star' = 'normal',
  lookShiftX = 0,
  lookShiftY = 0
) {
  ctx.save();
  ctx.translate(cx, cy);

  // 1. Solid Glossy Black Oval (NO white sclera)
  ctx.fillStyle = '#0f141e';
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Solid Blue/Teal Iris Accent at bottom
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.ellipse(0, ry * 0.35, rx * 0.72, ry * 0.45, 0, 0, Math.PI);
  ctx.fill();

  // Subtle pupil shift toward look direction
  const shiftX = lookShiftX * 8;
  const shiftY = lookShiftY * 6;

  if (sparkleType === 'star') {
    // 4-point star sparkle highlight for excited/starry eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const s = 36;
    const sx = -rx * 0.25 + shiftX;
    const sy = -ry * 0.32 + shiftY;
    ctx.moveTo(sx, sy - s / 2);
    ctx.quadraticCurveTo(sx, sy, sx + s / 2, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy + s / 2);
    ctx.quadraticCurveTo(sx, sy, sx - s / 2, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy - s / 2);
    ctx.fill();

    // Secondary sparkle
    ctx.beginPath();
    ctx.arc(rx * 0.35 + shiftX, ry * 0.38 + shiftY, 13, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 3. Primary Large White Circle in upper left (~35% of eye width = ~24px radius)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-rx * 0.28 + shiftX, -ry * 0.32 + shiftY, 24, 28, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // 4. Secondary Small White Circle in lower right
    ctx.beginPath();
    ctx.arc(rx * 0.32 + shiftX, ry * 0.36 + shiftY, 12, 0, Math.PI * 2);
    ctx.fill();

    // Tiny tertiary shimmer dot
    ctx.beginPath();
    ctx.arc(-rx * 0.36 + shiftX, ry * 0.28 + shiftY, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws closed happy curved eye: "^"
 */
function drawHappyClosedEye(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width = 96,
  height = 44
) {
  ctx.save();
  ctx.strokeStyle = '#0f141e';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, cy + height / 3);
  ctx.quadraticCurveTo(cx, cy - height, cx + width / 2, cy + height / 3);
  ctx.stroke();

  // Gentle double lash accent
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx + width / 2 - 4, cy + height / 3);
  ctx.lineTo(cx + width / 2 + 10, cy + height / 3 - 8);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws sleepy half-closed eye
 */
function drawSleepyEye(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx = 70, ry = 90) {
  ctx.save();
  ctx.translate(cx, cy);

  // Black bottom half
  ctx.fillStyle = '#0f141e';
  ctx.beginPath();
  ctx.ellipse(0, 10, rx, ry * 0.65, 0, 0, Math.PI);
  ctx.fill();

  // White highlight
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-rx * 0.2, ry * 0.25, 12, 0, Math.PI * 2);
  ctx.fill();

  // Heavy eyelid line
  ctx.strokeStyle = '#0f141e';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-rx * 1.05, 10);
  ctx.quadraticCurveTo(0, 18, rx * 1.05, 10);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws cute curved eyebrow
 */
function drawEyebrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, isHappy = true) {
  ctx.save();
  ctx.strokeStyle = '#261520';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (isHappy) {
    ctx.moveTo(cx - 24, cy + 6);
    ctx.quadraticCurveTo(cx, cy - 8, cx + 24, cy + 6);
  } else {
    ctx.moveTo(cx - 24, cy - 4);
    ctx.quadraticCurveTo(cx, cy + 6, cx + 24, cy - 4);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws thick, clearly readable mouth (small 'w' smile, open mouth, or tongue)
 */
function drawThickMouth(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  type: 'w' | 'smile' | 'open' | 'tongue' | 'dot'
) {
  ctx.save();
  const mouthStroke = '#3a1626';
  ctx.strokeStyle = mouthStroke;
  ctx.fillStyle = mouthStroke;
  ctx.lineWidth = 13;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'w') {
    // Adorable cat/bunny "w" / "ω" smile (0.12W width = ~76px)
    const halfW = 38;
    const midX = halfW / 2;
    ctx.beginPath();
    ctx.moveTo(cx - halfW, cy - 4);
    ctx.quadraticCurveTo(cx - midX, cy + 18, cx, cy + 2);
    ctx.quadraticCurveTo(cx + midX, cy + 18, cx + halfW, cy - 4);
    ctx.stroke();
  } else if (type === 'smile') {
    // Clean curved happy smile
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 34, 0.22 * Math.PI, 0.78 * Math.PI);
    ctx.stroke();
  } else if (type === 'open') {
    // Big happy open mouth with pink tongue
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI);
    ctx.closePath();
    ctx.fill();

    // Cute pink tongue
    ctx.fillStyle = '#ff7096';
    ctx.beginPath();
    ctx.arc(cx, cy + 14, 18, 0, Math.PI);
    ctx.fill();
  } else if (type === 'tongue') {
    // "w" smile with little pink tongue sticking out
    const halfW = 38;
    const midX = halfW / 2;
    ctx.beginPath();
    ctx.moveTo(cx - halfW, cy - 4);
    ctx.quadraticCurveTo(cx - midX, cy + 16, cx, cy + 2);
    ctx.quadraticCurveTo(cx + midX, cy + 16, cx + halfW, cy - 4);
    ctx.stroke();

    // Pink tongue
    ctx.fillStyle = '#ff5c8a';
    ctx.strokeStyle = mouthStroke;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy + 16, 14, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
  } else if (type === 'dot') {
    // Tiny sleepy "o"
    ctx.beginPath();
    ctx.arc(cx, cy + 8, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Generates or retrieves from cache the HUGE, ultra-readable kawaii face texture.
 */
export function getFaceTexture(
  expression: BlobExpression = 'idle',
  cheekMark: CheekMark = 'blush',
  lookShiftX = 0,
  lookShiftY = 0
): THREE.CanvasTexture {
  const quantX = Math.round(lookShiftX * 3);
  const quantY = Math.round(lookShiftY * 3);
  const key = `${expression}_${cheekMark}_${quantX}_${quantY}`;

  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);

  // PROPORTIONS:
  // Eye spacing = 0.42W -> Centers at X = 256 ± 134 px
  // Eye width = 0.22W -> rx = 70 px
  // Eye height = 0.28W -> ry = 90 px
  // Eye Y = ~40% up from bottom -> Y = 245 px
  const leftEyeX = 122;
  const rightEyeX = 390;
  const eyeY = 245;

  // Blush spacing: just below and outside eyes
  const blushLeftX = 78;
  const blushRightX = 434;
  const blushY = 320;

  // Mouth Y: centered between and slightly below eyes
  const mouthY = 310;

  // 1. Soft Pink Blush Ovals (70% opacity, 0.14W wide)
  drawBlush(ctx, blushLeftX, blushY, 52, 30, cheekMark);
  drawBlush(ctx, blushRightX, blushY, 52, 30, cheekMark);

  // 2. Eyebrows
  if (expression !== 'blink') {
    drawEyebrow(ctx, leftEyeX, eyeY - 110, true);
    drawEyebrow(ctx, rightEyeX, eyeY - 110, true);
  }

  // 3. Eyes & Mouth per expression
  switch (expression) {
    case 'idle':
      drawGlossyHugeEye(ctx, leftEyeX, eyeY, 70, 90, 'normal', lookShiftX, lookShiftY);
      drawGlossyHugeEye(ctx, rightEyeX, eyeY, 70, 90, 'normal', lookShiftX, lookShiftY);
      drawThickMouth(ctx, 256, mouthY, 'w');
      break;

    case 'hover':
      drawGlossyHugeEye(ctx, leftEyeX, eyeY, 72, 92, 'star', lookShiftX, lookShiftY);
      drawGlossyHugeEye(ctx, rightEyeX, eyeY, 72, 92, 'star', lookShiftX, lookShiftY);
      drawThickMouth(ctx, 256, mouthY, 'tongue');
      break;

    case 'selected':
      drawHappyClosedEye(ctx, leftEyeX, eyeY, 100, 48);
      drawHappyClosedEye(ctx, rightEyeX, eyeY, 100, 48);
      drawThickMouth(ctx, 256, mouthY + 6, 'open');
      // Floating pink hearts near head
      ctx.fillStyle = '#ff4d79';
      ctx.beginPath();
      ctx.arc(rightEyeX + 38, eyeY - 60, 14, 0, Math.PI * 2);
      ctx.arc(rightEyeX + 58, eyeY - 60, 14, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'trend_up':
      drawGlossyHugeEye(ctx, leftEyeX, eyeY, 72, 92, 'normal', lookShiftX, lookShiftY);
      drawGlossyHugeEye(ctx, rightEyeX, eyeY, 72, 92, 'normal', lookShiftX, lookShiftY);
      drawThickMouth(ctx, 256, mouthY, 'w');
      // Sparkle heart
      ctx.fillStyle = '#ff4d79';
      ctx.beginPath();
      ctx.arc(rightEyeX + 44, eyeY - 48, 12, 0, Math.PI * 2);
      ctx.arc(rightEyeX + 60, eyeY - 48, 12, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'trend_down':
      drawSleepyEye(ctx, leftEyeX, eyeY, 70, 85);
      drawSleepyEye(ctx, rightEyeX, eyeY, 70, 85);
      drawThickMouth(ctx, 256, mouthY + 4, 'dot');
      // "z" floating particles
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('z', rightEyeX + 42, eyeY - 40);
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('z', rightEyeX + 68, eyeY - 70);
      break;

    case 'trend_new':
      drawGlossyHugeEye(ctx, leftEyeX, eyeY, 72, 92, 'star', lookShiftX, lookShiftY);
      drawGlossyHugeEye(ctx, rightEyeX, eyeY, 72, 92, 'star', lookShiftX, lookShiftY);
      drawThickMouth(ctx, 256, mouthY + 4, 'open');
      break;

    case 'blink':
      // Squash eyes into happy curved arcs
      drawHappyClosedEye(ctx, leftEyeX, eyeY + 12, 92, 36);
      drawHappyClosedEye(ctx, rightEyeX, eyeY + 12, 92, 36);
      drawThickMouth(ctx, 256, mouthY, 'smile');
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  textureCache.set(key, texture);
  return texture;
}
