import Phaser from 'phaser';
import { GearType, RoundSummary, useGameStore } from '../store/gameStore';

type RushDebrisKind = 'glass' | 'wood' | 'metal' | 'soft' | 'electronics' | 'cake';
type RushPropKind =
  | 'cakeCart'
  | 'printer'
  | 'glassTable'
  | 'foldingChairStack'
  | 'rollingTvStand'
  | 'podium'
  | 'speakerTower'
  | 'expensiveVase';

type RushPropConfig = {
  kind: RushPropKind;
  label: string;
  textureKey: string;
  assetPath: string;
  width: number;
  height: number;
  mass: number;
  health: number;
  value: number;
  speed: number;
  wobble?: number;
  bounciness: number;
  fragility: number;
  debrisKind: RushDebrisKind;
  bonusTag?: 'fragile' | 'heavy' | 'topHeavy' | 'tinyTarget' | 'electronics' | 'party';
};

type RushPropMeta = RushPropConfig & {
  id: string;
  healthLeft: number;
  cleared: boolean;
  escaped: boolean;
};

type GearConfig = {
  label: string;
  width: number;
  height: number;
  mass: number;
  bounciness: number;
  behavior: 'balanced' | 'crusher' | 'ricochet' | 'spear' | 'burst';
  multiplier: number;
};

const GEAR: Record<GearType, GearConfig> = {
  guitar: { label: 'GUITAR', width: 120, height: 34, mass: 24, bounciness: 0.72, behavior: 'balanced', multiplier: 1.12 },
  amp: { label: 'BASS AMP', width: 96, height: 88, mass: 68, bounciness: 0.24, behavior: 'crusher', multiplier: 1.5 },
  cymbal: { label: 'CYMBAL', width: 78, height: 78, mass: 18, bounciness: 0.98, behavior: 'ricochet', multiplier: 0.9 },
  micStand: { label: 'MIC STAND', width: 150, height: 18, mass: 22, bounciness: 0.5, behavior: 'spear', multiplier: 1.35 },
  fogMachine: { label: 'FOG MACHINE', width: 82, height: 54, mass: 34, bounciness: 0.38, behavior: 'burst', multiplier: 1.05 }
};

const RUSH_PROPS: RushPropConfig[] = [
  { kind: 'cakeCart', label: 'Questionable Cake', textureKey: 'prop-questionable-cake', assetPath: '/assets/garage-band/props-raster/questionable_cake_intact.png', width: 124, height: 122, mass: 34, health: 45, value: 880, speed: 2.35, wobble: 0.035, bounciness: 0.38, fragility: 1.18, debrisKind: 'cake', bonusTag: 'party' },
  { kind: 'printer', label: 'Old TV', textureKey: 'prop-old-tv', assetPath: '/assets/garage-band/props-raster/old_tv_intact.png', width: 142, height: 132, mass: 58, health: 62, value: 620, speed: 2.05, bounciness: 0.24, fragility: 0.82, debrisKind: 'electronics', bonusTag: 'electronics' },
  { kind: 'glassTable', label: 'Neon Sign', textureKey: 'prop-neon-sign', assetPath: '/assets/garage-band/props-raster/neon_sign_intact.png', width: 214, height: 70, mass: 22, health: 26, value: 960, speed: 2.85, bounciness: 0.58, fragility: 1.75, debrisKind: 'glass', bonusTag: 'fragile' },
  { kind: 'foldingChairStack', label: 'Folding Table', textureKey: 'prop-folding-table', assetPath: '/assets/garage-band/props-raster/folding_table_intact.png', width: 196, height: 78, mass: 36, health: 48, value: 560, speed: 2.38, wobble: 0.028, bounciness: 0.42, fragility: 1.0, debrisKind: 'metal' },
  { kind: 'rollingTvStand', label: 'Garage Shelf', textureKey: 'prop-garage-shelf', assetPath: '/assets/garage-band/props-raster/garage_shelf_intact.png', width: 230, height: 86, mass: 70, health: 72, value: 1040, speed: 1.88, wobble: 0.018, bounciness: 0.22, fragility: 0.78, debrisKind: 'electronics', bonusTag: 'heavy' },
  { kind: 'podium', label: 'Mystery Box', textureKey: 'prop-mystery-box', assetPath: '/assets/garage-band/props-raster/mystery_box_intact.png', width: 106, height: 106, mass: 42, health: 52, value: 600, speed: 2.32, bounciness: 0.34, fragility: 0.96, debrisKind: 'wood' },
  { kind: 'speakerTower', label: 'Speaker Stack', textureKey: 'prop-speaker-stack', assetPath: '/assets/garage-band/props-raster/speaker_stack_intact.png', width: 92, height: 178, mass: 62, health: 68, value: 980, speed: 2.02, wobble: 0.042, bounciness: 0.28, fragility: 0.9, debrisKind: 'electronics', bonusTag: 'topHeavy' },
  { kind: 'expensiveVase', label: 'Paint Can', textureKey: 'prop-paint-can', assetPath: '/assets/garage-band/props-raster/paint_can_intact.png', width: 78, height: 84, mass: 14, health: 18, value: 1250, speed: 3.15, wobble: 0.065, bounciness: 0.62, fragility: 2.1, debrisKind: 'glass', bonusTag: 'tinyTarget' }
];

const ROUND_DURATION_SECONDS = 90;
const MAX_ESCAPES = 5;
const MAX_ACTIVE_RUSH_OBJECTS = 10;
const BASE_RELOAD_MS = 1200;
const COMBO_WINDOW_MS = 2500;
const MAX_COMBO_MULTIPLIER = 5;
const LANES = [190, 305, 420, 535, 625];
const SPAWN_X = 1480;
const FLOOR_Y = 694;
const LAUNCHER = new Phaser.Math.Vector2(118, 575);
const MAX_PULL_DISTANCE = 340;
const LAUNCH_VELOCITY_DIVISOR = 10.4;
const PERFORMER_SCALE = 0.32;
const AIM_THEME = {
  shadow: 0x19161f,
  warm: 0xffe17d,
  hot: 0xff5c8a,
  cool: 0x5de0e6
};
type PerformerPose = 'idle' | 'pull' | 'throw' | 'recover';

export class DamageRushScene extends Phaser.Scene {
  private aimLine!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private reloadText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private activeGear: Phaser.Physics.Matter.Sprite | null = null;
  private activeProps: Phaser.Physics.Matter.Image[] = [];
  private debris: Phaser.Physics.Matter.Image[] = [];
  private performer: Phaser.GameObjects.Image | null = null;
  private heldGearPreview: Phaser.GameObjects.Image | null = null;
  private performerPose: PerformerPose = 'idle';
  private previewGear: GearType | null = null;
  private previewTextureKey: string | null = null;
  private isDragging = false;
  private dragAnchor: Phaser.Math.Vector2 | null = null;
  private reloadUntil = 0;
  private roundStartedAt = 0;
  private nextSpawnAt = 0;
  private rushScore = 0;
  private rushDamage = 0;
  private rushCombo = 0;
  private rushBestCombo = 0;
  private rushClearedCount = 0;
  private rushEscapedCount = 0;
  private rushBestSingleImpact = 0;
  private rushFansEarned = 0;
  private rushCashEarned = 0;
  private lastClearAt = 0;
  private launchHitIds = new Set<string>();
  private roundOver = false;
  private fogBurstUsed = false;
  private isRoundArmed = false;
  private stagePointerHandler = (event: Event) => {
    const detail = (event as CustomEvent<{ type: 'down' | 'move' | 'up'; x: number; y: number }>).detail;
    if (!detail || this.roundOver || !this.cameras?.main) return;
    const point = this.clampPointerPoint(this.cameras.main.getWorldPoint(detail.x, detail.y));
    if (detail.type === 'down') this.beginDrag(point);
    if (detail.type === 'move') this.moveDrag(point);
    if (detail.type === 'up') this.endDrag(point);
  };
  private resetHandler = () => this.resetRush();
  private roundArmedHandler = () => this.armRound();
  private keyHandler = (event: KeyboardEvent) => {
    if ((event.code === 'Space' || event.code === 'Enter') && !this.roundOver) {
      event.preventDefault();
      this.quickLaunch();
    }
  };

  constructor() {
    super('DamageRushScene');
  }

  preload() {
    this.loadImageOnce('garage-background', '/assets/garage-band/backgrounds/garage_background.png');
    this.loadSvgOnce('debris-wood-1', '/assets/garage-band/debris/wood_chunk_01.svg', { width: 48, height: 38 });
    this.loadSvgOnce('debris-wood-2', '/assets/garage-band/debris/wood_chunk_02.svg', { width: 52, height: 34 });
    this.loadSvgOnce('debris-glass-1', '/assets/garage-band/debris/glass_chunk_01.svg', { width: 44, height: 40 });
    this.loadSvgOnce('debris-metal-1', '/assets/garage-band/debris/metal_chunk_01.svg', { width: 50, height: 36 });
    this.loadSvgOnce('debris-fabric-1', '/assets/garage-band/debris/fabric_scrap_01.svg', { width: 54, height: 38 });
    this.loadSvgOnce('effect-impact-star', '/assets/garage-band/effects/impact_star.svg', { width: 92, height: 92 });
    this.loadSvgOnce('effect-smoke-puff', '/assets/garage-band/effects/smoke_puff.svg', { width: 96, height: 96 });
    RUSH_PROPS.forEach((prop) => {
      this.loadImageOnce(prop.textureKey, prop.assetPath);
    });
    ([1, 2, 3] as const).forEach((variant) => {
      Object.keys(GEAR).forEach((key) => this.loadImageOnce(`gear-${key}-${variant}`, `/assets/garage-band/${key}-v${variant}.png`));
    });
    this.loadImageOnce('performer-idle', '/assets/thrower-idle.png');
    this.loadImageOnce('performer-pull', '/assets/thrower-pull.png');
    this.loadImageOnce('performer-throw', '/assets/thrower-throw.png');
    this.loadImageOnce('performer-recover', '/assets/thrower-recover.png');
  }

  private loadImageOnce(key: string, path: string) {
    if (!this.textures.exists(key)) this.load.image(key, path);
  }

  private loadSvgOnce(key: string, path: string, config: Phaser.Types.Loader.FileTypes.SVGSizeConfig) {
    if (!this.textures.exists(key)) this.load.svg(key, path, config);
  }

  create() {
    this.matter.world.setBounds(0, 0, 1280, 720, 42, false, false, true, true);
    this.matter.add.rectangle(640, FLOOR_Y + 22, 1280, 44, { isStatic: true, restitution: 0.38, friction: 0.78 });
    this.drawBackground();
    this.createPerformer();
    this.aimLine = this.add.graphics().setDepth(20);
    this.createHud();
    this.setupCollisions();
    window.addEventListener('pd:stage-pointer', this.stagePointerHandler);
    window.addEventListener('pd:reset-rush', this.resetHandler);
    window.addEventListener('pd:round-armed', this.roundArmedHandler);
    window.addEventListener('keydown', this.keyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('pd:stage-pointer', this.stagePointerHandler);
      window.removeEventListener('pd:reset-rush', this.resetHandler);
      window.removeEventListener('pd:round-armed', this.roundArmedHandler);
      window.removeEventListener('keydown', this.keyHandler);
    });
    this.resetRush();
  }

  update(time: number) {
    if (this.roundOver) return;
    if (!this.isRoundArmed || ['selecting', 'countdown'].includes(useGameStore.getState().roundState)) {
      this.updateHud(ROUND_DURATION_SECONDS, time);
      return;
    }
    const elapsedSeconds = (time - this.roundStartedAt) / 1000;
    const remaining = Math.max(0, ROUND_DURATION_SECONDS - elapsedSeconds);
    if (remaining <= 0 || this.rushEscapedCount >= MAX_ESCAPES) {
      this.endRound();
      return;
    }

    if (time >= this.nextSpawnAt && this.activeProps.length < MAX_ACTIVE_RUSH_OBJECTS) {
      this.spawnIncomingProp(elapsedSeconds);
      if (elapsedSeconds > 8 && this.activeProps.length < MAX_ACTIVE_RUSH_OBJECTS - 1 && Math.random() < 0.38) {
        this.spawnIncomingProp(elapsedSeconds, SPAWN_X + Phaser.Math.Between(120, 280));
      }
      this.nextSpawnAt = time + this.getNextSpawnDelay(elapsedSeconds);
    }

    this.activeProps.forEach((prop) => {
      const meta = prop.getData('rushProp') as RushPropMeta | undefined;
      if (!meta || meta.cleared || meta.escaped || !prop.body) return;
      prop.setVelocityX(Math.min(prop.body.velocity.x, -meta.speed));
      if (meta.wobble) prop.setAngularVelocity(Math.sin(time / 240 + prop.y) * meta.wobble);
      if (prop.x + prop.displayWidth / 2 < 0) this.escapeProp(prop, meta);
    });

    if (this.activeGear && (this.activeGear.x > 1450 || this.activeGear.y > 850 || this.activeGear.x < -180)) {
      this.activeGear.destroy();
      this.activeGear = null;
    }

    if (this.rushCombo && time - this.lastClearAt > COMBO_WINDOW_MS) this.rushCombo = 0;
    if (useGameStore.getState().roundState === 'ready' && !this.isDragging) this.updateReadyGearPreview();
    this.updateHud(remaining, time);
  }

  private resetRush() {
    this.roundOver = false;
    this.isRoundArmed = false;
    this.isDragging = false;
    this.reloadUntil = 0;
    this.roundStartedAt = this.time.now;
    this.nextSpawnAt = Number.POSITIVE_INFINITY;
    this.rushScore = 0;
    this.rushDamage = 0;
    this.rushCombo = 0;
    this.rushBestCombo = 0;
    this.rushClearedCount = 0;
    this.rushEscapedCount = 0;
    this.rushBestSingleImpact = 0;
    this.rushFansEarned = 0;
    this.rushCashEarned = 0;
    this.lastClearAt = 0;
    this.launchHitIds.clear();
    this.fogBurstUsed = false;
    this.dragAnchor = null;
    this.activeGear?.destroy();
    this.activeGear = null;
    this.activeProps.forEach((prop) => prop.destroy());
    this.debris.forEach((piece) => piece.destroy());
    this.activeProps = [];
    this.debris = [];
    this.aimLine?.clear();
    this.setPerformerPose('idle');
    this.updateReadyGearPreview();
    useGameStore.getState().resetRun();
    useGameStore.getState().addFeed('Damage Rush staged. Pick a weapon before the props roll.');
    this.updateHud(ROUND_DURATION_SECONDS, this.time.now);
  }

  private armRound() {
    if (this.roundOver) return;
    this.isRoundArmed = true;
    this.roundStartedAt = this.time.now;
    this.nextSpawnAt = this.time.now + 760;
    useGameStore.getState().addFeed('Damage Rush started. Fragile stuff is incoming.');
    [SPAWN_X, SPAWN_X + 140, SPAWN_X + 280, SPAWN_X + 420].forEach((spawnX, index) => {
      this.time.delayedCall(index * 210, () => {
        if (!this.roundOver && this.isRoundArmed) this.spawnIncomingProp(0, spawnX);
      });
    });
  }

  private beginDrag(point: Phaser.Math.Vector2) {
    if (useGameStore.getState().roundState !== 'ready' || this.time.now < this.reloadUntil) return;
    this.isDragging = true;
    this.dragAnchor = point.clone();
    this.setPerformerPose('pull');
    this.updateReadyGearPreview();
    this.positionHeldGearForCharge(0);
    this.drawAim(point);
  }

  private moveDrag(point: Phaser.Math.Vector2) {
    if (!this.isDragging) return;
    const pull = this.getDragPull(point);
    this.positionHeldGearForCharge(pull.length() / MAX_PULL_DISTANCE);
    this.drawAim(point);
  }

  private endDrag(point: Phaser.Math.Vector2) {
    if (!this.isDragging) return;
    this.isDragging = false;
    const pull = this.getDragPull(point);
    this.dragAnchor = null;
    this.aimLine.clear();
    if (pull.length() < 18) {
      this.setPerformerPose('idle');
      this.updateReadyGearPreview();
      return;
    }
    pull.limit(MAX_PULL_DISTANCE);
    this.animatePerformerThrow(pull);
  }

  private quickLaunch() {
    if (useGameStore.getState().roundState !== 'ready' || this.time.now < this.reloadUntil) return;
    this.setPerformerPose('pull');
    this.positionHeldGearForCharge(0.9);
    this.animatePerformerThrow(new Phaser.Math.Vector2(Phaser.Math.Between(295, 350), Phaser.Math.Between(-120, -45)));
  }

  private launchGear(pull: Phaser.Math.Vector2, spawnPoint = new Phaser.Math.Vector2(LAUNCHER.x + 35, LAUNCHER.y - 28)) {
    const selectedGear = useGameStore.getState().selectedGear;
    const config = GEAR[selectedGear];
    const textureKey = `gear-${selectedGear}-${Phaser.Math.Between(1, 3)}`;
    this.activeGear = this.matter.add.sprite(spawnPoint.x, spawnPoint.y, textureKey);
    this.activeGear.setName(`rush-gear-${selectedGear}`);
    this.activeGear.setData('gearType', selectedGear);
    this.activeGear.setData('behavior', config.behavior);
    this.activeGear.setDisplaySize(config.width, config.height);
    if (config.behavior === 'ricochet') this.activeGear.setCircle(38);
    this.activeGear.setFrictionAir(0.008);
    this.activeGear.setBounce(config.bounciness);
    this.activeGear.setMass(config.mass * (1 + useGameStore.getState().upgrades.gearWeight * 0.1));
    this.activeGear.setVelocity(
      (pull.x / LAUNCH_VELOCITY_DIVISOR) * (1 + useGameStore.getState().upgrades.launchPower * 0.14),
      pull.y / LAUNCH_VELOCITY_DIVISOR
    );
    this.activeGear.setAngularVelocity(config.behavior === 'spear' ? 0.18 : pull.x > 0 ? 0.24 : -0.24);
    this.reloadUntil = this.time.now + BASE_RELOAD_MS;
    this.launchHitIds.clear();
    this.fogBurstUsed = false;
    useGameStore.getState().setRoundState('launched');
    useGameStore.getState().addFeed(`${config.label} away. Reloading before the next bad idea.`);
    this.time.delayedCall(BASE_RELOAD_MS, () => {
      if (!this.roundOver) {
        useGameStore.getState().setRoundState('ready');
        this.setPerformerPose('idle');
        this.updateReadyGearPreview();
      }
    });
  }

  private setupCollisions() {
    this.matter.world.on('collisionstart', (event: any) => {
      if (this.roundOver) return;
      event.pairs.forEach((pair: any) => {
        const objects = [(pair.bodyA as any).gameObject, (pair.bodyB as any).gameObject].filter(Boolean) as Phaser.Physics.Matter.Image[];
        const gear = objects.find((obj) => obj.getData?.('gearType')) as Phaser.Physics.Matter.Sprite | undefined;
        const prop = objects.find((obj) => obj.getData?.('rushProp')) as Phaser.Physics.Matter.Image | undefined;
        if (!prop?.active || !prop.body) return;
        const meta = prop.getData('rushProp') as RushPropMeta;
        if (meta.cleared || meta.escaped) return;
        const relativeSpeed = Math.max(pair.bodyA.speed ?? 0, pair.bodyB.speed ?? 0);
        if (relativeSpeed < 1.2) return;
        if (!gear) return;
        const gearType = gear.getData('gearType') as GearType;
        const config = GEAR[gearType];
        const impactValue = relativeSpeed * 5.8 * config.multiplier * meta.fragility * (1 + useGameStore.getState().upgrades.fragility * 0.12);
        meta.healthLeft -= impactValue;
        this.rushBestSingleImpact = Math.max(this.rushBestSingleImpact, Math.round(impactValue * 34));
        prop.setTint(0xffffff);
        this.time.delayedCall(60, () => {
          if (prop.active) prop.clearTint();
        });
        this.launchHitIds.add(meta.id);
        if (config.behavior === 'burst' && !this.fogBurstUsed && relativeSpeed > 3) {
          this.fogBurstUsed = true;
          this.fogBurst(prop.x, prop.y);
        }
        if (config.behavior === 'ricochet' && relativeSpeed > 2) this.cymbalPing(prop.x, prop.y, prop);
        if (!meta.cleared && meta.healthLeft <= 0) this.clearProp(prop, meta, impactValue, gearType);
      });
    });
  }

  private clearProp(prop: Phaser.Physics.Matter.Image, meta: RushPropMeta, impactValue: number, gearType: GearType) {
    meta.cleared = true;
    const now = this.time.now;
    this.rushCombo = now - this.lastClearAt < COMBO_WINDOW_MS ? this.rushCombo + 1 : 1;
    this.rushBestCombo = Math.max(this.rushBestCombo, this.rushCombo);
    this.lastClearAt = now;
    const comboMultiplier = Math.min(MAX_COMBO_MULTIPLIER, 1 + (this.rushCombo - 1) * 0.35);
    const lastSecondSaveBonus = prop.x < 160 ? 225 : 0;
    const multiHitBonus = this.launchHitIds.size >= 2 ? 160 * this.launchHitIds.size : 0;
    const tinyBonus = meta.bonusTag === 'tinyTarget' ? 300 : 0;
    const score = Math.round((meta.value + impactValue * 42 + lastSecondSaveBonus + multiHitBonus + tinyBonus) * comboMultiplier);
    this.rushScore += score;
    this.rushDamage += score;
    this.rushClearedCount += 1;
    this.rushCashEarned += Math.floor(score * 0.12);
    this.rushFansEarned += Math.max(1, Math.floor(score / 350));
    this.spawnDebris(prop.x, prop.y, meta.debrisKind, meta.bonusTag === 'fragile' ? 9 : 6);
    this.createFloatingText(prop.x, prop.y - 30, this.getImpactLabel(score, meta, gearType));
    this.cameras.main.shake(Math.min(250, 60 + impactValue * 8), Math.min(0.018, 0.003 + impactValue / 800));
    useGameStore.getState().updateLiveRound(this.rushScore, this.rushClearedCount + this.rushEscapedCount, this.rushCombo);
    useGameStore.getState().addFeed(this.getClearFeed(meta.label));
    prop.destroy();
    this.activeProps = this.activeProps.filter((item) => item !== prop);
  }

  private escapeProp(prop: Phaser.Physics.Matter.Image, meta: RushPropMeta) {
    meta.escaped = true;
    this.rushEscapedCount += 1;
    useGameStore.getState().addFeed(`The ${meta.label.toLowerCase()} escaped. Unacceptable.`);
    this.createFloatingText(70, prop.y, 'ESCAPED');
    prop.destroy();
    this.activeProps = this.activeProps.filter((item) => item !== prop);
    useGameStore.getState().updateLiveRound(this.rushScore, this.rushClearedCount + this.rushEscapedCount, this.rushCombo);
  }

  private endRound() {
    this.roundOver = true;
    this.isDragging = false;
    this.aimLine.clear();
    const totalDamage = Math.max(0, this.rushScore);
    const summary: RoundSummary = {
      mode: 'damageRush',
      totalDamage,
      chaos: this.rushClearedCount + this.rushBestCombo * 2,
      combo: this.rushCombo,
      bestCombo: this.rushBestCombo,
      fans: this.rushFansEarned,
      fansEarned: this.rushFansEarned,
      cashEarned: this.rushCashEarned,
      cleared: this.rushClearedCount,
      escapes: this.rushEscapedCount,
      title: this.getVerdict(),
      verdict: this.getVerdict(),
      bonuses: this.buildRushBonuses()
    };
    useGameStore.getState().completeRound(summary);
  }

  private spawnIncomingProp(elapsedSeconds: number, spawnX = SPAWN_X) {
    const config = this.pickPropConfig(elapsedSeconds);
    const startX = Math.max(spawnX, SPAWN_X);
    const openLanes = LANES.filter((candidate) => {
      return !this.activeProps.some((prop) => Math.abs(prop.y - candidate) < 48 && prop.x > SPAWN_X - 220);
    });
    const lane = Phaser.Utils.Array.GetRandom(openLanes.length > 0 ? openLanes : LANES);
    const prop = this.matter.add.image(startX, lane, config.textureKey, undefined, {
      restitution: config.bounciness,
      friction: 0.72,
      frictionAir: 0.006
    });
    prop.setDepth(7);
    prop.setDisplaySize(config.width, config.height);
    prop.setMass(config.mass);
    prop.setIgnoreGravity(true);
    prop.setVelocityX(-config.speed * Phaser.Math.FloatBetween(0.9, 1.22));
    prop.setAngularVelocity(Phaser.Math.FloatBetween(-0.025, 0.025));
    prop.setData('rushProp', {
      ...config,
      id: `${config.kind}-${this.time.now}-${Math.random()}`,
      healthLeft: config.health,
      cleared: false,
      escaped: false
    } satisfies RushPropMeta);
    this.activeProps.push(prop);
  }

  private pickPropConfig(elapsedSeconds: number) {
    if (elapsedSeconds < 20) {
      return Phaser.Utils.Array.GetRandom(RUSH_PROPS.filter((prop) => ['printer', 'cakeCart', 'foldingChairStack'].includes(prop.kind)));
    }
    if (elapsedSeconds < 55) {
      return Phaser.Utils.Array.GetRandom(RUSH_PROPS.filter((prop) => prop.kind !== 'cakeCart' || Math.random() < 0.35));
    }
    return Phaser.Utils.Array.GetRandom(RUSH_PROPS);
  }

  private getNextSpawnDelay(elapsedSeconds: number) {
    if (elapsedSeconds < 20) return Phaser.Math.Between(560, 920);
    if (elapsedSeconds < 55) return Phaser.Math.Between(440, 760);
    return Phaser.Math.Between(340, 620);
  }

  private drawAim(point: Phaser.Math.Vector2) {
    this.aimLine.clear();
    const pull = this.getDragPull(point);
    const charge = Phaser.Math.Clamp(pull.length() / MAX_PULL_DISTANCE, 0, 1);
    const hand = this.getHeldGearPoint('pull');
    this.aimLine.lineStyle(8, AIM_THEME.shadow, 0.28);
    this.aimLine.lineBetween(hand.x, hand.y + 28, point.x, point.y);
    this.aimLine.lineStyle(4 + charge * 2, AIM_THEME.hot, 0.48 + charge * 0.36);
    this.aimLine.lineBetween(hand.x, hand.y + 28, point.x, point.y);
    this.aimLine.lineStyle(2, AIM_THEME.cool, 0.48 + charge * 0.28);
    this.aimLine.lineBetween(hand.x + 16, hand.y + 24, point.x, point.y);
    this.aimLine.fillStyle(AIM_THEME.warm, 0.48 + charge * 0.28);
    for (let i = 1; i <= 10; i += 1) {
      const t = i / 10;
      const x = LAUNCHER.x + pull.x * Phaser.Math.Linear(1.7, 2.2, charge) * t;
      const y = LAUNCHER.y - 34 + pull.y * Phaser.Math.Linear(1.7, 2.2, charge) * t + Phaser.Math.Linear(140, 178, charge) * t * t;
      this.aimLine.fillCircle(x, y, Math.max(2.2, 5.8 - i * 0.24 + charge));
    }
  }

  private clampPointerPoint(point: Phaser.Math.Vector2) {
    return new Phaser.Math.Vector2(Phaser.Math.Clamp(point.x, 0, 1280), Phaser.Math.Clamp(point.y, 0, 720));
  }

  private getDragPull(point: Phaser.Math.Vector2) {
    const anchor = this.dragAnchor ?? LAUNCHER;
    return new Phaser.Math.Vector2(anchor.x - point.x, anchor.y - point.y).limit(MAX_PULL_DISTANCE);
  }

  private createPerformer() {
    this.performer = this.add.image(86, 640, 'performer-idle').setOrigin(0.5, 1).setScale(PERFORMER_SCALE).setDepth(12);
    this.setPerformerPose('idle');
  }

  private setPerformerPose(pose: PerformerPose) {
    this.performerPose = pose;
    this.performer?.setPosition(86, 640).setTexture(`performer-${pose}`);
    if (pose === 'idle') this.performer?.setAngle(0).setScale(PERFORMER_SCALE);
    if (pose === 'pull') this.performer?.setAngle(-2).setScale(PERFORMER_SCALE * 1.02, PERFORMER_SCALE * 0.99);
    if (pose === 'throw') this.performer?.setAngle(3).setScale(PERFORMER_SCALE * 1.04, PERFORMER_SCALE * 0.98);
    if (pose === 'recover') this.performer?.setAngle(1).setScale(PERFORMER_SCALE);
  }

  private getHeldGearPoint(pose = this.performerPose) {
    if (pose === 'pull') return new Phaser.Math.Vector2(62, 506);
    if (pose === 'throw') return new Phaser.Math.Vector2(148, 496);
    if (pose === 'recover') return new Phaser.Math.Vector2(128, 526);
    return new Phaser.Math.Vector2(76, 514);
  }

  private updateReadyGearPreview() {
    const gearType = useGameStore.getState().selectedGear;
    const textureKey = `gear-${gearType}-1`;
    if (!this.heldGearPreview) {
      this.heldGearPreview = this.add.image(LAUNCHER.x, LAUNCHER.y, textureKey).setDepth(18).setAlpha(0.96);
    }
    if (this.previewGear !== gearType || this.previewTextureKey !== textureKey) {
      this.heldGearPreview.setTexture(textureKey);
      this.previewGear = gearType;
      this.previewTextureKey = textureKey;
    }
    this.heldGearPreview.setVisible(useGameStore.getState().roundState === 'ready');
    this.positionHeldGear();
  }

  private positionHeldGear(point = this.getHeldGearPoint(), alpha = 0.96) {
    if (!this.heldGearPreview) return;
    const gearType = useGameStore.getState().selectedGear;
    const config = GEAR[gearType];
    const scale = Math.max(config.width, config.height) / 320;
    this.heldGearPreview
      .setPosition(point.x, point.y)
      .setScale(scale)
      .setAlpha(alpha)
      .setAngle(this.performerPose === 'pull' ? -12 : this.performerPose === 'throw' ? 18 : -4)
      .setVisible(useGameStore.getState().roundState === 'ready');
  }

  private positionHeldGearForCharge(charge: number) {
    const point = this.getHeldGearPoint('pull');
    const eased = Phaser.Math.Easing.Cubic.Out(Phaser.Math.Clamp(charge, 0, 1));
    this.positionHeldGear(new Phaser.Math.Vector2(point.x - eased * 26, point.y + eased * 10), 1);
    const gearType = useGameStore.getState().selectedGear;
    const config = GEAR[gearType];
    this.heldGearPreview
      ?.setAngle(-12 - eased * 14)
      .setScale((Math.max(config.width, config.height) / 320) * (1 + eased * 0.16));
    this.performer
      ?.setAngle(-2 - eased * 5)
      .setScale(PERFORMER_SCALE * (1.02 + eased * 0.08), PERFORMER_SCALE * (0.99 - eased * 0.06));
  }

  private animatePerformerThrow(pull: Phaser.Math.Vector2) {
    const releasePoint = this.getHeldGearPoint('throw');
    this.setPerformerPose('throw');
    if (!this.heldGearPreview) {
      this.launchGear(pull, releasePoint);
      return;
    }
    this.tweens.killTweensOf(this.heldGearPreview);
    this.tweens.add({
      targets: this.heldGearPreview,
      x: releasePoint.x,
      y: releasePoint.y,
      angle: pull.x > 0 ? 44 : -44,
      scale: this.heldGearPreview.scale * 1.08,
      duration: 105,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.heldGearPreview?.setVisible(false);
        this.previewTextureKey = null;
        this.launchGear(pull, releasePoint);
        this.setPerformerPose('recover');
      }
    });
    this.tweens.add({ targets: this.performer, x: 102, duration: 105, yoyo: true, ease: 'Cubic.easeOut' });
  }

  private fogBurst(x: number, y: number) {
    useGameStore.getState().addFeed('Fog machine burst: visibility has entered negotiations.');
    [...this.activeProps].forEach((prop) => {
      const meta = prop.getData('rushProp') as RushPropMeta | undefined;
      if (!prop.active || !prop.body || !meta || meta.cleared || meta.escaped) return;
      const distance = Phaser.Math.Distance.Between(x, y, prop.x, prop.y);
      if (distance > 175) return;
      meta.healthLeft -= Phaser.Math.Linear(18, 6, distance / 175);
      const angle = Phaser.Math.Angle.Between(x, y, prop.x, prop.y);
      prop.applyForce(new Phaser.Math.Vector2(Math.cos(angle) * 0.055, Math.sin(angle) * 0.02 - 0.02));
      if (meta.healthLeft <= 0) this.clearProp(prop, meta, 16, 'fogMachine');
    });
    for (let i = 0; i < 10; i += 1) {
      const puff = this.matter.add.image(x, y, 'effect-smoke-puff', undefined, { frictionAir: 0.08, restitution: 0.2 });
      puff.setAlpha(0.38).setScale(Phaser.Math.FloatBetween(0.9, 1.8));
      puff.setVelocity(Phaser.Math.FloatBetween(-4, 4), Phaser.Math.FloatBetween(-4, 1));
      this.tweens.add({ targets: puff, alpha: 0, scale: 2.8, duration: 900, onComplete: () => puff.destroy() });
    }
  }

  private cymbalPing(x: number, y: number, sourceProp: Phaser.Physics.Matter.Image) {
    this.createFloatingText(x, y - 36, 'CYMBAL PING');
    [...this.activeProps].forEach((prop) => {
      if (prop === sourceProp || !prop.active || !prop.body) return;
      const meta = prop.getData('rushProp') as RushPropMeta | undefined;
      if (!meta || meta.cleared || meta.escaped) return;
      const distance = Phaser.Math.Distance.Between(x, y, prop.x, prop.y);
      if (distance > 145) return;
      const pingDamage = Phaser.Math.Linear(13, 4, distance / 145) * meta.fragility;
      meta.healthLeft -= pingDamage;
      const angle = Phaser.Math.Angle.Between(x, y, prop.x, prop.y);
      prop.applyForce(new Phaser.Math.Vector2(Math.cos(angle) * 0.035, Math.sin(angle) * 0.012 - 0.012));
      if (meta.healthLeft <= 0) this.clearProp(prop, meta, pingDamage, 'cymbal');
    });
  }

  private spawnDebris(x: number, y: number, kind: RushDebrisKind, count: number) {
    const textureMap: Record<RushDebrisKind, string[]> = {
      glass: ['debris-glass-1'],
      wood: ['debris-wood-1', 'debris-wood-2'],
      metal: ['debris-metal-1'],
      soft: ['debris-fabric-1'],
      electronics: ['debris-metal-1', 'debris-glass-1'],
      cake: ['debris-fabric-1', 'debris-wood-1']
    };
    for (let i = 0; i < count; i += 1) {
      const piece = this.matter.add.image(x + Phaser.Math.Between(-16, 16), y + Phaser.Math.Between(-16, 16), Phaser.Utils.Array.GetRandom(textureMap[kind]), undefined, {
        restitution: 0.55,
        friction: 0.75
      });
      piece.setScale(Phaser.Math.FloatBetween(0.6, 1.25));
      piece.setVelocity(Phaser.Math.FloatBetween(-5, 5), Phaser.Math.FloatBetween(-6, -1));
      piece.setAngularVelocity(Phaser.Math.FloatBetween(-0.24, 0.24));
      piece.setMass(Phaser.Math.FloatBetween(2, 6));
      this.debris.push(piece);
      this.time.delayedCall(5500, () => {
        piece.destroy();
        this.debris = this.debris.filter((item) => item !== piece);
      });
    }
  }

  private createHud() {
    this.hudText = this.add.text(240, 112, 'DAMAGE RUSH', {
      color: '#fff7c2',
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '23px',
      stroke: '#19161f',
      strokeThickness: 5
    }).setDepth(10);
    this.timerText = this.add.text(690, 112, '', { color: '#ffe17d', fontFamily: 'Arial Black, Impact, sans-serif', fontSize: '26px', stroke: '#19161f', strokeThickness: 5 }).setDepth(10);
    this.scoreText = this.add.text(1015, 112, '', { color: '#ffffff', fontFamily: 'Arial Black, Impact, sans-serif', fontSize: '25px', stroke: '#19161f', strokeThickness: 5 }).setDepth(10);
    this.reloadText = this.add.text(390, 666, '', { color: '#ffe17d', fontFamily: 'Arial Black, Impact, sans-serif', fontSize: '20px', stroke: '#19161f', strokeThickness: 5 }).setDepth(10);
  }

  private updateHud(remaining: number, time: number) {
    this.hudText.setText(`DAMAGE RUSH   ESCAPES ${this.rushEscapedCount}/${MAX_ESCAPES}`);
    this.timerText.setText(`TIME ${Math.ceil(remaining)}`);
    this.scoreText.setText(`SCORE $${this.rushScore.toLocaleString()}`);
    const reloading = Math.max(0, this.reloadUntil - time);
    this.reloadText.setText(reloading > 0 ? `RELOADING ${(reloading / 1000).toFixed(1)}s` : 'READY');
  }

  private drawBackground() {
    this.add.image(640, 360, 'garage-background').setDisplaySize(1280, 720).setAlpha(0.96).setDepth(-10);
    this.add.rectangle(640, 360, 1280, 720, 0x111018, 0.02).setDepth(-9);
    this.add.text(930, 98, 'INCOMING PROPS', { color: '#fff7c2', fontFamily: 'Arial Black, Impact, sans-serif', fontSize: '18px', stroke: '#19161f', strokeThickness: 5 }).setDepth(-7).setAlpha(0.9);
  }

  private createFloatingText(x: number, y: number, text: string) {
    const label = this.add.text(x, y, text, {
      color: '#fff7c2',
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '22px',
      stroke: '#19161f',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: label, y: y - 48, alpha: 0, scale: 1.16, duration: 900, ease: 'Cubic.easeOut', onComplete: () => label.destroy() });
  }

  private getImpactLabel(score: number, meta: RushPropMeta, gearType: GearType) {
    if (this.rushCombo >= 4) return `SECURITY DEPOSIT GONE x${this.rushCombo}`;
    if (meta.bonusTag === 'tinyTarget') return `TINY TARGET +$${score.toLocaleString()}`;
    if (gearType === 'cymbal') return `RICOCHET CLAIM +$${score.toLocaleString()}`;
    return `THAT LOOKED EXPENSIVE +$${score.toLocaleString()}`;
  }

  private getClearFeed(label: string) {
    return Phaser.Utils.Array.GetRandom([
      `${label}: That Looked Expensive.`,
      `${label}: Security Deposit Gone.`,
      `${label}: The Adjuster Is Sweating.`,
      `${label}: Combo paperwork has been filed.`,
      `${label}: No Refunds, Only Debris.`
    ]);
  }

  private getVerdict() {
    if (this.rushScore > 42000) return 'Insurance Adjuster Nightmare';
    if (this.rushScore > 25000) return 'Security Deposit Gone';
    if (this.rushClearedCount >= 18) return 'Clearance Rack Catastrophe';
    if (this.rushEscapedCount >= MAX_ESCAPES) return 'Too Many Valuable Things Survived';
    return 'That Looked Expensive';
  }

  private buildRushBonuses() {
    const bonuses = [
      `Props cleared: ${this.rushClearedCount}.`,
      `Best combo: x${Math.max(1, this.rushBestCombo)}.`,
      `Escapes: ${this.rushEscapedCount}/${MAX_ESCAPES}.`
    ];
    if (this.rushBestSingleImpact > 900) bonuses.push(`Best single impact: $${this.rushBestSingleImpact.toLocaleString()}.`);
    if (this.launchHitIds.size >= 3) bonuses.push('Multi-prop launch: legally confusing.');
    return bonuses.slice(0, 5);
  }
}
