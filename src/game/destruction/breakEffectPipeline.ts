import Phaser from 'phaser';
import { gameAudio } from '../audio/gameAudio';
import { destroyGeneratedFragment } from './breakCleanup';
import { getBreakProfile } from './breakProfiles';
import { BreakFragment, BreakRequest } from './breakTypes';
import { createFragmentTextures } from './fragmentTextureFactory';

const MAX_ACTIVE_FRAGMENTS = 140;
const MAX_FRAGMENTS_PER_BREAK = 28;
const LOW_IMPACT_FRAGMENT_MULTIPLIER = 0.65;

export function breakObject(request: BreakRequest): BreakFragment[] {
  const profile = getBreakProfile(request.profileId, request.material);
  const random = createSeededRandom(request.seed || Date.now());
  const existingFragments = countActiveGeneratedFragments(request.scene);
  const budget = Math.max(0, MAX_ACTIVE_FRAGMENTS - existingFragments);
  if (budget <= 0) {
    gameAudio.playBreak(profile.id, profile.material, request.impactStrength);
    return [];
  }

  const baseCount = randomInt(profile.pieceCount[0], profile.pieceCount[1], random);
  const impactMultiplier = request.impactStrength < 16 ? LOW_IMPACT_FRAGMENT_MULTIPLIER : 1;
  const pieceCount = Math.min(MAX_FRAGMENTS_PER_BREAK, budget, Math.max(3, Math.round(baseCount * impactMultiplier)));
  const fragments = createFragmentTextures(request, profile, pieceCount, random);

  fragments.forEach((fragment) => {
    fragment.setData('generatedFragment', true);
    launchFragment(fragment, request, profile.velocityMultiplier, random);
    const lifespan = randomInt(profile.lifespanMs[0], profile.lifespanMs[1], random);
    const fadeDelay = Math.min(lifespan - 220, randomInt(profile.fadeDelayMs[0], profile.fadeDelayMs[1], random));
    request.scene.tweens.add({
      targets: fragment,
      alpha: 0,
      duration: Math.max(180, lifespan - fadeDelay),
      delay: fadeDelay,
      onComplete: () => destroyGeneratedFragment(fragment)
    });
    request.scene.time.delayedCall(lifespan + 100, () => {
      if (fragment.active) destroyGeneratedFragment(fragment);
    });
  });

  if (budget > 12) spawnEffects(request, profile, random);
  gameAudio.playBreak(profile.id, profile.material, request.impactStrength);
  return fragments;
}

function launchFragment(fragment: BreakFragment, request: BreakRequest, profileVelocity: number, random: () => number) {
  const fromImpact = new Phaser.Math.Vector2(fragment.x - request.impactPoint.x, fragment.y - request.impactPoint.y);
  if (fromImpact.lengthSq() < 8) fromImpact.set((random() - 0.5) * 2, -1);
  fromImpact.normalize();
  const inherited = request.impactVelocity.clone().scale(0.12);
  const strength = Phaser.Math.Clamp(request.impactStrength / 7, 1.6, 9.5) * profileVelocity;
  const lift = Phaser.Math.Linear(1.2, 5.4, random());
  fragment.setVelocity(
    fromImpact.x * strength + inherited.x + Phaser.Math.FloatBetween(-1.8, 1.8),
    fromImpact.y * strength + inherited.y - lift
  );
}

function spawnEffects(request: BreakRequest, profile: ReturnType<typeof getBreakProfile>, random: () => number) {
  if (profile.dust && request.scene.textures.exists('effect-dust-puff')) {
    for (let i = 0; i < 3; i += 1) spawnEffect(request, 'effect-dust-puff', 0.28, 1.45, random);
  }
  if (profile.sparks && request.scene.textures.exists('effect-spark')) {
    for (let i = 0; i < 4; i += 1) spawnEffect(request, 'effect-spark', 0.72, 0.95, random);
  }
  if (profile.smoke && request.scene.textures.exists('effect-smoke-puff')) {
    for (let i = 0; i < 2; i += 1) spawnEffect(request, 'effect-smoke-puff', 0.32, 1.6, random);
  }
}

function spawnEffect(request: BreakRequest, textureKey: string, alpha: number, scale: number, random: () => number) {
  const effect = request.scene.matter.add.image(
    request.impactPoint.x + Phaser.Math.FloatBetween(-12, 12),
    request.impactPoint.y + Phaser.Math.FloatBetween(-12, 12),
    textureKey,
    undefined,
    { restitution: 0.2, frictionAir: 0.08 }
  );
  effect.setDepth(11);
  effect.setAlpha(alpha);
  effect.setScale(Phaser.Math.Linear(scale * 0.58, scale, random()));
  effect.setVelocity(Phaser.Math.FloatBetween(-3.5, 3.5), Phaser.Math.FloatBetween(-4, 1));
  request.scene.tweens.add({
    targets: effect,
    alpha: 0,
    scale: scale * 1.8,
    duration: 520 + random() * 460,
    onComplete: () => effect.destroy()
  });
}

function countActiveGeneratedFragments(scene: Phaser.Scene) {
  return scene.children.list.filter((child) => child.getData?.('generatedFragment')).length;
}

function createSeededRandom(seed: number) {
  let value = Math.floor(seed) % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function randomInt(min: number, max: number, random: () => number) {
  return Math.floor(Phaser.Math.Linear(min, max + 1, random()));
}
