import { BreakFragment } from './breakTypes';

export function destroyGeneratedFragment(fragment: BreakFragment) {
  const key = fragment.generatedTextureKey;
  const scene = fragment.scene;
  if (fragment.active) fragment.destroy();
  if (key && scene?.textures.exists(key)) scene.textures.remove(key);
}
