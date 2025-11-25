import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, getGameWidth, getGameHeight } from '../../shared/config/constants';
import { GameOverSceneData } from '../../shared/types';

export class GameOverScene extends Phaser.Scene {
  private score!: number;
  private gameTime!: number;

  constructor() {
    super({ key: 'GameOver' });
  }

  private getResponsiveFontSize(baseSize: number): string {
    const scale = Math.min(this.cameras.main.width / 800, this.cameras.main.height / 600);
    return `${Math.max(16, Math.round(baseSize * scale))}px`;
  }

  private getResponsiveX(x: number): number {
    return (x / 800) * this.cameras.main.width;
  }

  private getResponsiveY(y: number): number {
    return (y / 600) * this.cameras.main.height;
  }

  init(data: GameOverSceneData) {
    this.score = data.score;
    this.gameTime = data.time;
  }

  create() {
    // Display 'Game Over'
    this.add.text(this.getResponsiveX(400), this.getResponsiveY(150), 'Game Over', {
      fontSize: this.getResponsiveFontSize(48),
      color: '#ffffff'
    }).setOrigin(0.5);

    // Display score
    this.add.text(this.getResponsiveX(400), this.getResponsiveY(250), `Score: ${this.score}`, {
      fontSize: this.getResponsiveFontSize(32),
      color: '#ffffff'
    }).setOrigin(0.5);

    // Display time
    this.add.text(this.getResponsiveX(400), this.getResponsiveY(300), `Time: ${this.gameTime.toFixed(1)}s`, {
      fontSize: this.getResponsiveFontSize(32),
      color: '#ffffff'
    }).setOrigin(0.5);

    // Restart button
    const restartButton = this.add.text(this.getResponsiveX(400), this.getResponsiveY(400), 'Restart', {
      fontSize: this.getResponsiveFontSize(32),
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