import Phaser from 'phaser';
import { useGameStore, GearType, RoundSummary } from '../store/gameStore';

type BreakableMeta = {
  id: string;
  label: string;
  value: number;
  health: number;
  broken: boolean;
  kind: 'glass' | 'wood' | 'metal' | 'soft' | 'electronics';
};

type GearConfig = {
  label: string;
  width: number;
  height: number;
  visualWidth?: number;
  visualHeight?: number;
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
const LAUNCH_VELOCITY_DIVISOR = 11.5;
const PERFORMER_SCALE = 0.42;
const AIM_THEME = {
  shadow: 0x19161f,
  warm: 0xffe17d,
  hot: 0xff5c8a,
  cool: 0x5de0e6,
  cream: 0xfff7c2
};
const GEAR_VARIANTS = [1, 2, 3] as const;
const WORLD_WIDTH = 1700;
const WORLD_HEIGHT = 960;
const CAMERA_ZOOM = 0.78;
const FLOOR_Y = 905;
type PerformerPose = 'idle' | 'pull' | 'throw' | 'recover';

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
};

const LEVEL_PROPS: LevelProp[] = [
  { x: 890, y: 806, width: 260, height: 100, key: 'prop-folding-table', path: '/assets/garage-band/props-raster/folding_table_intact.png', label: 'Folding Table', value: 260, health: 28, kind: 'wood' },
  { x: 922, y: 735, width: 120, height: 118, key: 'prop-questionable-cake', path: '/assets/garage-band/props-raster/questionable_cake_intact.png', label: 'Questionable Cake', value: 420, health: 18, kind: 'soft' },
  { x: 1120, y: 792, width: 150, height: 138, key: 'prop-old-tv', path: '/assets/garage-band/props-raster/old_tv_intact.png', label: 'Old TV', value: 780, health: 38, kind: 'electronics' },
  { x: 1328, y: 720, width: 116, height: 225, key: 'prop-speaker-stack', path: '/assets/garage-band/props-raster/speaker_stack_intact.png', label: 'Speaker Stack', value: 680, health: 45, kind: 'metal' },
  { x: 1548, y: 824, width: 150, height: 92, key: 'prop-cooler', path: '/assets/garage-band/props-raster/cooler_intact.png', label: 'Cooler of Regret', value: 320, health: 32, kind: 'metal' },
  { x: 1430, y: 510, width: 330, height: 105, key: 'prop-garage-shelf', path: '/assets/garage-band/props-raster/garage_shelf_intact.png', label: 'Garage Shelf', value: 550, health: 36, kind: 'wood' },
  { x: 1368, y: 430, width: 86, height: 92, key: 'prop-paint-can', path: '/assets/garage-band/props-raster/paint_can_intact.png', label: 'Paint Can', value: 190, health: 20, kind: 'metal' },
  { x: 1450, y: 432, width: 130, height: 90, key: 'prop-cable-bin', path: '/assets/garage-band/props-raster/cable_bin_intact.png', label: 'Cable Bin', value: 210, health: 20, kind: 'soft' },
  { x: 1540, y: 430, width: 104, height: 104, key: 'prop-mystery-box', path: '/assets/garage-band/props-raster/mystery_box_intact.png', label: 'Mystery Box', value: 240, health: 22, kind: 'wood' },
  { x: 1050, y: 348, width: 265, height: 86, key: 'prop-neon-sign', path: '/assets/garage-band/props-raster/neon_sign_intact.png', label: 'Neon Sign', value: 900, health: 24, kind: 'glass' },
  { x: 700, y: 782, width: 150, height: 150, key: 'prop-tiny-drum-kit', path: '/assets/garage-band/props-raster/tiny_drum_kit_intact.png', label: 'Tiny Drum Kit', value: 520, health: 30, kind: 'metal' },
  { x: 1626, y: 648, width: 84, height: 245, key: 'prop-garage-window', path: '/assets/garage-band/props-raster/garage_window_intact.png', label: 'Garage Window', value: 760, health: 15, kind: 'glass' }
];

const DEBRIS_TEXTURES: Record<BreakableMeta['kind'], string[]> = {
  glass: ['debris-glass-1'],
  wood: ['debris-wood-1', 'debris-wood-2'],
  metal: ['debris-metal-1'],
  soft: ['debris-fabric-1'],
  electronics: ['debris-metal-1', 'debris-glass-1']
};

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
  private maxRoundTimer: number | null = null;
  private resetHandler = () => this.resetLevel();
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
    LEVEL_PROPS.forEach((prop) => {
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
    if (!this.textures.exists(key)) this.load.image(key, path);
  }

  private loadSvgOnce(key: string, path: string, config: Phaser.Types.Loader.FileTypes.SVGSizeConfig) {
    if (!this.textures.exists(key)) this.load.svg(key, path, config);
  }

  create() {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.centerOn(820, 500);
    this.drawGarageBackground();
    this.aimLine = this.add.graphics();
    this.createWorldBounds();
    this.createVenueObjects();
    this.setupInput();
    this.setupKeyboardShortcuts();
    this.setupCollisions();
    this.createPerformer();
    this.updateReadyGearPreview();

    window.addEventListener('pd:reset-level', this.resetHandler);
    window.addEventListener('pd:stage-pointer', this.stagePointerHandler);
    window.addEventListener('keydown', this.keyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('pd:reset-level', this.resetHandler);
      window.removeEventListener('pd:stage-pointer', this.stagePointerHandler);
      window.removeEventListener('keydown', this.keyHandler);
    });
  }

  update(_time: number, delta: number) {
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
      window.setTimeout(() => this.finishRound(), 650);
    }
  }

  private setupInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const point = this.getPointerPoint(pointer);
      if (point) this.beginDrag(point);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const point = this.getPointerPoint(pointer);
      if (point) this.moveDrag(point);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const point = this.getPointerPoint(pointer);
      if (point) this.endDrag(point);
    });
  }

  private getPointerPoint(pointer: Phaser.Input.Pointer) {
    if (!this.cameras?.main) return null;
    const point = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
    return this.clampPointerPoint(point);
  }

  private clampPointerPoint(point: Phaser.Math.Vector2) {
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(point.x, 0, WORLD_WIDTH),
      Phaser.Math.Clamp(point.y, 0, WORLD_HEIGHT)
    );
  }

  private beginDrag(point: Phaser.Math.Vector2) {
    const state = useGameStore.getState().roundState;
    if (state === 'summary') {
      this.resetLevel(true);
      return;
    }
    if (useGameStore.getState().roundState !== 'ready') return;
    this.isDragging = true;
    this.dragAnchor = point.clone();
    this.setPerformerPose('pull');
    this.updateReadyGearPreview();
    this.positionHeldGearForCharge(0, 1);
    this.drawAim(point);
  }

  private moveDrag(point: Phaser.Math.Vector2) {
    if (!this.isDragging) return;
    const pull = this.getDragPull(point);
    this.positionHeldGearForCharge(pull.length() / MAX_PULL_DISTANCE, 1);
    this.drawAim(point);
  }

  private endDrag(point: Phaser.Math.Vector2) {
    if (!this.isDragging) return;
    this.isDragging = false;
    const pull = this.getDragPull(point);
    this.dragAnchor = null;
    this.aimLine.clear();

    if (pull.length() < 20) {
      this.setPerformerPose('idle');
      this.updateReadyGearPreview();
      return;
    }
    pull.limit(MAX_PULL_DISTANCE);
    this.animatePerformerThrow(point, pull);
  }

  private drawAim(point: Phaser.Math.Vector2) {
    this.aimLine.clear();
    const pull = this.getDragPull(point);
    const charge = Phaser.Math.Clamp(pull.length() / MAX_PULL_DISTANCE, 0, 1);
    const hand = this.getHeldGearPoint('pull');
    const lineAlpha = Phaser.Math.Linear(0.42, 0.86, charge);

    this.aimLine.lineStyle(8, AIM_THEME.shadow, 0.28);
    this.aimLine.lineBetween(hand.x - 9, hand.y + 34, point.x, point.y);
    this.aimLine.lineStyle(4 + charge * 2, AIM_THEME.hot, lineAlpha);
    this.aimLine.lineBetween(hand.x - 9, hand.y + 34, point.x, point.y);
    this.aimLine.lineStyle(2, AIM_THEME.cool, 0.5 + charge * 0.24);
    this.aimLine.lineBetween(hand.x + 14, hand.y + 30, point.x, point.y);

    this.aimLine.fillStyle(AIM_THEME.warm, 0.42 + charge * 0.35);
    for (let i = 1; i <= 12; i += 1) {
      const t = i / 12;
      const x = this.launcher.x + pull.x * Phaser.Math.Linear(1.55, 2.15, charge) * t;
      const y = this.launcher.y - 42 + pull.y * Phaser.Math.Linear(1.55, 2.15, charge) * t + Phaser.Math.Linear(180, 235, charge) * t * t;
      const radius = Math.max(2.2, 6.5 - i * 0.28 + charge * 1.2);
      this.aimLine.fillCircle(x, y, radius);
      if (i % 3 === 0) {
        this.aimLine.fillStyle(AIM_THEME.cool, 0.22 + charge * 0.28);
        this.aimLine.fillCircle(x + 5, y - 3, radius * 0.54);
        this.aimLine.fillStyle(AIM_THEME.warm, 0.42 + charge * 0.35);
      }
    }
  }

  private getDragPull(point: Phaser.Math.Vector2) {
    const anchor = this.dragAnchor ?? this.launcher;
    return new Phaser.Math.Vector2(anchor.x - point.x, anchor.y - point.y).limit(MAX_PULL_DISTANCE);
  }

  private createPerformer() {
    this.performer = this.add.image(this.launcher.x - 18, this.launcher.y + 74, 'performer-idle');
    this.performer.setOrigin(0.5, 1);
    this.performer.setDepth(16);
    this.setPerformerPose('idle');
  }

  private setPerformerPose(pose: PerformerPose) {
    this.performerPose = pose;
    this.performer?.setPosition(this.launcher.x - 18, this.launcher.y + 74);
    this.performer?.setTexture(`performer-${pose}`);
    if (pose === 'idle') this.performer?.setAngle(0).setScale(PERFORMER_SCALE);
    if (pose === 'pull') this.performer?.setAngle(-2).setScale(PERFORMER_SCALE * 1.02, PERFORMER_SCALE * 0.99);
    if (pose === 'throw') this.performer?.setAngle(3).setScale(PERFORMER_SCALE * 1.03, PERFORMER_SCALE * 0.98);
    if (pose === 'recover') this.performer?.setAngle(1).setScale(PERFORMER_SCALE);
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
      .setScale(PERFORMER_SCALE * (1.02 + eased * 0.08), PERFORMER_SCALE * (0.99 - eased * 0.06));
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
            this.performer?.setTexture('performer-recover');
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

  private advanceGearVariant(gearType: GearType) {
    this.gearVariantByType[gearType] = (this.gearVariantByType[gearType] % GEAR_VARIANTS.length) + 1;
  }

  private setupKeyboardShortcuts() {
    this.input.keyboard?.on('keydown-SPACE', () => this.quickLaunch());
    this.input.keyboard?.on('keydown-ENTER', () => this.quickLaunch());
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
    this.activeGear.setDisplaySize(config.visualWidth ?? config.width, config.visualHeight ?? config.height);
    if (config.behavior === 'ricochet') this.activeGear.setCircle(39);
    if (config.behavior === 'spear') this.activeGear.setRectangle(config.width, config.height);
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
    this.maxRoundTimer = window.setTimeout(() => this.forceFinishRound(), 12500);
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

          if (meta.health <= 0) {
            this.breakObject(image, meta, impact);
          }
        });
      });
    });
  }

  private breakObject(image: Phaser.Physics.Matter.Image, meta: BreakableMeta, impact: number) {
    const breakX = image.x;
    const breakY = image.y;

    meta.broken = true;
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

    this.spawnDebris(breakX, breakY, meta.kind, Phaser.Math.Between(4, 8));
    this.createFloatingText(breakX, breakY - 20, `$${damage.toLocaleString()}`);
    this.cameras.main.shake(Math.min(260, 90 + impact * 8), Math.min(0.018, 0.004 + impact / 900));

    const flavor = this.getBreakFlavor(meta.label);
    useGameStore.getState().addFeed(flavor);

    const behavior = this.activeGear?.getData('behavior');
    if (behavior === 'burst' && impact > 4) this.fogBurst(breakX, breakY, true);
    if (behavior === 'crusher' && impact > 5) this.shockwave(breakX, breakY);
    if (behavior === 'ricochet' && impact > 7) this.cymbalPing(breakX, breakY, true);
  }

  private finishRound() {
    if (this.maxRoundTimer !== null) {
      window.clearTimeout(this.maxRoundTimer);
      this.maxRoundTimer = null;
    }
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
    window.setTimeout(() => this.finishRound(), 650);
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
      `${label} broke with confidence.`
    ];
    return Phaser.Utils.Array.GetRandom(lines);
  }

  private resetLevel(setReady = true) {
    if (this.maxRoundTimer !== null) {
      window.clearTimeout(this.maxRoundTimer);
      this.maxRoundTimer = null;
    }
    this.aimLine?.clear();
    this.setPerformerPose('idle');
    this.activeGear?.destroy();
    this.activeGear = null;
    this.breakables.forEach((obj) => obj.destroy());
    this.debris.forEach((obj) => obj.destroy());
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
    LEVEL_PROPS.forEach((prop) => this.addBreakable(prop));
  }

  private addBreakable(prop: LevelProp) {
    const image = this.matter.add.image(prop.x, prop.y, prop.key, undefined, {
      isStatic: true,
      restitution: 0.42,
      friction: 0.62,
      density: 0.0015
    });
    image.setDisplaySize(prop.width, prop.height);
    image.setData('breakable', {
      id: prop.key,
      label: prop.label,
      value: prop.value,
      health: prop.health,
      broken: false,
      kind: prop.kind
    } satisfies BreakableMeta);
    image.setFrictionAir(0.012);
    this.breakables.push(image);
    return image;
  }

  private spawnDebris(x: number, y: number, kind: BreakableMeta['kind'], count: number) {
    const textures = DEBRIS_TEXTURES[kind];
    for (let i = 0; i < count; i += 1) {
      const texture = Phaser.Utils.Array.GetRandom(textures);
      const piece = this.matter.add.image(x + Phaser.Math.Between(-12, 12), y + Phaser.Math.Between(-10, 10), texture, undefined, {
        restitution: 0.55,
        friction: 0.75
      });
      piece.setScale(Phaser.Math.FloatBetween(0.65, 1.35));
      piece.setVelocity(Phaser.Math.FloatBetween(-5, 5), Phaser.Math.FloatBetween(-7, -2));
      piece.setAngularVelocity(Phaser.Math.FloatBetween(-0.25, 0.25));
      piece.setMass(Phaser.Math.FloatBetween(2, 7));
      this.debris.push(piece);
    }
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
      stroke: '#19161f',
      strokeThickness: 6
    }).setOrigin(0.5);
    this.tweens.add({
      targets: label,
      y: y - 48,
      alpha: 0,
      scale: 1.18,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy()
    });
  }

  private drawGarageBackground() {
    this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'garage-background')
      .setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT)
      .setDepth(-10);
  }
}
