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
let musicBus: GainNode | null = null;
let ambienceBus: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let shortVerb: ConvolverNode | null = null;
let activeBreakSounds = 0;
let sfxVolume = 0.86;
let musicVolume = 0.42;
let musicTimer: number | null = null;
let musicStep = 0;
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
  if (masterBus && musicBus && ambienceBus && compressor && shortVerb) return;
  compressor = audio.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, audio.currentTime);
  compressor.knee.setValueAtTime(20, audio.currentTime);
  compressor.ratio.setValueAtTime(8, audio.currentTime);
  compressor.attack.setValueAtTime(0.004, audio.currentTime);
  compressor.release.setValueAtTime(0.16, audio.currentTime);

  masterBus = audio.createGain();
  masterBus.gain.setValueAtTime(0.72 * sfxVolume, audio.currentTime);

  musicBus = audio.createGain();
  musicBus.gain.setValueAtTime(0.26 * musicVolume, audio.currentTime);

  ambienceBus = audio.createGain();
  ambienceBus.gain.setValueAtTime(0.12 * sfxVolume, audio.currentTime);

  shortVerb = audio.createConvolver();
  shortVerb.buffer = makeImpulseBuffer(audio, 0.28, 1.7);

  masterBus.connect(compressor);
  musicBus.connect(compressor);
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

function connectMusicOutput(node: AudioNode) {
  if (musicBus) node.connect(musicBus);
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

function createDistortionCurve(amount: number) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  for (let index = 0; index < samples; index += 1) {
    const x = (index * 2) / samples - 1;
    curve[index] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

function playDistortedTone(frequency: number, duration: number, volume: number, delay = 0, endFrequency?: number) {
  const audio = resumeContext();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const shaper = audio.createWaveShaper();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
  shaper.curve = createDistortionCurve(520);
  shaper.oversample = '4x';
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(780, start);
  filter.frequency.exponentialRampToValueAtTime(210, start + duration);
  filter.Q.setValueAtTime(1.9, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(shaper);
  shaper.connect(filter);
  filter.connect(gain);
  connectOutput(gain, 0.08);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}

function playMusicStep() {
  const audio = resumeContext();
  if (!audio || musicVolume <= 0.001) return;
  const start = audio.currentTime;
  const bassNotes = [55, 55, 65.41, 73.42, 82.41, 73.42, 65.41, 49];
  const leadNotes = [220, 246.94, 196, 293.66, 261.63, 196, 164.81, 146.83];
  const step = musicStep % bassNotes.length;
  const bass = audio.createOscillator();
  const bassGain = audio.createGain();
  const bassFilter = audio.createBiquadFilter();
  bass.type = 'sawtooth';
  bass.frequency.setValueAtTime(bassNotes[step], start);
  bassFilter.type = 'lowpass';
  bassFilter.frequency.setValueAtTime(210, start);
  bassFilter.Q.setValueAtTime(0.9, start);
  bassGain.gain.setValueAtTime(0.0001, start);
  bassGain.gain.exponentialRampToValueAtTime(0.13, start + 0.018);
  bassGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
  bass.connect(bassFilter);
  bassFilter.connect(bassGain);
  connectMusicOutput(bassGain);
  bass.start(start);
  bass.stop(start + 0.38);

  if (step % 2 === 1) {
    const lead = audio.createOscillator();
    const leadGain = audio.createGain();
    lead.type = 'triangle';
    lead.frequency.setValueAtTime(leadNotes[step], start + 0.035);
    lead.frequency.exponentialRampToValueAtTime(leadNotes[step] * 0.985, start + 0.21);
    leadGain.gain.setValueAtTime(0.0001, start + 0.035);
    leadGain.gain.exponentialRampToValueAtTime(0.034, start + 0.055);
    leadGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
    lead.connect(leadGain);
    connectMusicOutput(leadGain);
    lead.start(start + 0.035);
    lead.stop(start + 0.27);
  }

  musicStep += 1;
}

function scaledIntensity(intensity: number) {
  return Math.pow(Phaser.Math.Clamp(intensity / 45, 0.12, 1), 0.72);
}

export const gameAudio = {
  setVolumes(settings: { musicVolume?: number; sfxVolume?: number }): void {
    sfxVolume = Phaser.Math.Clamp(settings.sfxVolume ?? sfxVolume, 0, 1);
    musicVolume = Phaser.Math.Clamp(settings.musicVolume ?? musicVolume, 0, 1);
    if (!audioContext) return;
    const audio = audioContext;
    ensureOutputChain(audio);
    masterBus?.gain.setTargetAtTime(0.72 * sfxVolume, audio.currentTime, 0.018);
    ambienceBus?.gain.setTargetAtTime(0.12 * sfxVolume, audio.currentTime, 0.018);
    musicBus?.gain.setTargetAtTime(0.26 * musicVolume, audio.currentTime, 0.035);
  },

  getSfxVolume(): number {
    return sfxVolume;
  },

  startMusic(): void {
    const audio = resumeContext();
    if (!audio || musicTimer !== null) return;
    playMusicStep();
    musicTimer = window.setInterval(playMusicStep, 430);
  },

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
    playTone(220, 0.032, 0.05, 'square', 0, 180);
    playTone(720, 0.026, 0.024, 'triangle', 0.004, 1040);
    playNoise(0.028, 0.032, 'highpass', 1800, 0, 0.9, 3600, 0.02);
  },

  playMenuSelect(): void {
    playNoise(0.036, 0.046, 'highpass', 1600, 0, 0.85, 3200, 0.03);
    playNoise(0.11, 0.056, 'bandpass', 420, 0.012, 1.15, 1180, 0.1);
    playTone(73.42, 0.2, 0.056, 'triangle', 0.014, 52, 0.08);
    playTone(146.83, 0.13, 0.03, 'sawtooth', 0.045, 98, 0.08);
    playNoise(0.09, 0.022, 'lowpass', 220, 0.075, 0.6, 120);
  },

  playUiHover(): void {
    playTone(690, 0.034, 0.014, 'triangle', 0, 920, 0.035);
    playNoise(0.018, 0.008, 'highpass', 2400, 0.004, 0.75);
  },

  playUiLocked(): void {
    playNoise(0.1, 0.034, 'lowpass', 280, 0, 0.65, 145);
    playTone(82, 0.14, 0.04, 'triangle', 0.01, 58);
  },

  playWeaponToggle(opening: boolean): void {
    if (opening) {
      this.playUiClick();
      playNoise(0.15, 0.05, 'bandpass', 520, 0.006, 1.7, 1460, 0.11);
      playTone(98, 0.16, 0.04, 'sawtooth', 0.012, 73.42, 0.06);
      playTone(196, 0.08, 0.038, 'square', 0.032, 392);
      playTone(523.25, 0.13, 0.028, 'triangle', 0.07, 784, 0.12);
      return;
    }
    playNoise(0.09, 0.038, 'bandpass', 760, 0, 1.35, 280, 0.08);
    playTone(392, 0.07, 0.032, 'square', 0.006, 196, 0.04);
    playTone(82, 0.12, 0.026, 'triangle', 0.035, 55);
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
      this.playUiClick();
      playTone(130.81, 0.1, 0.038, 'square', 0, 196);
      playTone(261.63, 0.08, 0.032, 'triangle', 0.028, 392, 0.08);
      playTone(659.25, 0.11, 0.022, 'sine', 0.07, 987.77, 0.12);
      playNoise(0.12, 0.03, 'bandpass', 900, 0.012, 1.6, 1900, 0.08);
      return;
    }
    playNoise(0.075, 0.032, 'bandpass', 880, 0, 1.2, 340, 0.05);
    playTone(523.25, 0.055, 0.026, 'square', 0, 261.63);
    playTone(98, 0.1, 0.024, 'triangle', 0.028, 65.41);
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
    playNoise(0.045, 0.07 + power * 0.052, 'bandpass', 920, 0, 1.85, 1650, 0.06);
    playNoise(0.085, 0.052 + power * 0.048, 'highpass', 1450, 0.018, 1.35, 3100, 0.04);
    playTone(92, 0.24, 0.044 + power * 0.054, 'triangle', 0.006, 58, 0.08);
    playTone(184, 0.11, 0.026 + power * 0.026, 'square', 0.032, 121, 0.04);
    playNoise(0.22, 0.026 + power * 0.036, 'lowpass', 410, 0.065, 0.75, 145);
    return;
  }
  if (profileId === 'oldTv') {
    playNoise(0.035, 0.1 + power * 0.07, 'highpass', 2600, 0, 2.1, 9200, 0.18);
    playNoise(0.055, 0.074 + power * 0.058, 'bandpass', 1320, 0.018, 1.6, 3600, 0.12);
    playNoise(0.18, 0.038 + power * 0.05, 'highpass', 4200, 0.045, 1.8, 9800, 0.22);
    playResonantHit(62, 0.36, 0.072 + power * 0.056, 0.012, 0.08);
    playDistortedTone(96, 0.26, 0.046 + power * 0.038, 0.035, 42);
    playTone(15720, 0.18, 0.006 + power * 0.01, 'sine', 0.075, 11200, 0.12);
    return;
  }
  if (profileId === 'speakerStack') {
    playDistortedTone(58, 0.42, 0.082 + power * 0.07, 0, 31);
    playNoise(0.16, 0.058 + power * 0.052, 'bandpass', 260, 0.018, 2.4, 95, 0.1);
    playNoise(0.24, 0.034 + power * 0.046, 'lowpass', 190, 0.065, 0.95, 70);
    playNoise(0.1, 0.024 + power * 0.034, 'highpass', 3600, 0.04, 1.2, 7600, 0.12);
    playTone(118, 0.18, 0.03 + power * 0.024, 'square', 0.09, 59, 0.06);
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
