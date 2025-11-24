import Phaser from 'phaser';
import {
  COLLISION_CATEGORY_ENEMY,
  COLLISION_CATEGORY_OBSTACLE,
  COLLISION_CATEGORY_PLAYER,
  COLLISION_CATEGORY_ATTACK
} from '../../shared/config/constants';
import { EnemyConfig, EnemyType, CollectibleType } from '../../shared/types';
import enemiesConfig from '../../shared/config/enemies.json';
import { Collectible } from './Collectible';

export abstract class Enemy extends Phaser.Physics.Matter.Sprite {
  public id: string;
  public health: number;
  public maxHealth: number;
  public speed: number;
  public damage: number;
  public config: EnemyConfig;
  protected player: any; // Reference to player
  protected attackCooldown: number = 1000;
  protected lastAttackTime: number = 0;
  protected attackRange: number = 50;
  protected isAlive: boolean = true;

  getIsAlive(): boolean {
    return this.isAlive;
  }
  protected dropCollectibleCallback?: (type: CollectibleType, texture: string, value: number, x: number, y: number) => void;
  protected facingDirection: { x: number; y: number } = { x: 1, y: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyConfig) {
    super(scene.matter.world, x, y, config.id); // Assume texture is config.id

    this.config = config;
    this.id = config.id;
    this.health = config.health;
    this.maxHealth = config.health;
    this.speed = config.speed;
    this.damage = config.damage;

    // Set up physics body as circle
    this.setCircle(16);
    this.setFixedRotation(); // Prevent rotation on collision
    this.setCollisionCategory(COLLISION_CATEGORY_ENEMY);
    this.setCollidesWith([COLLISION_CATEGORY_OBSTACLE, COLLISION_CATEGORY_PLAYER, COLLISION_CATEGORY_ATTACK]);

    // Add to scene
    scene.add.existing(this);

    // Set up animations
    this.setupAnimations();
  }

  protected setupAnimations(): void {
    const idleKey = this.config.animations.idle;
    const walkKey = this.config.animations.walk;
    const attackKey = this.config.animations.attack;
    const deathKey = this.config.animations.death;

    // Idle animations
    this.scene.anims.create({
      key: `${idleKey}_down`,
      frames: this.scene.anims.generateFrameNumbers(idleKey, { frames: [0, 1, 2, 3] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: `${idleKey}_up`,
      frames: this.scene.anims.generateFrameNumbers(idleKey, { frames: [4, 5, 6, 7] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: `${idleKey}_left`,
      frames: this.scene.anims.generateFrameNumbers(idleKey, { frames: [8, 9, 10, 11] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: `${idleKey}_right`,
      frames: this.scene.anims.generateFrameNumbers(idleKey, { frames: [12, 13, 14, 15] }),
      frameRate: 10,
      repeat: -1
    });

    // Walk animations
    this.scene.anims.create({
      key: `${walkKey}_down`,
      frames: this.scene.anims.generateFrameNumbers(walkKey, { frames: [0, 1, 2, 3, 4, 5, 6, 7] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: `${walkKey}_up`,
      frames: this.scene.anims.generateFrameNumbers(walkKey, { frames: [8, 9, 10, 11, 12, 13, 14, 15] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: `${walkKey}_left`,
      frames: this.scene.anims.generateFrameNumbers(walkKey, { frames: [16, 17, 18, 19, 20, 21, 22, 23] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: `${walkKey}_right`,
      frames: this.scene.anims.generateFrameNumbers(walkKey, { frames: [24, 25, 26, 27, 28, 29, 30, 31] }),
      frameRate: 10,
      repeat: -1
    });

    // Attack animations
    if (this.id === 'slime') {
      // Slime has frames 0-35
      this.scene.anims.create({
        key: `${attackKey}_down`,
        frames: this.scene.anims.generateFrameNumbers(attackKey, { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8] }),
        frameRate: 15,
        repeat: 0
      });

      this.scene.anims.create({
        key: `${attackKey}_up`,
        frames: this.scene.anims.generateFrameNumbers(attackKey, { frames: [9, 10, 11, 12, 13, 14, 15, 16, 17] }),
        frameRate: 15,
        repeat: 0
      });

      this.scene.anims.create({
        key: `${attackKey}_left`,
        frames: this.scene.anims.generateFrameNumbers(attackKey, { frames: [18, 19, 20, 21, 22, 23, 24, 25, 26] }),
        frameRate: 15,
        repeat: 0
      });

      this.scene.anims.create({
        key: `${attackKey}_right`,
        frames: this.scene.anims.generateFrameNumbers(attackKey, { frames: [27, 28, 29, 30, 31, 32, 33, 34, 35] }),
        frameRate: 15,
        repeat: 0
      });
    } else {
      // Goblin
      this.scene.anims.create({
        key: `${attackKey}_down`,
        frames: this.scene.anims.generateFrameNumbers(attackKey, { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }),
        frameRate: 15,
        repeat: 0
      });

      this.scene.anims.create({
        key: `${attackKey}_up`,
        frames: this.scene.anims.generateFrameNumbers(attackKey, { frames: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] }),
        frameRate: 15,
        repeat: 0
      });

      this.scene.anims.create({
        key: `${attackKey}_left`,
        frames: this.scene.anims.generateFrameNumbers(attackKey, { frames: [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35] }),
        frameRate: 15,
        repeat: 0
      });

      this.scene.anims.create({
        key: `${attackKey}_right`,
        frames: this.scene.anims.generateFrameNumbers(attackKey, { frames: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47] }),
        frameRate: 15,
        repeat: 0
      });
    }

    // Death animation
    this.scene.anims.create({
      key: deathKey,
      frames: this.scene.anims.generateFrameNumbers(deathKey, { start: 0, end: 3 }),
      frameRate: 10,
      repeat: 0
    });
  }

  setPlayer(player: any): void {
    this.player = player;
  }

  setDropCollectibleCallback(callback: (type: CollectibleType, texture: string, value: number, x: number, y: number) => void): void {
    this.dropCollectibleCallback = callback;
  }

  update(delta: number): void {
    if (!this.isAlive || !this.player) return;

    // Update facing direction
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
    this.facingDirection.x = Math.cos(angle);
    this.facingDirection.y = Math.sin(angle);

    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);

    if (distance <= this.attackRange) {
      this.attack();
    } else {
      this.chasePlayer();
    }
  }

  protected abstract chasePlayer(): void;

  protected abstract attack(): void;

  takeDamage(amount: number): void {
    this.health -= amount;
    this.playDamageSound();
    if (this.health <= 0) {
      this.die();
    }
  }

  protected die(): void {
    this.isAlive = false;
    this.anims.play(this.config.animations.death, true);
    this.setActive(false);
    this.setVisible(false);
    this.playDeathSound();
    // Add score to player
    if (this.player && typeof this.player.addScore === 'function') {
      this.player.addScore(10); // Base score for killing enemy
    }
    // Drop collectible
    this.dropCollectible();
  }

  protected dropCollectible(): void {
    const rand = Math.random();
    let type: CollectibleType;
    let texture: string;
    let value: number;

    if (rand < 0.4) {
      type = CollectibleType.HEALTH;
      texture = 'health_potion';
      value = 20;
    } else if (rand < 0.6) {
      type = CollectibleType.SHIELD;
      texture = 'shield';
      value = 5; // 5 seconds
    } else if (rand < 0.8) {
      type = CollectibleType.DAMAGE_BOOST;
      texture = 'damage_boost';
      value = 10; // 10 seconds
    } else {
      type = CollectibleType.SPEED_BOOST;
      texture = 'speed_boost';
      value = 10; // 10 seconds
    }

    if (this.dropCollectibleCallback) {
      this.dropCollectibleCallback(type, texture, value, this.x, this.y);
    } else {
      // Fallback to creating directly
      const collectible = new Collectible(this.scene, this.x, this.y, texture, type, value);
      console.log(`${this.config.name} dropped a ${type} collectible`);
    }
  }


  protected playDamageSound(): void {
    if (this.scene.sound.get('enemy_damage')) {
      this.scene.sound.play('enemy_damage');
    }
  }

  protected playDeathSound(): void {
    if (this.scene.sound.get('enemy_death')) {
      this.scene.sound.play('enemy_death');
    }
  }

  protected getDirectionString(): string {
    if (Math.abs(this.facingDirection.x) > Math.abs(this.facingDirection.y)) {
      return this.facingDirection.x > 0 ? 'right' : 'left';
    } else {
      return this.facingDirection.y > 0 ? 'down' : 'up';
    }
  }

  public reset(): void {
    this.x = 0;
    this.y = 0;
    this.health = this.maxHealth;
    this.isAlive = true;
    this.setVelocity(0, 0);
    this.setActive(false);
    this.setVisible(false);
  }

  static createEnemy(type: string, scene: Phaser.Scene, x: number, y: number): Enemy | null {
    const config = enemiesConfig.find((c: EnemyConfig) => c.id === type);
    if (!config) return null;

    switch (type) {
      case 'slime':
        return new Slime(scene, x, y, config);
      case 'goblin':
        return new Goblin(scene, x, y, config);
      default:
        return null;
    }
  }
}

export class Slime extends Enemy {
  protected attack(): void {
    if (this.scene.time.now - this.lastAttackTime < this.attackCooldown) return;

    this.lastAttackTime = this.scene.time.now;
    this.anims.play(`${this.config.animations.attack}_${this.getDirectionString()}`, true);

    // Melee attack: create hitbox
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
    const hitboxX = this.x + Math.cos(angle) * 20;
    const hitboxY = this.y + Math.sin(angle) * 20;
    const hitbox = this.scene.matter.add.rectangle(hitboxX, hitboxY, 32, 32, {
      isSensor: true,
      label: 'enemy_attack'
    });
    hitbox.collisionFilter = { category: COLLISION_CATEGORY_ATTACK, mask: COLLISION_CATEGORY_PLAYER, group: 0 };

    const collisionCallback = (event: any) => {
      event.pairs.forEach((pair: any) => {
        if (pair.bodyA === hitbox || pair.bodyB === hitbox) {
          const otherBody = pair.bodyA === hitbox ? pair.bodyB : pair.bodyA;
          const player = otherBody.gameObject as any;
          if (player && typeof player.takeDamage === 'function') {
            player.takeDamage(this.damage);
          }
        }
      });
    };

    this.scene.matter.world.on('collisionstart', collisionCallback);

    this.scene.time.delayedCall(300, () => {
      this.scene.matter.world.remove(hitbox);
      this.scene.matter.world.off('collisionstart', collisionCallback);
    });
  }

  protected chasePlayer(): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
    const velocityX = Math.cos(angle) * this.speed;
    const velocityY = Math.sin(angle) * this.speed;

    // Basic pathfinding: check ahead for collision
    const checkX = this.x + Math.cos(angle) * 20;
    const checkY = this.y + Math.sin(angle) * 20;
    // For simplicity, assume no obstacles or just move

    this.setVelocity(velocityX, velocityY);
    this.anims.play(`${this.config.animations.walk}_${this.getDirectionString()}`, true);
  }
}

export class Goblin extends Enemy {
  protected attack(): void {
    if (this.scene.time.now - this.lastAttackTime < this.attackCooldown) return;

    this.lastAttackTime = this.scene.time.now;
    this.anims.play(`${this.config.animations.attack}_${this.getDirectionString()}`, true);

    // Ranged attack: shoot projectile
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
    const projectile = (this.scene as any).getProjectile?.(this.x, this.y, COLLISION_CATEGORY_PLAYER);
    if (!projectile) return; // Pool exhausted

    const velocityX = Math.cos(angle) * 200; // Faster projectile
    const velocityY = Math.sin(angle) * 200;
    (projectile as any).velocity.x = velocityX;
    (projectile as any).velocity.y = velocityY;

    const collisionCallback = (event: any) => {
      event.pairs.forEach((pair: any) => {
        if (pair.bodyA === projectile || pair.bodyB === projectile) {
          const otherBody = pair.bodyA === projectile ? pair.bodyB : pair.bodyA;
          const player = otherBody.gameObject as any;
          if (player && typeof player.takeDamage === 'function') {
            player.takeDamage(this.damage);
            (this.scene as any).releaseProjectile?.(projectile);
            this.scene.matter.world.off('collisionstart', collisionCallback);
          }
        }
      });
    };

    this.scene.matter.world.on('collisionstart', collisionCallback);

    // Remove projectile after time
    this.scene.time.delayedCall(2000, () => {
      (this.scene as any).releaseProjectile?.(projectile);
      this.scene.matter.world.off('collisionstart', collisionCallback);
    });
  }

  protected chasePlayer(): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
    const velocityX = Math.cos(angle) * this.speed;
    const velocityY = Math.sin(angle) * this.speed;

    // Basic pathfinding: check ahead for collision
    const checkX = this.x + Math.cos(angle) * 20;
    const checkY = this.y + Math.sin(angle) * 20;
    // For simplicity, assume no obstacles or just move

    this.setVelocity(velocityX, velocityY);
    this.anims.play(`${this.config.animations.walk}_${this.getDirectionString()}`, true);
  }
}