"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const phaser_1 = __importDefault(require("phaser"));
const constants_1 = require("../../shared/config/constants");
const types_1 = require("../../shared/types");
class Player extends phaser_1.default.Physics.Matter.Sprite {
    constructor(scene, x, y, texture_idle) {
        super(scene.matter.world, x, y, texture_idle);
        this.facingDirection = { x: 1, y: 0 };
        // Buff properties
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.damageMultiplier = 1;
        this.damageBoostTimer = 0;
        this.speedMultiplier = 1;
        this.speedBoostTimer = 0;
        // Upgrade properties
        this.upgrades = {
            damageLevel: 0,
            speedLevel: 0,
            healthLevel: 0
        };
        this.id = 'player';
        this.health = constants_1.PLAYER_HEALTH;
        this.maxHealth = constants_1.PLAYER_MAX_HEALTH;
        this.speed = constants_1.PLAYER_SPEED;
        this.damage = constants_1.PLAYER_DAMAGE;
        this.score = 0;
        this.state = types_1.PlayerStateEnum.IDLE;
        this.attackCooldown = constants_1.ATTACK_COOLDOWN;
        this.lastAttackTime = 0;
        // Apply upgrade bonuses
        this.applyUpgradeBonuses();
        // Set up physics body as circle
        this.setCircle(16);
        this.setFixedRotation(); // Prevent rotation on collision
        this.setCollisionCategory(constants_1.COLLISION_CATEGORY_PLAYER);
        this.setCollidesWith([constants_1.COLLISION_CATEGORY_OBSTACLE, constants_1.COLLISION_CATEGORY_ENEMY, constants_1.COLLISION_CATEGORY_COLLECTIBLE]);
        // Add to scene
        scene.add.existing(this);
        // Set up input
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.wasd = {
            up: scene.input.keyboard.addKey(phaser_1.default.Input.Keyboard.KeyCodes.W),
            down: scene.input.keyboard.addKey(phaser_1.default.Input.Keyboard.KeyCodes.S),
            left: scene.input.keyboard.addKey(phaser_1.default.Input.Keyboard.KeyCodes.A),
            right: scene.input.keyboard.addKey(phaser_1.default.Input.Keyboard.KeyCodes.D),
        };
        this.attackKey = scene.input.keyboard.addKey(phaser_1.default.Input.Keyboard.KeyCodes.SPACE);
        // Set up animations
        this.setupAnimations(texture_idle);
    }
    setupAnimations(texture_idle) {
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
    update(delta) {
        if (this.state === types_1.PlayerStateEnum.DEAD)
            return;
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
        if (velocityX !== 0 || velocityY !== 0) {
            console.log('Player is moving');
            this.state = types_1.PlayerStateEnum.WALKING;
            this.anims.play(`player-walk_${this.facingDirection.x === 0 ? (this.facingDirection.y === 1 ? 'down' : 'up') : (this.facingDirection.x === 1 ? 'right' : 'left')}`, true);
        }
        else if (this.attackKey.isDown) {
            this.state = types_1.PlayerStateEnum.ATTACKING;
            this.anims.play(`player-attack_${this.facingDirection.x === 0 ? (this.facingDirection.y === 1 ? 'down' : 'up') : (this.facingDirection.x === 1 ? 'right' : 'left')}`, true);
        }
        else {
            this.state = types_1.PlayerStateEnum.IDLE;
            this.anims.play(`player-idle_${this.facingDirection.x === 0 ? (this.facingDirection.y === 1 ? 'down' : 'up') : (this.facingDirection.x === 1 ? 'right' : 'left')}`, true);
        }
        this.setVelocity(velocityX * this.speed * this.speedMultiplier, velocityY * this.speed * this.speedMultiplier);
        // Clamp position to arena bounds
        this.x = phaser_1.default.Math.Clamp(this.x, 0, constants_1.GAME_WIDTH);
        this.y = phaser_1.default.Math.Clamp(this.y, 0, constants_1.GAME_HEIGHT);
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
    attack() {
        console.log('Player attack executed');
        this.state = types_1.PlayerStateEnum.ATTACKING;
        this.anims.play(`player-attack_${this.facingDirection.x === 0 ? (this.facingDirection.y === 1 ? 'down' : 'up') : (this.facingDirection.x === 1 ? 'right' : 'left')}`, true);
        this.lastAttackTime = this.scene.time.now;
        // Play attack sound
        this.playAttackSound();
        // Create attack hitbox using pool
        const hitboxX = this.x + this.facingDirection.x * 20;
        const hitboxY = this.y + this.facingDirection.y * 20;
        const hitbox = this.scene.getProjectile?.(hitboxX, hitboxY, constants_1.COLLISION_CATEGORY_ENEMY);
        if (!hitbox) {
            // Fallback to creating new if pool exhausted
            const newHitbox = this.scene.matter.add.rectangle(hitboxX, hitboxY, 32, 32, {
                isSensor: true,
                label: 'attack'
            });
            newHitbox.collisionFilter = { category: constants_1.COLLISION_CATEGORY_ATTACK, mask: constants_1.COLLISION_CATEGORY_ENEMY, group: 0 };
            // Handle collision with enemies
            const collisionCallback = (event) => {
                event.pairs.forEach((pair) => {
                    if (pair.bodyA === newHitbox || pair.bodyB === newHitbox) {
                        const otherBody = pair.bodyA === newHitbox ? pair.bodyB : pair.bodyA;
                        const enemy = otherBody.gameObject;
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
                this.state = types_1.PlayerStateEnum.IDLE;
            });
            return;
        }
        // Handle collision with enemies
        const collisionCallback = (event) => {
            event.pairs.forEach((pair) => {
                if (pair.bodyA === hitbox || pair.bodyB === hitbox) {
                    const otherBody = pair.bodyA === hitbox ? pair.bodyB : pair.bodyA;
                    const enemy = otherBody.gameObject; // Assume enemy has takeDamage
                    if (enemy && typeof enemy.takeDamage === 'function') {
                        enemy.takeDamage(this.damage * this.damageMultiplier);
                    }
                }
            });
        };
        this.scene.matter.world.on('collisionstart', collisionCallback);
        // Destroy hitbox after attack animation
        this.scene.time.delayedCall(300, () => {
            this.scene.releaseProjectile?.(hitbox);
            this.scene.matter.world.off('collisionstart', collisionCallback);
            this.state = types_1.PlayerStateEnum.IDLE;
        });
    }
    playAttackSound() {
        if (this.scene.sound.get('player_attack')) {
            this.scene.sound.play('player_attack');
        }
    }
    takeDamage(amount) {
        if (this.invulnerable)
            return;
        this.health -= amount;
        if (this.health <= 0) {
            this.die();
        }
    }
    heal(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }
    addScore(amount) {
        this.score += amount;
    }
    applyShield(duration) {
        this.invulnerable = true;
        this.invulnerableTimer = duration * 1000; // Convert to milliseconds
    }
    applyDamageBoost(duration) {
        this.damageMultiplier = 1.5;
        this.damageBoostTimer = duration * 1000;
    }
    applySpeedBoost(duration) {
        this.speedMultiplier = 1.5;
        this.speedBoostTimer = duration * 1000;
    }
    die() {
        this.state = types_1.PlayerStateEnum.DEAD;
        this.anims.play('player-death');
        this.setActive(false);
        this.setVisible(false);
    }
    applyUpgradeBonuses() {
        // Apply health upgrade: +20 health per level
        this.maxHealth = constants_1.PLAYER_MAX_HEALTH + (this.upgrades.healthLevel * 20);
        this.health = this.maxHealth; // Reset health to new max
        // Apply speed upgrade: +10 speed per level
        this.speed = constants_1.PLAYER_SPEED + (this.upgrades.speedLevel * 10);
        // Apply damage upgrade: +5 damage per level
        this.damage = constants_1.PLAYER_DAMAGE + (this.upgrades.damageLevel * 5);
    }
    applyUpgrade(upgradeType) {
        switch (upgradeType) {
            case types_1.UpgradeType.DAMAGE:
                this.upgrades.damageLevel++;
                break;
            case types_1.UpgradeType.SPEED:
                this.upgrades.speedLevel++;
                break;
            case types_1.UpgradeType.HEALTH:
                this.upgrades.healthLevel++;
                break;
        }
        this.applyUpgradeBonuses();
    }
    getUpgrades() {
        return { ...this.upgrades };
    }
    getBuffTimers() {
        return {
            invulnerable: Math.max(0, this.invulnerableTimer / 1000),
            damageBoost: Math.max(0, this.damageBoostTimer / 1000),
            speedBoost: Math.max(0, this.speedBoostTimer / 1000)
        };
    }
    // Public method for multiplayer attack handling
    canAttack() {
        return this.scene.time.now - this.lastAttackTime > this.attackCooldown;
    }
    performAttack() {
        this.lastAttackTime = this.scene.time.now;
        this.attack();
    }
    getLastAttackTime() {
        return this.lastAttackTime;
    }
    setLastAttackTime(time) {
        this.lastAttackTime = time;
    }
}
exports.Player = Player;
