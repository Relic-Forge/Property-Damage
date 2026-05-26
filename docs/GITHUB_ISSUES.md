# Suggested GitHub Issues

Use these as the starting backlog.

## 1. Make the prototype compile and run cleanly

**Goal:** `npm install`, `npm run dev`, and `npm run build` all work.

Acceptance:

- No TypeScript errors.
- No duplicate Phaser canvas on reload.
- No console errors during normal play.
- Game is playable in Chrome/Safari/Edge.

## 2. Tune launch feel

**Goal:** Pull/release mechanic feels immediately satisfying.

Acceptance:

- Aim line clearly shows direction and charge.
- Launch power has a readable max pull distance.
- Objects spin differently by type.
- Player can intentionally aim at major room areas.

## 3. Make gear objects distinct

**Goal:** The five objects do not feel like reskins.

Acceptance:

- Guitar spins/bounces unpredictably.
- Bass amp crushes and moves heavy objects.
- Cymbal ricochets and tags fragile props.
- Mic stand behaves like a spear.
- Fog machine creates smoke/burst bonus.

## 4. Improve breakable prop system

**Goal:** Destruction feels physical and repeatable.

Acceptance:

- Props break from collision force.
- Props have health/value/kind metadata.
- Broken props spawn appropriate debris.
- High-value fragile props feel satisfying.

## 5. Add score report polish

**Goal:** The damage report is funny and clear.

Acceptance:

- Total damage is prominent.
- Combo, chaos, and viral/insurance bonuses are visible.
- At least 20 clean flavor text lines exist.
- Best damage encourages replay.

## 6. Upgrade loop pass

**Goal:** Upgrades create the “one more try” loop.

Acceptance:

- Launch Power visibly affects distance/impact.
- Gear Weight visibly affects collision strength.
- Fragile Room makes more props break.
- Viral Clip and Insurance Math affect reward outcomes.
- Costs ramp enough to require multiple rounds.

## 7. First art pass

**Goal:** Replace generated placeholders with stylized sprites.

Acceptance:

- Garage background added.
- Five gear sprites added.
- Twelve prop sprites added.
- Debris/effect sprites added.
- Readability is strong at game scale.

## 8. Sound hooks and impact juice

**Goal:** The game feels alive.

Acceptance:

- Impact sound hook exists by material type.
- Break sound hook exists by material type.
- Camera shake tuned by impact force.
- Floating text and particles do not clutter the screen.

## 9. Responsive browser polish

**Goal:** The game plays well in a hosted browser link.

Acceptance:

- Desktop layout is clean at 1440x900 and 1920x1080.
- Tablet-sized layout is usable.
- Touch input works for fling.
- No page scroll needed on standard desktop fullscreen.
