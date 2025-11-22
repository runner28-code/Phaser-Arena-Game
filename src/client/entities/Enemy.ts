import Phaser from 'phaser';
import {
  COLLISION_CATEGORY_ENEMY,
  COLLISION_CATEGORY_OBSTACLE,
  COLLISION_CATEGORY_PLAYER,
  COLLISION_CATEGORY_ATTACK
} from '../../shared/config/constants';
import { EnemyConfig, EnemyType, EnemyState, CollectibleType } from '../../shared/types';
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
  protected dropCollectibleCallback?: (type: CollectibleType, texture: string, value: number, x: number, y: number) => void;

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
    this.setCollisionCategory(COLLISION_CATEGORY_ENEMY);
    this.setCollidesWith([COLLISION_CATEGORY_OBSTACLE, COLLISION_CATEGORY_PLAYER, COLLISION_CATEGORY_ATTACK]);

    // Add to scene
    scene.add.existing(this);

    // Set up animations
    this.setupAnimations();
  }

  protected setupAnimations(): void {
    // Assume frames are sequential
    this.scene.anims.create({
      key: this.config.animations.idle,
      frames: this.scene.anims.generateFrameNumbers('enemy_idle', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: this.config.animations.walk,
      frames: this.scene.anims.generateFrameNumbers('enemy_walk', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: this.config.animations.attack,
      frames: this.scene.anims.generateFrameNumbers('enemy_attack', { start: 0, end: 11 }),
      frameRate: 15,
      repeat: 0
    });

    this.scene.anims.create({
      key: this.config.animations.death,
      frames: this.scene.anims.generateFrameNumbers(this.config.id, { start: 12, end: 15 }),
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
    this.anims.play("enemy_death", true);
    this.setActive(false);
    this.setVisible(false);
    this.playDeathSound();
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

  getState(): EnemyState {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      health: this.health,
      maxHealth: this.maxHealth,
      speed: this.speed,
      damage: this.damage,
      isAlive: this.isAlive,
      type: this.id.toUpperCase() as EnemyType
    };
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
    this.anims.play("enemy_attack", true);

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
    this.anims.play("enemy_walk", true);
  }
}

export class Goblin extends Enemy {
  protected attack(): void {
    if (this.scene.time.now - this.lastAttackTime < this.attackCooldown) return;

    this.lastAttackTime = this.scene.time.now;
    this.anims.play(this.config.animations.attack);

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
    this.anims.play(this.config.animations.walk, true);
  }
}