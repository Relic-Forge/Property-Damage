import Phaser from 'phaser';
import { BreakFragment, BreakPattern, BreakProfile, BreakRequest, FragmentShape } from './breakTypes';

type Random = () => number;

type FragmentCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
  shape: FragmentShape;
};

let generatedTextureCounter = 0;

export function createFragmentTextures(request: BreakRequest, profile: BreakProfile, count: number, random: Random): BreakFragment[] {
  const texture = request.scene.textures.get(request.sourceTextureKey);
  const image = texture?.getSourceImage() as CanvasImageSource & { width?: number; height?: number };
  const sourceWidth = Number(image?.width ?? 0);
  const sourceHeight = Number(image?.height ?? 0);
  if (!image || sourceWidth <= 0 || sourceHeight <= 0) return [];

  const pattern = choose(profile.patterns, random);
  const crops = createCrops(sourceWidth, sourceHeight, count, pattern, profile.fragmentShapes, random);
  const scaleX = request.width / sourceWidth;
  const scaleY = request.height / sourceHeight;

  return crops.map((crop, index) => {
    const key = `generated-fragment-${request.objectId}-${Math.floor(request.seed)}-${generatedTextureCounter++}`;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(4, Math.ceil(crop.width));
    canvas.height = Math.max(4, Math.ceil(crop.height));
    const context = canvas.getContext('2d');
    if (!context) return null;

    drawJaggedCrop(context, image, crop, random);
    request.scene.textures.addCanvas(key, canvas);

    const worldOffsetX = (crop.x + crop.width / 2 - sourceWidth / 2) * scaleX;
    const worldOffsetY = (crop.y + crop.height / 2 - sourceHeight / 2) * scaleY;
    const fragment = request.scene.matter.add.image(
      request.source.x + worldOffsetX,
      request.source.y + worldOffsetY,
      key,
      undefined,
      {
        restitution: getRestitution(profile.material),
        friction: profile.material === 'soft' || profile.material === 'cake' ? 0.82 : 0.64,
        frictionAir: profile.material === 'glass' ? 0.012 : 0.022
      }
    ) as BreakFragment;

    fragment.generatedTextureKey = key;
    fragment.setDisplaySize(Math.max(8, crop.width * scaleX), Math.max(8, crop.height * scaleY));
    fragment.setDepth(8 + index * 0.001);
    fragment.setMass(getFragmentMass(profile.material, crop));
    fragment.setAngle(random() * 360);
    fragment.setAngularVelocity(randomSigned(profile.angularVelocityRange, random));
    if (profile.gravityScale && fragment.body) {
      (fragment.body as MatterJS.BodyType).gravityScale = { x: 0, y: profile.gravityScale };
    }
    return fragment;
  }).filter(Boolean) as BreakFragment[];
}

function createCrops(
  sourceWidth: number,
  sourceHeight: number,
  count: number,
  pattern: BreakPattern,
  shapes: FragmentShape[],
  random: Random
): FragmentCrop[] {
  const crops: FragmentCrop[] = [];
  const columns = pattern === 'vertical-split' ? 2 : pattern === 'horizontal-split' ? Math.max(3, Math.ceil(Math.sqrt(count))) : Math.ceil(Math.sqrt(count));
  const rows = pattern === 'horizontal-split' ? 2 : Math.max(2, Math.ceil(count / columns));
  const cellWidth = sourceWidth / columns;
  const cellHeight = sourceHeight / rows;

  for (let row = 0; row < rows && crops.length < count; row += 1) {
    for (let column = 0; column < columns && crops.length < count; column += 1) {
      const shape = choose(shapes, random);
      const centerBias = getPatternBias(pattern, column / Math.max(1, columns - 1), row / Math.max(1, rows - 1), random);
      const widthScale = getShapeWidthScale(shape, random) * centerBias.width;
      const heightScale = getShapeHeightScale(shape, random) * centerBias.height;
      const cropWidth = Phaser.Math.Clamp(cellWidth * widthScale, 10, sourceWidth);
      const cropHeight = Phaser.Math.Clamp(cellHeight * heightScale, 10, sourceHeight);
      const jitterX = (random() - 0.5) * cellWidth * 0.42;
      const jitterY = (random() - 0.5) * cellHeight * 0.42;
      crops.push({
        x: Phaser.Math.Clamp(column * cellWidth + (cellWidth - cropWidth) / 2 + jitterX, 0, sourceWidth - cropWidth),
        y: Phaser.Math.Clamp(row * cellHeight + (cellHeight - cropHeight) / 2 + jitterY, 0, sourceHeight - cropHeight),
        width: cropWidth,
        height: cropHeight,
        shape
      });
    }
  }

  while (crops.length < count) {
    const shape = choose(shapes, random);
    const cropWidth = Phaser.Math.Clamp(sourceWidth * Phaser.Math.Linear(0.12, 0.28, random()), 10, sourceWidth);
    const cropHeight = Phaser.Math.Clamp(sourceHeight * Phaser.Math.Linear(0.12, 0.3, random()), 10, sourceHeight);
    crops.push({
      x: random() * Math.max(1, sourceWidth - cropWidth),
      y: random() * Math.max(1, sourceHeight - cropHeight),
      width: cropWidth,
      height: cropHeight,
      shape
    });
  }

  return Phaser.Utils.Array.Shuffle(crops).slice(0, count);
}

function drawJaggedCrop(context: CanvasRenderingContext2D, image: CanvasImageSource, crop: FragmentCrop, random: Random) {
  context.save();
  context.beginPath();
  const inset = Math.min(crop.width, crop.height) * 0.12;
  const points = buildJaggedPoints(crop.width, crop.height, inset, crop.shape, random);
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
  context.clip();
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  context.restore();
}

function buildJaggedPoints(width: number, height: number, inset: number, shape: FragmentShape, random: Random) {
  const steps = shape === 'shard' || shape === 'splatter' ? 3 : 2;
  const points: Array<[number, number]> = [];
  const addEdge = (fromX: number, fromY: number, toX: number, toY: number) => {
    for (let step = 0; step < steps; step += 1) {
      const progress = step / steps;
      const jitter = (random() - 0.5) * inset;
      points.push([
        Phaser.Math.Linear(fromX, toX, progress) + jitter,
        Phaser.Math.Linear(fromY, toY, progress) + jitter
      ]);
    }
  };
  addEdge(inset * random(), inset * random(), width - inset * random(), inset * random());
  addEdge(width - inset * random(), inset * random(), width - inset * random(), height - inset * random());
  addEdge(width - inset * random(), height - inset * random(), inset * random(), height - inset * random());
  addEdge(inset * random(), height - inset * random(), inset * random(), inset * random());
  return points;
}

function getPatternBias(pattern: BreakPattern, columnT: number, rowT: number, random: Random) {
  if (pattern === 'radial') {
    const centerDistance = Phaser.Math.Distance.Between(columnT, rowT, 0.5, 0.5);
    return { width: Phaser.Math.Linear(1.22, 0.78, centerDistance), height: Phaser.Math.Linear(1.22, 0.78, centerDistance) };
  }
  if (pattern === 'corner-impact') return { width: Phaser.Math.Linear(0.8, 1.28, (columnT + rowT) / 2), height: Phaser.Math.Linear(0.8, 1.22, rowT) };
  if (pattern === 'crush') return { width: 0.76 + random() * 0.38, height: 0.76 + random() * 0.38 };
  if (pattern === 'soft-burst') return { width: 1.05 + random() * 0.34, height: 1.05 + random() * 0.34 };
  return { width: 1, height: 1 };
}

function getShapeWidthScale(shape: FragmentShape, random: Random) {
  if (shape === 'sliver') return Phaser.Math.Linear(0.35, 0.62, random());
  if (shape === 'panel') return Phaser.Math.Linear(1.05, 1.6, random());
  if (shape === 'shard') return Phaser.Math.Linear(0.55, 1.1, random());
  if (shape === 'splatter') return Phaser.Math.Linear(0.65, 1.25, random());
  return Phaser.Math.Linear(0.75, 1.2, random());
}

function getShapeHeightScale(shape: FragmentShape, random: Random) {
  if (shape === 'sliver') return Phaser.Math.Linear(1.05, 1.7, random());
  if (shape === 'panel') return Phaser.Math.Linear(0.7, 1.05, random());
  if (shape === 'shard') return Phaser.Math.Linear(0.5, 1.15, random());
  if (shape === 'splatter') return Phaser.Math.Linear(0.62, 1.32, random());
  return Phaser.Math.Linear(0.78, 1.2, random());
}

function getRestitution(material: string) {
  if (material === 'glass') return 0.62;
  if (material === 'metal' || material === 'electronics') return 0.5;
  if (material === 'soft' || material === 'cake') return 0.28;
  return 0.42;
}

function getFragmentMass(material: string, crop: FragmentCrop) {
  const area = (crop.width * crop.height) / 1800;
  const materialScale = material === 'metal' || material === 'electronics' ? 1.5 : material === 'glass' ? 0.72 : material === 'soft' || material === 'cake' ? 0.58 : 1;
  return Phaser.Math.Clamp(area * materialScale, 0.8, 9);
}

function choose<T>(items: T[], random: Random) {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

function randomSigned(range: [number, number], random: Random) {
  const value = Phaser.Math.Linear(range[0], range[1], random());
  return random() > 0.5 ? value : -value;
}
