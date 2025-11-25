"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainMenuScene = void 0;
const phaser_1 = __importDefault(require("phaser"));
const VolumeControls_1 = require("../ui/VolumeControls");
class MainMenuScene extends phaser_1.default.Scene {
    constructor() {
        super({ key: 'MainMenu' });
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
    createImageButton(x, y, text, onClick) {
        const container = this.add.container(x, y);
        // Button image
        const buttonImage = this.add.image(0, 0, 'button');
        const baseScale = Math.min(this.cameras.main.width / 800, this.cameras.main.height / 600) * 0.5; // Increase to 50% of proportional size
        buttonImage.setScale(Math.max(baseScale, 0.25), Math.max(baseScale * 0.8, 0.2)); // Wider buttons (height slightly less than width)
        container.add(buttonImage);
        // Button text
        const buttonText = this.add.text(0, 0, text, {
            fontSize: this.getResponsiveFontSize(text === 'Settings' ? 20 : 24), // Smaller text
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(buttonText);
        // Make the button image interactive
        buttonImage.setInteractive();
        buttonImage.on('pointerdown', onClick);
        // Add hover effect
        buttonImage.on('pointerover', () => {
            buttonImage.setTint(0xcccccc);
            this.input.setDefaultCursor('pointer');
        });
        buttonImage.on('pointerout', () => {
            buttonImage.clearTint();
            this.input.setDefaultCursor('default');
        });
        return container;
    }
    create() {
        // Add background image
        const bg = this.add.image(this.getResponsiveX(400), this.getResponsiveY(300), 'background_menu');
        bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);
        bg.setOrigin(0.5);
        // Add title text
        this.add.text(this.getResponsiveX(400), this.getResponsiveY(150), 'Honor of Knight', {
            fontSize: this.getResponsiveFontSize(48),
            color: '#ffffff'
        }).setOrigin(0.5);
        // Single Player button
        const singlePlayerButton = this.createImageButton(this.getResponsiveX(400), this.getResponsiveY(250), 'Single Player', () => {
            this.scene.start('Game', { mode: 'single' });
            this.sound.play('btn_click');
        });
        singlePlayerButton.setName('singlePlayerButton');
        // Multiplayer button
        const multiplayerButton = this.createImageButton(this.getResponsiveX(400), this.getResponsiveY(350), 'Multiplayer', () => {
            this.scene.start('Game', { mode: 'multi' });
            this.sound.play('btn_click');
        });
        multiplayerButton.setName('multiplayerButton');
        // Settings button
        this.settingsButton = this.createImageButton(this.getResponsiveX(400), this.getResponsiveY(450), 'Settings', () => {
            this.toggleVolumeControls();
            this.sound.play('btn_click');
        });
        this.settingsButton.setName('settingsButton');
        // Create volume controls (initially hidden)
        this.volumeControls = new VolumeControls_1.VolumeControls(this, this.getResponsiveX(400), this.getResponsiveY(350), () => {
            // Optional: Add any additional logic when settings are closed
        });
        this.volumeControls.setVisible(false);
    }
    toggleVolumeControls() {
        const isVisible = this.volumeControls.getContainer().visible;
        this.volumeControls.setVisible(!isVisible);
    }
    destroy() {
        // Remove button listeners - buttons are now containers with interactive images inside
        // The event listeners are attached to the images within the containers
        // Destroy volume controls container
        if (this.volumeControls) {
            this.volumeControls.getContainer().destroy();
        }
    }
}
exports.MainMenuScene = MainMenuScene;
