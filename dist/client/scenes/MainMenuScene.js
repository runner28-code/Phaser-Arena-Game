"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainMenuScene = void 0;
const phaser_1 = __importDefault(require("phaser"));
const constants_1 = require("../../shared/config/constants");
const VolumeControls_1 = require("../ui/VolumeControls");
class MainMenuScene extends phaser_1.default.Scene {
    constructor() {
        super({ key: 'MainMenu' });
    }
    create() {
        // Add title text
        this.add.text(constants_1.GAME_WIDTH / 2, constants_1.GAME_HEIGHT / 4, 'Phaser Fantasy Game', {
            fontSize: '48px',
            color: '#ffffff'
        }).setOrigin(0.5);
        // Single Player button
        const singlePlayerButton = this.add.text(constants_1.GAME_WIDTH / 2, constants_1.GAME_HEIGHT / 2 - 50, 'Single Player', {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5).setInteractive().setName('singlePlayerButton');
        singlePlayerButton.on('pointerdown', () => {
            this.scene.start('Game', { mode: 'single' });
        });
        // Multiplayer button
        const multiplayerButton = this.add.text(constants_1.GAME_WIDTH / 2, constants_1.GAME_HEIGHT / 2 + 50, 'Multiplayer', {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5).setInteractive().setName('multiplayerButton');
        multiplayerButton.on('pointerdown', () => {
            this.scene.start('Game', { mode: 'multi' });
        });
        // Settings button
        this.settingsButton = this.add.text(constants_1.GAME_WIDTH / 2, constants_1.GAME_HEIGHT / 2 + 150, 'Settings', {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5).setInteractive().setName('settingsButton');
        this.settingsButton.on('pointerdown', () => {
            this.toggleVolumeControls();
        });
        // Create volume controls (initially hidden)
        this.volumeControls = new VolumeControls_1.VolumeControls(this, constants_1.GAME_WIDTH / 2, constants_1.GAME_HEIGHT / 2 + 50);
        this.volumeControls.setVisible(false);
    }
    toggleVolumeControls() {
        const isVisible = this.volumeControls.getContainer().visible;
        this.volumeControls.setVisible(!isVisible);
    }
    destroy() {
        // Remove button listeners
        const singlePlayerButton = this.children.getByName('singlePlayerButton');
        const multiplayerButton = this.children.getByName('multiplayerButton');
        const settingsButton = this.children.getByName('settingsButton');
        if (singlePlayerButton)
            singlePlayerButton.off('pointerdown');
        if (multiplayerButton)
            multiplayerButton.off('pointerdown');
        if (settingsButton)
            settingsButton.off('pointerdown');
        // Destroy volume controls container
        if (this.volumeControls) {
            this.volumeControls.getContainer().destroy();
        }
    }
}
exports.MainMenuScene = MainMenuScene;
