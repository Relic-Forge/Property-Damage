# Property Damage

A 2D physics chaos game where the player flings memorable objects into fragile environments and tries to create the funniest, most expensive chain-reaction destruction possible.

The first playable pack is **Garage Band**: guitars, bass amps, cymbals, mic stands, fog machines, cheap garage props, bad adult decisions, and clean non-offensive humor.

## V1 target

V1 is not a full game. V1 is a playable proof that the core mechanic is fun on repeat.

The player should be able to:

- Open the game in a browser.
- Pick one of five band-related objects.
- Pull back from the launcher and fling the object into the garage.
- Watch objects bounce, break, scatter, and trigger funny scoring events.
- See damage totals, combo bonuses, cash, fans, and chaos update.
- Buy simple upgrades that make the next throw more destructive.
- Replay the same room and still get different outcomes because physics, break thresholds, bounce, spin, and upgrade values shift the result.

## Tech stack

- Vite
- React
- TypeScript
- Phaser 3
- Phaser Matter physics
- Zustand

## Local setup

```bash
npm install
npm run dev
```

Then open the local Vite URL.

## Build

```bash
npm run build
npm run preview
```

## Repo setup

Recommended GitHub repo:

```txt
Relic-Forge/property-damage
```

Create the repo in the Relic Forge org, copy this package into the repo root, then commit:

```bash
git add .
git commit -m "Initialize Property Damage V1 scaffold"
git push origin main
```

## Core game loop

```txt
Choose object
→ Pull and fling
→ Physics chaos happens
→ Environment breaks
→ Damage score appears
→ Round settles
→ Damage report pays cash/fans/chaos
→ Buy upgrades
→ Try again for a better/funnier chain reaction
```

## What hooks the player

This game should not hook people with complex strategy. It hooks them with curiosity.

The player should think:

- “What happens if I launch the amp higher?”
- “Can I break the window and the neon sign in one shot?”
- “The cymbal bounced like a maniac. Can I make that happen again?”
- “What if I upgrade fragility before using the fog machine?”
- “I barely missed the TV. One more try.”

The same level stays replayable because the physics outcome changes based on launch angle, object type, spin, collision order, break thresholds, combo timing, and upgrades.

## Humor rule

Funny, not mean. Chaotic, not offensive.

Use clean smirk humor: bad band decisions, embarrassing gear choices, property damage math, weird insurance wording, landlord energy, local viral clips, garage chaos, wedding disaster, office meltdown, moving day regret.

Avoid politics, insults toward protected groups, gore, cruelty, graphic injuries, sexual jokes, or punching down.

## Current prototype

The scaffold includes one working garage scene using generated placeholder textures. The code is intentionally simple so Codex can replace placeholders with real assets later without changing the game loop.

Key files:

```txt
src/game/PropertyDamageScene.ts   Phaser + Matter physics scene
src/store/gameStore.ts            Zustand economy/progression state
src/ui/GearSelector.tsx           Object picker
src/ui/UpgradePanel.tsx           Upgrade shop
src/ui/ScorePanel.tsx             HUD stats
src/ui/EventFeed.tsx              Damage report and incident feed
docs/                            Build specs and Codex instructions
```
