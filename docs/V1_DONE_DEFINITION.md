# V1 Done Definition

V1 is done when the game proves the mechanic is fun, funny, and replayable in one room.

## Required gameplay

- Player lands on a polished title menu before gameplay.
- Player can choose Wreck Room or Damage Rush.
- Player can launch at least five objects.
- Each object has a distinct physics personality.
- One garage environment contains at least twelve breakable props.
- Props break based on collision force, not click events.
- Broken props spawn debris or broken parts.
- Round ends when the physics settle.
- Player gets a damage report after each round.
- Player can reset/replay the same room.
- Player can buy upgrades using earned cash.
- Upgrades materially change the next run.
- Damage Rush can spawn incoming props, reload gear between launches, clear props through Matter collisions, count escapes only after props leave the screen, and show a final summary.

## Required feel

- The first throw must be understandable with no tutorial.
- Damage should feel funny and satisfying within 10 seconds.
- At least one object should make the player smirk because it behaves stupidly.
- Camera shake, floating damage text, debris, and event feed should make impacts feel alive.
- Same-room replay should feel worth doing at least five times.

## Required visual direction

- Stylized cartoon/cutout look.
- Objects readable at a glance.
- Bright impact accents against a darker garage background.
- No bland gray placeholder-only final V1.
- No offensive content.

## Required UI

- Title menu has exactly two mode buttons with descriptions.
- Visible cash, fans, chaos, and best damage.
- Object picker always clear.
- Upgrade shop visible and understandable.
- Damage report after round.
- Incident feed with clean funny text.

## Required technical quality

- `npm install` works.
- `npm run dev` starts the game.
- `npm run build` succeeds.
- `npm run typecheck` succeeds.
- No console errors during normal play.
- Game scales to common desktop browser sizes.
- Pointer controls work with mouse and touch.
- Phaser game cleanup does not duplicate canvases during React reload.
- Switching modes destroys/recreates or cleanly routes Phaser scenes without duplicate active scenes.

## Not required for V1

- User accounts.
- Saved cloud progress.
- Real money purchases.
- Multiple levels.
- Mobile app packaging.
- Real-time fracture physics.
- Complex 3D assets.
- Multiplayer.
- Full idle economy.
- Polished final sound design.

## V1 acceptance test

A new player can open the game, fling the bass amp, laugh at the damage, buy one upgrade, try the cymbal, and immediately understand why they want to play one more round.

## Main menu and Damage Rush acceptance test

A new player can open the game, see the PROPERTY DAMAGE title menu, choose Damage Rush, launch multiple pieces of band gear at incoming props, see READY/RELOADING feedback, watch props clear or escape only after leaving the screen, and reach a summary with replay and return-to-menu actions.
