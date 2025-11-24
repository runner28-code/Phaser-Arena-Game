import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../shared/config/constants';
import { VolumeControls } from '../ui/VolumeControls';

export class MainMenuScene extends Phaser.Scene {
  private volumeControls!: VolumeControls;
  private settingsButton!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainMenu' });
  }

  create() {
    // Add title text
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 4, 'Phaser Fantasy Game', {
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Single Player button
    const singlePlayerButton = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'Single Player', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive().setName('singlePlayerButton');

    singlePlayerButton.on('pointerdown', () => {
      this.scene.start('Game', { mode: 'single' });
      this.sound.play('btn_click');
    });

    // Multiplayer button
    const multiplayerButton = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, 'Multiplayer', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive().setName('multiplayerButton');

    multiplayerButton.on('pointerdown', () => {
      this.scene.start('Game', { mode: 'multi' });
      this.sound.play('btn_click');
    });

    // Settings button
    this.settingsButton = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 150, 'Settings', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive().setName('settingsButton');

    this.settingsButton.on('pointerdown', () => {
      this.toggleVolumeControls();
      this.sound.play('btn_click');
    });

    // Create volume controls (initially hidden)
    this.volumeControls = new VolumeControls(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
    this.volumeControls.setVisible(false);
  }

  private toggleVolumeControls(): void {
    const isVisible = this.volumeControls.getContainer().visible;
    this.volumeControls.setVisible(!isVisible);
  }

  destroy() {
    // Remove button listeners
    const singlePlayerButton = this.children.getByName('singlePlayerButton') as Phaser.GameObjects.Text;
    const multiplayerButton = this.children.getByName('multiplayerButton') as Phaser.GameObjects.Text;
    const settingsButton = this.children.getByName('settingsButton') as Phaser.GameObjects.Text;

    if (singlePlayerButton) singlePlayerButton.off('pointerdown');
    if (multiplayerButton) multiplayerButton.off('pointerdown');
    if (settingsButton) settingsButton.off('pointerdown');

    // Destroy volume controls container
    if (this.volumeControls) {
      this.volumeControls.getContainer().destroy();
    }
  }
}