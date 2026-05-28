# Property Damage — Focused Destruction + Audio Pass

## Goal

Make breaking objects feel like the core fantasy of the game instead of a generic debris effect.

This pass should improve two areas only:

1. **Asset-aware break graphics** — when an object breaks, the fragments should visually resemble that object, using matching colors, shapes, and material behavior.
2. **Game sound effects** — start with satisfying UI/menu sounds, then throwing sounds, then impact/breaking sounds tied to the object material and impact strength.

Do not redesign the game loop, scoring model, menu layout, upgrade system, or mode structure during this pass.

---

## Current code observations

The project is currently a Vite + React + Phaser game. The repo has scripts for `dev`, `lint`, `build`, `preview`, and `typecheck`, so every implementation step should finish with the normal validation commands.

Relevant files:

- `src/App.tsx`
- `src/game/PropertyDamageScene.ts`
- `src/game/DamageRushScene.ts`
- `src/game/assetPath.ts`
- `src/store/gameStore.ts`
- `src/ui/MainMenu.tsx`
- `src/ui/GearSelector.tsx`
- `src/ui/UpgradePanel.tsx`

The current Wreck Room scene already has breakable item metadata with a material-style `kind` field:

```ts
kind: 'glass' | 'wood' | 'metal' | 'soft' | 'electronics'
```

It also defines the intact object assets in `LEVEL_PROP_TEMPLATES`, including objects like folding table, cake, old TV, speaker stack, cooler, shelf, paint can, cable bin, mystery box, neon sign, tiny drum kit, and garage window.

The current debris system is material-generic:

```ts
const DEBRIS_TEXTURES: Record<BreakableMeta['kind'], string[]> = {
  glass: ['debris-glass-1'],
  wood: ['debris-wood-1', 'debris-wood-2'],
  metal: ['debris-metal-1'],
  soft: ['debris-fabric-1'],
  electronics: ['debris-metal-1', 'debris-glass-1']
};
```

That is the main graphics limitation. A TV, paint can, speaker stack, and shelf can all end up feeling like the same small generic pieces.

`DamageRushScene.ts` has a parallel object system with `RushPropConfig`, `RushDebrisKind`, and `RUSH_PROPS`. It uses the same general prop assets, so the destruction pipeline should be shared by both scenes instead of duplicated.

`App.tsx` already uses browser Web Audio for the damage report impact animation. That means the project already has a path for procedural audio, but gameplay SFX should move into a reusable game audio module instead of staying embedded inside React animation code.

---

## Target result

Breaking should feel like this:

- A neon sign or window breaks into bright glass shards with a few glowing tube fragments.
- A folding table breaks into long tabletop chunks and thin leg-like pieces.
- An old TV breaks into dark casing chunks, glass pieces, and a couple of spark effects.
- A speaker stack breaks into cabinet panels, dark grille chunks, and small cone/magnet pieces.
- A paint can pops into curved metal chunks and maybe a small colored splatter/dust accent.
- A cake breaks into soft chunks/puffs instead of hard debris.

The fragments should use gravity and Matter physics so the same item does not break identically every time.

---

## Implementation principle

Build a reusable destruction pipeline that accepts this input:

```ts
type BreakRequest = {
  scene: Phaser.Scene;
  source: Phaser.Physics.Matter.Image;
  sourceTextureKey: string;
  objectId: string;
  label: string;
  material: BreakMaterial;
  width: number;
  height: number;
  impactPoint: Phaser.Math.Vector2;
  impactVelocity: Phaser.Math.Vector2;
  impactStrength: number;
  seed: number;
};
```

And produces:

- physics fragments
- dust/spark/smoke effects
- material-specific sound event
- cleanup timers

The scenes should not know how to slice assets, pick fragment shapes, or play the correct break sound. Scenes should only call the pipeline.

---

## New files to add

Create this folder structure:

```txt
src/game/destruction/
  breakTypes.ts
  breakProfiles.ts
  fragmentTextureFactory.ts
  breakEffectPipeline.ts
  breakCleanup.ts

src/game/audio/
  gameAudio.ts
  sfxProfiles.ts
```

Keep the files small enough that future Codex passes can work on one concern at a time.

---

## Destruction types

Create `src/game/destruction/breakTypes.ts`:

```ts
import Phaser from 'phaser';

export type BreakMaterial = 'glass' | 'wood' | 'metal' | 'soft' | 'electronics' | 'cake';

export type FragmentShape = 'rect' | 'sliver' | 'chunk' | 'shard' | 'panel' | 'splatter';

export type BreakPattern =
  | 'radial'
  | 'horizontal-split'
  | 'vertical-split'
  | 'corner-impact'
  | 'crush'
  | 'soft-burst';

export type BreakProfile = {
  id: string;
  material: BreakMaterial;
  patterns: BreakPattern[];
  pieceCount: [number, number];
  fragmentShapes: FragmentShape[];
  velocityMultiplier: number;
  angularVelocityRange: [number, number];
  gravityScale?: number;
  lifespanMs: [number, number];
  fadeDelayMs: [number, number];
  dust: boolean;
  sparks: boolean;
  smoke: boolean;
  soundProfile: string;
};

export type BreakRequest = {
  scene: Phaser.Scene;
  source: Phaser.Physics.Matter.Image;
  sourceTextureKey: string;
  objectId: string;
  label: string;
  material: BreakMaterial;
  profileId?: string;
  width: number;
  height: number;
  impactPoint: Phaser.Math.Vector2;
  impactVelocity: Phaser.Math.Vector2;
  impactStrength: number;
  seed: number;
};

export type BreakFragment = Phaser.Physics.Matter.Image & {
  generatedTextureKey?: string;
};
```

---

## Break profiles

Create `src/game/destruction/breakProfiles.ts`.

Use specific profiles, not just broad material profiles. This gives each object a distinct break personality.

Recommended starter profiles:

```ts
import { BreakMaterial, BreakProfile } from './breakTypes';

export const BREAK_PROFILES: Record<string, BreakProfile> = {
  foldingTable: {
    id: 'foldingTable',
    material: 'wood',
    patterns: ['horizontal-split', 'corner-impact'],
    pieceCount: [7, 12],
    fragmentShapes: ['panel', 'sliver', 'chunk'],
    velocityMultiplier: 1.05,
    angularVelocityRange: [0.035, 0.12],
    lifespanMs: [2600, 4200],
    fadeDelayMs: [1100, 2200],
    dust: true,
    sparks: false,
    smoke: false,
    soundProfile: 'break.wood.table'
  },
  oldTv: {
    id: 'oldTv',
    material: 'electronics',
    patterns: ['radial', 'crush'],
    pieceCount: [10, 17],
    fragmentShapes: ['chunk', 'panel', 'shard'],
    velocityMultiplier: 0.95,
    angularVelocityRange: [0.025, 0.1],
    lifespanMs: [2800, 4800],
    fadeDelayMs: [1400, 2600],
    dust: true,
    sparks: true,
    smoke: true,
    soundProfile: 'break.electronics.tv'
  },
  neonSign: {
    id: 'neonSign',
    material: 'glass',
    patterns: ['radial', 'horizontal-split'],
    pieceCount: [14, 24],
    fragmentShapes: ['shard', 'sliver'],
    velocityMultiplier: 1.35,
    angularVelocityRange: [0.08, 0.22],
    lifespanMs: [1800, 3600],
    fadeDelayMs: [800, 1700],
    dust: false,
    sparks: true,
    smoke: false,
    soundProfile: 'break.glass.neon'
  },
  garageWindow: {
    id: 'garageWindow',
    material: 'glass',
    patterns: ['radial', 'vertical-split'],
    pieceCount: [16, 28],
    fragmentShapes: ['shard', 'sliver'],
    velocityMultiplier: 1.45,
    angularVelocityRange: [0.08, 0.24],
    lifespanMs: [1800, 3300],
    fadeDelayMs: [700, 1600],
    dust: false,
    sparks: false,
    smoke: false,
    soundProfile: 'break.glass.window'
  },
  speakerStack: {
    id: 'speakerStack',
    material: 'electronics',
    patterns: ['vertical-split', 'crush'],
    pieceCount: [9, 16],
    fragmentShapes: ['panel', 'chunk', 'sliver'],
    velocityMultiplier: 0.9,
    angularVelocityRange: [0.025, 0.09],
    lifespanMs: [3000, 5200],
    fadeDelayMs: [1500, 2800],
    dust: true,
    sparks: true,
    smoke: false,
    soundProfile: 'break.electronics.speaker'
  },
  paintCan: {
    id: 'paintCan',
    material: 'metal',
    patterns: ['radial', 'corner-impact'],
    pieceCount: [6, 11],
    fragmentShapes: ['chunk', 'sliver', 'splatter'],
    velocityMultiplier: 1.25,
    angularVelocityRange: [0.05, 0.18],
    lifespanMs: [2400, 4200],
    fadeDelayMs: [1000, 2200],
    dust: false,
    sparks: false,
    smoke: false,
    soundProfile: 'break.metal.can'
  },
  questionableCake: {
    id: 'questionableCake',
    material: 'cake',
    patterns: ['soft-burst', 'crush'],
    pieceCount: [8, 15],
    fragmentShapes: ['chunk', 'splatter'],
    velocityMultiplier: 0.72,
    angularVelocityRange: [0.015, 0.055],
    gravityScale: 1.15,
    lifespanMs: [2200, 3800],
    fadeDelayMs: [800, 1600],
    dust: true,
    sparks: false,
    smoke: false,
    soundProfile: 'break.soft.cake'
  }
};

export const FALLBACK_PROFILE_BY_MATERIAL: Record<BreakMaterial, string> = {
  glass: 'garageWindow',
  wood: 'foldingTable',
  metal: 'paintCan',
  soft: 'questionableCake',
  electronics: 'oldTv',
  cake: 'questionableCake'
};

export function getBreakProfile(profileId: string | undefined, material: BreakMaterial) {
  return BREAK_PROFILES[profileId ?? ''] ?? BREAK_PROFILES[FALLBACK_PROFILE_BY_MATERIAL[material]];
}
```

Add missing profile IDs as needed for all current props.

---

## Asset-aware fragment generation

Create `src/game/destruction/fragmentTextureFactory.ts`.

V1 should use the intact asset as the visual source. Start with practical runtime slicing. Do not over-engineer polygon cutting on the first pass.

### V1 approach

1. Read the source texture dimensions.
2. Generate a randomized set of crop rectangles based on the selected break pattern.
3. For each crop rectangle:
   - create a small canvas texture
   - draw that portion of the source asset into it
   - optionally apply a jagged alpha mask to avoid perfectly rectangular pieces
   - create a Matter image at the correct world offset
   - push it away from the impact point
   - rotate it randomly
   - fade/cleanup after a short lifespan

This gives fragments matching the object colors immediately, without manually creating new art for every asset.

### Important detail

The visible prop dimensions in the scene may not match the raw texture dimensions. Convert texture crop offsets into scene/world offsets using the prop display scale.

Pseudocode:

```ts
const sourceTexture = scene.textures.get(sourceTextureKey);
const image = sourceTexture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
const scaleX = request.width / image.width;
const scaleY = request.height / image.height;

const worldOffsetX = (cropCenterX - image.width / 2) * scaleX;
const worldOffsetY = (cropCenterY - image.height / 2) * scaleY;
```

### Fragment texture cleanup

Generated textures must be removed after fragments are destroyed.

Do not leave thousands of generated textures in the Phaser texture cache after several rounds.

Create a helper like:

```ts
export function destroyGeneratedFragment(fragment: BreakFragment) {
  const key = fragment.generatedTextureKey;
  fragment.destroy();
  if (key && fragment.scene?.textures.exists(key)) {
    fragment.scene.textures.remove(key);
  }
}
```

### Jagged mask path

If rectangular slices look too clean, add a simple jagged clipping mask:

- Create a canvas.
- Build a polygon with slight random offsets around the rectangle perimeter.
- Clip to that polygon.
- Draw the cropped asset image inside the clipped region.

Do this after basic slicing is working.

---

## Break pipeline

Create `src/game/destruction/breakEffectPipeline.ts`.

Expose one main function:

```ts
export function breakObject(request: BreakRequest): BreakFragment[]
```

Expected behavior:

1. Pick the correct `BreakProfile`.
2. Generate object-colored fragment textures from the intact asset.
3. Spawn fragments as Matter images.
4. Apply impulse based on:
   - impact direction
   - impact strength
   - distance from impact point
   - random seed variation
5. Add dust/spark/smoke effects based on profile.
6. Play a material/profile-specific break sound.
7. Schedule cleanup.
8. Return fragments so the scene can track them in its existing `debris` array.

The function should be scene-safe and not assume Wreck Room or Damage Rush.

---

## Scene integration — Wreck Room

Update `src/game/PropertyDamageScene.ts`.

### Add profile IDs to props

Extend `LevelProp` / `LevelPropTemplate` with:

```ts
breakProfileId?: string;
```

Then map the existing objects:

```ts
{ key: 'prop-folding-table', breakProfileId: 'foldingTable', ... }
{ key: 'prop-questionable-cake', breakProfileId: 'questionableCake', ... }
{ key: 'prop-old-tv', breakProfileId: 'oldTv', ... }
{ key: 'prop-speaker-stack', breakProfileId: 'speakerStack', ... }
{ key: 'prop-cooler', breakProfileId: 'cooler', ... }
{ key: 'prop-garage-shelf', breakProfileId: 'garageShelf', ... }
{ key: 'prop-paint-can', breakProfileId: 'paintCan', ... }
{ key: 'prop-cable-bin', breakProfileId: 'cableBin', ... }
{ key: 'prop-mystery-box', breakProfileId: 'mysteryBox', ... }
{ key: 'prop-neon-sign', breakProfileId: 'neonSign', ... }
{ key: 'prop-tiny-drum-kit', breakProfileId: 'tinyDrumKit', ... }
{ key: 'prop-garage-window', breakProfileId: 'garageWindow', ... }
```

### Replace generic debris spawning

Find the current break/destruction path that uses `DEBRIS_TEXTURES`. Replace that section with a call to `breakObject(...)`.

The score/health logic should stay where it is. Only the visual/audio break effect should move.

Use the collision data already available in the scene when possible:

```ts
const fragments = breakObject({
  scene: this,
  source: prop,
  sourceTextureKey: prop.texture.key,
  objectId: meta.id,
  label: meta.label,
  material: meta.kind,
  profileId: meta.breakProfileId,
  width: prop.displayWidth,
  height: prop.displayHeight,
  impactPoint,
  impactVelocity,
  impactStrength,
  seed: this.time.now + Math.floor(prop.x * 17) + Math.floor(prop.y * 31)
});

this.debris.push(...fragments);
```

If the existing metadata object does not include `breakProfileId`, add it to `BreakableMeta`.

---

## Scene integration — Damage Rush

Update `src/game/DamageRushScene.ts`.

### Add profile IDs to Rush props

Extend `RushPropConfig` with:

```ts
breakProfileId?: string;
```

Map the current prop configs to the same profile IDs used by Wreck Room.

### Use the shared break pipeline

When a rushing prop is cleared/destroyed, call `breakObject(...)` instead of spawning generic material debris.

Use `prop.texture.key` or the config `textureKey` as the source texture key.

Add returned fragments to the scene’s existing `debris` array so the cleanup and movement logic stays consistent.

---

## Performance guardrails

Destruction can get expensive quickly. Add hard limits now.

Recommended constants:

```ts
const MAX_ACTIVE_FRAGMENTS = 140;
const MAX_FRAGMENTS_PER_BREAK = 28;
const LOW_IMPACT_FRAGMENT_MULTIPLIER = 0.65;
```

When the active fragment count is too high:

- reduce piece count
- shorten lifespan
- skip dust/smoke/sparks before skipping object-colored fragments

Do not let performance collapse because ten items break at once.

---

## Audio system

Create `src/game/audio/gameAudio.ts`.

Use browser Web Audio for V1. This avoids needing to source/download/license audio files immediately.

Expose a small API:

```ts
export const gameAudio = {
  unlock(): void;
  playUiClick(): void;
  playUiHover(): void;
  playThrowWindup(charge: number): void;
  playThrowRelease(charge: number, gearType: string): void;
  playImpact(material: string, intensity: number): void;
  playBreak(profileId: string, material: string, intensity: number): void;
};
```

### Audio unlock

Call `gameAudio.unlock()` from the first trusted pointer interaction:

- menu button click
- game stage pointer down
- gear selection click

Avoid hidden autoplay assumptions.

### UI sounds

Start with:

- menu button hover: quiet tick / soft blip
- menu button click: short punchy click
- disabled/locked action: lower dull click

Wire these into:

- `MainMenu.tsx`
- `GearSelector.tsx`
- `UpgradePanel.tsx`

Keep sounds subtle. They should make the UI feel alive, not noisy.

### Throw sounds

Add:

- windup/charge sound when pulling back
- release/whoosh when thrown
- optional max-power accent when the throw reaches full charge

Wire these inside both scenes:

- `beginDrag` starts/unlocks windup behavior
- `moveDrag` can trigger the max-charge accent once when crossing the max threshold
- `endDrag` plays release based on charge and selected gear

Do not loop a windup oscillator forever. Keep it short or manage lifecycle carefully.

### Impact/breaking sounds

Use profile/material sounds:

- `glass`: sharp crack + tinkle tail
- `wood`: snap + short thud
- `metal`: clang + low body hit
- `electronics`: plastic crack + spark pops + small glass layer
- `soft` / `cake`: squish + puff

Use `impactStrength` to drive volume and brightness.

Add cooldowns so one collision storm does not produce 40 overlapping sounds.

Recommended rules:

```ts
const MIN_MS_BETWEEN_BREAK_SOUNDS_BY_OBJECT = 120;
const MAX_SIMULTANEOUS_BREAK_SOUNDS = 6;
const IMPACT_SOUND_THRESHOLD = 5;
```

---

## Optional sample-based audio later

After procedural SFX are working, add CC0 audio samples under:

```txt
public/assets/sfx/ui/
public/assets/sfx/throw/
public/assets/sfx/impact/
public/assets/sfx/break/
```

Do not block this pass on finding samples.

The audio module should be written so samples can replace procedural sounds later without changing scene code.

---

## Implementation order

Work in this order to avoid a messy refactor.

### 1. Add the audio module

- Create `src/game/audio/gameAudio.ts`.
- Move reusable Web Audio helpers out of React if practical.
- Wire `gameAudio.unlock()` into existing pointer/menu interactions.
- Add menu click and hover sounds.

Acceptance check:

- Main menu buttons produce subtle sound.
- No browser console audio errors.
- Audio does not start until user interaction.

### 2. Add break profiles

- Create `breakTypes.ts` and `breakProfiles.ts`.
- Add `breakProfileId` to Wreck Room and Damage Rush prop configs.
- No visual behavior change yet.

Acceptance check:

- `npm run typecheck` passes.
- Existing game behavior is unchanged.

### 3. Build runtime fragment slicing

- Create `fragmentTextureFactory.ts`.
- Generate object-colored fragments from source texture crops.
- Add cleanup for generated textures.
- Test with one object first: `prop-neon-sign` or `prop-folding-table`.

Acceptance check:

- Breaking that one object produces fragments using that object’s colors.
- Fragments fall under gravity and fade/cleanup.
- Repeated breaks produce different layouts.

### 4. Replace generic debris in Wreck Room

- Wire `breakObject(...)` into `PropertyDamageScene.ts`.
- Keep existing scoring and break thresholds unchanged.
- Push returned fragments into `this.debris`.

Acceptance check:

- Every Wreck Room object breaks with asset-colored fragments.
- No broken scoring.
- No permanent texture cache growth after repeated resets.

### 5. Replace generic debris in Damage Rush

- Wire the same break pipeline into `DamageRushScene.ts`.
- Keep Rush scoring, clearing, escaping, combo, and timer logic unchanged.

Acceptance check:

- Rush objects break with the same visual quality.
- Rush mode does not lag when multiple objects break.

### 6. Add throw and break sounds

- Add throw windup/release sounds.
- Add material/profile break sounds.
- Add impact intensity scaling.
- Add cooldown/polyphony caps.

Acceptance check:

- UI, throw, impact, and break sounds are all present.
- Sound does not become chaotic during multi-object breaks.
- Muted browser/audio-disabled scenarios do not break gameplay.

---

## Visual tuning notes

Fragments should not all be tiny confetti.

Use object-specific proportions:

- Tables/shelves: fewer long panels and slivers.
- Glass/window/neon: many shards, fast outward movement, lighter gravity feel.
- TV/electronics: medium chunks, a few glass shards, small sparks.
- Speaker stack: boxy panels and dark grille-looking chunks.
- Cake/soft: slower chunks, less bounce, puff/dust effect.
- Paint can/cooler: metal chunks with sharper spin and a heavier clank.

The user should be able to identify what broke by looking at the remaining fragments for at least the first second after impact.

---

## Randomization requirements

Each break should vary without feeling completely random.

Use the profile to constrain behavior, then randomize inside that lane:

- piece count within profile range
- selected pattern from profile patterns
- slight impact-point variation
- fragment crop locations
- fragment rotation
- launch impulse
- fade timing

Avoid purely random explosion clouds. The object should still feel like it fractured from the collision point.

---

## Cleanup requirements

Every generated thing must be cleaned up:

- generated fragment textures
- fragment Matter bodies
- delayed timers
- sparks/dust/smoke sprites
- audio timers/nodes where applicable

Scene shutdown and reset must not leave orphaned generated textures or timers.

Add a lightweight debug helper during development if needed:

```ts
console.debug('[destruction]', {
  activeFragments: this.debris.length,
  textureCount: this.textures.list ? Object.keys(this.textures.list).length : undefined
});
```

Remove or gate debug logs before final.

---

## Validation commands

Run after implementation:

```bash
npm run lint
npm run typecheck
npm run build
npm run preview
```

Manual browser validation:

- Main menu hover/click sounds work.
- Gear selection sound works.
- Throw release sound works for all gear types.
- At least five different objects break into visually distinct fragments.
- Glass sounds different from wood, metal, electronics, and soft/cake.
- Repeatedly breaking the same object produces different fragment arrangements.
- Wreck Room still completes and shows the summary.
- Damage Rush still spawns, clears, scores, and ends normally.
- No console errors after repeated reset/menu/mode switching.
- No visible performance collapse when several objects break close together.

---

## Codex build instruction

Implement this as a focused pass. Do not make unrelated UI, scoring, or gameplay changes.

The core deliverable is a reusable destruction/audio pipeline that both scenes can use. The first working version can use runtime rectangular/cell slicing from the original asset texture. Once that works, improve the masks to look jagged and broken.

Keep the existing game modes intact:

- Main Menu
- Wreck Room
- Damage Rush

Commit in small steps:

1. `Add reusable game audio module`
2. `Add break profiles for destructible props`
3. `Generate asset-colored break fragments`
4. `Wire destruction pipeline into Wreck Room`
5. `Wire destruction pipeline into Damage Rush`
6. `Add throw impact and break sound effects`

Do not skip validation. If the runtime slicing approach hits Phaser API issues, fall back to curated per-asset fragment sprites, but keep the same `breakObject(...)` API so the scene integration does not change.
