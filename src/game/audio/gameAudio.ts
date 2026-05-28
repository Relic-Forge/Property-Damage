import Phaser from 'phaser';
import { MATERIAL_SFX_PROFILES } from './sfxProfiles';

const MIN_MS_BETWEEN_BREAK_SOUNDS_BY_OBJECT = 120;
const MAX_SIMULTANEOUS_BREAK_SOUNDS = 6;
const IMPACT_SOUND_THRESHOLD = 5;

type WebAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

let audioContext: AudioContext | null = null;
let masterBus: GainNode | null = null;
let ambienceBus: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let shortVerb: ConvolverNode | null = null;
let activeBreakSounds = 0;
const lastBreakSoundByProfile = new Map<string, number>();

function getAudioContext() {
  const AudioContextClass = window.AudioContext || (window as WebAudioWindow).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext || audioContext.state === 'closed') audioContext = new AudioContextClass();
  return audioContext;
}

function resumeContext() {
  const audio = getAudioContext();
  if (!audio) return null;
  ensureOutputChain(audio);
  if (audio.state === 'suspended') void audio.resume();
  return audio;
}

function ensureOutputChain(audio: AudioContext) {
  if (masterBus && ambienceBus && compressor && shortVerb) return;
  compressor = audio.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, audio.currentTime);
  compressor.knee.setValueAtTime(20, audio.currentTime);
  compressor.ratio.setValueAtTime(8, audio.currentTime);
  compressor.attack.setValueAtTime(0.004, audio.currentTime);
  compressor.release.setValueAtTime(0.16, audio.currentTime);

  masterBus = audio.createGain();
  masterBus.gain.setValueAtTime(0.72, audio.currentTime);

  ambienceBus = audio.createGain();
  ambienceBus.gain.setValueAtTime(0.12, audio.currentTime);

  shortVerb = audio.createConvolver();
  shortVerb.buffer = makeImpulseBuffer(audio, 0.28, 1.7);

  masterBus.connect(compressor);
  ambienceBus.connect(shortVerb);
  shortVerb.connect(compressor);
  compressor.connect(audio.destination);
}

function makeNoiseBuffer(audio: AudioContext, duration: number) {
  const buffer = audio.createBuffer(1, Math.max(1, Math.floor(audio.sampleRate * duration)), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  return buffer;
}

function makeImpulseBuffer(audio: AudioContext, duration: number, decay: number) {
  const buffer = audio.createBuffer(2, Math.max(1, Math.floor(audio.sampleRate * duration)), audio.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      const t = index / data.length;
      data[index] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return buffer;
}

function connectOutput(node: AudioNode, sendAmount = 0) {
  if (masterBus) node.connect(masterBus);
  if (sendAmount > 0 && ambienceBus) {
    const send = node.context.createGain();
    send.gain.setValueAtTime(sendAmount, node.context.currentTime);
    node.connect(send);
    send.connect(ambienceBus);
  }
}

function playTone(
  frequency: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  delay = 0,
  endFrequency?: number,
  sendAmount = 0
) {
  const audio = resumeContext();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  connectOutput(gain, sendAmount);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function playNoise(
  duration: number,
  volume: number,
  filterType: BiquadFilterType,
  frequency: number,
  delay = 0,
  q = 0.85,
  sweepTo?: number,
  sendAmount = 0
) {
  const audio = resumeContext();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  source.buffer = makeNoiseBuffer(audio, duration);
  filter.type = filterType;
  filter.frequency.setValueAtTime(frequency, start);
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(30, sweepTo), start + duration);
  filter.Q.setValueAtTime(q, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  connectOutput(gain, sendAmount);
  source.start(start);
  source.stop(start + duration + 0.02);
}

function playResonantHit(frequency: number, duration: number, volume: number, delay = 0, sendAmount = 0.08) {
  playTone(frequency, duration, volume, 'sine', delay, frequency * 0.72, sendAmount);
  playTone(frequency * 2.01, duration * 0.62, volume * 0.34, 'triangle', delay + 0.008, frequency * 1.4, sendAmount);
}

function playChord(frequencies: number[], duration: number, volume: number, delay = 0, sendAmount = 0.08) {
  frequencies.forEach((frequency, index) => {
    playTone(frequency, duration + index * 0.025, volume / Math.sqrt(frequencies.length), index % 2 ? 'triangle' : 'sine', delay + index * 0.018, undefined, sendAmount);
  });
}

function scaledIntensity(intensity: number) {
  return Math.pow(Phaser.Math.Clamp(intensity / 45, 0.12, 1), 0.72);
}

export const gameAudio = {
  unlock(): void {
    try {
      const audio = resumeContext();
      if (!audio) return;
      const gain = audio.createGain();
      const source = audio.createBufferSource();
      source.buffer = audio.createBuffer(1, 1, audio.sampleRate);
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      source.connect(gain);
      gain.connect(audio.destination);
      source.start();
      source.stop(audio.currentTime + 0.01);
    } catch {
      // Browser audio support and autoplay state are intentionally non-fatal.
    }
  },

  playUiClick(): void {
    playTone(240, 0.045, 0.026, 'square', 0, 210);
    playNoise(0.035, 0.012, 'highpass', 1400, 0.004, 0.7);
  },

  playMenuSelect(): void {
    playNoise(0.16, 0.024, 'bandpass', 420, 0, 1.1, 980, 0.08);
    playChord([146.83, 220, 293.66], 0.18, 0.052, 0.018, 0.12);
    playTone(587.33, 0.16, 0.018, 'triangle', 0.12, 440, 0.14);
  },

  playUiHover(): void {
    playTone(620, 0.035, 0.008, 'sine', 0, 760, 0.03);
  },

  playUiLocked(): void {
    playNoise(0.09, 0.022, 'lowpass', 280, 0, 0.6, 170);
    playTone(92, 0.12, 0.026, 'triangle', 0.01, 68);
  },

  playWeaponToggle(opening: boolean): void {
    if (opening) {
      playNoise(0.13, 0.026, 'bandpass', 520, 0, 1.4, 1160, 0.06);
      playTone(196, 0.08, 0.024, 'square', 0.012, 294);
      playTone(392, 0.11, 0.018, 'triangle', 0.042, 523, 0.08);
      return;
    }
    playNoise(0.08, 0.016, 'bandpass', 620, 0, 1, 310);
    playTone(330, 0.08, 0.018, 'triangle', 0.012, 196, 0.04);
  },

  playWeaponSelect(gearType: string): void {
    if (gearType === 'guitar') {
      playChord([196, 246.94, 329.63], 0.12, 0.05, 0, 0.1);
      playTone(659.25, 0.1, 0.014, 'sawtooth', 0.08, 880, 0.1);
      return;
    }
    if (gearType === 'amp') {
      playResonantHit(82.41, 0.24, 0.06, 0, 0.1);
      playNoise(0.18, 0.026, 'lowpass', 360, 0.015, 0.8, 180);
      return;
    }
    if (gearType === 'cymbal') {
      playNoise(0.28, 0.034, 'highpass', 4200, 0, 1.8, 7600, 0.18);
      playTone(1740, 0.22, 0.015, 'sine', 0.012, 1320, 0.2);
      return;
    }
    if (gearType === 'micStand') {
      playTone(420, 0.045, 0.026, 'square', 0, 960);
      playTone(180, 0.12, 0.018, 'triangle', 0.035, 140, 0.08);
      return;
    }
    if (gearType === 'fogMachine') {
      playNoise(0.24, 0.035, 'bandpass', 240, 0, 0.7, 780, 0.16);
      playTone(146.83, 0.18, 0.018, 'triangle', 0.06, 110, 0.12);
      return;
    }
    playTone(240, 0.045, 0.026, 'square', 0, 210);
    playNoise(0.035, 0.012, 'highpass', 1400, 0.004, 0.7);
  },

  playUpgradeToggle(opening: boolean): void {
    if (opening) {
      playTone(261.63, 0.07, 0.022, 'triangle', 0, 329.63);
      playTone(392, 0.09, 0.018, 'sine', 0.035, 523.25, 0.08);
      playNoise(0.1, 0.012, 'bandpass', 900, 0.01, 1.3, 1400);
      return;
    }
    playTone(392, 0.07, 0.016, 'triangle', 0, 261.63);
    playNoise(0.06, 0.01, 'bandpass', 620, 0, 1, 360);
  },

  playUpgradeBuy(): void {
    playNoise(0.08, 0.015, 'highpass', 1800, 0, 0.9, 3200);
    playChord([261.63, 329.63, 392], 0.16, 0.054, 0.025, 0.1);
    playTone(783.99, 0.18, 0.018, 'sine', 0.12, 1046.5, 0.14);
  },

  playThrowWindup(charge: number): void {
    const power = Phaser.Math.Clamp(charge, 0.08, 1);
    playNoise(0.18, 0.018 + power * 0.032, 'bandpass', 180 + power * 380, 0, 0.75, 320 + power * 980);
    playTone(82 + power * 116, 0.14, 0.012 + power * 0.02, 'sawtooth', 0, 110 + power * 220, 0.05);
  },

  playThrowRelease(charge: number, gearType: string): void {
    const power = Phaser.Math.Clamp(charge, 0.12, 1);
    const weight = gearType === 'amp' ? 1.25 : gearType === 'cymbal' ? 0.82 : 1;
    playNoise(0.26, 0.04 * power * weight, 'bandpass', 430 + power * 900, 0, 0.9, 1300 + power * 1800, 0.06);
    playTone(130 * weight, 0.13, 0.024 * power, 'triangle', 0.018, 85 * weight, 0.06);
    if (gearType === 'guitar') playChord([146.83, 196, 246.94], 0.12, 0.028 * power, 0.055, 0.08);
    if (gearType === 'cymbal') playNoise(0.32, 0.026 * power, 'highpass', 3800, 0.035, 1.6, 7200, 0.16);
    if (gearType === 'fogMachine') playNoise(0.28, 0.026 * power, 'bandpass', 250, 0.03, 0.65, 760, 0.16);
  },

  playImpact(material: string, intensity: number): void {
    if (intensity < IMPACT_SOUND_THRESHOLD) return;
    const profile = MATERIAL_SFX_PROFILES[material] ?? MATERIAL_SFX_PROFILES.wood;
    const power = scaledIntensity(intensity);
    if (material === 'glass') {
      playNoise(0.12 + power * 0.08, 0.014 + power * 0.032, 'highpass', 2400, 0, 1.4, 5200, 0.12);
      playTone(1760, 0.12, 0.008 + power * 0.016, 'sine', 0.02, 1340, 0.16);
      return;
    }
    if (material === 'metal') {
      playResonantHit(170 + power * 50, 0.22, 0.018 + power * 0.04, 0, 0.12);
      playNoise(0.08, 0.012 + power * 0.022, 'bandpass', 1200, 0.012, 1.8, 2200);
      return;
    }
    if (material === 'electronics') {
      playNoise(0.12, 0.012 + power * 0.028, 'bandpass', 1400, 0, 1.2, 2600, 0.08);
      playTone(120 + power * 80, 0.16, 0.012 + power * 0.026, 'triangle', 0.012, 78, 0.08);
      return;
    }
    if (material === 'soft' || material === 'cake') {
      playNoise(0.12 + power * 0.08, 0.012 + power * 0.026, 'lowpass', 260, 0, 0.55, 170);
      playTone(64, 0.13, 0.01 + power * 0.018, 'sine', 0.01, 48);
      return;
    }
    playNoise(0.09 + power * 0.08, 0.012 + power * 0.03, profile.noiseFilter, profile.crackFrequency * profile.brightness, 0, 0.95, profile.tailFrequency);
    playTone(profile.bodyFrequency, 0.12 + power * 0.1, 0.012 + power * 0.026, 'triangle', 0, profile.bodyFrequency * 0.72, 0.06);
  },

  playBreak(profileId: string, material: string, intensity: number): void {
    const now = performance.now();
    const lastAt = lastBreakSoundByProfile.get(profileId) ?? 0;
    if (now - lastAt < MIN_MS_BETWEEN_BREAK_SOUNDS_BY_OBJECT || activeBreakSounds >= MAX_SIMULTANEOUS_BREAK_SOUNDS) return;
    lastBreakSoundByProfile.set(profileId, now);
    activeBreakSounds += 1;
    window.setTimeout(() => {
      activeBreakSounds = Math.max(0, activeBreakSounds - 1);
    }, 420);

    const profile = MATERIAL_SFX_PROFILES[material] ?? MATERIAL_SFX_PROFILES.wood;
    const power = scaledIntensity(intensity);
    playProfileBreak(profileId, material, profile, power);
  }
};

function playProfileBreak(profileId: string, material: string, profile: typeof MATERIAL_SFX_PROFILES[string], power: number) {
  if (profileId === 'neonSign') {
    playNoise(0.2, 0.046 + power * 0.046, 'highpass', 3200, 0, 1.8, 7400, 0.18);
    playTone(880, 0.18, 0.018 + power * 0.018, 'sine', 0.025, 1318.51, 0.22);
    playTone(1760, 0.28, 0.012 + power * 0.018, 'triangle', 0.08, 1174.66, 0.24);
    return;
  }
  if (profileId === 'garageWindow') {
    playNoise(0.24, 0.05 + power * 0.05, 'highpass', 2600, 0, 1.5, 6200, 0.18);
    playTone(1480, 0.16, 0.012 + power * 0.02, 'sine', 0.04, 980, 0.18);
    playTone(2320, 0.2, 0.008 + power * 0.014, 'sine', 0.1, 1640, 0.18);
    return;
  }
  if (profileId === 'foldingTable' || profileId === 'garageShelf' || profileId === 'mysteryBox') {
    playNoise(0.09, 0.04 + power * 0.04, 'bandpass', 760, 0, 1.2, 1250, 0.05);
    playTone(118, 0.2, 0.034 + power * 0.048, 'triangle', 0.012, 82, 0.08);
    playNoise(0.18, 0.018 + power * 0.028, 'lowpass', 360, 0.07, 0.7, 170);
    return;
  }
  if (profileId === 'oldTv') {
    playNoise(0.16, 0.04 + power * 0.05, 'bandpass', 1250, 0, 1.1, 2600, 0.12);
    playResonantHit(94, 0.24, 0.04 + power * 0.04, 0.015, 0.08);
    playNoise(0.18, 0.02 + power * 0.034, 'highpass', 3600, 0.075, 1.7, 6800, 0.16);
    playTone(1720, 0.18, 0.01 + power * 0.014, 'square', 0.115, 1240);
    return;
  }
  if (profileId === 'speakerStack') {
    playResonantHit(72, 0.32, 0.055 + power * 0.052, 0, 0.12);
    playNoise(0.14, 0.026 + power * 0.034, 'bandpass', 540, 0.025, 0.9, 280, 0.08);
    playTone(145, 0.24, 0.024 + power * 0.024, 'sine', 0.08, 68, 0.12);
    return;
  }
  if (profileId === 'paintCan' || profileId === 'cooler' || profileId === 'tinyDrumKit') {
    const root = profileId === 'tinyDrumKit' ? 220 : 165;
    playNoise(0.1, 0.032 + power * 0.04, 'bandpass', 1600, 0, 2.1, 3200, 0.1);
    playResonantHit(root, 0.38, 0.045 + power * 0.046, 0.01, 0.16);
    playTone(root * 2.7, 0.24, 0.012 + power * 0.016, 'sine', 0.09, root * 1.6, 0.18);
    return;
  }
  if (profileId === 'questionableCake') {
    playNoise(0.18, 0.04 + power * 0.045, 'lowpass', 310, 0, 0.55, 120);
    playTone(58, 0.22, 0.026 + power * 0.032, 'sine', 0.02, 42);
    playNoise(0.16, 0.018 + power * 0.024, 'bandpass', 520, 0.08, 0.7, 260, 0.08);
    return;
  }
  if (profileId === 'cableBin') {
    playNoise(0.16, 0.028 + power * 0.032, 'bandpass', 420, 0, 0.8, 220, 0.06);
    playTone(98, 0.18, 0.018 + power * 0.022, 'triangle', 0.03, 72);
    return;
  }

  playNoise(0.12 + profile.decay * power, 0.035 + power * 0.065, profile.noiseFilter, profile.crackFrequency * profile.brightness, 0, 0.95, profile.tailFrequency, 0.1);
  playTone(profile.bodyFrequency, 0.18 + profile.decay * 0.45, 0.03 + power * 0.055, material === 'metal' ? 'sine' : 'triangle', 0, profile.bodyFrequency * 0.72, 0.08);
  if (material === 'glass' || material === 'electronics') {
    playTone(profile.tailFrequency, 0.32, 0.014 + power * 0.025, 'sine', 0.055, profile.tailFrequency * 0.72, 0.18);
    playTone(profile.tailFrequency * 1.34, 0.22, 0.008 + power * 0.016, 'triangle', 0.11, profile.tailFrequency, 0.16);
  }
  if (material === 'electronics') playNoise(0.18, 0.018 + power * 0.028, 'highpass', 3600, 0.08, 1.5, 6200, 0.12);
}
