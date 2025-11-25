"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpawnManager = void 0;
const phaser_1 = __importDefault(require("phaser"));
const constants_1 = require("../../shared/config/constants");
/**
 * Manages enemy spawning and wave progression in single-player mode.
 * Handles enemy lifecycle, difficulty scaling, and collectible drops.
 */
class SpawnManager {
    constructor(scene, player, enemyPool, onLevelUp) {
        this.currentWave = 1;
        this.enemiesPerWave = 5;
        this.activeEnemies = [];
        this.waveInProgress = false;
        this.waveDelay = 3000; // 3 seconds
        this.scene = scene;
        this.player = player;
        this.enemyPool = enemyPool;
        this.onLevelUp = onLevelUp;
        // Spawn points at arena edges
        this.spawnPoints = [
            { x: 0, y: constants_1.GAME_HEIGHT / 2 },
            { x: constants_1.GAME_WIDTH, y: constants_1.GAME_HEIGHT / 2 },
            { x: constants_1.GAME_WIDTH / 2, y: 0 },
            { x: constants_1.GAME_WIDTH / 2, y: constants_1.GAME_HEIGHT }
        ];
    }
    /**
     * Starts a new enemy wave with the current wave's enemy types and count.
     * Spawns enemies at random edge positions around the arena.
     */
    startWave() {
        this.waveInProgress = true;
        const enemyTypes = this.getEnemyTypesForWave();
        const count = this.getEnemyCountForWave();
        for (let i = 0; i < count; i++) {
            const type = enemyTypes[i % enemyTypes.length];
            this.spawnEnemy(type);
        }
    }
    getEnemyTypesForWave() {
        if (this.currentWave === 1) {
            return ['slime'];
        }
        else if (this.currentWave <= 3) {
            return ['slime', 'goblin'];
        }
        else {
            return ['slime', 'goblin']; // orc not implemented yet
        }
    }
    getEnemyCountForWave() {
        return 5 + (this.currentWave - 1) * 2;
    }
    spawnEnemy(type) {
        const spawnPoint = phaser_1.default.Utils.Array.GetRandom(this.spawnPoints);
        let x = spawnPoint.x;
        let y = spawnPoint.y;
        // Adjust to avoid player overlap
        const distanceToPlayer = phaser_1.default.Math.Distance.Between(x, y, this.player.x, this.player.y);
        if (distanceToPlayer < 100) {
            const angle = phaser_1.default.Math.Angle.Between(x, y, this.player.x, this.player.y);
            x += Math.cos(angle) * 100;
            y += Math.sin(angle) * 100;
        }
        const enemy = this.enemyPool.get(type, x, y);
        if (enemy) {
            enemy.setPlayer(this.player);
            enemy.setDropCollectibleCallback((collectibleType, texture, value, cx, cy) => {
                // Use the collectible pool from GameScene
                const collectible = this.scene.collectiblePool?.get(texture, collectibleType, value, cx, cy);
                if (collectible) {
                    // Collectible spawned
                }
            });
            this.activeEnemies.push(enemy);
            // Difficulty scaling: +10% stats per wave
            const scaleFactor = 1 + (this.currentWave - 1) * 0.1;
            enemy.health *= scaleFactor;
            enemy.maxHealth *= scaleFactor;
            enemy.speed *= scaleFactor;
            enemy.damage *= scaleFactor;
        }
    }
    /**
     * Updates all active enemies and handles enemy lifecycle.
     * Removes dead enemies and releases them back to the object pool.
     * @param delta - Time elapsed since last update
     */
    update(delta) {
        if (this.waveInProgress) {
            // Filter out dead enemies and release them back to pool
            const aliveEnemies = [];
            this.activeEnemies.forEach(enemy => {
                if (enemy.getIsAlive()) {
                    aliveEnemies.push(enemy);
                    // Update enemy AI
                    enemy.update(delta);
                }
                else {
                    this.enemyPool.release(enemy);
                }
            });
            this.activeEnemies = aliveEnemies;
            if (this.activeEnemies.length === 0) {
                this.onWaveComplete();
            }
        }
    }
    onWaveComplete() {
        this.waveInProgress = false;
        this.currentWave++;
        // Check for level up every 5 waves
        if (this.currentWave % 5 === 0 && this.onLevelUp) {
            this.onLevelUp();
        }
        else {
            // Delay before next wave
            this.scene.time.delayedCall(this.waveDelay, () => {
                this.startWave();
            });
        }
    }
    /**
     * Gets the current wave number.
     * @returns The current wave number (starting from 1)
     */
    getCurrentWave() {
        return this.currentWave;
    }
    /**
     * Checks if a wave is currently in progress.
     * @returns True if enemies are still active, false if wave is complete
     */
    isWaveInProgress() {
        return this.waveInProgress;
    }
}
exports.SpawnManager = SpawnManager;
