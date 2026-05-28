import { ShuffleBag } from './ShuffleBag';
import { assetPath } from '../assetPath';

type AudioManifest = {
  version: number;
  basePath: string;
  groups: Record<string, string[]>;
};

type BusName = 'ui' | 'throw' | 'impact' | 'break' | 'debris' | 'sweetener';

type PlayOptions = {
  volume?: number;
  pitch?: number;
  delayMs?: number;
  pan?: number;
  bus?: BusName;
};

const BUS_DEFAULTS: Record<BusName, number> = {
  ui: 0.8,
  throw: 0.85,
  impact: 0.95,
  break: 1,
  debris: 0.75,
  sweetener: 0.7
};

const VOICE_LIMITS: Record<BusName, number> = {
  ui: 6,
  throw: 8,
  impact: 10,
  break: 8,
  debris: 14,
  sweetener: 5
};

type WebAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export class AudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private buses = new Map<BusName, GainNode>();
  private manifest: AudioManifest | null = null;
  private manifestPromise: Promise<AudioManifest | null> | null = null;
  private bags = new Map<string, ShuffleBag<string>>();
  private decoded = new Map<string, AudioBuffer>();
  private decoding = new Map<string, Promise<AudioBuffer | null>>();
  private activeVoices: Record<BusName, number> = {
    ui: 0,
    throw: 0,
    impact: 0,
    break: 0,
    debris: 0,
    sweetener: 0
  };
  private warnedManifest = false;
  private masterVolume = 0.86;
  private muted = false;
  private lastPlayed = '';

  unlock() {
    const context = this.getContext();
    if (!context) return;
    this.ensureOutput(context);
    if (context.state === 'suspended') void context.resume();
    void this.loadManifest();
  }

  setMasterVolume(volume: number) {
    this.masterVolume = Math.min(1, Math.max(0, volume));
    this.applyMasterVolume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyMasterVolume();
  }

  getGroups() {
    return Object.keys(this.manifest?.groups ?? {}).sort();
  }

  getLastPlayed() {
    return this.lastPlayed;
  }

  async preload(groups: string[]) {
    const manifest = await this.loadManifest();
    if (!manifest) return;
    await Promise.all(groups.flatMap((group) => manifest.groups[group] ?? []).map((file) => this.loadBuffer(file)));
  }

  playGroup(group: string, options: PlayOptions = {}) {
    const context = this.getContext();
    if (!context || this.masterVolume <= 0 || this.muted) return;
    this.ensureOutput(context);
    void this.loadManifest().then((manifest) => {
      if (!manifest) return;
      const bag = this.getBag(group, manifest.groups[group]);
      const file = bag?.next();
      if (!file) return;
      const bus = options.bus ?? this.inferBus(group);
      if (this.activeVoices[bus] >= VOICE_LIMITS[bus]) return;
      void this.loadBuffer(file).then((buffer) => {
        if (!buffer) return;
        this.playBuffer(file, buffer, bus, options);
      });
    });
  }

  private getContext() {
    const AudioContextClass = window.AudioContext || (window as WebAudioWindow).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!this.context || this.context.state === 'closed') this.context = new AudioContextClass();
    return this.context;
  }

  private ensureOutput(context: AudioContext) {
    if (this.master && this.compressor && this.buses.size > 0) return;
    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-16, context.currentTime);
    this.compressor.knee.setValueAtTime(18, context.currentTime);
    this.compressor.ratio.setValueAtTime(6, context.currentTime);
    this.compressor.attack.setValueAtTime(0.003, context.currentTime);
    this.compressor.release.setValueAtTime(0.14, context.currentTime);

    this.master = context.createGain();
    this.applyMasterVolume();
    this.master.connect(this.compressor);
    this.compressor.connect(context.destination);

    Object.entries(BUS_DEFAULTS).forEach(([bus, gainValue]) => {
      const gain = context.createGain();
      gain.gain.setValueAtTime(gainValue, context.currentTime);
      gain.connect(this.master as GainNode);
      this.buses.set(bus as BusName, gain);
    });
  }

  private applyMasterVolume() {
    if (!this.context || !this.master) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume, this.context.currentTime, 0.02);
  }

  private async loadManifest() {
    if (this.manifest) return this.manifest;
    if (this.manifestPromise) return this.manifestPromise;
    this.manifestPromise = fetch(assetPath('/assets/audio/manifest.audio.json'))
      .then((response) => (response.ok ? response.json() : null))
      .then((manifest: AudioManifest | null) => {
        this.manifest = manifest;
        if (manifest) {
          Object.entries(manifest.groups).forEach(([group, files]) => {
            this.bags.set(group, new ShuffleBag(files));
          });
        }
        return manifest;
      })
      .catch(() => {
        if (!this.warnedManifest) {
          this.warnedManifest = true;
          console.warn('Audio manifest unavailable; procedural fallback sounds will continue.');
        }
        return null;
      });
    return this.manifestPromise;
  }

  private getBag(group: string, files?: string[]) {
    if (!files?.length) return null;
    let bag = this.bags.get(group);
    if (!bag) {
      bag = new ShuffleBag(files);
      this.bags.set(group, bag);
    }
    return bag;
  }

  private async loadBuffer(file: string) {
    const cached = this.decoded.get(file);
    if (cached) return cached;
    const pending = this.decoding.get(file);
    if (pending) return pending;
    const context = this.getContext();
    const manifest = this.manifest;
    if (!context || !manifest) return null;
    const promise = fetch(assetPath(`${manifest.basePath}/${file}`))
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .then((data) => (data ? context.decodeAudioData(data) : null))
      .then((buffer) => {
        if (buffer) this.decoded.set(file, buffer);
        this.decoding.delete(file);
        return buffer;
      })
      .catch(() => {
        this.decoding.delete(file);
        return null;
      });
    this.decoding.set(file, promise);
    return promise;
  }

  private playBuffer(file: string, buffer: AudioBuffer, bus: BusName, options: PlayOptions) {
    const context = this.context;
    const output = this.buses.get(bus);
    if (!context || !output) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    const start = context.currentTime + (options.delayMs ?? 0) / 1000;
    const volume = Math.max(0, options.volume ?? 1);
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(Math.max(0.45, Math.min(1.8, options.pitch ?? 1)), start);
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, options.pan ?? 0)), start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.025, buffer.duration / Math.max(0.45, options.pitch ?? 1)));
    source.connect(gain);
    gain.connect(panner);
    panner.connect(output);
    this.activeVoices[bus] += 1;
    this.lastPlayed = file;
    source.onended = () => {
      this.activeVoices[bus] = Math.max(0, this.activeVoices[bus] - 1);
      source.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
    source.start(start);
    source.stop(start + buffer.duration / Math.max(0.45, options.pitch ?? 1) + 0.03);
  }

  private inferBus(group: string): BusName {
    if (group.startsWith('ui.')) return 'ui';
    if (group.startsWith('throw.')) return 'throw';
    if (group.startsWith('impact.')) return 'impact';
    if (group.startsWith('break.')) return 'break';
    if (group.startsWith('debris.')) return 'debris';
    return 'sweetener';
  }
}
