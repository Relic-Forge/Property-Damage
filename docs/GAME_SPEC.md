# Property Damage — Game Spec

## One-line pitch

A physics chaos game where players fling ridiculous objects into fragile rooms and try to cause the funniest, most expensive destruction possible.

## Design pillar

The game is a **chaos generator**, not a precision puzzle.

The player should feel smart when they cause a chain reaction, but the game should also produce unexpected outcomes that make them laugh.

## V1 pack

**Garage Band Pack**

The player launches band equipment into a messy garage rehearsal space.

### Flingable objects

| Object | Personality | Physics behavior | Player expectation |
|---|---|---|---|
| Guitar | classic chaos | medium mass, spins | unpredictable wall bounces |
| Bass Amp | heavy regret | high mass, low bounce | crushes objects and starts collapses |
| Cymbal | shiny menace | high bounce, round | ricochets and tags fragile items |
| Mic Stand | spear of bad ideas | long thin body | pierces across the room |
| Fog Machine | dumbest object | medium mass, burst bonus | smoke/fog incident and bonus chaos |

### Environment objects

| Object | Role |
|---|---|
| Folding table | easy early break target |
| Questionable cake | funny soft object, good bonus target |
| Old TV | high-value satisfying target |
| Speaker stack | heavy collapse object |
| Cooler of regret | sliding object that can knock others |
| Garage shelf | chain-reaction platform |
| Paint can | small target, debris source |
| Cable bin | soft chaos object |
| Mystery box | surprise debris object |
| Neon sign | fragile high-value target |
| Tiny drum kit | theme anchor |
| Garage window | fragile high-score target |

## Controls

V1 controls stay dead simple.

- Pointer/touch down near launcher.
- Drag backward to aim and charge.
- Release to fling.
- Round ends when physics settle.
- Reset button reloads the room.

## Round flow

1. Player selects object.
2. Player pulls and releases.
3. Object launches with velocity and spin.
4. Collision force damages breakable objects.
5. Objects break into debris when health reaches zero.
6. Damage score pops up at the break location.
7. Combo increases if multiple objects break close together in time.
8. Round settles once physics stop moving.
9. Damage report pays cash/fans/chaos.
10. Player buys upgrades and repeats.

## Scoring model

V1 scoring intentionally favors spectacle over precision.

```txt
Damage = object base value × combo multiplier + impact force bonus
Cash payout = total damage × 12%
Fans = total damage / 300 + viral bonus
Chaos = impact intensity + combo value
```

### Score categories

- Property Damage
- Combo Chain
- Chaos Bonus
- Viral Clip Bonus
- Insurance Math Bonus
- Security Deposit Bonus

## Upgrade model

| Upgrade | Effect | Why it matters |
|---|---|---|
| Launch Power | stronger launch velocity | bigger hits, more room coverage |
| Gear Weight | more mass | heavier collisions feel better |
| Fragile Room | lower effective durability | more frequent breaks |
| Viral Clip | more bonus fans | idle/progression hook |
| Insurance Math | better payout multiplier | cash progression |

## Same-level replayability

The room should remain fun even before new levels exist.

Replay comes from:

- different object behavior
- launch angle experimentation
- combo timing
- partially unpredictable bounces
- upgrades changing the damage curve
- funny incident feed text
- trying to beat best damage
- aiming for specific high-value targets
- rare viral bonuses

## Expansion structure

The name **Property Damage** is the umbrella. Garage Band is only Pack 1.

Future packs can reuse the same engine:

- Moving Day
- Office Meltdown
- Wedding Disaster
- Toddler Mode
- Holiday Party
- Failed Magician
- Influencer Photo Shoot
- Haunted Open House

Each pack only needs:

- new background
- new flingable objects
- new breakable props
- new flavor text
- new score bonuses
