# Property Damage Code Review Fix Plan

This document captures the current code review findings for Property Damage and turns them into a practical implementation checklist. The goal is not to redesign the game. The goal is to stabilize the current prototype so it runs predictably in local dev, Codex, and browser-hosted environments.

## Scope

Fix the issues below without changing the core game identity:

- Main menu stays.
- Wreck Room stays as the one-throw garage destruction mode.
- Damage Rush stays as the side-scrolling arcade mode.
- Current art direction and placeholder assets stay unless an asset path must change for deployment.
- Gameplay should feel the same or better after fixes.

## Fix priority

Work in this order:

1. Dependency / install reliability
2. Asset path and GitHub Pages deploy safety
3. Input duplication / drag reliability
4. Timer cleanup and stale callback protection
5. Upgrade locking during active rounds
6. Small cleanup and maintainability improvements

---

## 1. Regenerate `package-lock.json` without internal registry URLs

### Issue

`package-lock.json` was generated in an environment that wrote package `resolved` URLs pointing at an internal package mirror:

```txt
packages.applied-caas-gateway1.internal.api.openai.org
```

### Current effect

The game may install fine inside the environment where the lockfile was created, but fail or behave inconsistently for anyone cloning the repo locally or installing through normal public npm access.

### Fix

Regenerate the lockfile from a normal public npm registry environment.

Recommended steps:

```bash
rm -rf node_modules package-lock.json
npm config get registry
npm install
npm run typecheck
npm run build
```

The registry should normally be:

```txt
https://registry.npmjs.org/
```

If it is not, reset it before reinstalling:

```bash
npm config set registry https://registry.npmjs.org/
npm install
```

### Acceptance check

Search `package-lock.json` and confirm there are no internal mirror URLs:

```bash
grep -R "applied-caas-gateway\|internal.api.openai" package-lock.json
```

Expected result: no matches.

---

## 2. Pin dependency versions instead of using `latest`

### Issue

`package.json` uses `latest` for core dependencies. That makes future installs unpredictable, especially for Phaser, Vite, React, and TypeScript.

### Current effect

A future `npm install` can silently pull newer major versions and break the prototype even if no game code changed.

### Fix

Replace `latest` with known-good versions from the regenerated lockfile.

Also move build-only tools out of `dependencies` and into `devDependencies`.

Suggested structure:

```json
{
  "dependencies": {
    "phaser": "<locked-version>",
    "react": "<locked-version>",
    "react-dom": "<locked-version>",
    "zustand": "<locked-version>"
  },
  "devDependencies": {
    "@types/react": "<locked-version>",
    "@types/react-dom": "<locked-version>",
    "@vitejs/plugin-react": "<locked-version>",
    "typescript": "<locked-version>",
    "vite": "<locked-version>"
  }
}
```

Do not guess versions manually. Use the versions npm installs and validates.

### Acceptance check

`package.json` should contain no `latest` strings:

```bash
grep -R '"latest"' package.json
```

Expected result: no matches.

Run:

```bash
npm run typecheck
npm run build
```

Both should pass.

---

## 3. Fix asset paths for GitHub Pages / subfolder hosting

### Issue

The project uses absolute public asset paths like:

```txt
/assets/garage-band/guitar-v1.png
/assets/thrower-idle.png
```

This works at the domain root and in local dev, but can fail when deployed to a subpath such as:

```txt
https://relic-forge.github.io/Property-Damage/
```

### Current effect

On GitHub Pages, images and Phaser-loaded assets may 404 because `/assets/...` points to the domain root instead of `/Property-Damage/assets/...`.

### Files to inspect

- `vite.config.ts`
- `src/ui/GearSelector.tsx`
- `src/game/PropertyDamageScene.ts`
- `src/game/DamageRushScene.ts`
- Any other file containing `/assets/`

### Fix option A — preferred if deploying to GitHub Pages

Set the Vite base path:

```ts
export default defineConfig({
  base: '/Property-Damage/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    sourcemap: true
  }
});
```

Then centralize asset URL generation so React and Phaser use the same base-safe path.

Create something like:

```ts
// src/game/assetPath.ts
export function assetPath(path: string) {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${cleanPath}`;
}
```

Usage:

```ts
assetPath('/assets/garage-band/guitar-v1.png')
```

or:

```ts
assetPath('assets/garage-band/guitar-v1.png')
```

Both should resolve correctly.

### Fix option B — if this will only ever run at domain root

Keep Vite `base` as-is, but document that the project must be hosted at root. This is less flexible and not recommended.

### Acceptance check

Run:

```bash
npm run build
npm run preview
```

Then confirm:

- Main menu background renders.
- Gear images render in the React weapon selector.
- Wreck Room loads all garage props.
- Damage Rush loads incoming prop images.
- No 404 errors for assets in browser dev tools.

---

## 4. Remove duplicate pointer / drag input handling

### Issue

The app currently appears to support both:

- React stage pointer handling that dispatches `pd:stage-pointer`
- Phaser scene pointer handling directly through `this.input.on('pointerdown')`, `pointermove`, and `pointerup`

That means Wreck Room can receive duplicate or competing drag events.

### Current effect

Dragging and launching may feel inconsistent. Symptoms can include:

- Weird aim-line jumps
- Double launch attempts
- Drag starting from the wrong point
- Inconsistent fling velocity
- Hard-to-reproduce throw behavior

### Files to inspect

- `src/App.tsx`
- `src/game/PropertyDamageScene.ts`
- `src/game/DamageRushScene.ts`

### Fix

Pick one input system.

Recommended direction: keep React as the single pointer capture layer and keep the custom `pd:stage-pointer` bridge into Phaser.

Reason:

- React owns the full-screen overlay/menu state.
- React already knows when the game is in menu, countdown, selecting, paused, or summary state.
- Pointer capture is easier to control from the `game-stage` wrapper.

Implementation notes:

- Remove or disable direct Phaser pointer listeners in Wreck Room if React is dispatching `pd:stage-pointer`.
- Keep `stagePointerHandler` inside each Phaser scene.
- Ensure React does not dispatch pointer events while:
  - menu is open
  - round is selecting
  - countdown is active
  - game is paused
- Keep `pointercancel` mapped to pointer up.

### Acceptance check

Manual test:

1. Start Wreck Room.
2. Pick a weapon.
3. Drag slowly and release.
4. Drag quickly and release.
5. Drag out of the canvas bounds and release.
6. Repeat with each gear type.

Expected behavior:

- One drag creates one launch.
- Aim line tracks cleanly.
- No double throws.
- No stuck dragging state.
- No console errors.

Repeat the same basic test in Damage Rush.

---

## 5. Track and clear delayed callbacks / timers

### Issue

There are delayed actions using `window.setTimeout`, including scene round-finishing behavior and menu transition behavior.

### Current effect

A delayed callback can fire after the user has already:

- reset the round
- returned to menu
- switched modes
- paused/resumed
- destroyed and recreated the Phaser game

This can cause stale state updates, surprise summaries, duplicate feed entries, or callbacks touching destroyed scene objects.

### Files to inspect

- `src/App.tsx`
- `src/ui/MainMenu.tsx`
- `src/game/PropertyDamageScene.ts`
- `src/game/DamageRushScene.ts`

### Fix

Use one of these approaches consistently.

#### Phaser scene timers

Inside Phaser scenes, prefer Phaser timers:

```ts
const event = this.time.delayedCall(650, () => {
  if (!this.scene.isActive()) return;
  this.finishRound();
});
```

Track the timer event and remove it on reset/shutdown:

```ts
private finishRoundTimer: Phaser.Time.TimerEvent | null = null;

private clearTimers() {
  this.finishRoundTimer?.remove(false);
  this.finishRoundTimer = null;
}
```

Call `clearTimers()` from:

- reset handlers
- scene shutdown
- mode switch cleanup

#### React timers

In React components, store timeout IDs and clear them in `useEffect` cleanup or component unmount.

For `MainMenu`, replace fire-and-forget `window.setTimeout` with a tracked timeout:

```ts
useEffect(() => {
  return () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  };
}, []);
```

### Acceptance check

Manual stress test:

1. Start Wreck Room.
2. Launch object.
3. Immediately return to menu or start a new mode before round summary appears.
4. Confirm no old Wreck Room summary appears afterward.
5. Repeat with Damage Rush.
6. Watch console for errors.

Expected behavior:

- No stale summaries.
- No stale feed messages from abandoned rounds.
- No callback errors after scene switch.

---

## 6. Lock upgrades during active gameplay

### Issue

`UpgradePanel` lets the player buy upgrades whenever they have enough cash. It does not currently lock based on round state.

### Current effect

A player can buy upgrades during countdown, launch, or settling. If the Phaser scene reads upgrade levels during round execution, gameplay and scoring can change mid-round.

### Files to inspect

- `src/ui/UpgradePanel.tsx`
- `src/store/gameStore.ts`
- `src/game/PropertyDamageScene.ts`
- `src/game/DamageRushScene.ts`

### Fix

Disable upgrade purchasing unless the player is in a safe state.

Recommended allowed states:

- `selecting`
- `summary`
- possibly `ready`, only if upgrades are intended to affect the next throw before launch

Recommended locked states:

- `countdown`
- `launched`
- `settling`

Example:

```ts
const roundState = useGameStore((state) => state.roundState);
const upgradesLocked = ['countdown', 'launched', 'settling'].includes(roundState);
const canBuy = !upgradesLocked && cash >= cost;
```

Also update the UI copy so locked upgrades feel intentional, not broken.

Example:

```txt
Mods locked while chaos is in progress.
```

### Acceptance check

Manual test:

1. Earn enough cash to buy an upgrade.
2. Start a round.
3. During countdown, upgrade buttons should be disabled.
4. During launch/active physics, upgrade buttons should be disabled.
5. During settling, upgrade buttons should be disabled.
6. At summary or between rounds, upgrade buttons should work again.

---

## 7. Clarify mode economy and upgrade scope

### Issue

Cash and best damage are tracked per mode, but upgrades are global.

### Current effect

A player can earn cash in one mode and potentially benefit from upgrades in the other mode depending on how the store state is used. That may be intentional, but it should not be accidental.

### Files to inspect

- `src/store/gameStore.ts`
- `src/ui/ScorePanel.tsx`
- `src/ui/UpgradePanel.tsx`

### Decision needed

Choose one:

#### Option A — global upgrades

Keep upgrades shared across modes.

Then add UI copy:

```txt
Mods apply to both modes.
```

This makes the arcade feel unified and simple.

#### Option B — per-mode upgrades

Store upgrades inside each mode’s stats.

Example direction:

```ts
type ModeStats = Record<ScoreMode, {
  cash: number;
  bestDamage: number;
  upgrades: Upgrades;
}>;
```

This creates cleaner economy separation but adds complexity.

### Recommendation

For V1, use Option A. Global upgrades are simpler and more fun. Just make it explicit in the UI.

### Acceptance check

The player should be able to tell whether upgrades apply globally or only to the current mode without reading code.

---

## 8. Add a `lint` script

### Issue

The project has `typecheck`, but no lint script.

### Current effect

Codex can introduce unused variables, inconsistent imports, unreachable code, or React hook mistakes without a fast lint gate.

### Fix

Add ESLint with a simple Vite + React + TypeScript setup.

Suggested package additions:

```bash
npm install -D eslint typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh
```

Add script:

```json
"lint": "eslint ."
```

Add an ESLint config compatible with the installed ESLint version.

Keep rules practical. Do not over-tune style rules yet.

### Acceptance check

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

All should pass.

---

## 9. Make scene booting easier to reason about

### Issue

`createGame.ts` creates Phaser with `scene: []`, then adds scenes in `postBoot` and starts one based on mode.

This can work, but it is harder to reason about than direct scene registration.

### Current effect

Not an immediate bug, but future scene switching bugs become harder to trace.

### Files to inspect

- `src/game/createGame.ts`
- `src/App.tsx`

### Fix

Either keep the current approach and document why, or simplify scene registration.

Possible cleanup:

```ts
scene: [PropertyDamageScene, DamageRushScene]
```

Then start the desired scene in a predictable spot.

Do not do this if it creates churn. Treat this as cleanup after the core bugs are fixed.

### Acceptance check

Mode selection still works:

- Menu opens with blurred game preview.
- Wreck Room launches from menu.
- Damage Rush launches from menu.
- Returning to menu works.
- Switching modes does not leave hidden scenes running.

---

## 10. Pause should freeze React-owned countdown behavior

### Issue

Phaser pause does not automatically pause React timers. Countdown is controlled by React state and `window.setTimeout`.

### Current effect

If pause is allowed during countdown or near countdown state, the countdown can continue while the Phaser scene is paused.

### Files to inspect

- `src/App.tsx`

### Fix

Either:

- prevent pause during `selecting` and `countdown`, or
- make countdown respect `isPaused`.

Recommended V1 behavior:

- Do not allow pause during selecting or countdown.
- Only allow pause after the round is `ready`, `launched`, or `settling`.

Update `openPauseMenu` guard accordingly.

### Acceptance check

- Pressing pause during weapon select should do nothing.
- Pressing pause during countdown should do nothing or cancel countdown intentionally.
- Pressing pause during active gameplay should freeze the scene.
- Resuming should continue cleanly.

---

## Final validation checklist

Run these commands after all fixes:

```bash
npm install
npm run lint
npm run typecheck
npm run build
npm run preview
```

Manual browser test:

- App opens to main menu.
- Wreck Room can start, select all five gear types, launch once per drag, and show summary.
- Damage Rush can start, spawn props, launch gear, clear props, count escapes, and show summary.
- Return to menu works from both modes.
- Switching modes does not create stale summaries or duplicate event feed messages.
- Upgrade buttons lock during active gameplay.
- Assets load without 404s.
- Console stays clean during mode switching, reset, pause/resume, and repeated rounds.

## Commit guidance

Use small commits:

1. `Fix dependency lockfile and pin package versions`
2. `Make asset paths deploy-safe`
3. `Normalize pointer input handling`
4. `Clear stale timers on reset and scene shutdown`
5. `Lock upgrades during active rounds`
6. `Add lint script and cleanup checks`

Keep gameplay tuning changes separate from stability fixes.
