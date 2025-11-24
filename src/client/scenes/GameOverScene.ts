import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../shared/config/constants';
import { GameOverSceneData } from '../../shared/types';

export class GameOverScene extends Phaser.Scene {
  private score!: number;
  private gameTime!: number;

  constructor() {
    super({ key: 'GameOver' });
  }

  init(data: GameOverSceneData) {
    this.score = data.score;
    this.gameTime = data.time;
  }

  create() {
    // Display 'Game Over'
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 4, 'Game Over', {
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Display score
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, `Score: ${this.score}`, {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Display time
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `Time: ${this.gameTime.toFixed(1)}s`, {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Restart button
    const restartButton = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, 'Restart', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive();

    restartButton.on('pointerdown', () => {
      this.scene.start('MainMenu');
    }).setName('restartButton');
  }

  destroy() {
    // Remove restart button listener
    const restartButton = this.children.getByName('restartButton') as Phaser.GameObjects.Text;
    if (restartButton) {
      restartButton.off('pointerdown');
    }
  }
}