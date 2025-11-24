"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Goblin = exports.Slime = exports.Enemy = void 0;
const phaser_1 = __importDefault(require("phaser"));
const constants_1 = require("../../shared/config/constants");
const types_1 = require("../../shared/types");
const enemies_json_1 = __importDefault(require("../../shared/config/enemies.json"));
const Collectible_1 = require("./Collectible");
class Enemy extends phaser_1.default.Physics.Matter.Sprite {
    getIsAlive() {
        return this.isAlive;
    }
    constructor(scene, x, y, config) {
        super(scene.matter.world, x, y, config.animations.idle); // Use idle animation as initial texture
        this.attackCooldown = 1000;
        this.lastAttackTime = 0;
        this.attackRange = 50;
        this.isAlive = true;
        this.facingDirection = { x: 1, y: 0 };
        this.config = config;
        this.id = config.id;
        this.health = config.health;
        this.maxHealth = config.health;
        this.speed = config.speed;
        this.damage = config.damage;
        // Set up physics body as circle
        this.setCircle(16);
        this.setFixedRotation(); // Prevent rotation on collision
        this.setCollisionCategory(constants_1.COLLISION_CATEGORY_ENEMY);
        this.setCollidesWith([constants_1.COLLISION_CATEGORY_OBSTACLE, constants_1.COLLISION_CATEGORY_PLAYER, constants_1.COLLISION_CATEGORY_ATTACK]);
        // Add to scene
        scene.add.existing(this);
        // Set up animations
        this.setupAnimations();
    }
    setupAnimations() {
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
        }
        else {
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
    setPlayer(player) {
        this.player = player;
    }
    setDropCollectibleCallback(callback) {
        this.dropCollectibleCallback = callback;
    }
    update(delta) {
        if (!this.isAlive || !this.player)
            return;
        // Update facing direction
        const angle = phaser_1.default.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
        this.facingDirection.x = Math.cos(angle);
        this.facingDirection.y = Math.sin(angle);
        const distance = phaser_1.default.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
        if (distance <= this.attackRange) {
            this.attack();
        }
        else {
            this.chasePlayer();
        }
    }
    takeDamage(amount) {
        this.health -= amount;
        this.playDamageSound();
        if (this.health <= 0) {
            this.die();
        }
    }
    die() {
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
    dropCollectible() {
        const rand = Math.random();
        let type;
        let texture;
        let value;
        if (rand < 0.4) {
            type = types_1.CollectibleType.HEALTH;
            texture = 'health_potion';
            value = 20;
        }
        else if (rand < 0.6) {
            type = types_1.CollectibleType.SHIELD;
            texture = 'shield';
            value = 5; // 5 seconds
        }
        else if (rand < 0.8) {
            type = types_1.CollectibleType.DAMAGE_BOOST;
            texture = 'damage_boost';
            value = 10; // 10 seconds
        }
        else {
            type = types_1.CollectibleType.SPEED_BOOST;
            texture = 'speed_boost';
            value = 10; // 10 seconds
        }
        if (this.dropCollectibleCallback) {
            this.dropCollectibleCallback(type, texture, value, this.x, this.y);
        }
        else {
            // Fallback to creating directly
            const collectible = new Collectible_1.Collectible(this.scene, this.x, this.y, texture, type, value);
            console.log(`${this.config.name} dropped a ${type} collectible`);
        }
    }
    playDamageSound() {
        if (this.scene.sound.get('enemy_damage')) {
            this.scene.sound.play('enemy_damage');
        }
    }
    playDeathSound() {
        if (this.scene.sound.get('enemy_death')) {
            this.scene.sound.play('enemy_death');
        }
    }
    getDirectionString() {
        if (Math.abs(this.facingDirection.x) > Math.abs(this.facingDirection.y)) {
            return this.facingDirection.x > 0 ? 'right' : 'left';
        }
        else {
            return this.facingDirection.y > 0 ? 'down' : 'up';
        }
    }
    reset() {
        this.x = 0;
        this.y = 0;
        this.health = this.maxHealth;
        this.isAlive = true;
        this.setVelocity(0, 0);
        this.setActive(false);
        this.setVisible(false);
    }
    static createEnemy(type, scene, x, y) {
        const config = enemies_json_1.default.find((c) => c.id === type);
        if (!config)
            return null;
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
exports.Enemy = Enemy;
class Slime extends Enemy {
    attack() {
        if (this.scene.time.now - this.lastAttackTime < this.attackCooldown)
            return;
        this.lastAttackTime = this.scene.time.now;
        this.anims.play(`${this.config.animations.attack}_${this.getDirectionString()}`, true);
        // Melee attack: create hitbox
        const angle = phaser_1.default.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
        const hitboxX = this.x + Math.cos(angle) * 20;
        const hitboxY = this.y + Math.sin(angle) * 20;
        const hitbox = this.scene.matter.add.rectangle(hitboxX, hitboxY, 32, 32, {
            isSensor: true,
            label: 'enemy_attack'
        });
        hitbox.collisionFilter = { category: constants_1.COLLISION_CATEGORY_ATTACK, mask: constants_1.COLLISION_CATEGORY_PLAYER, group: 0 };
        const collisionCallback = (event) => {
            event.pairs.forEach((pair) => {
                if (pair.bodyA === hitbox || pair.bodyB === hitbox) {
                    const otherBody = pair.bodyA === hitbox ? pair.bodyB : pair.bodyA;
                    const player = otherBody.gameObject;
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
    chasePlayer() {
        const angle = phaser_1.default.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
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
exports.Slime = Slime;
class Goblin extends Enemy {
    attack() {
        if (this.scene.time.now - this.lastAttackTime < this.attackCooldown)
            return;
        this.lastAttackTime = this.scene.time.now;
        this.anims.play(`${this.config.animations.attack}_${this.getDirectionString()}`, true);
        // Ranged attack: shoot projectile
        const angle = phaser_1.default.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
        const projectile = this.scene.getProjectile?.(this.x, this.y, constants_1.COLLISION_CATEGORY_PLAYER);
        if (!projectile)
            return; // Pool exhausted
        const velocityX = Math.cos(angle) * 200; // Faster projectile
        const velocityY = Math.sin(angle) * 200;
        projectile.velocity.x = velocityX;
        projectile.velocity.y = velocityY;
        const collisionCallback = (event) => {
            event.pairs.forEach((pair) => {
                if (pair.bodyA === projectile || pair.bodyB === projectile) {
                    const otherBody = pair.bodyA === projectile ? pair.bodyB : pair.bodyA;
                    const player = otherBody.gameObject;
                    if (player && typeof player.takeDamage === 'function') {
                        player.takeDamage(this.damage);
                        this.scene.releaseProjectile?.(projectile);
                        this.scene.matter.world.off('collisionstart', collisionCallback);
                    }
                }
            });
        };
        this.scene.matter.world.on('collisionstart', collisionCallback);
        // Remove projectile after time
        this.scene.time.delayedCall(2000, () => {
            this.scene.releaseProjectile?.(projectile);
            this.scene.matter.world.off('collisionstart', collisionCallback);
        });
    }
    chasePlayer() {
        const angle = phaser_1.default.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
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
exports.Goblin = Goblin;
