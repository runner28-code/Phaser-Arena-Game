"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collectible = void 0;
const phaser_1 = __importDefault(require("phaser"));
const constants_1 = require("../../shared/config/constants");
const types_1 = require("../../shared/types");
class Collectible extends phaser_1.default.Physics.Matter.Sprite {
    constructor(scene, x, y, texture, type, value) {
        super(scene.matter.world, x, y, texture);
        this.id = `collectible_${Date.now()}_${Math.random()}`;
        this.type = type;
        this.value = value;
        // Set up physics body as sensor
        this.setCircle(8);
        this.setSensor(true);
        this.setCollisionCategory(constants_1.COLLISION_CATEGORY_COLLECTIBLE);
        // Add to scene
        scene.add.existing(this);
        // Set visual feedback based on type
        this.setVisualFeedback();
    }
    setVisualFeedback() {
        switch (this.type) {
            case types_1.CollectibleType.HEALTH:
                this.setScale(0.5);
                break;
            case types_1.CollectibleType.COIN:
                this.setScale(0.1);
                break;
            case types_1.CollectibleType.SHIELD:
                this.setScale(0.1);
                break;
            case types_1.CollectibleType.DAMAGE_BOOST:
                this.setScale(0.1);
                break;
            case types_1.CollectibleType.SPEED_BOOST:
                this.setScale(0.1);
                break;
        }
    }
    collect(player) {
        switch (this.type) {
            case types_1.CollectibleType.HEALTH:
                if (player && typeof player.heal === 'function') {
                    player.heal(this.value);
                }
                break;
            case types_1.CollectibleType.COIN:
                if (player && typeof player.addScore === 'function') {
                    player.addScore(this.value);
                }
                break;
            case types_1.CollectibleType.SHIELD:
                if (player && typeof player.applyShield === 'function') {
                    player.applyShield(this.value);
                }
                break;
            case types_1.CollectibleType.DAMAGE_BOOST:
                if (player && typeof player.applyDamageBoost === 'function') {
                    player.applyDamageBoost(this.value);
                }
                break;
            case types_1.CollectibleType.SPEED_BOOST:
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
    getState() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            type: this.type,
            value: this.value
        };
    }
    playPickupSound() {
        if (this.scene.sound.get('collectible_pickup')) {
            this.scene.sound.play('collectible_pickup');
        }
    }
    reset() {
        this.x = 0;
        this.y = 0;
        this.setActive(false);
        this.setVisible(false);
    }
}
exports.Collectible = Collectible;
