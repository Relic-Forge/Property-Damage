# Asset Manifest

V1 can start with generated placeholder textures, but the first art pass should replace them with stylized sprites.

## Folder structure

```txt
public/assets/garage-band/backgrounds/
public/assets/garage-band/gear/
public/assets/garage-band/props/
public/assets/garage-band/debris/
public/assets/garage-band/effects/
public/audio/impacts/
public/audio/ui/
```

## Required V1 sprites

### Background

| File | Notes |
|---|---|
| `garage_background.webp` | 1280x720 illustrated garage, dark but readable |

### Gear

| File | Notes |
|---|---|
| `guitar_intact.webp` | long spinny shape |
| `guitar_broken_body.webp` | broken part |
| `guitar_broken_neck.webp` | broken part |
| `amp_intact.webp` | heavy box silhouette |
| `amp_broken_cabinet.webp` | broken part |
| `amp_broken_grille.webp` | broken part |
| `cymbal_intact.webp` | round object, readable in motion |
| `cymbal_cracked.webp` | broken part |
| `mic_stand_intact.webp` | long thin spear shape |
| `mic_stand_bent.webp` | broken part |
| `fog_machine_intact.webp` | compact purple/gray object |
| `fog_machine_broken.webp` | broken part |

### Props

| File | Notes |
|---|---|
| `folding_table_intact.webp` | flimsy, high break readability |
| `questionable_cake_intact.webp` | funny target |
| `old_tv_intact.webp` | high value target |
| `speaker_stack_intact.webp` | heavy target |
| `cooler_intact.webp` | slide/knock target |
| `garage_shelf_intact.webp` | chain reaction anchor |
| `paint_can_intact.webp` | small target |
| `cable_bin_intact.webp` | soft chaos prop |
| `mystery_box_intact.webp` | debris target |
| `neon_sign_intact.webp` | high value glass target |
| `tiny_drum_kit_intact.webp` | theme anchor |
| `garage_window_intact.webp` | fragile high-score object |

### Debris

| File | Notes |
|---|---|
| `wood_chunk_01.webp` | multiple small chunks |
| `wood_chunk_02.webp` | multiple small chunks |
| `glass_chunk_01.webp` | bright cyan glints |
| `metal_chunk_01.webp` | gray/lavender chunks |
| `fabric_scrap_01.webp` | cable/fabric pieces |

### Effects

| File | Notes |
|---|---|
| `impact_star.webp` | comic hit flash |
| `dust_puff.webp` | soft debris cloud |
| `spark_01.webp` | electronics/neon impact |
| `smoke_puff.webp` | fog machine burst |

## Suggested AI art prompt pattern

Use this structure for consistent assets:

```txt
Stylized premium 2D cartoon game asset of [OBJECT], clean bold silhouette, slight black outline, warm shadows, polished mobile game quality, funny garage band personality, isolated on transparent background, no text unless specified, no people, no gore, no offensive content.
```

## Important implementation note

Sprites must match physics shapes. Keep silhouettes simple enough to approximate with rectangles, circles, capsules, or a small set of polygon points.
