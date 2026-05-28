import { BreakMaterial } from '../destruction/breakTypes';

export type MaterialSfxProfile = {
  bodyFrequency: number;
  crackFrequency: number;
  tailFrequency: number;
  noiseFilter: BiquadFilterType;
  brightness: number;
  decay: number;
};

export const MATERIAL_SFX_PROFILES: Record<BreakMaterial | string, MaterialSfxProfile> = {
  glass: { bodyFrequency: 240, crackFrequency: 2800, tailFrequency: 5200, noiseFilter: 'highpass', brightness: 1.25, decay: 0.34 },
  wood: { bodyFrequency: 115, crackFrequency: 860, tailFrequency: 1450, noiseFilter: 'bandpass', brightness: 0.74, decay: 0.28 },
  metal: { bodyFrequency: 155, crackFrequency: 1220, tailFrequency: 3100, noiseFilter: 'bandpass', brightness: 1.0, decay: 0.58 },
  electronics: { bodyFrequency: 170, crackFrequency: 1680, tailFrequency: 4200, noiseFilter: 'bandpass', brightness: 1.1, decay: 0.48 },
  soft: { bodyFrequency: 72, crackFrequency: 260, tailFrequency: 620, noiseFilter: 'lowpass', brightness: 0.45, decay: 0.32 },
  cake: { bodyFrequency: 64, crackFrequency: 220, tailFrequency: 520, noiseFilter: 'lowpass', brightness: 0.38, decay: 0.36 }
};
