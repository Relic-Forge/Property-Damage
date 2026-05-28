export type MaterialAudioProfile = {
  impactGroup: string;
  breakGroup: string;
  debrisGroup: string;
  secondaryDebrisGroup?: string;
  sweetenerGroup?: string;
  pitchBase: number;
  pitchVariance: number;
  volumeBase: number;
  debrisCount: [number, number];
  tailChance: number;
  subHitChance: number;
};

export const MATERIAL_AUDIO_PROFILES: Record<string, MaterialAudioProfile> = {
  glass: {
    impactGroup: 'impact.generic.medium',
    breakGroup: 'break.glass',
    debrisGroup: 'debris.glass',
    pitchBase: 1.08,
    pitchVariance: 0.1,
    volumeBase: 0.84,
    debrisCount: [3, 7],
    tailChance: 0.86,
    subHitChance: 0.14
  },
  ceramic: {
    impactGroup: 'impact.generic.medium',
    breakGroup: 'break.ceramic',
    debrisGroup: 'debris.ceramic',
    pitchBase: 0.98,
    pitchVariance: 0.08,
    volumeBase: 0.86,
    debrisCount: [2, 6],
    tailChance: 0.66,
    subHitChance: 0.2
  },
  wood: {
    impactGroup: 'impact.generic.heavy',
    breakGroup: 'break.wood',
    debrisGroup: 'debris.wood',
    pitchBase: 0.88,
    pitchVariance: 0.07,
    volumeBase: 0.9,
    debrisCount: [1, 4],
    tailChance: 0.34,
    subHitChance: 0.3
  },
  plastic: {
    impactGroup: 'impact.generic.light',
    breakGroup: 'break.plastic',
    debrisGroup: 'debris.plastic',
    pitchBase: 1.02,
    pitchVariance: 0.08,
    volumeBase: 0.72,
    debrisCount: [1, 4],
    tailChance: 0.24,
    subHitChance: 0.08
  },
  metal: {
    impactGroup: 'impact.generic.heavy',
    breakGroup: 'break.metal',
    debrisGroup: 'debris.metal',
    pitchBase: 0.82,
    pitchVariance: 0.06,
    volumeBase: 0.92,
    debrisCount: [1, 3],
    tailChance: 0.76,
    subHitChance: 0.36
  },
  electronics: {
    impactGroup: 'impact.generic.medium',
    breakGroup: 'break.electronics',
    debrisGroup: 'debris.plastic',
    secondaryDebrisGroup: 'debris.glass',
    sweetenerGroup: 'sweetener.electric',
    pitchBase: 0.96,
    pitchVariance: 0.1,
    volumeBase: 0.84,
    debrisCount: [2, 5],
    tailChance: 0.52,
    subHitChance: 0.24
  },
  cake: {
    impactGroup: 'impact.generic.light',
    breakGroup: 'break.plastic',
    debrisGroup: 'debris.generic',
    pitchBase: 0.72,
    pitchVariance: 0.06,
    volumeBase: 0.62,
    debrisCount: [1, 3],
    tailChance: 0.14,
    subHitChance: 0.1
  },
  soft: {
    impactGroup: 'impact.generic.light',
    breakGroup: 'break.plastic',
    debrisGroup: 'debris.generic',
    pitchBase: 0.78,
    pitchVariance: 0.05,
    volumeBase: 0.58,
    debrisCount: [1, 2],
    tailChance: 0.1,
    subHitChance: 0.05
  }
};
