# Asset Manifest

V1 can start with generated placeholder textures, but the first art pass should replace them with stylized sprites.

## Folder structure

```txt
public/assets/garage-band/backgrounds/
public/assets/garage-band/gear/
public/assets/garage-band/props/
public/assets/garage-band/props-raster/
public/assets/garage-band/debris/
public/assets/garage-band/effects/
public/audio/impacts/
public/audio/ui/
```

## Required V1 sprites

### Background

| File | Notes |
|---|---|
| `backgrounds/garage_background.png` | 1891x831 high-detail 2.5D garage scene with subtle hidden gags; active in-game background |
| `backgrounds/garage_background.svg` | 1700x960 illustrated garage, dark but readable |

### Gear

| File | Notes |
|---|---|
| `guitar-v1.png` through `guitar-v3.png` | long spinny launch variants |
| `amp-v1.png` through `amp-v3.png` | heavy box launch variants |
| `cymbal-v1.png` through `cymbal-v3.png` | round ricochet launch variants |
| `micStand-v1.png` through `micStand-v3.png` | long thin spear launch variants |
| `fogMachine-v1.png` through `fogMachine-v3.png` | compact fog launch variants |

### Props

| File | Notes |
|---|---|
| `props-raster/folding_table_intact.png` | flimsy, high break readability |
| `props-raster/questionable_cake_intact.png` | funny target |
| `props-raster/old_tv_intact.png` | high value target |
| `props-raster/speaker_stack_intact.png` | heavy target |
| `props-raster/cooler_intact.png` | slide/knock target |
| `props-raster/garage_shelf_intact.png` | chain reaction anchor |
| `props-raster/paint_can_intact.png` | small target |
| `props-raster/cable_bin_intact.png` | soft chaos prop |
| `props-raster/mystery_box_intact.png` | debris target |
| `props-raster/neon_sign_intact.png` | high value glass target |
| `props-raster/tiny_drum_kit_intact.png` | theme anchor |
| `props-raster/garage_window_intact.png` | fragile high-score object |

Raster prop source sheet: `destructible-props-source-v2.png`.

### Debris

| File | Notes |
|---|---|
| `debris/wood_chunk_01.svg` | multiple small chunks |
| `debris/wood_chunk_02.svg` | multiple small chunks |
| `debris/glass_chunk_01.svg` | bright cyan glints |
| `debris/metal_chunk_01.svg` | gray/lavender chunks |
| `debris/fabric_scrap_01.svg` | cable/fabric pieces |

### Effects

| File | Notes |
|---|---|
| `effects/impact_star.svg` | comic hit flash |
| `effects/dust_puff.svg` | soft debris cloud |
| `effects/spark_01.svg` | electronics/neon impact |
| `effects/smoke_puff.svg` | fog machine burst |

## Suggested AI art prompt pattern

Use this structure for consistent assets:

```txt
Stylized premium 2D cartoon game asset of [OBJECT], clean bold silhouette, slight black outline, warm shadows, polished mobile game quality, funny garage band personality, isolated on transparent background, no text unless specified, no people, no gore, no offensive content.
```

## Important implementation note

Sprites must match physics shapes. Keep silhouettes simple enough to approximate with rectangles, circles, capsules, or a small set of polygon points.
