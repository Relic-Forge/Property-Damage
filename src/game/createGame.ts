import Phaser from 'phaser';
import { PropertyDamageScene } from './PropertyDamageScene';
import { DamageRushScene } from './DamageRushScene';
import { StartMode } from './modes';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export function createPropertyDamageGame(parent: HTMLElement, startMode: StartMode = 'wreckRoom') {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#19161f',
    physics: {
      default: 'matter',
      matter: {
        gravity: { x: 0, y: 1.15 },
        debug: false,
        enableSleeping: true
      }
    },
    scale: {
      mode: Phaser.Scale.ENVELOP,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [],
    callbacks: {
      postBoot: (game) => {
        game.scene.add('PropertyDamageScene', PropertyDamageScene, false);
        game.scene.add('DamageRushScene', DamageRushScene, false);
        game.scene.start(startMode === 'damageRush' ? 'DamageRushScene' : 'PropertyDamageScene');
      }
    }
  });
}
