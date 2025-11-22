import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLLISION_CATEGORY_OBSTACLE, COLLISION_CATEGORY_ENEMY, COLLISION_CATEGORY_COLLECTIBLE, COLLISION_CATEGORY_ATTACK, COLLISION_CATEGORY_PLAYER } from '../../shared/config/constants';
import { Player } from '../entities/Player';
import { RemotePlayer } from '../entities/RemotePlayer';
import { Enemy } from '../entities/Enemy';
import { Collectible } from '../entities/Collectible';
import { SpawnManager } from '../systems/SpawnManager';
import { NetworkManager } from '../network/NetworkManager';
import { UpgradeScene } from './UpgradeScene';
import { ObjectPool } from '../systems/ObjectPool';
import { GameOverSceneData, PlayerStateEnum, RoomState, EnemyState, Collectible as CollectibleType, GameState, UpgradeType, CollectibleType as CollectibleEnum } from '../../shared/types';

export class GameScene extends Phaser.Scene {
    private mode!: 'single' | 'multi';
    private player!: Player;
    private networkManager?: NetworkManager;
    private remotePlayers: Map<string, RemotePlayer> = new Map();
    private activeEnemies: Map<string, any> = new Map(); // For multiplayer enemy syncing
    private activeCollectibles: Map<string, any> = new Map(); // For multiplayer collectible syncing
    private spawnManager!: SpawnManager;
    private waveText!: Phaser.GameObjects.Text;
    private buffTexts: Phaser.GameObjects.Text[] = [];
    private gameTimer: number = 0;
    private uiContainer!: Phaser.GameObjects.Container;
    private healthBarBackground!: Phaser.GameObjects.Graphics;
    private healthBarFill!: Phaser.GameObjects.Graphics;
    private currentHealthBarWidth: number = 200;
    private scoreText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;
    private waitingText!: Phaser.GameObjects.Text;
    private playerCountText!: Phaser.GameObjects.Text;
    private upgradeTexts: Phaser.GameObjects.Text[] = [];

    // Object pools for performance optimization
    private enemyPool!: ObjectPool<Enemy>;
    private collectiblePool!: ObjectPool<Collectible>;
    private projectilePool: MatterJS.BodyType[] = []; // Pool for projectile bodies

  constructor() {
    super({ key: 'Game' });
  }

  init(data: { mode: 'single' | 'multi' }) {
    this.mode = data.mode;
  }

  create() {
    // Set up matter world bounds
    this.matter.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Create static boundary bodies
    this.createBoundaries();

    // Initialize object pools
    this.initializePools();

    // Set up collision event listeners
    this.setupCollisionListeners();

    // Create player at center
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 'player_idle');

    if (this.mode === 'multi') {
      // Initialize network manager for multiplayer
      this.networkManager = new NetworkManager('ws://localhost:8080');
      this.networkManager.connect().then(() => {
        console.log('Connected to server');
        // Set up message handlers
        this.setupNetworkHandlers();
        // Send create room (for now, assuming host creates room)
        this.networkManager!.sendCreateRoom('Multiplayer Room');
      }).catch((error) => {
        console.error('Failed to connect to server:', error);
      });
    } else {
      // Single player mode
      // Create spawn manager with level up callback
      this.spawnManager = new SpawnManager(this, this.player, this.enemyPool, () => this.showUpgradeSelection());
      // Start first wave
      this.spawnManager.startWave();
    }

    // Create UI container
    this.uiContainer = this.add.container(0, 0);

    // Create waiting text
    this.waitingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.uiContainer.add(this.waitingText);

    // Create player count text
    this.playerCountText = this.add.text(10, 70, 'Players: 1', {
      fontSize: '24px',
      color: '#ffffff'
    });
    this.uiContainer.add(this.playerCountText);

    // Create health bar
    this.createHealthBar();

    // Create score display
    this.scoreText = this.add.text(GAME_WIDTH - 10, 10, `Score: ${this.player.score}`, {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(1, 0);
    this.uiContainer.add(this.scoreText);

    // Create timer display
    this.timerText = this.add.text(GAME_WIDTH / 2, 10, `Time: 0.0s`, {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5, 0);
    this.uiContainer.add(this.timerText);

    // Add existing UI text
    const modeText = this.add.text(10, 10, `Mode: ${this.mode}`, {
      fontSize: '24px',
      color: '#ffffff'
    });
    this.uiContainer.add(modeText);

    this.waveText = this.add.text(10, 40, `Wave: 1`, {
      fontSize: '24px',
      color: '#ffffff'
    });
    this.uiContainer.add(this.waveText);

    // Start background music
    this.startBackgroundMusic();

    // Initialize upgrade UI
    this.updateUpgradeUI();
  }

  private createBoundaries(): void {
    // Top wall
    this.matter.add.rectangle(GAME_WIDTH / 2, -10, GAME_WIDTH, 20, {
      isStatic: true,
      collisionFilter: { category: COLLISION_CATEGORY_OBSTACLE }
    });

    // Bottom wall
    this.matter.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + 10, GAME_WIDTH, 20, {
      isStatic: true,
      collisionFilter: { category: COLLISION_CATEGORY_OBSTACLE }
    });

    // Left wall
    this.matter.add.rectangle(-10, GAME_HEIGHT / 2, 20, GAME_HEIGHT, {
      isStatic: true,
      collisionFilter: { category: COLLISION_CATEGORY_OBSTACLE }
    });

    // Right wall
    this.matter.add.rectangle(GAME_WIDTH + 10, GAME_HEIGHT / 2, 20, GAME_HEIGHT, {
      isStatic: true,
      collisionFilter: { category: COLLISION_CATEGORY_OBSTACLE }
    });
  }

  private initializePools(): void {
    // Enemy pool
    this.enemyPool = new ObjectPool<Enemy>(
      (type: string, x: number, y: number) => {
        const enemy = Enemy.createEnemy(type, this, x, y);
        if (enemy) {
          enemy.setActive(false);
          enemy.setVisible(false);
        }
        return enemy!;
      },
      (enemy: Enemy) => {
        enemy.reset();
      },
      20, // initial size
      100 // max size
    );

    // Collectible pool
    this.collectiblePool = new ObjectPool<Collectible>(
      (texture: string, type: CollectibleEnum, value: number, x: number, y: number) => {
        const collectible = new Collectible(this, x, y, texture, type, value);
        return collectible;
      },
      (collectible: Collectible) => {
        collectible.reset();
      },
      10, // initial size
      50 // max size
    );

    // Pre-populate projectile pool
    for (let i = 0; i < 20; i++) {
      const projectile = this.matter.add.circle(0, 0, 8, { isSensor: true });
      projectile.collisionFilter = { category: COLLISION_CATEGORY_ATTACK, mask: COLLISION_CATEGORY_PLAYER, group: 0 };
      this.matter.world.remove(projectile); // Remove from world initially
      this.projectilePool.push(projectile);
    }
  }

  public getProjectile(x: number, y: number, mask: number): MatterJS.BodyType | null {
    let projectile = this.projectilePool.pop();
    if (!projectile) {
      projectile = this.matter.add.circle(x, y, 8, { isSensor: true });
      projectile.collisionFilter = { category: COLLISION_CATEGORY_ATTACK, mask: mask, group: 0 };
    } else {
      // Reset position
      projectile.position.x = x;
      projectile.position.y = y;
      projectile.velocity.x = 0;
      projectile.velocity.y = 0;
      projectile.collisionFilter = { category: COLLISION_CATEGORY_ATTACK, mask: mask, group: 0 };
      this.matter.world.add(projectile); // Add back to world
    }
    return projectile;
  }

  public releaseProjectile(projectile: MatterJS.BodyType): void {
    this.matter.world.remove(projectile);
    if (this.projectilePool.length < 50) { // Max pool size
      this.projectilePool.push(projectile);
    }
  }

  private setupNetworkHandlers(): void {
    if (!this.networkManager) return;

    this.networkManager.onRoomJoined((data) => {
      console.log('Joined room:', data.roomId);
      this.player.id = data.playerId;
      // Start input loop
      this.networkManager!.startInputLoop();
    });

    this.networkManager.onStateUpdate((data) => {
      // State updates will be handled in update()
    });

    this.networkManager.onPlayerJoined((data) => {
      console.log('Player joined:', data.playerId);
    });

    this.networkManager.onPlayerLeft((data) => {
      console.log('Player left:', data.playerId);
    });
  }

  private createHealthBar(): void {
    const barWidth = 200;
    const barHeight = 20;
    const barX = 10;
    const barY = GAME_HEIGHT - 30;

    // Background
    this.healthBarBackground = this.add.graphics();
    this.healthBarBackground.fillStyle(0xff0000);
    this.healthBarBackground.fillRect(barX, barY, barWidth, barHeight);
    this.uiContainer.add(this.healthBarBackground);

    // Fill
    this.currentHealthBarWidth = barWidth * (this.player.health / this.player.maxHealth);
    this.healthBarFill = this.add.graphics();
    this.healthBarFill.fillStyle(0x00ff00);
    this.healthBarFill.fillRect(barX, barY, this.currentHealthBarWidth, barHeight);
    this.uiContainer.add(this.healthBarFill);
  }

  private updateHealthBar(): void {
    const barWidth = 200;
    const barHeight = 20;
    const barX = 10;
    const barY = GAME_HEIGHT - 30;
    const targetWidth = barWidth * (this.player.health / this.player.maxHealth);

    if (this.currentHealthBarWidth !== targetWidth) {
      this.tweens.add({
        targets: { width: this.currentHealthBarWidth },
        width: targetWidth,
        duration: 300,
        ease: 'Power2',
        onUpdate: (tween) => {
          this.currentHealthBarWidth = tween.getValue() as number;
          this.healthBarFill.clear();
          this.healthBarFill.fillStyle(0x00ff00);
          this.healthBarFill.fillRect(barX, barY, this.currentHealthBarWidth, barHeight);
        }
      });
    }
  }

  private setupCollisionListeners(): void {
    this.matter.world.on('collisionstart', (event: any) => {
      event.pairs.forEach((pair: any) => {
        const { bodyA, bodyB } = pair;

        // Player vs Enemy collision
        if ((bodyA.gameObject === this.player && bodyB.collisionFilter.category === COLLISION_CATEGORY_OBSTACLE) ||
            (bodyB.gameObject === this.player && bodyA.collisionFilter.category === COLLISION_CATEGORY_OBSTACLE)) {
          // Player hit obstacle - movement already prevented by physics
        }

        // Player vs Enemy collision
        if ((bodyA.gameObject === this.player && bodyB.collisionFilter.category === COLLISION_CATEGORY_ENEMY) ||
            (bodyB.gameObject === this.player && bodyA.collisionFilter.category === COLLISION_CATEGORY_ENEMY)) {
          const enemyBody = bodyA.gameObject === this.player ? bodyB : bodyA;
          const enemy = enemyBody.gameObject as any;
          if (enemy && enemy.damage) {
            this.player.takeDamage(enemy.damage);
          }
        }

        // Player vs Collectible collision
        if ((bodyA.gameObject === this.player && bodyB.collisionFilter.category === COLLISION_CATEGORY_COLLECTIBLE) ||
            (bodyB.gameObject === this.player && bodyA.collisionFilter.category === COLLISION_CATEGORY_COLLECTIBLE)) {
          const collectibleBody = bodyA.gameObject === this.player ? bodyB : bodyA;
          const collectible = collectibleBody.gameObject as Collectible;
          if (collectible && typeof collectible.collect === 'function') {
            collectible.collect(this.player);
            // Release back to pool
            this.collectiblePool.release(collectible);
          }
        }
      });
    });
  }

  update(delta: number) {
    if (this.mode === 'multi' && this.networkManager) {
      // Multiplayer mode
      this.updateMultiplayer(delta);
    } else {
      // Single player mode
      this.updateSinglePlayer(delta);
    }
  }

  private updateSinglePlayer(delta: number) {
    // Check for player death
    if (this.player.state === PlayerStateEnum.DEAD) {
      const gameOverData: GameOverSceneData = {
        score: this.player.score,
        time: this.gameTimer / 1000,
        mode: this.mode
      };
      this.scene.start('GameOver', gameOverData);
      return;
    }

    this.player.update(delta);
    if (this.spawnManager) {
      this.spawnManager.update(delta);
    }

    // Update game timer
    this.gameTimer += delta;

    // Update UI
    this.updateHealthBar();
    this.scoreText.setText(`Score: ${this.player.score}`);
    this.timerText.setText(`Time: ${(this.gameTimer / 1000).toFixed(1)}s`);
    if (this.spawnManager) {
      this.waveText.setText(`Wave: ${this.spawnManager.getCurrentWave()}`);
    }
    this.updateBuffUI();
  }

  private updateMultiplayer(delta: number) {
    if (!this.networkManager) return;

    // Send local player input to server
    const direction = this.getPlayerInputDirection();
    const action = this.getPlayerAction();
    this.networkManager.setInput(direction, action);

    // Get interpolated state from server
    const interpolatedState = this.networkManager.getInterpolatedState();
    if (interpolatedState) {
      // Update local player from server state
      const localPlayerState = interpolatedState.players.find(p => p.id === this.player.id);
      if (localPlayerState) {
        this.player.x = localPlayerState.x;
        this.player.y = localPlayerState.y;
        this.player.health = localPlayerState.health;
        this.player.maxHealth = localPlayerState.maxHealth;

        if (!localPlayerState.isAlive && this.player.state !== PlayerStateEnum.DEAD) {
          // Handle game over
          const gameOverData: GameOverSceneData = {
            score: this.player.score,
            time: this.gameTimer / 1000,
            mode: this.mode
          };
          this.scene.start('GameOver', gameOverData);
          return;
        }
      }

      // Update remote players
      this.updateRemotePlayers(delta, interpolatedState);

      // Update enemies from server state
      this.updateEnemiesFromServer(interpolatedState);

      // Update collectibles from server state
      this.updateCollectiblesFromServer(interpolatedState);

      // Update UI from server state
      this.updateUIFromServer(interpolatedState);
    }

    // Update game timer
    this.gameTimer += delta;

    // Update health bar
    this.updateHealthBar();
    this.updateBuffUI();
  }

  private getPlayerInputDirection(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    const cursors = this.input.keyboard!.createCursorKeys();
    const wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    if (cursors.left.isDown || wasd.left.isDown) x = -1;
    if (cursors.right.isDown || wasd.right.isDown) x = 1;
    if (cursors.up.isDown || wasd.up.isDown) y = -1;
    if (cursors.down.isDown || wasd.down.isDown) y = 1;

    return { x, y };
  }

  private getPlayerAction(): string | undefined {
    const attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    if (Phaser.Input.Keyboard.JustDown(attackKey)) {
      return 'attack';
    }
    return undefined;
  }

  private updateRemotePlayers(delta: number, roomState: RoomState): void {
    const localPlayerId = this.player.id;

    // Update existing remote players and create new ones
    roomState.players.forEach(playerState => {
      if (playerState.id === localPlayerId) return; // Skip local player

      let remotePlayer = this.remotePlayers.get(playerState.id);
      if (!remotePlayer) {
        // Create new remote player
        remotePlayer = new RemotePlayer(this, playerState.x, playerState.y, 'player');
        remotePlayer.setPlayerId(playerState.id);
        this.remotePlayers.set(playerState.id, remotePlayer);
      }

      // Update remote player with interpolated state
      remotePlayer.update(delta, playerState);
    });

    // Remove remote players that are no longer in the state
    const currentPlayerIds = new Set(roomState.players.map(p => p.id));
    this.remotePlayers.forEach((remotePlayer, id) => {
      if (!currentPlayerIds.has(id)) {
        remotePlayer.destroy();
        this.remotePlayers.delete(id);
      }
    });
  }

  private updateBuffUI(): void {
    // Clear existing texts
    this.buffTexts.forEach(text => text.destroy());
    this.buffTexts = [];

    const timers = this.player.getBuffTimers();
    let yOffset = 70;

    if (timers.invulnerable > 0) {
      const text = this.add.text(10, yOffset, `Shield: ${timers.invulnerable.toFixed(1)}s`, {
        fontSize: '20px',
        color: '#0000ff'
      });
      this.buffTexts.push(text);
      this.uiContainer.add(text);
      yOffset += 25;
    }

    if (timers.damageBoost > 0) {
      const text = this.add.text(10, yOffset, `Damage Boost: ${timers.damageBoost.toFixed(1)}s`, {
        fontSize: '20px',
        color: '#ff0000'
      });
      this.buffTexts.push(text);
      this.uiContainer.add(text);
      yOffset += 25;
    }

    if (timers.speedBoost > 0) {
      const text = this.add.text(10, yOffset, `Speed Boost: ${timers.speedBoost.toFixed(1)}s`, {
        fontSize: '20px',
        color: '#ffff00'
      });
      this.buffTexts.push(text);
      this.uiContainer.add(text);
    }
  }

  private updateEnemiesFromServer(roomState: RoomState): void {
    // Update existing enemies and create new ones
    roomState.enemies.forEach((enemyState: EnemyState) => {
      let enemy = this.activeEnemies.get(enemyState.id);
      if (!enemy) {
        // Create new enemy
        enemy = Enemy.createEnemy(enemyState.type.toLowerCase(), this, enemyState.x, enemyState.y);
        if (enemy) {
          enemy.id = enemyState.id;
          enemy.setPlayer(this.player);
          this.activeEnemies.set(enemyState.id, enemy);
        }
      }

      // Update enemy state
      if (enemy) {
        enemy.x = enemyState.x;
        enemy.y = enemyState.y;
        enemy.health = enemyState.health;
        enemy.maxHealth = enemyState.maxHealth;
        enemy.speed = enemyState.speed;
        enemy.damage = enemyState.damage;

        if (!enemyState.isAlive && enemy.isAlive) {
          enemy.die();
        }
      }
    });

    // Remove enemies that are no longer in the state
    const currentEnemyIds = new Set(roomState.enemies.map(e => e.id));
    this.activeEnemies.forEach((enemy, id) => {
      if (!currentEnemyIds.has(id)) {
        enemy.destroy();
        this.activeEnemies.delete(id);
      }
    });
  }

  private updateCollectiblesFromServer(roomState: RoomState): void {
    // Update existing collectibles and create new ones
    roomState.collectibles.forEach((collectibleState: CollectibleType) => {
      let collectible = this.activeCollectibles.get(collectibleState.id);
      if (!collectible) {
        // Create new collectible
        const texture = this.getCollectibleTexture(collectibleState.type);
        collectible = new Collectible(this, collectibleState.x, collectibleState.y, texture, collectibleState.type, collectibleState.value);
        collectible.id = collectibleState.id;
        this.activeCollectibles.set(collectibleState.id, collectible);
      }

      // Update collectible position
      if (collectible) {
        collectible.x = collectibleState.x;
        collectible.y = collectibleState.y;
      }
    });

    // Remove collectibles that are no longer in the state
    const currentCollectibleIds = new Set(roomState.collectibles.map(c => c.id));
    this.activeCollectibles.forEach((collectible, id) => {
      if (!currentCollectibleIds.has(id)) {
        collectible.destroy();
        this.activeCollectibles.delete(id);
      }
    });
  }

  private getCollectibleTexture(type: string): string {
    switch (type) {
      case 'health': return 'health_potion';
      case 'coin': return 'coin';
      case 'shield': return 'shield';
      case 'damage_boost': return 'damage_boost';
      case 'speed_boost': return 'speed_boost';
      default: return 'collectible';
    }
  }

  private updateUIFromServer(roomState: RoomState): void {
    this.waveText.setText(`Wave: ${roomState.wave}`);
    this.playerCountText.setText(`Players: ${roomState.players.length}`);

    // Handle room state UI
    if (roomState.state === GameState.WAITING) {
      this.waitingText.setText('Waiting for more players...');
    } else if (roomState.state === GameState.STARTING) {
      this.waitingText.setText('Game Starting...');
    } else if (roomState.state === GameState.PLAYING) {
      this.waitingText.setText('');
    } else if (roomState.state === GameState.FINISHED) {
      this.waitingText.setText('Game Finished');
      // Could transition to game over scene
    }
    // Score would need to be in roomState or playerState
    // For now, keep local score
  }

  private startBackgroundMusic(): void {
    if (this.sound.get('background_music')) {
      const music = this.sound.add('background_music', { loop: true, volume: 0.5 });
      music.play();
    }
  }

  private showUpgradeSelection(): void {
    // Pause the game
    this.scene.pause();

    // Generate random upgrades
    const upgrades = UpgradeScene.generateRandomUpgrades(3);

    // Show upgrade scene
    this.scene.launch('Upgrade', {
      upgrades: upgrades,
      onSelect: (upgradeType: UpgradeType) => {
        this.player.applyUpgrade(upgradeType);
        this.updateUpgradeUI();
        // Resume the next wave
        if (this.spawnManager) {
          this.time.delayedCall(1000, () => { // Small delay for scene transition
            this.spawnManager!.startWave();
          });
        }
      }
    });
  }

  private updateUpgradeUI(): void {
    // Clear existing upgrade texts
    this.upgradeTexts.forEach(text => text.destroy());
    this.upgradeTexts = [];

    const upgrades = this.player.getUpgrades();
    let yOffset = GAME_HEIGHT - 100;

    // Damage upgrade
    if (upgrades.damageLevel > 0) {
      const text = this.add.text(10, yOffset, `Damage: ${upgrades.damageLevel}`, {
        fontSize: '18px',
        color: '#ff4444'
      });
      this.upgradeTexts.push(text);
      this.uiContainer.add(text);
      yOffset += 25;
    }

    // Speed upgrade
    if (upgrades.speedLevel > 0) {
      const text = this.add.text(10, yOffset, `Speed: ${upgrades.speedLevel}`, {
        fontSize: '18px',
        color: '#44ff44'
      });
      this.upgradeTexts.push(text);
      this.uiContainer.add(text);
      yOffset += 25;
    }

    // Health upgrade
    if (upgrades.healthLevel > 0) {
      const text = this.add.text(10, yOffset, `Health: ${upgrades.healthLevel}`, {
        fontSize: '18px',
        color: '#4444ff'
      });
      this.upgradeTexts.push(text);
      this.uiContainer.add(text);
    }
  }

  destroy() {
    // Remove collision listeners
    this.matter.world.off('collisionstart');

    // Destroy player
    if (this.player) {
      this.player.destroy();
    }

    // Destroy remote players
    this.remotePlayers.forEach(remotePlayer => remotePlayer.destroy());
    this.remotePlayers.clear();

    // Destroy active enemies (for multiplayer)
    this.activeEnemies.forEach((enemy, id) => {
      enemy.destroy();
      this.enemyPool.release(enemy);
    });
    this.activeEnemies.clear();

    // Destroy active collectibles (for multiplayer)
    this.activeCollectibles.forEach((collectible, id) => {
      collectible.destroy();
      this.collectiblePool.release(collectible);
    });
    this.activeCollectibles.clear();

    // Disconnect network manager
    if (this.networkManager) {
      this.networkManager.disconnect();
    }

    // Destroy active enemies from spawn manager (for single player)
    if (this.spawnManager) {
      // Access private activeEnemies - this is a bit hacky, but necessary for cleanup
      const activeEnemies = (this.spawnManager as any).activeEnemies;
      if (activeEnemies) {
        activeEnemies.forEach((enemy: any) => {
          enemy.destroy();
          this.enemyPool.release(enemy); // Release back to pool
        });
      }
    }

    // Destroy UI elements
    if (this.uiContainer) {
      this.uiContainer.destroy();
    }

    // Stop background music
    const music = this.sound.get('background_music');
    if (music && music.isPlaying) {
      music.stop();
    }
  }
}