import Phaser from 'phaser';
import {
  PLAYER_HEALTH,
  PLAYER_MAX_HEALTH,
  COLLISION_CATEGORY_PLAYER,
  COLLISION_CATEGORY_OBSTACLE
} from '../../shared/config/constants';
import { PlayerState } from '../../shared/types';

export class RemotePlayer extends Phaser.Physics.Matter.Sprite {
  public id: string;
  public health: number;
  public maxHealth: number;
  private targetX: number;
  private targetY: number;
  private LERP_FACTOR = 0.3;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene.matter.world, x, y, texture, frame);

    this.id = '';
    this.health = PLAYER_HEALTH;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.targetX = x;
    this.targetY = y;

    // Set up physics body as circle
    this.setCircle(16);
    this.setCollisionCategory(COLLISION_CATEGORY_PLAYER);
    this.setCollidesWith([COLLISION_CATEGORY_OBSTACLE]);

    // Add to scene
    scene.add.existing(this);

    // Set up animations
    this.setupAnimations(texture);
  }

  private setupAnimations(texture: string): void {
    // Assume frames are sequential starting from 0
    this.scene.anims.create({
      key: `remote-player-idle-${this.id}`,
      frames: this.scene.anims.generateFrameNumbers(texture, { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: `remote-player-walk-${this.id}`,
      frames: this.scene.anims.generateFrameNumbers(texture, { start: 4, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: `remote-player-attack-${this.id}`,
      frames: this.scene.anims.generateFrameNumbers(texture, { start: 8, end: 11 }),
      frameRate: 15,
      repeat: 0
    });

    this.scene.anims.create({
      key: `remote-player-death-${this.id}`,
      frames: this.scene.anims.generateFrameNumbers(texture, { start: 12, end: 15 }),
      frameRate: 10,
      repeat: 0
    });
  }

  update(delta: number, playerState: PlayerState): void {
    // Update target positions
    this.targetX = playerState.x;
    this.targetY = playerState.y;

    // Interpolate position using LERP with delta time for consistent speed
    const lerpFactor = this.LERP_FACTOR * (delta / 16.67); // Normalize to 60 FPS
    this.x = Phaser.Math.Linear(this.x, this.targetX, lerpFactor);
    this.y = Phaser.Math.Linear(this.y, this.targetY, lerpFactor);

    // Snap discrete values
    this.health = playerState.health;
    this.maxHealth = playerState.maxHealth;

    // Handle animation based on movement
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY);
    if (distance > 1) {
      this.anims.play(`remote-player-walk-${this.id}`, true);
    } else {
      this.anims.play(`remote-player-idle-${this.id}`, true);
    }

    // Handle death
    if (!playerState.isAlive) {
      this.anims.play(`remote-player-death-${this.id}`);
      this.setActive(false);
      this.setVisible(false);
    }
  }

  setPlayerId(id: string): void {
    this.id = id;
  }
}