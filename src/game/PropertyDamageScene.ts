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

export class PropertyDamageScene extends Phaser.Scene {
  private launcher = new Phaser.Math.Vector2(150, 545);
  private aimLine!: Phaser.GameObjects.Graphics;
  private isDragging = false;
  private activeGear: Phaser.Physics.Matter.Sprite | null = null;
  private breakables: Phaser.Physics.Matter.Image[] = [];
  private debris: Phaser.Physics.Matter.Image[] = [];
  private settledTimer = 0;
  private roundDamage = 0;
  private roundChaos = 0;
  private roundCombo = 0;
  private lastBreakAt = 0;
  private resetHandler = () => this.resetLevel();

  constructor() {
    super('PropertyDamageScene');
  }

  preload() {
    this.createGeneratedTexture('chunk-wood', 26, 18, '#b97842', '');
    this.createGeneratedTexture('chunk-glass', 20, 14, '#94f4ff', '');
    this.createGeneratedTexture('chunk-metal', 24, 16, '#b7b7c9', '');
    this.createGeneratedTexture('dust', 24, 24, '#e3c9a3', '');

    Object.entries(GEAR).forEach(([key, config]) => {
      this.createGeneratedTexture(`gear-${key}`, config.width, config.height, config.color, config.label);
    });
  }

  create() {
    this.drawGarageBackground();
    this.aimLine = this.add.graphics();
    this.createWorldBounds();
    this.createVenueObjects();
    this.setupInput();
    this.setupCollisions();
    this.add.text(this.launcher.x - 55, this.launcher.y + 50, 'PULL + RELEASE', {
      color: '#f8f1dc',
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '16px'
    }).setAlpha(0.78);
    this.add.circle(this.launcher.x, this.launcher.y, 28, 0xff5c8a, 0.35).setStrokeStyle(3, 0xffe17d, 0.75);

    window.addEventListener('pd:reset-level', this.resetHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('pd:reset-level', this.resetHandler);
    });
  }

  update(_time: number, delta: number) {
    const roundState = useGameStore.getState().roundState;
    if (roundState !== 'launched') return;

    const bodies = [this.activeGear, ...this.breakables, ...this.debris].filter(Boolean) as Phaser.Physics.Matter.Image[];
    const moving = bodies.some((obj) => obj.body && Math.abs(((obj.body as any).speed ?? 0)) > 0.35);

    if (moving) {
      this.settledTimer = 0;
      return;
    }

    this.settledTimer += delta;
    if (this.settledTimer > 1400) {
      useGameStore.getState().setRoundState('settling');
      this.time.delayedCall(650, () => this.finishRound());
    }
  }

  private setupInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const state = useGameStore.getState().roundState;
      if (state === 'summary') this.resetLevel(false);
      if (useGameStore.getState().roundState !== 'ready') return;
      if (Phaser.Math.Distance.Between(pointer.x, pointer.y, this.launcher.x, this.launcher.y) > 170) return;
      this.isDragging = true;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.aimLine.clear();
      this.aimLine.lineStyle(6, 0xffe17d, 0.9);
      this.aimLine.beginPath();
      this.aimLine.moveTo(this.launcher.x, this.launcher.y);
      this.aimLine.lineTo(pointer.x, pointer.y);
      this.aimLine.strokePath();
      this.aimLine.fillStyle(0xff5c8a, 0.55);
      this.aimLine.fillCircle(pointer.x, pointer.y, 12);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.aimLine.clear();

      const pull = new Phaser.Math.Vector2(this.launcher.x - pointer.x, this.launcher.y - pointer.y);
      if (pull.length() < 20) return;
      pull.limit(265);
      this.launchGear(pull);
    });
  }

  private launchGear(pull: Phaser.Math.Vector2) {
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

    this.activeGear = this.matter.add.sprite(this.launcher.x, this.launcher.y, `gear-${gearType}`);
    this.activeGear.setName(`gear-${gearType}`);
    this.activeGear.setData('gearType', gearType);
    this.activeGear.setData('behavior', config.behavior);
    this.activeGear.setFrictionAir(0.01);
    this.activeGear.setBounce(config.bounciness);
    this.activeGear.setMass(config.mass * (1 + weightBonus));
    this.activeGear.setAngularVelocity(Phaser.Math.FloatBetween(-0.18, 0.18));
    this.activeGear.setVelocity((pull.x / 17) * powerBonus, (pull.y / 17) * powerBonus);

    if (config.behavior === 'spear') this.activeGear.setAngularVelocity(0.22);
    if (config.behavior === 'ricochet') this.activeGear.setCircle(39);

    store.setRoundState('launched');
    store.addFeed(`${config.label} launched. Bad idea confirmed.`);
  }

  private setupCollisions() {
    this.matter.world.on('collisionstart', (event: any) => {
      event.pairs.forEach((pair: any) => {
        const objects = [
          (pair.bodyA as any).gameObject,
          (pair.bodyB as any).gameObject
        ].filter(Boolean) as Phaser.GameObjects.GameObject[];

        const impact = Math.max(pair.bodyA.speed ?? 0, pair.bodyB.speed ?? 0) * 22;
        if (impact < 2) return;

        objects.forEach((obj) => {
          const image = obj as Phaser.Physics.Matter.Image;
          const meta = image.getData?.('breakable') as BreakableMeta | undefined;
          if (!meta || meta.broken) return;

          const fragility = 1 + useGameStore.getState().upgrades.fragility * 0.14;
          meta.health -= impact * fragility;
          image.setTint(0xffffff);
          this.time.delayedCall(55, () => image.clearTint());

          if (meta.health <= 0) {
            this.breakObject(image, meta, impact);
          }
        });
      });
    });
  }

  private breakObject(image: Phaser.Physics.Matter.Image, meta: BreakableMeta, impact: number) {
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

    this.spawnDebris(image.x, image.y, meta.kind, Phaser.Math.Between(4, 8));
    this.createFloatingText(image.x, image.y - 20, `$${damage.toLocaleString()}`);
    this.cameras.main.shake(Math.min(260, 90 + impact * 8), Math.min(0.018, 0.004 + impact / 900));

    const flavor = this.getBreakFlavor(meta.label);
    useGameStore.getState().addFeed(flavor);

    const behavior = this.activeGear?.getData('behavior');
    if (behavior === 'burst' && impact > 4) this.fogBurst(image.x, image.y);
    if (behavior === 'crusher' && impact > 5) this.shockwave(image.x, image.y);
  }

  private finishRound() {
    const store = useGameStore.getState();
    const viralRoll = Math.random() < 0.18 + store.upgrades.viralChance * 0.04;
    const insuranceMultiplier = 1 + store.upgrades.insuranceMultiplier * 0.08;
    const totalDamage = Math.max(25, Math.round(this.roundDamage * insuranceMultiplier));
    const fans = Math.floor(totalDamage / 300) + (viralRoll ? 25 : 0);
    const bonuses = this.buildBonuses(totalDamage, viralRoll);
    const title = this.getRoundTitle(totalDamage);

    const summary: RoundSummary = {
      totalDamage,
      chaos: this.roundChaos,
      combo: this.roundCombo,
      fans,
      title,
      bonuses
    };

    store.completeRound(summary);
  }

  private buildBonuses(totalDamage: number, viralRoll: boolean) {
    const bonuses: string[] = [];
    if (this.roundCombo >= 3) bonuses.push(`Combo Chain x${this.roundCombo}: suspiciously efficient destruction.`);
    if (totalDamage > 2400) bonuses.push('Security Deposit: fully vaporized.');
    if (viralRoll) bonuses.push('Local Viral Clip: 25 people sent it to their group chat.');
    if (this.roundChaos > 40) bonuses.push('Chaos Bonus: nobody can explain the cymbal trajectory.');
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
    this.createVenueObjects();
    if (setReady) useGameStore.getState().resetRun();
    else useGameStore.getState().setRoundState('ready');
  }

  private createWorldBounds() {
    this.matter.world.setBounds(0, 0, 1280, 720, 64, true, true, true, true);
    this.matter.add.rectangle(640, 700, 1280, 48, { isStatic: true, restitution: 0.35, friction: 0.82 });
  }

  private createVenueObjects() {
    this.addBreakable(710, 602, 128, 35, '#ff8fab', 'Folding Table', 260, 28, 'wood');
    this.addBreakable(742, 555, 72, 58, '#ffe066', 'Questionable Cake', 420, 18, 'soft');
    this.addBreakable(895, 588, 92, 95, '#2dd4bf', 'Old TV', 780, 38, 'electronics');
    this.addBreakable(1015, 555, 72, 160, '#a78bfa', 'Speaker Stack', 680, 45, 'metal');
    this.addBreakable(1140, 612, 90, 44, '#fb7185', 'Cooler of Regret', 320, 32, 'metal');
    this.addBreakable(1085, 415, 210, 28, '#b97842', 'Garage Shelf', 550, 36, 'wood');
    this.addBreakable(1035, 365, 50, 50, '#facc15', 'Paint Can', 190, 20, 'metal');
    this.addBreakable(1100, 360, 82, 44, '#38bdf8', 'Cable Bin', 210, 20, 'soft');
    this.addBreakable(1168, 358, 62, 62, '#fb923c', 'Mystery Box', 240, 22, 'wood');
    this.addBreakable(785, 330, 160, 38, '#f472b6', 'Neon Sign', 900, 24, 'glass');
    this.addBreakable(595, 590, 92, 105, '#e879f9', 'Tiny Drum Kit', 520, 30, 'metal');
    this.addBreakable(1210, 475, 32, 170, '#93c5fd', 'Garage Window', 760, 15, 'glass');
  }

  private addBreakable(x: number, y: number, width: number, height: number, color: string, label: string, value: number, health: number, kind: BreakableMeta['kind']) {
    const key = `prop-${label.replace(/\s+/g, '-').toLowerCase()}-${width}-${height}`;
    if (!this.textures.exists(key)) this.createGeneratedTexture(key, width, height, color, label);
    const image = this.matter.add.image(x, y, key, undefined, {
      restitution: 0.42,
      friction: 0.62,
      density: 0.0015
    });
    image.setData('breakable', {
      id: key,
      label,
      value,
      health,
      broken: false,
      kind
    } satisfies BreakableMeta);
    image.setFrictionAir(0.012);
    this.breakables.push(image);
    return image;
  }

  private spawnDebris(x: number, y: number, kind: BreakableMeta['kind'], count: number) {
    const texture = kind === 'glass' ? 'chunk-glass' : kind === 'metal' || kind === 'electronics' ? 'chunk-metal' : 'chunk-wood';
    for (let i = 0; i < count; i += 1) {
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

  private fogBurst(x: number, y: number) {
    for (let i = 0; i < 10; i += 1) {
      const puff = this.matter.add.image(x, y, 'dust', undefined, { restitution: 0.2, frictionAir: 0.08 });
      puff.setAlpha(0.42);
      puff.setScale(Phaser.Math.FloatBetween(1.0, 2.2));
      puff.setVelocity(Phaser.Math.FloatBetween(-5, 5), Phaser.Math.FloatBetween(-5, 1));
      this.tweens.add({ targets: puff, alpha: 0, scale: 3, duration: 950, onComplete: () => puff.destroy() });
    }
    this.roundDamage += 175;
    this.createFloatingText(x, y - 40, 'FOG INCIDENT +$175');
  }

  private shockwave(x: number, y: number) {
    const ring = this.add.circle(x, y, 10).setStrokeStyle(5, 0xffe17d, 0.8);
    this.tweens.add({ targets: ring, radius: 90, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
    this.roundDamage += 120;
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
    const g = this.add.graphics();
    g.fillGradientStyle(0x221b2f, 0x221b2f, 0x32233a, 0x19161f, 1);
    g.fillRect(0, 0, 1280, 720);
    g.fillStyle(0x2d2433, 1);
    g.fillRect(0, 620, 1280, 100);
    g.lineStyle(2, 0x4a3b4f, 0.6);
    for (let x = 0; x < 1280; x += 90) g.lineBetween(x, 620, x + 120, 720);
    g.fillStyle(0x443347, 0.8);
    g.fillRect(420, 115, 790, 500);
    g.lineStyle(5, 0x5d4a5f, 0.75);
    g.strokeRect(420, 115, 790, 500);
    g.lineStyle(2, 0x5d4a5f, 0.35);
    for (let y = 175; y < 590; y += 65) g.lineBetween(420, y, 1210, y);
    this.add.text(465, 150, 'THE GARAGE THAT SHOULD HAVE STAYED QUIET', {
      color: '#f8f1dc',
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '24px'
    }).setAlpha(0.72);
  }

  private createGeneratedTexture(key: string, width: number, height: number, color: string, label: string) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(width, 28);
    canvas.height = Math.max(height, 20);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const radius = Math.min(14, width / 5, height / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    roundRect(ctx, 3, 4, width - 4, height - 4, radius);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx, 0, 0, width - 4, height - 5, radius);
    ctx.fill();
    ctx.strokeStyle = 'rgba(25,22,31,0.7)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.24)';
    roundRect(ctx, 8, 7, Math.max(8, width - 26), Math.max(5, height * 0.22), Math.max(4, radius / 2));
    ctx.fill();

    if (label) {
      ctx.fillStyle = '#19161f';
      ctx.font = `900 ${Math.max(10, Math.min(17, width / Math.max(label.length * 0.52, 5)))}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, width / 2 - 2, height / 2 - 1, width - 10);
    }

    this.textures.addCanvas(key, canvas);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
