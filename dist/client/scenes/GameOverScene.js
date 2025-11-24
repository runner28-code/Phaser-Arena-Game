"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameOverScene = void 0;
const phaser_1 = __importDefault(require("phaser"));
const constants_1 = require("../../shared/config/constants");
class GameOverScene extends phaser_1.default.Scene {
    constructor() {
        super({ key: 'GameOver' });
    }
    init(data) {
        this.score = data.score;
        this.gameTime = data.time;
    }
    create() {
        // Display 'Game Over'
        this.add.text(constants_1.GAME_WIDTH / 2, constants_1.GAME_HEIGHT / 4, 'Game Over', {
            fontSize: '48px',
            color: '#ffffff'
        }).setOrigin(0.5);
        // Display score
        this.add.text(constants_1.GAME_WIDTH / 2, constants_1.GAME_HEIGHT / 2 - 50, `Score: ${this.score}`, {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);
        // Display time
        this.add.text(constants_1.GAME_WIDTH / 2, constants_1.GAME_HEIGHT / 2, `Time: ${this.gameTime.toFixed(1)}s`, {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);
        // Restart button
        const restartButton = this.add.text(constants_1.GAME_WIDTH / 2, constants_1.GAME_HEIGHT / 2 + 100, 'Restart', {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5).setInteractive();
        restartButton.on('pointerdown', () => {
            this.scene.start('MainMenu');
        }).setName('restartButton');
    }
    destroy() {
        // Remove restart button listener
        const restartButton = this.children.getByName('restartButton');
        if (restartButton) {
            restartButton.off('pointerdown');
        }
    }
}
exports.GameOverScene = GameOverScene;
