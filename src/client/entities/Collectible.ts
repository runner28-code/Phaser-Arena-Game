import Phaser from 'phaser';
import { COLLISION_CATEGORY_COLLECTIBLE } from '../../shared/config/constants';
import { Collectible as CollectibleType, CollectibleType as CollectibleEnum } from '../../shared/types';

export class Collectible extends Phaser.Physics.Matter.Sprite {
  public id: string;
  public type: CollectibleEnum;
  public value: number;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, type: CollectibleEnum, value: number) {
    super(scene.matter.world, x, y, texture);

    this.id = `collectible_${Date.now()}_${Math.random()}`;
    this.type = type;
    this.value = value;

    // Set up physics body as sensor
    this.setCircle(8);
    this.setSensor(true);
    this.setCollisionCategory(COLLISION_CATEGORY_COLLECTIBLE);

    // Add to scene
    scene.add.existing(this);

    // Set up animation if needed
    this.setupAnimation(texture);

    // Set visual feedback based on type
    this.setVisualFeedback();
  }

  private setupAnimation(texture: string): void {
    // Simple idle animation
    this.scene.anims.create({
      key: `${texture}-idle`,
      frames: this.scene.anims.generateFrameNumbers(texture, { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.play(`${texture}-idle`);
  }

  private setVisualFeedback(): void {
    switch (this.type) {
      case CollectibleEnum.HEALTH:
        this.setTint(0x00ff00); // Green
        break;
      case CollectibleEnum.COIN:
        this.setTint(0xffd700); // Gold
        break;
      case CollectibleEnum.SHIELD:
        this.setTint(0x0000ff); // Blue
        break;
      case CollectibleEnum.DAMAGE_BOOST:
        this.setTint(0xff0000); // Red
        break;
      case CollectibleEnum.SPEED_BOOST:
        this.setTint(0xffff00); // Yellow
        break;
    }
  }

  collect(player: any): void {
    switch (this.type) {
      case CollectibleEnum.HEALTH:
        if (player && typeof player.heal === 'function') {
          player.heal(this.value);
        }
        break;
      case CollectibleEnum.COIN:
        if (player && typeof player.addScore === 'function') {
          player.addScore(this.value);
        }
        break;
      case CollectibleEnum.SHIELD:
        if (player && typeof player.applyShield === 'function') {
          player.applyShield(this.value);
        }
        break;
      case CollectibleEnum.DAMAGE_BOOST:
        if (player && typeof player.applyDamageBoost === 'function') {
          player.applyDamageBoost(this.value);
        }
        break;
      case CollectibleEnum.SPEED_BOOST:
        if (player && typeof player.applySpeedBoost === 'function') {
          player.applySpeedBoost(this.value);
        }
        break;
      // Add more types as needed
    }

    // Play pickup sound
    this.playPickupSound();

    // Visual feedback on collection
    this.scene.cameras.main.flash(200, 255, 255, 255); // White flash

    // Remove from scene
    this.destroy();
  }

  getState(): CollectibleType {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      type: this.type,
      value: this.value
    };
  }

  private playPickupSound(): void {
    if (this.scene.sound.get('collectible_pickup')) {
      this.scene.sound.play('collectible_pickup');
    }
  }

  public reset(): void {
    this.x = 0;
    this.y = 0;
    this.setActive(false);
    this.setVisible(false);
  }
}