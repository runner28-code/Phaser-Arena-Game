import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../shared/config/constants';

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Preload' });
  }

  preload() {
    // Create progress bar
    this.progressBar = this.add.graphics();
    this.progressText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '0%', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Update progress bar
    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0xffffff, 1);
      this.progressBar.fillRect(GAME_WIDTH / 4, GAME_HEIGHT / 2 - 10, (GAME_WIDTH / 2) * value, 20);
      this.progressText.setText(Math.round(value * 100) + '%');
    });

    // Load placeholder assets
    // Images
    this.load.spritesheet('player_idle', 'src/client/scenes/assets/player/player_idle.png',{ frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_walk', 'src/client/scenes/assets/player/player_walk.png',{ frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_attack', 'src/client/scenes/assets/player/player_attack.png',{ frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_run_attack', 'src/client/scenes/assets/player/player_run_attack.png',{ frameWidth: 64, frameHeight: 64 });

    this.load.spritesheet('enemy_idle', 'src/client/scenes/assets/enemy/enemy_idle.png',{ frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('enemy_walk', 'src/client/scenes/assets/enemy/enemy_walk.png',{ frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('enemy_attack', 'src/client/scenes/assets/enemy/enemy_attack.png',{ frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('enemy_death', 'src/client/scenes/assets/enemy/enemy_death.png',{ frameWidth: 64, frameHeight: 64 });

    this.load.spritesheet('player', 'src/client/scenes/assets/player.png',{ frameWidth: 50, frameHeight: 37 }); // Placeholder
    this.load.spritesheet('enemy', 'src/client/scenes/assets/enemy.png',{ frameWidth: 32, frameHeight: 25 }); // Placeholder
    this.load.spritesheet('collectible', 'src/client/scenes/assets/collectible.png',{ frameWidth: 16, frameHeight: 16 }); // Placeholder
    this.load.image('ui', 'src/client/scenes/assets/ui.png'); // Placeholder

    // Sounds
    this.load.audio('player_attack', 'src/client/scenes/assets/player_attack.wav');
    this.load.audio('enemy_damage', 'src/client/scenes/assets/enemy_damage.wav');
    this.load.audio('enemy_death', 'src/client/scenes/assets/enemy_death.wav');
    this.load.audio('collectible_pickup', 'src/client/scenes/assets/collectible_pickup.wav');
    this.load.audio('background_music', 'src/client/scenes/assets/background_music.mp3');
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