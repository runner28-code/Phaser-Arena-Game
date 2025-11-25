import Phaser from 'phaser';
import { PlayerData } from '../../shared/types';

/**
 * Represents a remote player in multiplayer mode.
 * Displays other players' positions, animations, and states synchronized from the server.
 */
export class RemotePlayer extends Phaser.Physics.Matter.Sprite {
  private playerId: string = '';
  private lastUpdateTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene.matter.world, x, y, texture);

    // Set up physics body as circle
    this.setCircle(16);
    this.setFixedRotation(); // Prevent rotation on collision

    // Add to scene
    scene.add.existing(this);

    // Set up animations
    this.setupAnimations(texture);
  }

  private setupAnimations(texture: string): void {
    // Idle animations
    this.scene.anims.create({
      key: 'remote-idle_down',
      frames: this.anims.generateFrameNumbers('player_idle', { frames: [0, 1, 2, 3, 4, 5] }),
      frameRate: 6,
      repeat: -1,
    });

    this.scene.anims.create({
      key: 'remote-idle_up',
      frames: this.anims.generateFrameNumbers('player_idle', { frames: [36, 37, 38, 39] }),
      frameRate: 6,
      repeat: -1,
    });

    this.scene.anims.create({
      key: 'remote-idle_left',
      frames: this.anims.generateFrameNumbers('player_idle', { frames: [12, 13, 14, 15, 16] }),
      frameRate: 6,
      repeat: -1,
    });

    this.scene.anims.create({
      key: 'remote-idle_right',
      frames: this.anims.generateFrameNumbers('player_idle', { frames: [24, 25, 26, 27, 28, 29] }),
      frameRate: 6,
      repeat: -1,
    });


    this.scene.anims.create({
      key: 'remote-walk_down',
      frames: this.scene.anims.generateFrameNumbers('player_walk', { frames: [0, 1, 2, 3, 4, 5, 6, 7] }),
      frameRate: 10,
      repeat: -1
    });

    // Walk animations
    this.scene.anims.create({
      key: 'remote-walk_down',
      frames: this.anims.generateFrameNumbers('player_walk', { frames: [0, 1, 2, 3, 4, 5, 6, 7] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'remote-walk_left',
      frames: this.anims.generateFrameNumbers('player_walk', { frames: [8, 9, 10, 11, 12, 13, 14, 15] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'remote-walk_right',
      frames: this.anims.generateFrameNumbers('player_walk', { frames: [16, 17, 18, 19, 20, 21, 22, 23] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'remote-walk_up',
      frames: this.anims.generateFrameNumbers('player_walk', { frames: [24, 25, 26, 27, 28, 29, 30, 31] }),
      frameRate: 10,
      repeat: -1
    });

    // Attack animations
    this.scene.anims.create({
      key: 'remote-attack_down',
      frames: this.anims.generateFrameNumbers('player_attack', { frames: [0, 1, 2, 3, 4, 5] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'remote-attack_left',
      frames: this.anims.generateFrameNumbers('player_attack', { frames: [6, 7, 8, 9, 10, 11] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'remote-attack_right',
      frames: this.anims.generateFrameNumbers('player_attack', { frames: [12, 13, 14, 15, 16, 17] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'remote-attack_up',
      frames: this.anims.generateFrameNumbers('player_attack', { frames: [18, 19, 20, 21, 22, 23] }),
      frameRate: 10,
      repeat: -1
    });

    // Death animation
    this.scene.anims.create({
      key: 'remote-death',
      frames: this.anims.generateFrameNumbers(texture, { start: 12, end: 15 }),
      frameRate: 10,
      repeat: 0
    });
  }

  /**
   * Sets the unique identifier for this remote player.
   * @param id - The player's unique ID
   */
  setPlayerId(id: string): void {
    this.playerId = id;
  }

  /**
   * Gets the unique identifier for this remote player.
   * @returns The player's unique ID
   */
  getPlayerId(): string {
    return this.playerId;
  }

  /**
   * Updates the remote player's position and animation based on server data.
   * @param delta - Time elapsed since last update
   * @param playerData - Current player state from server
   */
  update(delta: number, playerData: PlayerData): void {
    // Update position
    this.x = playerData.x;
    this.y = playerData.y;

    // Update animation based on direction and state
    if (playerData.state === 'DEAD') {
      this.anims.play('remote-death', true);
      this.setActive(false);
      this.setVisible(false);
    } else {
      this.setActive(true);
      this.setVisible(true);

      let dir = 'down'; // default
      if (playerData.facingDirection.x > 0) {
        dir = 'right';
      } else if (playerData.facingDirection.x < 0) {
        dir = 'left';
      } else if (playerData.facingDirection.y > 0) {
        dir = 'down';
      } else if (playerData.facingDirection.y < 0) {
        dir = 'up';
      }

      if (playerData.currentState === 'attacking') {
        this.anims.play(`remote-attack_${dir}`, true);
      } else if (playerData.currentState === 'walking') {
        this.anims.play(`remote-walk_${dir}`, true);
      } else {
        this.anims.play(`remote-idle_${dir}`, true);
      }
    }
  }
}