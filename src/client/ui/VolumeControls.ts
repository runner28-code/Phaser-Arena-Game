import Phaser from 'phaser';

export class VolumeControls {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private masterVolume: number = 1.0;
  private sfxVolume: number = 1.0;
  private musicVolume: number = 0.5;
  private onClose?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, onClose?: () => void) {
    this.scene = scene;
    this.onClose = onClose;
    this.container = scene.add.container(x, y);
    this.loadSavedVolumes();
    this.createControls();
  }

  private createControls(): void {
    const background = this.scene.add.graphics();
    background.fillStyle(0x000000, 0.8);
    background.fillRoundedRect(-160, -120, 320, 240, 10);
    this.container.add(background);

    // Close button
    const closeButton = this.scene.add.text(140, -110, '×', {
      fontSize: '24px',
      color: '#ffffff'
    }).setInteractive();
    closeButton.on('pointerdown', () => {
      this.setVisible(false);
      if (this.onClose) {
        this.onClose();
      }
    });
    closeButton.on('pointerover', () => closeButton.setColor('#ff0000'));
    closeButton.on('pointerout', () => closeButton.setColor('#ffffff'));
    this.container.add(closeButton);

    // Title
    const title = this.scene.add.text(0, -100, 'Settings', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(title);

    // Master Volume
    const masterLabel = this.scene.add.text(-140, -70, 'Master Volume', {
      fontSize: '16px',
      color: '#ffffff'
    });
    this.container.add(masterLabel);

    const masterSlider = this.createSlider(-140, -40, this.masterVolume, (value: number) => {
      this.masterVolume = value;
      this.saveVolumes();
      this.updateVolumes();
    });
    this.container.add(masterSlider);

    // SFX Volume
    const sfxLabel = this.scene.add.text(-140, -10, 'SFX Volume', {
      fontSize: '16px',
      color: '#ffffff'
    });
    this.container.add(sfxLabel);

    const sfxSlider = this.createSlider(-140, 20, this.sfxVolume, (value: number) => {
      this.sfxVolume = value;
      this.saveVolumes();
      this.updateVolumes();
    });
    this.container.add(sfxSlider);

    // Music Volume
    const musicLabel = this.scene.add.text(-140, 50, 'Music Volume', {
      fontSize: '16px',
      color: '#ffffff'
    });
    this.container.add(musicLabel);

    const musicSlider = this.createSlider(-140, 80, this.musicVolume, (value: number) => {
      this.musicVolume = value;
      this.saveVolumes();
      this.updateVolumes();
    });
    this.container.add(musicSlider);
  }

  private createSlider(x: number, y: number, initialValue: number, onChange: (value: number) => void): Phaser.GameObjects.Container {
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
    handle.on('drag', (pointer: Phaser.Input.Pointer, dragX: number) => {
      const clampedX = Phaser.Math.Clamp(dragX, 0, 200);
      handle.x = clampedX;
      const value = clampedX / 200;
      valueText.setText(Math.round(value * 100) + '%');
      onChange(value);
    });

    // Set initial position
    handle.x = initialValue * 200;

    return sliderContainer;
  }

  private updateVolumes(): void {
    // Update master volume
    this.scene.sound.volume = this.masterVolume;

    // Note: Individual sound volume adjustments would need to be handled
    // when sounds are played, as Phaser doesn't provide easy access to
    // all currently playing sounds. The master volume affects all sounds.
  }

  private loadSavedVolumes(): void {
    try {
      const saved = localStorage.getItem('gameVolumes');
      if (saved) {
        const volumes = JSON.parse(saved);
        this.masterVolume = volumes.master ?? 1.0;
        this.sfxVolume = volumes.sfx ?? 1.0;
        this.musicVolume = volumes.music ?? 0.5;
      }
    } catch (error) {
      console.warn('Failed to load saved volumes:', error);
    }
  }

  private saveVolumes(): void {
    try {
      const volumes = {
        master: this.masterVolume,
        sfx: this.sfxVolume,
        music: this.musicVolume
      };
      localStorage.setItem('gameVolumes', JSON.stringify(volumes));
    } catch (error) {
      console.warn('Failed to save volumes:', error);
    }
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }
}