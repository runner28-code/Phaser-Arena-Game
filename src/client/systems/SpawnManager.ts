import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../shared/config/constants';
import { Enemy } from '../entities/Enemy';
import { ObjectPool } from './ObjectPool';

export class SpawnManager {
  private scene: Phaser.Scene;
  private player: any;
  private currentWave: number = 1;
  private enemiesPerWave: number = 5;
  private spawnPoints: { x: number; y: number }[];
  private activeEnemies: Enemy[] = [];
  private waveInProgress: boolean = false;
  private waveDelay: number = 3000; // 3 seconds
  private onLevelUp?: () => void;
  private enemyPool: ObjectPool<Enemy>;

  constructor(scene: Phaser.Scene, player: any, enemyPool: ObjectPool<Enemy>, onLevelUp?: () => void) {
    this.scene = scene;
    this.player = player;
    this.enemyPool = enemyPool;
    this.onLevelUp = onLevelUp;

    // Spawn points at arena edges
    this.spawnPoints = [
      { x: 0, y: GAME_HEIGHT / 2 },
      { x: GAME_WIDTH, y: GAME_HEIGHT / 2 },
      { x: GAME_WIDTH / 2, y: 0 },
      { x: GAME_WIDTH / 2, y: GAME_HEIGHT }
    ];
  }

  startWave(): void {
    this.waveInProgress = true;
    const enemyTypes = this.getEnemyTypesForWave();
    const count = this.getEnemyCountForWave();

    for (let i = 0; i < count; i++) {
      const type = enemyTypes[i % enemyTypes.length];
      this.spawnEnemy(type);
    }
  }

  private getEnemyTypesForWave(): string[] {
    if (this.currentWave === 1) {
      return ['slime'];
    } else if (this.currentWave <= 3) {
      return ['slime', 'goblin'];
    } else {
      return ['slime', 'goblin']; // orc not implemented yet
    }
  }

  private getEnemyCountForWave(): number {
    return 5 + (this.currentWave - 1) * 2;
  }

  private spawnEnemy(type: string): void {
    const spawnPoint = Phaser.Utils.Array.GetRandom(this.spawnPoints);
    let x = spawnPoint.x;
    let y = spawnPoint.y;

    // Adjust to avoid player overlap
    const distanceToPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
    if (distanceToPlayer < 100) {
      const angle = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
      x += Math.cos(angle) * 100;
      y += Math.sin(angle) * 100;
    }

    const enemy = this.enemyPool.get(type, x, y);
    if (enemy) {
      enemy.setPlayer(this.player);
      enemy.setDropCollectibleCallback((collectibleType, texture, value, cx, cy) => {
        // Use the collectible pool from GameScene
        const collectible = (this.scene as any).collectiblePool?.get(texture, collectibleType, value, cx, cy);
        if (collectible) {
          console.log(`${enemy.config.name} dropped a ${collectibleType} collectible`);
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

  update(delta: number): void {
    if (this.waveInProgress) {
      // Filter out dead enemies and release them back to pool
      const aliveEnemies: Enemy[] = [];
      this.activeEnemies.forEach(enemy => {
        if (enemy.getState().isAlive) {
          aliveEnemies.push(enemy);
          // Update enemy AI
          enemy.update(delta);
        } else {
          this.enemyPool.release(enemy);
        }
      });
      this.activeEnemies = aliveEnemies;

      if (this.activeEnemies.length === 0) {
        this.onWaveComplete();
      }
    }
  }

  private onWaveComplete(): void {
    this.waveInProgress = false;
    this.currentWave++;

    // Check for level up every 5 waves
    if (this.currentWave % 5 === 0 && this.onLevelUp) {
      this.onLevelUp();
    } else {
      // Delay before next wave
      this.scene.time.delayedCall(this.waveDelay, () => {
        this.startWave();
      });
    }
  }

  getCurrentWave(): number {
    return this.currentWave;
  }

  isWaveInProgress(): boolean {
    return this.waveInProgress;
  }
}