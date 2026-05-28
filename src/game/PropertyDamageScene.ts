import Phaser from 'phaser';
import { useGameStore, GearType, RoundSummary } from '../store/gameStore';
import { gameAudio } from './audio/gameAudio';
import { assetPath } from './assetPath';
import { destroyGeneratedFragment } from './destruction/breakCleanup';
import { breakObject as runBreakPipeline } from './destruction/breakEffectPipeline';
import { BreakMaterial } from './destruction/breakTypes';

type BreakableMeta = {
  id: string;
  label: string;
  value: number;
  health: number;
  broken: boolean;
  kind: BreakMaterial;
  breakProfileId?: string;
};

type GearConfig = {
  label: string;
  width: number;
  height: number;
  visualWidth?: number;
  visualHeight?: number;
  visualSize?: number;
  mass: number;
  bounciness: number;
  color: string;
  behavior: 'balanced' | 'crusher' | 'ricochet' | 'spear' | 'burst';
};

const GEAR: Record<GearType, GearConfig> = {
  guitar: {
    label: 'GUITAR',
    width: 120,
    height: 34,
    visualSize: 176,
    mass: 24,
    bounciness: 0.72,
    color: '#ffb84d',
    behavior: 'balanced'
  },
  amp: {
    label: 'BASS AMP',
    width: 96,
    height: 88,
    mass: 62,
    bounciness: 0.28,
    color: '#5de0e6',
    behavior: 'crusher'
  },
  cymbal: {
    label: 'CYMBAL',
    width: 78,
    height: 78,
    mass: 18,
    bounciness: 0.95,
    color: '#f7d65b',
    behavior: 'ricochet'
  },
  micStand: {
    label: 'MIC STAND',
    width: 150,
    height: 18,
    visualWidth: 170,
    visualHeight: 72,
    visualSize: 188,
    mass: 22,
    bounciness: 0.58,
    color: '#d8d8ea',
    behavior: 'spear'
  },
  fogMachine: {
    label: 'FOG',
    width: 82,
    height: 54,
    mass: 34,
    bounciness: 0.4,
    color: '#c084fc',
    behavior: 'burst'
  }
};

const MAX_PULL_DISTANCE = 380;
const PULL_POWER_EXPONENT = 2.2;
const AIM_RELEASE_FADE_MS = 920;
const FLOATING_TEXT_DURATION_MS = 1350;
const AIM_MAX_BURST_MS = 180;
const LAUNCH_VELOCITY_DIVISOR = 11.5;
const PERFORMER_SCALE = 0.42;
const AIM_THEME = {
  haze: 0x5de0e6,
  accent: 0xa98cff,
  core: 0xe8fdff
};
const GEAR_VARIANTS = [1, 2, 3] as const;
const WORLD_WIDTH = 1700;
const WORLD_HEIGHT = 960;
const FLOOR_Y = 905;
const BACKGROUND_ASPECT_RATIO = 1891 / 831;
const BACKGROUND_HEIGHT = WORLD_HEIGHT;
const BACKGROUND_WIDTH = BACKGROUND_HEIGHT * BACKGROUND_ASPECT_RATIO;
const BACKGROUND_LEFT = (WORLD_WIDTH - BACKGROUND_WIDTH) / 2;
type PerformerPose = 'idle' | 'pull' | 'throw' | 'recover';
type AimReleaseState = {
  points: Phaser.Math.Vector2[];
  charge: number;
  startedAt: number;
  wind: Phaser.Math.Vector2;
  seed: number;
};
const PERFORMER_POSE_SCALE: Record<PerformerPose, number> = {
  idle: PERFORMER_SCALE,
  pull: PERFORMER_SCALE * 1.32,
  throw: PERFORMER_SCALE * 1.33,
  recover: PERFORMER_SCALE * 1.24
};

type LevelProp = {
  x: number;
  y: number;
  width: number;
  height: number;
  key: string;
  path: string;
  label: string;
  value: number;
  health: number;
  kind: BreakableMeta['kind'];
  breakProfileId?: string;
  mass: number;
  bounce: number;
};

type LevelPropTemplate = Omit<LevelProp, 'x' | 'y'>;

const LEVEL_PROP_TEMPLATES: LevelPropTemplate[] = [
  { width: 260, height: 100, key: 'prop-folding-table', path: '/assets/garage-band/props-raster/folding_table_intact.png', label: 'Folding Table', value: 260, health: 28, kind: 'wood', breakProfileId: 'foldingTable', mass: 42, bounce: 0.38 },
  { width: 120, height: 118, key: 'prop-questionable-cake', path: '/assets/garage-band/props-raster/questionable_cake_intact.png', label: 'Questionable Cake', value: 420, health: 18, kind: 'cake', breakProfileId: 'questionableCake', mass: 20, bounce: 0.48 },
  { width: 150, height: 138, key: 'prop-old-tv', path: '/assets/garage-band/props-raster/old_tv_intact.png', label: 'Old TV', value: 780, health: 38, kind: 'electronics', breakProfileId: 'oldTv', mass: 52, bounce: 0.24 },
  { width: 170, height: 225, key: 'prop-speaker-stack', path: '/assets/garage-band/props-raster/speaker_stack_intact.png', label: 'Speaker Stack', value: 680, health: 45, kind: 'electronics', breakProfileId: 'speakerStack', mass: 66, bounce: 0.28 },
  { width: 150, height: 92, key: 'prop-cooler', path: '/assets/garage-band/props-raster/cooler_intact.png', label: 'Cooler of Regret', value: 320, health: 32, kind: 'metal', breakProfileId: 'cooler', mass: 46, bounce: 0.34 },
  { width: 330, height: 105, key: 'prop-garage-shelf', path: '/assets/garage-band/props-raster/garage_shelf_intact.png', label: 'Garage Shelf', value: 550, health: 36, kind: 'wood', breakProfileId: 'garageShelf', mass: 72, bounce: 0.2 },
  { width: 86, height: 92, key: 'prop-paint-can', path: '/assets/garage-band/props-raster/paint_can_intact.png', label: 'Paint Can', value: 190, health: 20, kind: 'metal', breakProfileId: 'paintCan', mass: 16, bounce: 0.62 },
  { width: 130, height: 90, key: 'prop-cable-bin', path: '/assets/garage-band/props-raster/cable_bin_intact.png', label: 'Cable Bin', value: 210, health: 20, kind: 'soft', breakProfileId: 'cableBin', mass: 24, bounce: 0.46 },
  { width: 104, height: 104, key: 'prop-mystery-box', path: '/assets/garage-band/props-raster/mystery_box_intact.png', label: 'Mystery Box', value: 240, health: 22, kind: 'wood', breakProfileId: 'mysteryBox', mass: 30, bounce: 0.5 },
  { width: 265, height: 86, key: 'prop-neon-sign', path: '/assets/garage-band/props-raster/neon_sign_intact.png', label: 'Neon Sign', value: 900, health: 24, kind: 'glass', breakProfileId: 'neonSign', mass: 18, bounce: 0.7 },
  { width: 300, height: 220, key: 'prop-tiny-drum-kit', path: '/assets/garage-band/props-raster/tiny_drum_kit_intact_v2.png', label: 'Tiny Drum Kit', value: 520, health: 30, kind: 'metal', breakProfileId: 'tinyDrumKit', mass: 48, bounce: 0.42 },
  { width: 84, height: 245, key: 'prop-garage-window', path: '/assets/garage-band/props-raster/garage_window_intact.png', label: 'Garage Window', value: 760, health: 15, kind: 'glass', breakProfileId: 'garageWindow', mass: 22, bounce: 0.64 }
];

const PROP_PLACEMENT_BOUNDS = new Phaser.Geom.Rectangle(500, 285, 1110, 555);
const PLAYER_CLEAR_ZONE = new Phaser.Geom.Rectangle(0, 540, 455, 390);
const PROP_EDGE_PADDING = 34;
const PROP_CLEARANCE = 18;

export class PropertyDamageScene extends Phaser.Scene {
  private launcher = new Phaser.Math.Vector2(170, 765);
  private aimLine!: Phaser.GameObjects.Graphics;
  private performer: Phaser.GameObjects.Image | null = null;
  private heldGearPreview: Phaser.GameObjects.Image | null = null;
  private previewGear: GearType | null = null;
  private previewTextureKey: string | null = null;
  private performerPose: PerformerPose = 'idle';
  private gearVariantByType: Record<GearType, number> = {
    guitar: 1,
    amp: 1,
    cymbal: 1,
    micStand: 1,
    fogMachine: 1
  };
  private isDragging = false;
  private dragAnchor: Phaser.Math.Vector2 | null = null;
  private lastChargeAudioAt = 0;
  private wasAimAtMax = false;
  private maxChargeBurstStartedAt = Number.NEGATIVE_INFINITY;
  private releaseAim: AimReleaseState | null = null;
  private activeGear: Phaser.Physics.Matter.Sprite | null = null;
  private breakables: Phaser.Physics.Matter.Image[] = [];
  private debris: Phaser.Physics.Matter.Image[] = [];
  private settledTimer = 0;
  private roundDamage = 0;
  private roundChaos = 0;
  private roundCombo = 0;
  private lastBreakAt = 0;
  private launchedAt = 0;
  private roundFinishing = false;
  private maxRoundTimer: Phaser.Time.TimerEvent | null = null;
  private finishRoundTimer: Phaser.Time.TimerEvent | null = null;
  private resetHandler = () => this.resetLevel();
  private resizeHandler = (gameSize: Phaser.Structs.Size) => this.layoutCamera(gameSize.width, gameSize.height);
  private stagePointerHandler = (event: Event) => {
    const detail = (event as CustomEvent<{ type: 'down' | 'move' | 'up'; x: number; y: number }>).detail;
    if (!detail || !this.cameras?.main) return;
    const point = this.clampPointerPoint(this.cameras.main.getWorldPoint(detail.x, detail.y));
    if (detail.type === 'down') this.beginDrag(point);
    if (detail.type === 'move') this.moveDrag(point);
    if (detail.type === 'up') this.endDrag(point);
  };
  private keyHandler = (event: KeyboardEvent) => {
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      this.quickLaunch();
    }
  };

  constructor() {
    super('PropertyDamageScene');
  }

  preload() {
    this.loadImageOnce('garage-background', '/assets/garage-band/backgrounds/garage_background.png');
    this.loadSvgOnce('debris-wood-1', '/assets/garage-band/debris/wood_chunk_01.svg', { width: 48, height: 38 });
    this.loadSvgOnce('debris-wood-2', '/assets/garage-band/debris/wood_chunk_02.svg', { width: 52, height: 34 });
    this.loadSvgOnce('debris-glass-1', '/assets/garage-band/debris/glass_chunk_01.svg', { width: 44, height: 40 });
    this.loadSvgOnce('debris-metal-1', '/assets/garage-band/debris/metal_chunk_01.svg', { width: 50, height: 36 });
    this.loadSvgOnce('debris-fabric-1', '/assets/garage-band/debris/fabric_scrap_01.svg', { width: 54, height: 38 });
    this.loadSvgOnce('effect-impact-star', '/assets/garage-band/effects/impact_star.svg', { width: 92, height: 92 });
    this.loadSvgOnce('effect-dust-puff', '/assets/garage-band/effects/dust_puff.svg', { width: 84, height: 84 });
    this.loadSvgOnce('effect-spark', '/assets/garage-band/effects/spark_01.svg', { width: 64, height: 64 });
    this.loadSvgOnce('effect-smoke-puff', '/assets/garage-band/effects/smoke_puff.svg', { width: 96, height: 96 });
    LEVEL_PROP_TEMPLATES.forEach((prop) => {
      this.loadImageOnce(prop.key, prop.path);
    });

    Object.keys(GEAR).forEach((key) => {
      GEAR_VARIANTS.forEach((variant) => {
        this.loadImageOnce(`gear-${key}-${variant}`, `/assets/garage-band/${key}-v${variant}.png`);
      });
    });
    (['idle', 'pull', 'throw', 'recover'] as PerformerPose[]).forEach((pose) => {
      this.loadImageOnce(`performer-${pose}`, `/assets/thrower-${pose}.png`);
    });
  }

  private loadImageOnce(key: string, path: string) {
    if (!this.textures.exists(key)) this.load.image(key, assetPath(path));
  }

  private loadSvgOnce(key: string, path: string, config: Phaser.Types.Loader.FileTypes.SVGSizeConfig) {
    if (!this.textures.exists(key)) this.load.svg(key, assetPath(path), config);
  }

  create() {
    this.drawGarageBackground();
    this.layoutCamera(this.scale.width, this.scale.height);
    this.aimLine = this.add.graphics();
    this.createWorldBounds();
    this.createVenueObjects();
    this.setupCollisions();
    this.createPerformer();
    this.updateReadyGearPreview();

    window.addEventListener('pd:reset-level', this.resetHandler);
    window.addEventListener('pd:stage-pointer', this.stagePointerHandler);
    window.addEventListener('keydown', this.keyHandler);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('pd:reset-level', this.resetHandler);
      window.removeEventListener('pd:stage-pointer', this.stagePointerHandler);
      window.removeEventListener('keydown', this.keyHandler);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeHandler);
      this.clearTimers();
    });
  }

  private layoutCamera(width: number, height: number) {
    const viewportWidth = Math.max(1, width);
    const viewportHeight = Math.max(1, height);
    const camera = this.cameras.main;
    const zoom = viewportHeight / WORLD_HEIGHT;

    camera.setViewport(0, 0, viewportWidth, viewportHeight);
    camera.setBounds(BACKGROUND_LEFT, 0, BACKGROUND_WIDTH, WORLD_HEIGHT);
    camera.setZoom(zoom);
    camera.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  }

  update(_time: number, delta: number) {
    this.updateAimReleaseFade();
    const roundState = useGameStore.getState().roundState;
    if (roundState === 'ready' && !this.isDragging) this.updateReadyGearPreview();
    if (roundState !== 'launched') return;

    const bodies = [this.activeGear, ...this.breakables, ...this.debris].filter(Boolean) as Phaser.Physics.Matter.Image[];
    const moving = bodies.some((obj) => obj.body && Math.abs(((obj.body as any).speed ?? 0)) > 0.35);
    const timedOut = this.time.now - this.launchedAt > 12000;

    if (moving && !timedOut) {
      this.settledTimer = 0;
      return;
    }

    this.settledTimer += delta;
    if (!this.roundFinishing && (this.settledTimer > 1400 || timedOut)) {
      this.roundFinishing = true;
      useGameStore.getState().setRoundState('settling');
      this.scheduleFinishRound();
    }
  }

  private clampPointerPoint(point: Phaser.Math.Vector2) {
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(point.x, 0, WORLD_WIDTH),
      Phaser.Math.Clamp(point.y, 0, WORLD_HEIGHT)
    );
  }

  private beginDrag(point: Phaser.Math.Vector2) {
    gameAudio.unlock();
    const state = useGameStore.getState().roundState;
    if (state === 'summary') {
      this.resetLevel(true);
      return;
    }
    if (useGameStore.getState().roundState !== 'ready') return;
    this.isDragging = true;
    this.dragAnchor = point.clone();
    this.releaseAim = null;
    this.wasAimAtMax = false;
    this.lastChargeAudioAt = 0;
    gameAudio.playThrowWindup(0.08);
    this.setPerformerPose('pull');
    this.updateReadyGearPreview();
    this.positionHeldGearForCharge(0, 1);
    this.drawAim(point);
  }

  private moveDrag(point: Phaser.Math.Vector2) {
    if (!this.isDragging) return;
    const pull = this.getDragPull(point);
    const charge = pull.length() / MAX_PULL_DISTANCE;
    if (this.time.now - this.lastChargeAudioAt > 150) {
      this.lastChargeAudioAt = this.time.now;
      gameAudio.playThrowWindup(charge);
    }
    this.positionHeldGearForCharge(charge, 1);
    this.drawAim(point);
  }

  private endDrag(point: Phaser.Math.Vector2) {
    if (!this.isDragging) return;
    this.isDragging = false;
    const rawPull = this.getRawDragPull(point);
    const pull = this.getDragPull(point);
    this.dragAnchor = null;

    if (rawPull.length() < 20) {
      this.releaseAim = null;
      this.wasAimAtMax = false;
      this.aimLine.clear();
      this.setPerformerPose('idle');
      this.updateReadyGearPreview();
      return;
    }
    const charge = this.getPullCharge(rawPull);
    this.startAimReleaseFade(rawPull, pull);
    gameAudio.playThrowRelease(charge, useGameStore.getState().selectedGear);
    this.animatePerformerThrow(point, pull);
  }

  private drawAim(point: Phaser.Math.Vector2) {
    this.aimLine.clear();
    const rawPull = this.getRawDragPull(point);
    const pull = this.getEffectivePull(rawPull);
    const charge = this.getPullCharge(rawPull);
    const source = this.getHeldGearPoint('throw');
    const arc = this.getAimArcPoints(source, pull, charge, 18, 2.06, 230);
    const atMax = rawPull.length() >= MAX_PULL_DISTANCE;
    if (atMax && !this.wasAimAtMax) this.triggerMaxChargeBurst();
    this.wasAimAtMax = atMax;
    const pulse = Math.max(this.getMaxChargePulse(), atMax ? 0.42 : 0);

    this.drawVaporGlow(arc, charge, 1, pulse);
    this.drawVaporCore(arc, charge, 1, pulse);
    this.drawVaporMotes(arc, charge, 1, pulse);
    this.drawArcFlow(arc, charge, pulse);
    this.drawSourceVaporPlume(source, pull, charge, pulse);
  }

  private getDragPull(point: Phaser.Math.Vector2) {
    return this.getEffectivePull(this.getRawDragPull(point));
  }

  private getRawDragPull(point: Phaser.Math.Vector2) {
    const anchor = this.dragAnchor ?? this.launcher;
    return new Phaser.Math.Vector2(anchor.x - point.x, anchor.y - point.y);
  }

  private getPullCharge(rawPull: Phaser.Math.Vector2) {
    return Phaser.Math.Clamp(rawPull.length() / MAX_PULL_DISTANCE, 0, 1);
  }

  private getEffectivePull(rawPull: Phaser.Math.Vector2) {
    const distance = rawPull.length();
    if (distance <= 0) return new Phaser.Math.Vector2(0, 0);
    const charge = this.getPullCharge(rawPull);
    const pullStrength = 1 - Math.pow(1 - charge, PULL_POWER_EXPONENT);
    return rawPull.clone().normalize().scale(pullStrength * MAX_PULL_DISTANCE);
  }

  private getAimArcPoints(origin: Phaser.Math.Vector2, pull: Phaser.Math.Vector2, charge: number, steps: number, reach: number, gravity: number) {
    const points: Phaser.Math.Vector2[] = [];
    const distanceScale = Phaser.Math.Linear(1.26, reach, charge);
    const gravityScale = Phaser.Math.Linear(gravity * 0.58, gravity, charge);
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      points.push(new Phaser.Math.Vector2(
        origin.x + pull.x * distanceScale * t,
        origin.y + pull.y * distanceScale * t + gravityScale * t * t
      ));
    }
    return points;
  }

  private getAimDefinition(charge: number) {
    return Math.pow(Phaser.Math.Clamp(charge, 0, 1), 1.2);
  }

  private triggerMaxChargeBurst() {
    this.maxChargeBurstStartedAt = this.time.now;
    gameAudio.playThrowWindup(1);
    this.performer?.setAngle(-9);
    this.tweens.add({
      targets: this.performer,
      angle: -7,
      duration: 130,
      ease: 'Sine.easeOut'
    });
  }

  private getMaxChargePulse() {
    const elapsed = this.time.now - this.maxChargeBurstStartedAt;
    if (elapsed < 0 || elapsed > AIM_MAX_BURST_MS) return 0;
    const t = elapsed / AIM_MAX_BURST_MS;
    return Math.sin(t * Math.PI);
  }

  private startAimReleaseFade(rawPull: Phaser.Math.Vector2, pull: Phaser.Math.Vector2) {
    const source = this.getHeldGearPoint('throw');
    const angle = Math.atan2(pull.y, pull.x);
    this.releaseAim = {
      points: this.getAimArcPoints(source, pull, this.getPullCharge(rawPull), 18, 2.06, 230),
      charge: this.getPullCharge(rawPull),
      startedAt: this.time.now,
      wind: this.getReleaseWindVector(angle),
      seed: this.time.now * 0.017 + angle * 31
    };
    this.wasAimAtMax = false;
    this.renderAimReleaseFade(0);
  }

  private updateAimReleaseFade() {
    if (!this.releaseAim || this.isDragging) return;
    const t = Phaser.Math.Clamp((this.time.now - this.releaseAim.startedAt) / AIM_RELEASE_FADE_MS, 0, 1);
    if (t >= 1) {
      this.releaseAim = null;
      this.aimLine.clear();
      return;
    }
    this.renderAimReleaseFade(t);
  }

  private renderAimReleaseFade(t: number) {
    if (!this.releaseAim) return;
    const coreFade = Math.pow(1 - t, 3.2);
    const hazeFade = Math.pow(1 - t, 1.05);
    const wind = Phaser.Math.Easing.Cubic.Out(t);
    const collapsedPoints = this.getWindBlownAimPoints(this.releaseAim.points, wind);
    this.aimLine.clear();
    this.drawVaporGlow(collapsedPoints, this.releaseAim.charge, hazeFade * 0.86, 0, wind * 0.7);
    if (t < 0.38) this.drawVaporCore(collapsedPoints, this.releaseAim.charge, coreFade, 0, wind * 0.8);
    this.drawReleaseVaporCloud(collapsedPoints, this.releaseAim.charge, hazeFade, wind);
  }

  private getReleaseWindVector(angle: number) {
    const along = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)).scale(0.42);
    const cross = new Phaser.Math.Vector2(Math.cos(angle - Math.PI / 2), Math.sin(angle - Math.PI / 2)).scale(0.72);
    return along.add(cross).add(new Phaser.Math.Vector2(0.52, -0.42)).normalize();
  }

  private getWindBlownAimPoints(points: Phaser.Math.Vector2[], wind: number) {
    const origin = points[0];
    const release = this.releaseAim;
    const windVector = release?.wind ?? new Phaser.Math.Vector2(1, -0.35);
    const seed = release?.seed ?? 0;
    return points.map((point, index) => {
      const t = index / Math.max(1, points.length - 1);
      const shear = wind * Phaser.Math.Linear(0.1, 1, t);
      const gust = Math.sin(seed + index * 1.43 + wind * 7.2) * 18 * wind;
      const curl = Math.cos(seed * 0.7 + index * 2.18 + wind * 5.4) * 13 * wind;
      return new Phaser.Math.Vector2(
        Phaser.Math.Linear(point.x, origin.x + (point.x - origin.x) * 0.5, shear) + windVector.x * shear * 92 + gust,
        Phaser.Math.Linear(point.y, point.y - 18 - t * 44, wind) + windVector.y * shear * 70 + curl * 0.35
      );
    });
  }

  private drawVaporGlow(points: Phaser.Math.Vector2[], charge: number, fadeMultiplier = 1, pulse = 0, collapse = 0) {
    const definition = this.getAimDefinition(charge);
    for (let i = 0; i < points.length - 1; i += 1) {
      const fade = 1 - i / (points.length - 1);
      const width = Phaser.Math.Linear(12, 30, definition) * (1 + pulse * 0.16) * (1 - collapse * 0.32);
      const alpha = (0.025 + definition * 0.13 + pulse * 0.08) * fade * fadeMultiplier;
      this.aimLine.lineStyle(Math.max(2, width - i * 0.35), AIM_THEME.haze, alpha);
      this.aimLine.lineBetween(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
      this.aimLine.lineStyle(Math.max(1, width * 0.52 - i * 0.22), AIM_THEME.accent, alpha * Phaser.Math.Linear(0.18, 0.52, definition));
      this.aimLine.lineBetween(points[i].x, points[i].y + 2, points[i + 1].x, points[i + 1].y + 2);
    }
  }

  private drawVaporCore(points: Phaser.Math.Vector2[], charge: number, fadeMultiplier = 1, pulse = 0, collapse = 0) {
    const definition = this.getAimDefinition(charge);
    for (let i = 0; i < points.length - 1; i += 1) {
      const fade = Math.pow(1 - i / (points.length - 1), 1.35);
      const width = Phaser.Math.Linear(0.9, 4.6, definition) * (1 + pulse * 0.28) * (1 - collapse * 0.42);
      const alpha = Phaser.Math.Linear(0.08, 0.82, definition) + pulse * 0.16;
      this.aimLine.lineStyle(Math.max(0.6, width), AIM_THEME.core, alpha * fade * fadeMultiplier);
      this.aimLine.lineBetween(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    }
  }

  private drawVaporMotes(points: Phaser.Math.Vector2[], charge: number, fadeMultiplier = 1, pulse = 0, collapse = 0) {
    const definition = this.getAimDefinition(charge);
    for (let i = 2; i < points.length - 2; i += 3) {
      const point = points[i];
      const next = points[i + 1];
      const angle = Phaser.Math.Angle.Between(point.x, point.y, next.x, next.y);
      const normal = angle - Math.PI / 2;
      const drift = Math.sin(i * 1.91 + this.time.now * 0.008) * Phaser.Math.Linear(5, 18, definition);
      const lift = 4 + i * 0.58 + collapse * 20;
      const fade = 1 - i / points.length;
      const alpha = (0.035 + definition * 0.16 + pulse * 0.05) * fade * fadeMultiplier;
      const x = point.x + Math.cos(normal) * drift;
      const y = point.y + Math.sin(normal) * drift - lift;
      const streak = Phaser.Math.Linear(5, 13, definition) * fade * (1 + collapse * 0.45);
      const width = Phaser.Math.Linear(0.7, 1.8, definition) * fade;
      this.aimLine.lineStyle(Math.max(0.55, width), i % 2 === 0 ? AIM_THEME.haze : AIM_THEME.core, alpha);
      this.aimLine.lineBetween(
        x - Math.cos(angle) * streak * 0.32,
        y - Math.sin(angle) * streak * 0.32,
        x + Math.cos(angle) * streak,
        y + Math.sin(angle) * streak - collapse * 2
      );
    }
  }

  private drawArcFlow(points: Phaser.Math.Vector2[], charge: number, pulse: number) {
    const definition = this.getAimDefinition(charge);
    if (definition < 0.45 && pulse <= 0) return;
    const flowHead = (this.time.now * 0.0048) % 1;
    for (let i = 1; i < points.length - 2; i += 1) {
      const position = i / (points.length - 1);
      const wave = 1 - Phaser.Math.Clamp(Math.abs(position - flowHead) / 0.18, 0, 1);
      const alpha = (wave * definition * 0.22 + pulse * 0.26) * Math.pow(1 - position, 1.4);
      if (alpha <= 0.01) continue;
      this.aimLine.lineStyle(1.2 + definition * 1.4, AIM_THEME.core, alpha);
      this.aimLine.lineBetween(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    }
  }

  private drawReleaseVaporCloud(points: Phaser.Math.Vector2[], charge: number, fadeMultiplier: number, wind: number) {
    const definition = this.getAimDefinition(charge);
    const release = this.releaseAim;
    const windVector = release?.wind ?? new Phaser.Math.Vector2(1, -0.35);
    const seed = release?.seed ?? 0;
    for (let i = 1; i < points.length - 1; i += 1) {
      const point = points[i];
      const pathFade = Math.pow(1 - i / points.length, 0.8);
      const tangent = i < points.length - 2
        ? Phaser.Math.Angle.Between(point.x, point.y, points[i + 1].x, points[i + 1].y)
        : Math.atan2(windVector.y, windVector.x);
      const normal = tangent - Math.PI / 2;
      const particleCount = 3 + Math.round(definition * 2);
      for (let j = 0; j < particleCount; j += 1) {
        const noiseA = Math.sin(seed + i * 8.91 + j * 13.37 + wind * 7.6);
        const noiseB = Math.cos(seed * 0.83 + i * 5.47 + j * 17.11 + wind * 9.3);
        const plume = wind * Phaser.Math.Linear(20, 88, pathFade) + j * 6;
        const scatter = Phaser.Math.Linear(5, 28, wind) * (0.35 + definition) * noiseA;
        const x = point.x + windVector.x * plume + Math.cos(normal) * scatter + noiseB * 8 * wind;
        const y = point.y + windVector.y * plume + Math.sin(normal) * scatter - wind * (9 + j * 2.8) + noiseA * 5;
        const direction = Math.atan2(windVector.y, windVector.x) + noiseB * 0.5 + tangent * 0.15;
        const length = Phaser.Math.Linear(7, 24, definition) * pathFade * (0.65 + wind * 1.05) * (0.75 + j * 0.16);
        const width = Phaser.Math.Linear(0.45, 2.25, definition) * pathFade * (1 - wind * 0.18);
        const alpha = (0.035 + definition * 0.095) * fadeMultiplier * pathFade * (1 - wind * 0.25) * (0.72 + Math.abs(noiseA) * 0.55);
        if (alpha <= 0.004) continue;
        const color = j === 0 && i % 4 === 0 ? AIM_THEME.core : i % 3 === 0 ? AIM_THEME.accent : AIM_THEME.haze;
        this.aimLine.lineStyle(Math.max(0.4, width), color, alpha);
        this.aimLine.lineBetween(
          x - Math.cos(direction) * length * 0.35,
          y - Math.sin(direction) * length * 0.35,
          x + Math.cos(direction) * length,
          y + Math.sin(direction) * length
        );
        if (j === 0 && i % 2 === 0) {
          this.aimLine.fillStyle(AIM_THEME.core, alpha * 0.45);
          this.aimLine.fillRect(x, y, 1.2, 1.2);
        }
      }
    }
  }

  private drawSourceVaporPlume(source: Phaser.Math.Vector2, pull: Phaser.Math.Vector2, charge: number, pulse: number) {
    const definition = this.getAimDefinition(charge);
    if (definition <= 0.02) return;
    const angle = Math.atan2(pull.y, pull.x);
    const back = new Phaser.Math.Vector2(-Math.cos(angle), -Math.sin(angle));
    const normal = new Phaser.Math.Vector2(Math.cos(angle - Math.PI / 2), Math.sin(angle - Math.PI / 2));
    const time = this.time.now * 0.007;
    const count = 9;
    for (let i = 0; i < count; i += 1) {
      const offset = i - (count - 1) / 2;
      const breathe = Math.sin(time + i * 1.73) * 4;
      const x = source.x + back.x * (5 + i * 2.8) + normal.x * (offset * 3.8 + breathe);
      const y = source.y + back.y * (5 + i * 2.8) + normal.y * (offset * 3.8 + breathe) - i * 1.7;
      const length = Phaser.Math.Linear(8, 21, definition) * (1 - Math.abs(offset) / 6.4) * (1 + pulse * 0.2);
      const alpha = (0.045 + definition * 0.12 + pulse * 0.04) * (1 - Math.abs(offset) / 6.1);
      const direction = angle + Math.sin(time * 0.8 + i * 2.1) * 0.35;
      this.aimLine.lineStyle(Phaser.Math.Linear(0.55, 2.2, definition), i % 3 === 0 ? AIM_THEME.core : AIM_THEME.haze, alpha);
      this.aimLine.lineBetween(
        x - Math.cos(direction) * length * 0.25,
        y - Math.sin(direction) * length * 0.25,
        x + Math.cos(direction) * length,
        y + Math.sin(direction) * length
      );
    }
  }

  private createPerformer() {
    this.performer = this.add.image(this.launcher.x - 18, this.launcher.y + 74, 'performer-idle');
    this.performer.setOrigin(0.5, 1);
    this.performer.setDepth(16);
    this.setPerformerPose('idle');
  }

  private setPerformerPose(pose: PerformerPose) {
    this.performerPose = pose;
    const textureKey = `performer-${pose}`;
    if (!this.performer || !this.textures.exists(textureKey)) return;
    this.performer.setPosition(this.launcher.x - 18, this.launcher.y + 74);
    this.performer.setTexture(textureKey);
    if (pose === 'idle') this.performer?.setAngle(0).setScale(PERFORMER_POSE_SCALE.idle);
    if (pose === 'pull') this.performer?.setAngle(-2).setScale(PERFORMER_POSE_SCALE.pull);
    if (pose === 'throw') this.performer?.setAngle(3).setScale(PERFORMER_POSE_SCALE.throw);
    if (pose === 'recover') this.performer?.setAngle(1).setScale(PERFORMER_POSE_SCALE.recover);
  }

  private getHeldGearPoint(pose = this.performerPose) {
    if (pose === 'pull') return new Phaser.Math.Vector2(this.launcher.x - 72, this.launcher.y - 118);
    if (pose === 'throw') return new Phaser.Math.Vector2(this.launcher.x + 82, this.launcher.y - 132);
    if (pose === 'recover') return new Phaser.Math.Vector2(this.launcher.x + 58, this.launcher.y - 96);
    return new Phaser.Math.Vector2(this.launcher.x - 38, this.launcher.y - 118);
  }

  private positionHeldGear(point = this.getHeldGearPoint(), alpha = 0.96) {
    if (!this.heldGearPreview) return;
    const gearType = useGameStore.getState().selectedGear;
    const scale = this.getGearDisplayScale(gearType, 0.92);
    this.heldGearPreview
      .setPosition(point.x, point.y)
      .setScale(scale)
      .setAlpha(alpha)
      .setAngle(this.performerPose === 'pull' ? -12 : this.performerPose === 'throw' ? 18 : -4)
      .setVisible(useGameStore.getState().roundState === 'ready');
  }

  private positionHeldGearForCharge(charge: number, alpha = 0.96) {
    const point = this.getHeldGearPoint('pull');
    const eased = Phaser.Math.Easing.Cubic.Out(Phaser.Math.Clamp(charge, 0, 1));
    this.positionHeldGear(new Phaser.Math.Vector2(point.x - eased * 34, point.y + eased * 12), alpha);
    this.heldGearPreview
      ?.setAngle(-12 - eased * 14)
      .setScale(this.getGearDisplayScale(useGameStore.getState().selectedGear, 0.92) * (1 + eased * 0.16));
    this.performer
      ?.setAngle(-2 - eased * 5)
      .setScale(PERFORMER_POSE_SCALE.pull);
  }

  private animatePerformerThrow(point: Phaser.Math.Vector2, pull: Phaser.Math.Vector2) {
    const releasePoint = this.getHeldGearPoint('throw');
    const settlePoint = this.getHeldGearPoint('recover');
    this.setPerformerPose('throw');
    if (!this.heldGearPreview) {
      this.launchGear(pull, releasePoint);
      return;
    }

    this.heldGearPreview.setVisible(true);
    this.tweens.killTweensOf(this.heldGearPreview);
    this.tweens.add({
      targets: this.heldGearPreview,
      x: releasePoint.x,
      y: releasePoint.y,
      angle: pull.x > 0 ? 48 : -48,
      scale: this.heldGearPreview.scale * 1.08,
      duration: 115,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.heldGearPreview?.setVisible(false);
        this.previewGear = null;
        this.launchGear(pull, releasePoint);
        this.setPerformerPose('recover');
        this.time.delayedCall(420, () => {
          if (useGameStore.getState().roundState === 'ready') this.setPerformerPose('idle');
          else {
            this.setPerformerPose('recover');
            this.heldGearPreview?.setPosition(settlePoint.x, settlePoint.y);
          }
        });
      }
    });

    this.tweens.add({
      targets: this.performer,
      x: this.launcher.x + 10,
      duration: 115,
      yoyo: true,
      ease: 'Cubic.easeOut'
    });
  }

  private updateReadyGearPreview() {
    const gearType = useGameStore.getState().selectedGear;
    const textureKey = this.getGearTextureKey(gearType);
    if (!this.heldGearPreview) {
      this.heldGearPreview = this.add.image(this.launcher.x, this.launcher.y, textureKey);
      this.heldGearPreview.setDepth(18);
      this.heldGearPreview.setAlpha(0.96);
      this.previewGear = gearType;
      this.previewTextureKey = textureKey;
    }
    if (this.previewGear !== gearType || this.previewTextureKey !== textureKey) {
      this.heldGearPreview.setTexture(textureKey);
      this.previewGear = gearType;
      this.previewTextureKey = textureKey;
    }
    this.heldGearPreview.setVisible(useGameStore.getState().roundState === 'ready');
    this.positionHeldGear();
  }

  private getGearTextureKey(gearType: GearType) {
    return `gear-${gearType}-${this.gearVariantByType[gearType]}`;
  }

  private getGearDisplayScale(gearType: GearType, targetPixels: number) {
    const config = GEAR[gearType];
    return targetPixels * (Math.max(config.width, config.height) / 320);
  }

  private getThrownGearScale(config: GearConfig) {
    return (config.visualSize ?? Math.max(config.visualWidth ?? config.width, config.visualHeight ?? config.height)) / 320;
  }

  private advanceGearVariant(gearType: GearType) {
    this.gearVariantByType[gearType] = (this.gearVariantByType[gearType] % GEAR_VARIANTS.length) + 1;
  }

  private quickLaunch() {
    const state = useGameStore.getState().roundState;
    if (state === 'summary') {
      this.resetLevel(true);
      return;
    }
    if (state !== 'ready') return;
    const pull = new Phaser.Math.Vector2(
      Phaser.Math.Between(330, 380),
      Phaser.Math.Between(-175, -115)
    );
    const startPoint = this.getHeldGearPoint('pull').subtract(new Phaser.Math.Vector2(170, -45));
    this.setPerformerPose('pull');
    this.positionHeldGear(startPoint, 1);
    this.animatePerformerThrow(startPoint, pull);
  }

  private launchGear(pull: Phaser.Math.Vector2, spawnPoint = this.launcher) {
    const store = useGameStore.getState();
    const gearType = store.selectedGear;
    const config = GEAR[gearType];
    const weightBonus = store.upgrades.gearWeight * 0.12;
    const powerBonus = 1 + store.upgrades.launchPower * 0.16;

    this.roundDamage = 0;
    this.roundChaos = 0;
    this.roundCombo = 0;
    this.lastBreakAt = 0;
    this.settledTimer = 0;
    this.launchedAt = this.time.now;
    this.roundFinishing = false;
    this.dragAnchor = null;

    this.activeGear = this.matter.add.sprite(spawnPoint.x, spawnPoint.y, this.getGearTextureKey(gearType));
    this.activeGear.setName(`gear-${gearType}`);
    this.activeGear.setData('gearType', gearType);
    this.activeGear.setData('behavior', config.behavior);
    if (config.behavior === 'ricochet') this.activeGear.setCircle(39);
    if (config.behavior === 'balanced') this.activeGear.setRectangle(config.width, config.height);
    if (config.behavior === 'spear') this.activeGear.setRectangle(config.width, config.height);
    this.activeGear.setScale(this.getThrownGearScale(config));
    this.activeGear.setFrictionAir(0.01);
    this.activeGear.setBounce(config.bounciness);
    this.activeGear.setMass(config.mass * (1 + weightBonus));
    this.activeGear.setAngularVelocity(Phaser.Math.FloatBetween(-0.18, 0.18));
    this.activeGear.setVelocity((pull.x / LAUNCH_VELOCITY_DIVISOR) * powerBonus, (pull.y / LAUNCH_VELOCITY_DIVISOR) * powerBonus);

    if (config.behavior === 'spear') this.activeGear.setAngularVelocity(0.22);
    if (config.behavior === 'burst') this.time.delayedCall(850, () => this.fogBurst(this.activeGear?.x ?? this.launcher.x, this.activeGear?.y ?? this.launcher.y, true));
    if (config.behavior === 'balanced') this.activeGear.setAngularVelocity(pull.x > 0 ? 0.24 : -0.24);

    store.startRound();
    store.addFeed(`${config.label} launched. Bad idea confirmed.`);
    this.advanceGearVariant(gearType);
    this.previewTextureKey = null;
    this.maxRoundTimer = this.time.delayedCall(12500, () => this.forceFinishRound());
  }

  private setupCollisions() {
    this.matter.world.on('collisionstart', (event: any) => {
      event.pairs.forEach((pair: any) => {
        const objects = [
          (pair.bodyA as any).gameObject,
          (pair.bodyB as any).gameObject
        ].filter(Boolean) as Phaser.GameObjects.GameObject[];

        const gear = objects.find((obj) => (obj as Phaser.Physics.Matter.Image).getData?.('gearType')) as Phaser.Physics.Matter.Image | undefined;
        const behavior = gear?.getData('behavior') as GearConfig['behavior'] | undefined;
        const impactMultiplier = behavior === 'ricochet' ? 1.35 : 1;
        const impact = Math.max(pair.bodyA.speed ?? 0, pair.bodyB.speed ?? 0) * 22 * impactMultiplier;
        if (impact < 2) return;

        objects.forEach((obj) => {
          const image = obj as Phaser.Physics.Matter.Image;
          const meta = image.getData?.('breakable') as BreakableMeta | undefined;
          if (!image.active || !meta || meta.broken) return;

          const fragility = 1 + useGameStore.getState().upgrades.fragility * 0.14;
          meta.health -= (impact + (behavior === 'ricochet' ? 8 : 0)) * fragility;
          image.setTint(0xffffff);
          this.time.delayedCall(55, () => {
            if (image.active) image.clearTint();
          });

          if (behavior === 'ricochet') this.cymbalPing(image.x, image.y, false);

          gameAudio.playImpact(meta.kind, impact);

          if (meta.health <= 0) {
            this.breakObject(image, meta, impact, gear);
          }
        });
      });
    });
  }

  private breakObject(image: Phaser.Physics.Matter.Image, meta: BreakableMeta, impact: number, gear?: Phaser.Physics.Matter.Image) {
    const breakX = image.x;
    const breakY = image.y;
    const impactPoint = new Phaser.Math.Vector2(
      gear ? Phaser.Math.Linear(gear.x, image.x, 0.62) : image.x,
      gear ? Phaser.Math.Linear(gear.y, image.y, 0.62) : image.y
    );
    const gearBody = gear?.body as MatterJS.BodyType | undefined;
    const imageBody = image.body as MatterJS.BodyType | undefined;
    const impactVelocity = new Phaser.Math.Vector2(
      gearBody?.velocity.x ?? imageBody?.velocity.x ?? 0,
      gearBody?.velocity.y ?? imageBody?.velocity.y ?? 0
    );

    meta.broken = true;
    const fragments = runBreakPipeline({
      scene: this,
      source: image,
      sourceTextureKey: image.texture.key,
      objectId: meta.id,
      label: meta.label,
      material: meta.kind,
      profileId: meta.breakProfileId,
      width: image.displayWidth,
      height: image.displayHeight,
      impactPoint,
      impactVelocity,
      impactStrength: impact,
      seed: this.time.now + Math.floor(image.x * 17) + Math.floor(image.y * 31)
    });
    this.debris.push(...fragments);
    image.setVisible(false);
    image.setStatic(false);
    image.setActive(false);
    image.destroy();

    const comboWindow = this.time.now - this.lastBreakAt < 950;
    this.roundCombo = comboWindow ? this.roundCombo + 1 : 1;
    this.lastBreakAt = this.time.now;

    const comboMultiplier = 1 + Math.min(this.roundCombo, 8) * 0.12;
    const damage = Math.round(meta.value * comboMultiplier + impact * 17);
    this.roundDamage += damage;
    this.roundChaos += Math.ceil(impact / 4) + this.roundCombo;
    useGameStore.getState().updateLiveRound(this.roundDamage, this.roundChaos, this.roundCombo);

    this.createFloatingText(breakX, breakY - 20, this.getDamagePopLabel(damage));
    this.cameras.main.shake(Math.min(260, 90 + impact * 8), Math.min(0.018, 0.004 + impact / 900));

    const flavor = this.getBreakFlavor(meta.label);
    useGameStore.getState().addFeed(flavor);

    const behavior = this.activeGear?.getData('behavior');
    if (behavior === 'burst' && impact > 4) this.fogBurst(breakX, breakY, true);
    if (behavior === 'crusher' && impact > 5) this.shockwave(breakX, breakY);
    if (behavior === 'ricochet' && impact > 7) this.cymbalPing(breakX, breakY, true);
  }

  private finishRound() {
    this.clearTimers();
    if (!this.scene.isActive()) return;
    const store = useGameStore.getState();
    const viralRoll = Math.random() < 0.18 + store.upgrades.viralChance * 0.04;
    const insuranceMultiplier = 1 + store.upgrades.insuranceMultiplier * 0.08;
    const totalDamage = Math.max(25, Math.round(this.roundDamage * insuranceMultiplier));
    const fans = Math.floor(totalDamage / 300) + (viralRoll ? 25 : 0);
    const bonuses = this.buildBonuses(totalDamage, viralRoll);
    const title = this.getRoundTitle(totalDamage);

    const summary: RoundSummary = {
      mode: 'wreckRoom',
      totalDamage,
      chaos: this.roundChaos,
      combo: this.roundCombo,
      fans,
      title,
      bonuses
    };

    store.completeRound(summary);
  }

  private forceFinishRound() {
    if (useGameStore.getState().roundState !== 'launched' || this.roundFinishing) return;
    this.roundFinishing = true;
    useGameStore.getState().setRoundState('settling');
    this.scheduleFinishRound();
  }

  private scheduleFinishRound() {
    this.finishRoundTimer?.remove(false);
    this.finishRoundTimer = this.time.delayedCall(650, () => this.finishRound());
  }

  private clearTimers() {
    this.maxRoundTimer?.remove(false);
    this.finishRoundTimer?.remove(false);
    this.maxRoundTimer = null;
    this.finishRoundTimer = null;
  }

  private buildBonuses(totalDamage: number, viralRoll: boolean) {
    const bonuses: string[] = [];
    if (this.roundCombo >= 3) bonuses.push(`Combo Chain x${this.roundCombo}: suspiciously efficient destruction.`);
    if (totalDamage > 2400) bonuses.push('Security Deposit: fully vaporized.');
    if (viralRoll) bonuses.push('Local Viral Clip: 25 people sent it to their group chat.');
    if (this.roundChaos > 40) bonuses.push('Trajectory Bonus: nobody can explain the cymbal path.');
    if (bonuses.length === 0) bonuses.push('Minor Incident: still technically a claim.');
    return bonuses.slice(0, 4);
  }

  private getRoundTitle(totalDamage: number) {
    if (totalDamage > 7000) return 'Insurance Adjuster Nightmare';
    if (totalDamage > 4200) return 'Landlord Entered Chat';
    if (totalDamage > 1800) return 'That Looked Expensive';
    return 'Practice Got Weird';
  }

  private getBreakFlavor(label: string) {
    const lines = [
      `${label} has left the building.`,
      `${label} made a financially meaningful sound.`,
      `${label} is now a conversation with insurance.`,
      `${label} achieved its final form: pieces.`,
      `${label} broke with confidence.`,
      `${label} chose itemized regret.`,
      `${label} became a landlord email.`,
      `${label} filed itself under debris.`,
      `${label} discovered gravity's legal team.`,
      `${label} is mostly vibes now.`,
      `${label} heard the deductible laughing.`,
      `${label} really committed to the bit.`
    ];
    return Phaser.Utils.Array.GetRandom(lines);
  }

  private getDamagePopLabel(damage: number) {
    const label = Phaser.Utils.Array.GetRandom([
      'BAD IDEA PAID',
      'CLAIM DENIED',
      'DEPOSIT WHEEZED',
      'LANDLORD FELT THAT',
      'VERY NORMAL SOUND',
      'ITEMIZED REGRET',
      'ROOM LOST ARGUMENT',
      'INSURANCE FLINCHED',
      'DEBRIS RECEIPT'
    ]);
    return `${label}\n+$${damage.toLocaleString()}`;
  }

  private resetLevel(setReady = true) {
    this.clearTimers();
    this.aimLine?.clear();
    this.setPerformerPose('idle');
    this.activeGear?.destroy();
    this.activeGear = null;
    this.breakables.forEach((obj) => obj.destroy());
    this.debris.forEach((obj) => destroyGeneratedFragment(obj));
    this.breakables = [];
    this.debris = [];
    this.roundDamage = 0;
    this.roundChaos = 0;
    this.roundCombo = 0;
    this.lastBreakAt = 0;
    this.settledTimer = 0;
    this.launchedAt = 0;
    this.roundFinishing = false;
    if (setReady) useGameStore.getState().resetRun();
    else useGameStore.getState().setRoundState('ready');
    this.createVenueObjects();
    this.updateReadyGearPreview();
  }

  private createWorldBounds() {
    this.matter.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 64, true, true, true, true);
    this.matter.add.rectangle(WORLD_WIDTH / 2, FLOOR_Y, WORLD_WIDTH, 48, { isStatic: true, restitution: 0.35, friction: 0.82 });
  }

  private createVenueObjects() {
    this.createRandomizedLevelProps().forEach((prop) => this.addBreakable(prop));
  }

  private addBreakable(prop: LevelProp) {
    const image = this.matter.add.image(prop.x, prop.y, prop.key, undefined, {
      isStatic: false,
      ignoreGravity: true,
      restitution: prop.bounce,
      friction: 0.05,
      frictionStatic: 0.02,
      frictionAir: 0.018,
      density: 0.0012,
      chamfer: { radius: 8 }
    });
    image.setDisplaySize(prop.width, prop.height);
    image.setBody({ type: 'rectangle', width: prop.width * 0.86, height: prop.height * 0.82 });
    image.setIgnoreGravity(true);
    image.setBounce(prop.bounce);
    image.setMass(prop.mass);
    image.setData('breakable', {
      id: prop.key,
      label: prop.label,
      value: prop.value,
      health: prop.health,
      broken: false,
      kind: prop.kind,
      breakProfileId: prop.breakProfileId
    } satisfies BreakableMeta);
    image.setFrictionAir(0.018);
    image.setAngularVelocity(Phaser.Math.FloatBetween(-0.003, 0.003));
    this.breakables.push(image);
    return image;
  }

  private createRandomizedLevelProps() {
    const placed: LevelProp[] = [];
    const occupied: Phaser.Geom.Rectangle[] = [];
    const anchor = new Phaser.Math.Vector2(
      Phaser.Math.Between(930, 1235),
      Phaser.Math.Between(520, 690)
    );
    const orderedProps = Phaser.Utils.Array.Shuffle([...LEVEL_PROP_TEMPLATES]);

    orderedProps.forEach((template, index) => {
      const position = this.findPropPosition(template, occupied, anchor, index);
      const rect = this.getPropRect(position.x, position.y, template.width, template.height, PROP_CLEARANCE);
      occupied.push(rect);
      placed.push({ ...template, x: position.x, y: position.y });
    });

    return placed;
  }

  private findPropPosition(
    prop: LevelPropTemplate,
    occupied: Phaser.Geom.Rectangle[],
    anchor: Phaser.Math.Vector2,
    index: number
  ) {
    const angleBase = index * 2.399963229728653;
    const radiusBase = 80 + index * 34;

    for (let attempt = 0; attempt < 180; attempt += 1) {
      const ring = Math.floor(attempt / 24);
      const angle = angleBase + Phaser.Math.FloatBetween(-0.95, 0.95) + ring * 0.42;
      const radius = radiusBase + ring * 44 + Phaser.Math.Between(-55, 95);
      const x = this.clampPropX(anchor.x + Math.cos(angle) * radius * 1.28, prop.width);
      const y = this.clampPropY(anchor.y + Math.sin(angle) * radius * 0.78, prop.height);
      if (this.canPlaceProp(x, y, prop.width, prop.height, occupied)) return new Phaser.Math.Vector2(x, y);
    }

    return this.findFallbackPropPosition(prop, occupied);
  }

  private findFallbackPropPosition(prop: LevelPropTemplate, occupied: Phaser.Geom.Rectangle[]) {
    const minX = PROP_PLACEMENT_BOUNDS.left + prop.width / 2 + PROP_EDGE_PADDING;
    const maxX = PROP_PLACEMENT_BOUNDS.right - prop.width / 2 - PROP_EDGE_PADDING;
    const minY = PROP_PLACEMENT_BOUNDS.top + prop.height / 2 + PROP_EDGE_PADDING;
    const maxY = Math.min(PROP_PLACEMENT_BOUNDS.bottom, FLOOR_Y - PROP_EDGE_PADDING) - prop.height / 2;

    for (let y = maxY; y >= minY; y -= 34) {
      for (let x = minX; x <= maxX; x += 38) {
        if (this.canPlaceProp(x, y, prop.width, prop.height, occupied)) return new Phaser.Math.Vector2(x, y);
      }
    }

    return new Phaser.Math.Vector2(this.clampPropX(PROP_PLACEMENT_BOUNDS.right - prop.width / 2, prop.width), this.clampPropY(maxY, prop.height));
  }

  private canPlaceProp(x: number, y: number, width: number, height: number, occupied: Phaser.Geom.Rectangle[]) {
    const rect = this.getPropRect(x, y, width, height, PROP_CLEARANCE);
    if (Phaser.Geom.Intersects.RectangleToRectangle(rect, PLAYER_CLEAR_ZONE)) return false;
    return occupied.every((other) => !Phaser.Geom.Intersects.RectangleToRectangle(rect, other));
  }

  private getPropRect(x: number, y: number, width: number, height: number, padding = 0) {
    return new Phaser.Geom.Rectangle(
      x - width / 2 - padding,
      y - height / 2 - padding,
      width + padding * 2,
      height + padding * 2
    );
  }

  private clampPropX(x: number, width: number) {
    return Phaser.Math.Clamp(
      x,
      PROP_PLACEMENT_BOUNDS.left + width / 2 + PROP_EDGE_PADDING,
      PROP_PLACEMENT_BOUNDS.right - width / 2 - PROP_EDGE_PADDING
    );
  }

  private clampPropY(y: number, height: number) {
    return Phaser.Math.Clamp(
      y,
      PROP_PLACEMENT_BOUNDS.top + height / 2 + PROP_EDGE_PADDING,
      Math.min(PROP_PLACEMENT_BOUNDS.bottom, FLOOR_Y - PROP_EDGE_PADDING) - height / 2
    );
  }

  private fogBurst(x: number, y: number, damageNearby = false) {
    for (let i = 0; i < 10; i += 1) {
      const puff = this.matter.add.image(x, y, 'effect-smoke-puff', undefined, { restitution: 0.2, frictionAir: 0.08 });
      puff.setAlpha(0.42);
      puff.setScale(Phaser.Math.FloatBetween(1.0, 2.2));
      puff.setVelocity(Phaser.Math.FloatBetween(-5, 5), Phaser.Math.FloatBetween(-5, 1));
      this.tweens.add({ targets: puff, alpha: 0, scale: 3, duration: 950, onComplete: () => puff.destroy() });
    }
    this.roundDamage += 175;
    if (damageNearby) this.damageNearbyObjects(x, y, 145, 10, 'Fog Incident');
    useGameStore.getState().updateLiveRound(this.roundDamage, this.roundChaos, this.roundCombo);
    this.createFloatingText(x, y - 40, 'FOG INCIDENT +$175');
  }

  private shockwave(x: number, y: number) {
    const ring = this.add.image(x, y, 'effect-impact-star').setAlpha(0.9).setScale(0.35);
    this.tweens.add({ targets: ring, scale: 1.45, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
    this.roundDamage += 120;
    this.roundChaos += 6;
    this.breakables.forEach((obj) => {
      if (!obj.active || !obj.body) return;
      const distance = Phaser.Math.Distance.Between(x, y, obj.x, obj.y);
      if (distance > 170) return;
      const strength = Phaser.Math.Linear(0.045, 0.012, distance / 170);
      const angle = Phaser.Math.Angle.Between(x, y, obj.x, obj.y);
      obj.applyForce(new Phaser.Math.Vector2(
        Math.cos(angle) * strength,
        Math.sin(angle) * strength - strength * 0.35
      ));
    });
    useGameStore.getState().updateLiveRound(this.roundDamage, this.roundChaos, this.roundCombo);
  }

  private cymbalPing(x: number, y: number, damageNearby = true) {
    const spark = this.add.image(x, y, 'effect-spark').setAlpha(0.92).setScale(0.42);
    this.tweens.add({ targets: spark, scale: 4, alpha: 0, duration: 280, onComplete: () => spark.destroy() });
    if (damageNearby) this.damageNearbyObjects(x, y, 125, 8, 'Cymbal Ping');
    this.roundChaos += 4;
    this.roundDamage += damageNearby ? 90 : 20;
    useGameStore.getState().updateLiveRound(this.roundDamage, this.roundChaos, this.roundCombo);
  }

  private damageNearbyObjects(x: number, y: number, radius: number, amount: number, source: string) {
    this.breakables.forEach((obj) => {
      if (!obj.active) return;
      const meta = obj.getData('breakable') as BreakableMeta | undefined;
      if (!meta || meta.broken) return;
      const distance = Phaser.Math.Distance.Between(x, y, obj.x, obj.y);
      if (distance > radius) return;
      meta.health -= amount * Phaser.Math.Linear(1, 0.3, distance / radius);
      if (meta.health <= 0) {
        this.breakObject(obj, meta, amount);
        useGameStore.getState().addFeed(`${source}: ${meta.label} could not handle the atmosphere.`);
      }
    });
  }

  private createFloatingText(x: number, y: number, text: string) {
    const label = this.add.text(x, y, text, {
      color: '#fff7c2',
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '24px',
      align: 'center',
      stroke: '#19161f',
      strokeThickness: 6
    }).setOrigin(0.5);
    this.tweens.add({
      targets: label,
      y: y - 48,
      alpha: 0,
      scale: 1.18,
      duration: FLOATING_TEXT_DURATION_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy()
    });
  }

  private drawGarageBackground() {
    this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'garage-background')
      .setDisplaySize(BACKGROUND_WIDTH, BACKGROUND_HEIGHT)
      .setDepth(-10);
  }
}
