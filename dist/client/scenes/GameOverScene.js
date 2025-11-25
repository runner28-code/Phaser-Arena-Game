"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameOverScene = void 0;
const phaser_1 = __importDefault(require("phaser"));
class GameOverScene extends phaser_1.default.Scene {
    constructor() {
        super({ key: 'GameOver' });
    }
    getResponsiveFontSize(baseSize) {
        const scale = Math.min(this.cameras.main.width / 800, this.cameras.main.height / 600);
        return `${Math.max(16, Math.round(baseSize * scale))}px`;
    }
    getResponsiveX(x) {
        return (x / 800) * this.cameras.main.width;
    }
    getResponsiveY(y) {
        return (y / 600) * this.cameras.main.height;
    }
    init(data) {
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
        const restartButton = this.children.getByName('restartButton');
        if (restartButton) {
            restartButton.off('pointerdown');
        }
    }
}
exports.GameOverScene = GameOverScene;
