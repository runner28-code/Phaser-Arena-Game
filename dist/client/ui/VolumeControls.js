"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VolumeControls = void 0;
const phaser_1 = __importDefault(require("phaser"));
class VolumeControls {
    constructor(scene, x, y) {
        this.masterVolume = 1.0;
        this.sfxVolume = 1.0;
        this.musicVolume = 0.5;
        this.scene = scene;
        this.container = scene.add.container(x, y);
        this.createControls();
    }
    createControls() {
        const background = this.scene.add.graphics();
        background.fillStyle(0x000000, 0.8);
        background.fillRoundedRect(-150, -100, 300, 200, 10);
        this.container.add(background);
        // Master Volume
        const masterLabel = this.scene.add.text(-130, -80, 'Master Volume', {
            fontSize: '16px',
            color: '#ffffff'
        });
        this.container.add(masterLabel);
        const masterSlider = this.createSlider(-130, -50, this.masterVolume, (value) => {
            this.masterVolume = value;
            this.updateVolumes();
        });
        this.container.add(masterSlider);
        // SFX Volume
        const sfxLabel = this.scene.add.text(-130, -20, 'SFX Volume', {
            fontSize: '16px',
            color: '#ffffff'
        });
        this.container.add(sfxLabel);
        const sfxSlider = this.createSlider(-130, 10, this.sfxVolume, (value) => {
            this.sfxVolume = value;
            this.updateVolumes();
        });
        this.container.add(sfxSlider);
        // Music Volume
        const musicLabel = this.scene.add.text(-130, 40, 'Music Volume', {
            fontSize: '16px',
            color: '#ffffff'
        });
        this.container.add(musicLabel);
        const musicSlider = this.createSlider(-130, 70, this.musicVolume, (value) => {
            this.musicVolume = value;
            this.updateVolumes();
        });
        this.container.add(musicSlider);
    }
    createSlider(x, y, initialValue, onChange) {
        const sliderContainer = this.scene.add.container(x, y);
        // Slider track
        const track = this.scene.add.graphics();
        track.fillStyle(0x666666);
        track.fillRect(0, -2, 200, 4);
        sliderContainer.add(track);
        // Slider handle
        const handle = this.scene.add.graphics();
        handle.fillStyle(0xffffff);
        handle.fillCircle(0, 0, 8);
        sliderContainer.add(handle);
        // Value text
        const valueText = this.scene.add.text(210, -8, Math.round(initialValue * 100) + '%', {
            fontSize: '14px',
            color: '#ffffff'
        });
        sliderContainer.add(valueText);
        // Make interactive
        handle.setInteractive({ draggable: true });
        handle.on('drag', (pointer, dragX) => {
            const clampedX = phaser_1.default.Math.Clamp(dragX, 0, 200);
            handle.x = clampedX;
            const value = clampedX / 200;
            valueText.setText(Math.round(value * 100) + '%');
            onChange(value);
        });
        // Set initial position
        handle.x = initialValue * 200;
        return sliderContainer;
    }
    updateVolumes() {
        // Update all sound volumes
        this.scene.sound.volume = this.masterVolume;
        // Update specific sound categories if needed
        // For Phaser, we can set individual sound volumes or use groups
        // For now, we'll use the master volume as base
    }
    setVisible(visible) {
        this.container.setVisible(visible);
    }
    getContainer() {
        return this.container;
    }
    getMasterVolume() {
        return this.masterVolume;
    }
    getSfxVolume() {
        return this.sfxVolume;
    }
    getMusicVolume() {
        return this.musicVolume;
    }
}
exports.VolumeControls = VolumeControls;
