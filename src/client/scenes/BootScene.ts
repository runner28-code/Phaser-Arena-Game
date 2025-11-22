import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../shared/config/constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create() {
    // Configure physics settings
    this.matter.world.setGravity(0);
    this.matter.world.drawDebug = false;

    // Start PreloadScene
    this.scene.start('Preload');
  }
}