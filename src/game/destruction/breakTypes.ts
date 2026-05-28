import Phaser from 'phaser';

export type BreakMaterial = 'glass' | 'wood' | 'metal' | 'soft' | 'electronics' | 'cake';

export type FragmentShape = 'rect' | 'sliver' | 'chunk' | 'shard' | 'panel' | 'splatter';

export type BreakPattern =
  | 'radial'
  | 'horizontal-split'
  | 'vertical-split'
  | 'corner-impact'
  | 'crush'
  | 'soft-burst';

export type BreakProfile = {
  id: string;
  material: BreakMaterial;
  patterns: BreakPattern[];
  pieceCount: [number, number];
  fragmentShapes: FragmentShape[];
  velocityMultiplier: number;
  angularVelocityRange: [number, number];
  gravityScale?: number;
  lifespanMs: [number, number];
  fadeDelayMs: [number, number];
  dust: boolean;
  sparks: boolean;
  smoke: boolean;
  soundProfile: string;
};

export type BreakRequest = {
  scene: Phaser.Scene;
  source: Phaser.Physics.Matter.Image;
  sourceTextureKey: string;
  objectId: string;
  label: string;
  material: BreakMaterial;
  profileId?: string;
  width: number;
  height: number;
  impactPoint: Phaser.Math.Vector2;
  impactVelocity: Phaser.Math.Vector2;
  impactStrength: number;
  seed: number;
};

export type BreakFragment = Phaser.Physics.Matter.Image & {
  generatedTextureKey?: string;
};
