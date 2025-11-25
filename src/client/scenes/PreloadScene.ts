import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, getGameWidth, getGameHeight } from '../../shared/config/constants';

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Preload' });
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

  private getResponsiveWidth(width: number): number {
    return (width / 800) * this.cameras.main.width;
  }

  preload() {
    // Create progress bar
    this.progressBar = this.add.graphics();
    this.progressText = this.add.text(this.getResponsiveX(400), this.getResponsiveY(270), '0%', {
      fontSize: this.getResponsiveFontSize(32),
      color: '#ffffff'
    }).setOrigin(0.5);

    // Update progress bar
    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0xffffff, 1);
      this.progressBar.fillRect(this.getResponsiveX(200), this.getResponsiveY(290), this.getResponsiveWidth(400) * value, this.getResponsiveY(20));
      this.progressText.setText(Math.round(value * 100) + '%');
    });

    // Load placeholder assets
    // Images
    this.load.spritesheet('player_idle', 'src/client/scenes/assets/player/player_idle.png',{ frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_walk', 'src/client/scenes/assets/player/player_walk.png',{ frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_attack', 'src/client/scenes/assets/player/player_attack.png',{ frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_run_attack', 'src/client/scenes/assets/player/player_run_attack.png',{ frameWidth: 64, frameHeight: 64 });

    // Enemy spritesheets
    this.load.spritesheet('slime_idle', 'src/client/scenes/assets/enemy/slime_idle.png',{ frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('slime_walk', 'src/client/scenes/assets/enemy/slime_walk.png',{ frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('slime_attack', 'src/client/scenes/assets/enemy/slime_attack.png',{ frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('slime_death', 'src/client/scenes/assets/enemy/slime_death.png',{ frameWidth: 64, frameHeight: 64 });

    this.load.spritesheet('goblin_idle', 'src/client/scenes/assets/enemy/goblin_idle.png',{ frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('goblin_walk', 'src/client/scenes/assets/enemy/goblin_walk.png',{ frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('goblin_attack', 'src/client/scenes/assets/enemy/goblin_attack.png',{ frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('goblin_death', 'src/client/scenes/assets/enemy/goblin_death.png',{ frameWidth: 64, frameHeight: 64 });

    this.load.image('health_potion', 'src/client/scenes/assets/health_potion.png');
    this.load.image('shield', 'src/client/scenes/assets/shield.png');
    this.load.image('coin', 'src/client/scenes/assets/coin.png');
    this.load.image('speed_boost', 'src/client/scenes/assets/speed_boost.png');
    this.load.image('damage_boost', 'src/client/scenes/assets/damage_boost.png');
    this.load.image('ui', 'src/client/scenes/assets/ui.png');
    this.load.image('background_menu', 'background_menu.png');
    this.load.image('background_game', 'background_game.avif');
    this.load.image('button', 'button.png');
    this.load.image('button', 'button.png');
    // Sounds
    this.load.audio('player_attack', 'player_attack.wav');
    this.load.audio('enemy_damage', 'enemy_damage.wav');
    this.load.audio('enemy_death', 'enemy_death.mp3');
    this.load.audio('collectible_pickup', 'pickup.mp3');
    this.load.audio('background_music', 'background_music.mp3');
    this.load.audio('btn_click', 'btn_click.mp3');
  }

  create() {
    // Clean up progress bar
    this.progressBar.destroy();
    this.progressText.destroy();

    // Start MainMenuScene
    this.scene.start('MainMenu');
  }

  destroy() {
    // Remove load progress listener
    this.load.off('progress');
  }
}