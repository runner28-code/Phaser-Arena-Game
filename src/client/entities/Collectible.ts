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

    // Set visual feedback based on type
    this.setVisualFeedback();
  }


  private setVisualFeedback(): void {
    switch (this.type) {
      case CollectibleEnum.HEALTH:
        this.setScale(1);
        break;
      case CollectibleEnum.COIN:
        this.setScale(0.05);
        break;
      case CollectibleEnum.SHIELD:
        this.setScale(0.1);
        break;
      case CollectibleEnum.DAMAGE_BOOST:
        this.setScale(0.1);
        break;
      case CollectibleEnum.SPEED_BOOST:
        this.setScale(0.1);
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

    // Deactivate instead of destroy for pooling
    this.setActive(false);
    this.setVisible(false);
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
      this.scene.sound.play('collectible_pickup');
  }

  public reset(): void {
    if (this.body) {
      this.x = 0;
      this.y = 0;
    }
    this.setActive(false);
    this.setVisible(false);
  }
}