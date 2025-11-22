import Phaser from 'phaser';

export class VolumeControls {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private masterVolume: number = 1.0;
  private sfxVolume: number = 1.0;
  private musicVolume: number = 0.5;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
    this.createControls();
  }

  private createControls(): void {
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

    const masterSlider = this.createSlider(-130, -50, this.masterVolume, (value: number) => {
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

    const sfxSlider = this.createSlider(-130, 10, this.sfxVolume, (value: number) => {
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

    const musicSlider = this.createSlider(-130, 70, this.musicVolume, (value: number) => {
      this.musicVolume = value;
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
    // Update all sound volumes
    this.scene.sound.volume = this.masterVolume;

    // Update specific sound categories if needed
    // For Phaser, we can set individual sound volumes or use groups
    // For now, we'll use the master volume as base
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