import Phaser from 'phaser';
import { PropertyDamageScene } from './PropertyDamageScene';

export function createPropertyDamageGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
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
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [PropertyDamageScene]
  });
}
