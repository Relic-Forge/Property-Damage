# Build Notes

Use these notes when continuing the public `Relic-Forge/Property-Damage` prototype.

```txt
You are building Property Damage, a 2D physics chaos game using Vite + React + TypeScript + Phaser 3 + Matter physics + Zustand.

Read the repo first. Do not rewrite the entire project. Preserve the current architecture unless a change is clearly needed.

Goal for V1:
Make one polished playable Garage Band level where the player picks a band object, pulls back to fling it, breaks garage props through physics collisions, receives funny damage scoring, buys upgrades, and wants to replay the same room to create a better chain reaction.

Core design:
- This is a chaos generator, not a precision puzzle.
- The player should understand the mechanic in seconds.
- The hook is curiosity: different launch angles, different objects, funny collision chains, score bonuses, and upgrades that change outcomes.
- Humor must be clean and non-offensive. Use smirk-worthy property damage, band gear, landlord, security deposit, and insurance style jokes. No gore, no protected-class jokes, no sexual jokes, no politics.

V1 done means:
- npm install works.
- npm run dev works.
- npm run build passes.
- There is one playable Garage Band scene.
- Five flingable objects exist: guitar, bass amp, cymbal, mic stand, fog machine.
- Each object feels different in physics behavior.
- At least twelve garage props can break from collision force.
- Broken objects spawn debris or broken pieces.
- Round settles automatically and shows a damage report.
- Score includes property damage, combo, chaos, cash, fans, and at least a few funny bonus labels.
- Upgrade shop changes future runs.
- The same level is replayable and produces different outcomes.
- UI is clear, stylized, and not overly boxed-in.
- No console errors.

Implementation priorities:
1. Make the current prototype compile and run cleanly.
2. Improve launch feel: aim line, charge clarity, object spin, velocity tuning.
3. Improve break feedback: camera shake, floating damage text, debris, sound hooks.
4. Make each gear item genuinely distinct.
5. Improve scoring and damage report language.
6. Add enough polish that a player wants to try 5+ throws.
7. Keep code readable and split systems only when it actually helps.

Do not add accounts, online backend, multiplayer, app-store packaging, or full 3D. Keep V1 browser-playable.
```
