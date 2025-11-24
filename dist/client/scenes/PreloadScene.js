"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreloadScene = void 0;
const phaser_1 = __importDefault(require("phaser"));
const constants_1 = require("../../shared/config/constants");
class PreloadScene extends phaser_1.default.Scene {
    constructor() {
        super({ key: 'Preload' });
    }
    preload() {
        // Create progress bar
        this.progressBar = this.add.graphics();
        this.progressText = this.add.text(constants_1.GAME_WIDTH / 2, constants_1.GAME_HEIGHT / 2, '0%', {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);
        // Update progress bar
        this.load.on('progress', (value) => {
            this.progressBar.clear();
            this.progressBar.fillStyle(0xffffff, 1);
            this.progressBar.fillRect(constants_1.GAME_WIDTH / 4, constants_1.GAME_HEIGHT / 2 - 10, (constants_1.GAME_WIDTH / 2) * value, 20);
            this.progressText.setText(Math.round(value * 100) + '%');
        });
        // Load placeholder assets
        // Images
        this.load.spritesheet('player_idle', 'src/client/scenes/assets/player/player_idle.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('player_walk', 'src/client/scenes/assets/player/player_walk.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('player_attack', 'src/client/scenes/assets/player/player_attack.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('player_run_attack', 'src/client/scenes/assets/player/player_run_attack.png', { frameWidth: 64, frameHeight: 64 });
        // Enemy spritesheets
        this.load.spritesheet('slime_idle', 'src/client/scenes/assets/enemy/slime_idle.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('slime_walk', 'src/client/scenes/assets/enemy/slime_walk.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('slime_attack', 'src/client/scenes/assets/enemy/slime_attack.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('slime_death', 'src/client/scenes/assets/enemy/slime_death.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('goblin_idle', 'src/client/scenes/assets/enemy/goblin_idle.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('goblin_walk', 'src/client/scenes/assets/enemy/goblin_walk.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('goblin_attack', 'src/client/scenes/assets/enemy/goblin_attack.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('goblin_death', 'src/client/scenes/assets/enemy/goblin_death.png', { frameWidth: 64, frameHeight: 64 });
        this.load.image('health_potion', 'src/client/scenes/assets/health_potion.png');
        this.load.image('shield', 'src/client/scenes/assets/shield.png');
        this.load.image('coin', 'src/client/scenes/assets/coin.png');
        this.load.image('speed_boost', 'src/client/scenes/assets/speed_boost.png');
        this.load.image('damage_boost', 'src/client/scenes/assets/damage_boost.png');
        this.load.image('ui', 'src/client/scenes/assets/ui.png'); // Placeholder
        // Sounds
        this.load.audio('player_attack', 'player_attack.wav');
        this.load.audio('enemy_damage', './assets/enemy_damage.wav');
        this.load.audio('enemy_death', './assets/enemy_death.wav');
        this.load.audio('collectible_pickup', './assets/collectible_pickup.wav');
        this.load.audio('background_music', './assets/background_music.mp3');
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
exports.PreloadScene = PreloadScene;
