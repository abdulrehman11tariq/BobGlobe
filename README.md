# 🌍 BobGlobe | 3D Music World (Next Byte Hacks V5)

> An explorable 3D planet where adorable kawaii mochi creatures represent the most-listened artists per country, set on a clean, soft, premium Earth with real continent geography, friendly pastel biomes, gentle mountain relief, soft clouds, and a cozy gradient space background.

---

## 🎨 Visual Philosophy: Clean, Soft, Premium

- **Clean, Soft Earth**:
  - Smooth high-segment sphere ($256\times256$) with accurate continental geography.
  - Procedural soft biome palette: fresh temperate green, deep tropical emerald, warm desert sand, pale subpolar sage, and white-blue polar snow.
  - Gentle coastal turquoise transitions with a subtle light-blue shore foam line.
  - Soft mountain relief using normal maps at low strength ($0.35$) and gentle vertex displacement ($0.038$) — no harsh bumps.
- **Lighting & Atmosphere**:
  - Warm sun key light with strong hemisphere/ambient fill: **NO black night side**. Shaded regions settle into a calm, tranquil blue-gray (`#223247`).
  - Thin, clean atmospheric Fresnel glow in soft light-blue/cyan (`#67e8f9`).
- **Soft Cloud Sphere**:
  - Semi-transparent white clouds floating above the surface with calm, gentle drift.
  - Fades out automatically when the camera zooms in close to the surface so ground detail and blobs are never obscured.
- **Cozy Space Backdrop**:
  - Gradient space dome from deep cozy indigo (`#090d20`) to dusty teal/blue (`#162842`) behind the planet.
  - Sparse twinkling stars ($1,400$) and 7 faint floating camera dust/sparkle particles for cozy cinematic depth.
- **Kawaii Mochi Blobs (The Star of the Show)**:
  - Big, glossy black anime eyes ($0.22W \times 0.28W$) with dual sparkle highlights, blue iris glow, and soft pink blush.
  - Unlit `MeshBasicMaterial` faces that are always bright and clear from any angle.
  - Distance LOD enlarging faces up to $1.4\times$ from orbit.
  - 8 personality accessories + royal golden crowns for each country's #1 artist.
  - Jelly squash-and-stretch breathing, random blinks, and bouncy boing physics.

---

## 🎛️ Tunable Constants Quick Reference

### Earth Parameters (`src/theme/earthConfig.ts`)

| Constant | Value | Description |
| :--- | :--- | :--- |
| `PLANET_RADIUS` | `2.5` | Base radius of the Earth sphere |
| `SPHERE_SEGMENTS` | `256` | Smooth sphere subdivision ($256\times256$) |
| `RELIEF_NORMAL_STRENGTH` | `0.35` | Soft mountain normal relief strength |
| `DISPLACEMENT_SCALE` | `0.038` | Gentle vertex displacement scale (max 1.5x) |
| `biomes.oceanDeep` | `#184e68` | Deep soft teal-blue ocean |
| `biomes.oceanShallow` | `#2298a4` | Coastal turquoise |
| `biomes.oceanReef` | `#2dd4bf` | Shore reef turquoise |
| `biomes.shoreFoam` | `#a5f3fc` | Gentle light-blue foam line along coasts |
| `biomes.temperateGreen` | `#4ade80` | Fresh temperate meadow green |
| `biomes.tropicalGreen` | `#2e8b57` | Lush tropical emerald |
| `biomes.desertSand` | `#eab366` | Warm golden desert sand |
| `biomes.tundraSage` | `#94b89a` | Pale sage subpolar tundra |
| `biomes.polarSnow` | `#f0f9ff` | Polar ice and mountain snow |
| `biomes.shadeFloor` | `#223247` | Soft blue-gray floor (NO black night side!) |
| `atmosphere.color` | `#67e8f9` | Thin clean cyan rim glow |
| `atmosphere.strength` | `0.95` | Atmospheric rim radiance multiplier |
| `atmosphere.power` | `3.4` | Falloff exponent of the atmospheric rim |
| `clouds.opacity` | `0.38` | Soft cloud transparency |
| `clouds.speed` | `0.008` | Calm cloud drift speed |
| `clouds.fadeNearDist` | `3.8` | Distance where clouds begin fading out on zoom-in |
| `space.gradientTop` | `#090d20` | Cozy deep indigo at top of space dome |
| `space.gradientHorizon` | `#162842` | Dusty teal/blue behind the planet |
| `space.starCount` | `1400` | Sparse field of small twinkling stars |
| `space.dustParticleCount` | `7` | Faint camera dust/sparkle particles |

---

## 🛠️ Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Build production bundle
npm run build
```

Open [http://localhost:3000](http://localhost:3000) for the main globe or [http://localhost:3000/debug/blob](http://localhost:3000/debug/blob) for the QA Blob Studio.
