# Property Damage

Property Damage is a browser-playable 2D physics chaos game about launching questionable band gear into fragile rooms and trying to create the funniest, most expensive chain reaction possible.

The first playable pack is **Garage Band**: guitars, bass amps, cymbals, mic stands, fog machines, cheap garage props, bad adult decisions, and clean non-offensive humor.

## Playable Modes

- **Wreck Room**: a one-throw garage destruction sandbox built around aim, launch power, breakable props, combo scoring, and upgrades.
- **Damage Rush**: a side-scrolling arcade mode where valuable props roll in from the right while the player launches band gear from the left to clear them before they escape.

## Current Status

This repo is an early public prototype. The target is not a finished commercial game yet; it is a proof that the core loop is fun on repeat.

The current build includes:

- A title menu with mode selection.
- Five launchable gear choices: guitar, bass amp, cymbal, mic stand, and fog machine.
- Phaser Matter physics for throws, collisions, prop breaks, debris, and score events.
- Live score, cash, best damage, combo, fans, chaos, and upgrade progression.
- Generated Garage Band art assets in `public/assets/garage-band`.
- A GitHub Pages workflow that builds and publishes the Vite app from `main`.

## Tech Stack

- Vite
- React
- TypeScript
- Phaser 3
- Phaser Matter physics
- Zustand

## Local Development

```bash
npm install
npm run dev
```

Then open the local Vite URL. By default the dev server uses port `5173`.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

Preview the production build locally with:

```bash
npm run preview
```

## GitHub Pages

The app is configured for GitHub Pages under:

```txt
https://relic-forge.github.io/Property-Damage/
```

The `Deploy to GitHub Pages` workflow runs on pushes to `main`. It installs dependencies with `npm ci`, runs lint/typecheck/build, uploads `dist`, and deploys the static site.

## Core Game Loop

```txt
Choose object
-> Pull and fling
-> Physics chaos happens
-> Environment breaks
-> Damage score appears
-> Round settles
-> Damage report pays cash/fans/chaos
-> Buy upgrades
-> Try again for a better chain reaction
```

## Design Rules

The game should hook players through curiosity rather than complex strategy.

Good player questions:

- What happens if I launch the amp higher?
- Can I break the window and the neon sign in one shot?
- The cymbal bounced wildly. Can I make that happen again?
- What if I upgrade fragility before using the fog machine?
- I barely missed the TV. One more try.

The same level should stay replayable because physics outcomes change based on launch angle, object type, spin, collision order, break thresholds, combo timing, and upgrades.

## Humor Rule

Funny, not mean. Chaotic, not offensive.

Use clean smirk humor: bad band decisions, embarrassing gear choices, property damage math, weird insurance wording, landlord energy, local viral clips, garage chaos, wedding disaster, office meltdown, and moving day regret.

Avoid politics, insults toward protected groups, gore, cruelty, graphic injuries, sexual jokes, or punching down.

## Project Map

```txt
src/App.tsx                         React shell, game mount, menus, overlays
src/game/PropertyDamageScene.ts     Wreck Room Phaser + Matter scene
src/game/DamageRushScene.ts         Damage Rush arcade physics mode
src/game/createGame.ts              Phaser boot and scene routing
src/game/modes.ts                   Shared mode types
src/store/gameStore.ts              Zustand economy/progression state
src/ui/MainMenu.tsx                 Title menu and mode selection
src/ui/GearSelector.tsx             Object picker
src/ui/UpgradePanel.tsx             Upgrade shop
src/ui/ScorePanel.tsx               HUD stats
public/assets/garage-band/          Generated SVG game assets
docs/                               Design notes, art direction, backlog, prompts
```

## Useful Docs

- [Game spec](docs/GAME_SPEC.md)
- [Art direction](docs/ART_DIRECTION.md)
- [Asset manifest](docs/ASSET_MANIFEST.md)
- [V1 done definition](docs/V1_DONE_DEFINITION.md)
- [Suggested GitHub issues](docs/GITHUB_ISSUES.md)

## License

No open-source license has been selected yet. All rights are reserved unless a license is added later.
