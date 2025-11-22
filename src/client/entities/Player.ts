import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_HEALTH,
  PLAYER_MAX_HEALTH,
  PLAYER_SPEED,
  PLAYER_DAMAGE,
  ATTACK_COOLDOWN,
  COLLISION_CATEGORY_PLAYER,
  COLLISION_CATEGORY_OBSTACLE,
  COLLISION_CATEGORY_ENEMY,
  COLLISION_CATEGORY_ATTACK,
  COLLISION_CATEGORY_COLLECTIBLE
} from '../../shared/config/constants';
import { PlayerState, PlayerStateEnum, UpgradeType, PlayerUpgrades } from '../../shared/types';

export class Player extends Phaser.Physics.Matter.Sprite {
  public id: string;
  public health: number;
  public maxHealth: number;
  public speed: number;
  public damage: number;
  public score: number;
  public state: PlayerStateEnum;
  private attackCooldown: number;
  private lastAttackTime: number;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private attackKey: Phaser.Input.Keyboard.Key;
  public facingDirection: { x: number; y: number } = { x: 1, y: 0 };

  // Buff properties
  private invulnerable: boolean = false;
  private invulnerableTimer: number = 0;
  private damageMultiplier: number = 1;
  private damageBoostTimer: number = 0;
  private speedMultiplier: number = 1;
  private speedBoostTimer: number = 0;

  // Upgrade properties
  private upgrades: PlayerUpgrades = {
    damageLevel: 0,
    speedLevel: 0,
    healthLevel: 0
  };

  constructor(scene: Phaser.Scene, x: number, y: number, texture_idle: string) {
    super(scene.matter.world, x, y, texture_idle);

    this.id = 'player';
    this.health = PLAYER_HEALTH;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.speed = PLAYER_SPEED;
    this.damage = PLAYER_DAMAGE;
    this.score = 0;
    this.state = PlayerStateEnum.IDLE;
    this.attackCooldown = ATTACK_COOLDOWN;
    this.lastAttackTime = 0;

    // Apply upgrade bonuses
    this.applyUpgradeBonuses();

    // Set up physics body as circle
    this.setCircle(16);
    this.setFixedRotation(); // Prevent rotation on collision
    this.setCollisionCategory(COLLISION_CATEGORY_PLAYER);
    this.setCollidesWith([COLLISION_CATEGORY_OBSTACLE, COLLISION_CATEGORY_ENEMY, COLLISION_CATEGORY_COLLECTIBLE]);

    // Add to scene
    scene.add.existing(this);

    // Set up input
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.attackKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Set up animations
    this.setupAnimations(texture_idle);
  }

  private setupAnimations(texture_idle: string): void {
    // Assume frames are sequential starting from 0
    this.scene.anims.create({
      key: 'player-idle_down',
      frames: this.anims.generateFrameNumbers('player_idle', { frames: [0, 1, 2, 3, 4, 5] }),
      frameRate: 6,
      repeat: -1,
    });

    this.scene.anims.create({
      key: 'player-idle_up',
      frames: this.anims.generateFrameNumbers('player_idle', { frames: [36, 37, 38, 39] }),
      frameRate: 6,
      repeat: -1,
    });

    this.scene.anims.create({
      key: 'player-idle_left',
      frames: this.anims.generateFrameNumbers('player_idle', { frames: [12, 13, 14, 15, 16] }),
      frameRate: 6,
      repeat: -1,
    });

    this.scene.anims.create({
      key: 'player-idle_right',
      frames: this.anims.generateFrameNumbers('player_idle', { frames: [24, 25, 26, 27, 28, 29] }),
      frameRate: 6,
      repeat: -1,
    });


    this.scene.anims.create({
      key: 'player-walk_down',
      frames: this.scene.anims.generateFrameNumbers('player_walk', { frames: [0, 1, 2, 3, 4, 5, 6, 7] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'player-walk_up',
      frames: this.scene.anims.generateFrameNumbers('player_walk', { frames: [24, 25, 26, 27, 28, 29, 30, 31] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'player-walk_left',
      frames: this.scene.anims.generateFrameNumbers('player_walk', { frames: [8, 9, 10, 11, 12, 13, 14, 15] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'player-walk_right',
      frames: this.scene.anims.generateFrameNumbers('player_walk', { frames: [16, 17, 18, 19, 20, 21, 22, 23] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'player-attack_down',
      frames: this.scene.anims.generateFrameNumbers('player_attack', { frames: [0, 1, 2, 3, 4, 5] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'player-attack_up',
      frames: this.scene.anims.generateFrameNumbers('player_attack', { frames: [18, 19, 20, 21, 22, 23] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'player-attack_left',
      frames: this.scene.anims.generateFrameNumbers('player_attack', { frames: [6, 7, 8, 9, 10, 11] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'player-attack_right',
      frames: this.scene.anims.generateFrameNumbers('player_attack', { frames: [12, 13, 14, 15, 16, 17] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'player-run-attack_down',
      frames: this.scene.anims.generateFrameNumbers('player_run_attack', { frames: [0, 1, 2, 3, 4, 5, 6, 7] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'player-run-attack_left',
      frames: this.scene.anims.generateFrameNumbers('player_run_attack', { frames: [8, 9, 10, 11, 12, 13, 14, 15] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'player-run-attack_right',
      frames: this.scene.anims.generateFrameNumbers('player_run_attack', { frames: [16, 17, 18, 19, 20, 21, 22, 23] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'player-run-attack_up',
      frames: this.scene.anims.generateFrameNumbers('player_run_attack', { frames: [24, 25, 26, 27, 28, 29, 30, 31] }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'player-death',
      frames: this.scene.anims.generateFrameNumbers(texture_idle, { start: 12, end: 15 }),
      frameRate: 10,
      repeat: 0
    });
  }

  update(delta: number): void {
    if (this.state === PlayerStateEnum.DEAD) return;

    // Handle movement
    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      velocityX = -1;
      this.facingDirection = { x: -1, y: 0 };
    }
    if (this.cursors.right.isDown || this.wasd.right.isDown) {
      velocityX = 1;
      this.facingDirection = { x: 1, y: 0 };
    }
    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      velocityY = -1;
      this.facingDirection = { x: 0, y: -1 };
    }
    if (this.cursors.down.isDown || this.wasd.down.isDown) {
      velocityY = 1;
      this.facingDirection = { x: 0, y: 1 };
    }
   if(velocityX !== 0 || velocityY !== 0) {
      console.log('Player is moving');
      this.state = PlayerStateEnum.WALKING;
      this.anims.play(`player-walk_${this.facingDirection.x === 0 ? (this.facingDirection.y === 1 ? 'down' : 'up') : (this.facingDirection.x === 1 ? 'right' : 'left')}`, true); 
   }else if(this.attackKey.isDown) {
      this.state = PlayerStateEnum.ATTACKING;
      this.anims.play(`player-attack_${this.facingDirection.x === 0 ? (this.facingDirection.y === 1 ? 'down' : 'up') : (this.facingDirection.x === 1 ? 'right' : 'left')}`, true);
    }else{
      this.state = PlayerStateEnum.IDLE;
      this.anims.play(`player-idle_${this.facingDirection.x === 0 ? (this.facingDirection.y === 1 ? 'down' : 'up') : (this.facingDirection.x === 1 ? 'right' : 'left')}`, true);
    } 

    this.setVelocity(velocityX * this.speed * this.speedMultiplier, velocityY * this.speed * this.speedMultiplier);

    // Clamp position to arena bounds
    this.x = Phaser.Math.Clamp(this.x, 0, GAME_WIDTH);
    this.y = Phaser.Math.Clamp(this.y, 0, GAME_HEIGHT);

    // Update buff timers
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      if (this.invulnerableTimer <= 0) {
        this.invulnerable = false;
        this.invulnerableTimer = 0;
      }
    }
    if (this.damageBoostTimer > 0) {
      this.damageBoostTimer -= delta;
      if (this.damageBoostTimer <= 0) {
        this.damageMultiplier = 1;
        this.damageBoostTimer = 0;
      }
    }
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= delta;
      if (this.speedBoostTimer <= 0) {
        this.speedMultiplier = 1;
        this.speedBoostTimer = 0;
      }
    }

    // Handle attack
    if (this.attackKey.isDown && this.scene.time.now - this.lastAttackTime > this.attackCooldown) {
      this.attack();
    }
  }

  private attack(): void {
    console.log('Player attack executed');
    this.state = PlayerStateEnum.ATTACKING;
    this.anims.play(`player-attack_${this.facingDirection.x === 0 ? (this.facingDirection.y === 1 ? 'down' : 'up') : (this.facingDirection.x === 1 ? 'right' : 'left')}`, true);
    this.lastAttackTime = this.scene.time.now;

    // Play attack sound
    this.playAttackSound();

    // Create attack hitbox using pool
    const hitboxX = this.x + this.facingDirection.x * 20;
    const hitboxY = this.y + this.facingDirection.y * 20;
    const hitbox = (this.scene as any).getProjectile?.(hitboxX, hitboxY, COLLISION_CATEGORY_ENEMY);
    if (!hitbox) {
      // Fallback to creating new if pool exhausted
      const newHitbox = this.scene.matter.add.rectangle(hitboxX, hitboxY, 32, 32, {
        isSensor: true,
        label: 'attack'
      });
      newHitbox.collisionFilter = { category: COLLISION_CATEGORY_ATTACK, mask: COLLISION_CATEGORY_ENEMY, group: 0 };

      // Handle collision with enemies
      const collisionCallback = (event: any) => {
        event.pairs.forEach((pair: any) => {
          if (pair.bodyA === newHitbox || pair.bodyB === newHitbox) {
            const otherBody = pair.bodyA === newHitbox ? pair.bodyB : pair.bodyA;
            const enemy = otherBody.gameObject as any;
            if (enemy && typeof enemy.takeDamage === 'function') {
              enemy.takeDamage(this.damage * this.damageMultiplier);
            }
          }
        });
      };

      this.scene.matter.world.on('collisionstart', collisionCallback);

      this.scene.time.delayedCall(300, () => {
        this.scene.matter.world.remove(newHitbox);
        this.scene.matter.world.off('collisionstart', collisionCallback);
        this.state = PlayerStateEnum.IDLE;
      });
      return;
    }

    // Handle collision with enemies
    const collisionCallback = (event: any) => {
      event.pairs.forEach((pair: any) => {
        if (pair.bodyA === hitbox || pair.bodyB === hitbox) {
          const otherBody = pair.bodyA === hitbox ? pair.bodyB : pair.bodyA;
          const enemy = otherBody.gameObject as any; // Assume enemy has takeDamage
          if (enemy && typeof enemy.takeDamage === 'function') {
            enemy.takeDamage(this.damage * this.damageMultiplier);
          }
        }
      });
    };

    this.scene.matter.world.on('collisionstart', collisionCallback);

    // Destroy hitbox after attack animation
    this.scene.time.delayedCall(300, () => {
      (this.scene as any).releaseProjectile?.(hitbox);
      this.scene.matter.world.off('collisionstart', collisionCallback);
      this.state = PlayerStateEnum.IDLE;
    });
  }

  private playAttackSound(): void {
    if (this.scene.sound.get('player_attack')) {
      this.scene.sound.play('player_attack');
    }
  }

  takeDamage(amount: number): void {
    if (this.invulnerable) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.die();
    }
  }

  heal(amount: number): void {
    this.health = Math.min(this.health + amount, this.maxHealth);
  }

  addScore(amount: number): void {
    this.score += amount;
  }

  applyShield(duration: number): void {
    this.invulnerable = true;
    this.invulnerableTimer = duration * 1000; // Convert to milliseconds
  }

  applyDamageBoost(duration: number): void {
    this.damageMultiplier = 1.5;
    this.damageBoostTimer = duration * 1000;
  }

  applySpeedBoost(duration: number): void {
    this.speedMultiplier = 1.5;
    this.speedBoostTimer = duration * 1000;
  }

  private die(): void {
    this.state = PlayerStateEnum.DEAD;
    this.anims.play('player-death');
    this.setActive(false);
    this.setVisible(false);
  }

  private applyUpgradeBonuses(): void {
    // Apply health upgrade: +20 health per level
    this.maxHealth = PLAYER_MAX_HEALTH + (this.upgrades.healthLevel * 20);
    this.health = this.maxHealth; // Reset health to new max

    // Apply speed upgrade: +10 speed per level
    this.speed = PLAYER_SPEED + (this.upgrades.speedLevel * 10);

    // Apply damage upgrade: +5 damage per level
    this.damage = PLAYER_DAMAGE + (this.upgrades.damageLevel * 5);
  }

  applyUpgrade(upgradeType: UpgradeType): void {
    switch (upgradeType) {
      case UpgradeType.DAMAGE:
        this.upgrades.damageLevel++;
        break;
      case UpgradeType.SPEED:
        this.upgrades.speedLevel++;
        break;
      case UpgradeType.HEALTH:
        this.upgrades.healthLevel++;
        break;
    }
    this.applyUpgradeBonuses();
  }

  getUpgrades(): PlayerUpgrades {
    return { ...this.upgrades };
  }

  getState(): PlayerState {
    return {
      id: this.id || 'player',
      x: this.x,
      y: this.y,
      health: this.health,
      maxHealth: this.maxHealth,
      speed: this.speed,
      damage: this.damage,
      isAlive: this.state !== PlayerStateEnum.DEAD,
      lastAttackTime: this.lastAttackTime,
      direction: this.facingDirection
    };
  }

  getBuffTimers(): { invulnerable: number; damageBoost: number; speedBoost: number } {
    return {
      invulnerable: Math.max(0, this.invulnerableTimer / 1000),
      damageBoost: Math.max(0, this.damageBoostTimer / 1000),
      speedBoost: Math.max(0, this.speedBoostTimer / 1000)
    };
  }
}