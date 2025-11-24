import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLLISION_CATEGORY_OBSTACLE, COLLISION_CATEGORY_ENEMY, COLLISION_CATEGORY_COLLECTIBLE, COLLISION_CATEGORY_ATTACK, COLLISION_CATEGORY_PLAYER } from '../../shared/config/constants';
import { Player } from '../entities/Player';
import { RemotePlayer } from '../entities/RemotePlayer';
import { Enemy } from '../entities/Enemy';
import { Collectible } from '../entities/Collectible';
import { SpawnManager } from '../systems/SpawnManager';
import { ObjectPool } from '../systems/ObjectPool';
import { NetworkManager } from '../network/NetworkManager';
import { UpgradeScene } from './UpgradeScene';
import { GameOverSceneData, PlayerStateEnum, UpgradeType, CollectibleType as CollectibleEnum, GameStateData, PlayerData, GameState, MessageType, PlayerState, EnemyData, CollectibleData } from '../../shared/types';

export class GameScene extends Phaser.Scene {
    private mode: 'single' | 'multi' = 'single';
    private player!: Player;
    private networkManager?: NetworkManager;
    private remotePlayers: Map<string, RemotePlayer> = new Map();
    private remoteEnemies: Map<string, Enemy> = new Map();
    private remoteCollectibles: Map<string, Collectible> = new Map();
    private spawnManager?: SpawnManager; // Only used in single player
    private waveText?: Phaser.GameObjects.Text;
    private buffTexts: Phaser.GameObjects.Text[] = [];
    private upgradeTexts: Phaser.GameObjects.Text[] = [];
    private gameTimer: number = 0;
    private uiContainer!: Phaser.GameObjects.Container;
    private healthBarBackground!: Phaser.GameObjects.Graphics;
    private healthBarFill!: Phaser.GameObjects.Graphics;
    private currentHealthBarWidth: number = 200;
    private scoreText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;
    private playerCountText!: Phaser.GameObjects.Text;
    private waitingText!: Phaser.GameObjects.Text;
    private deathAlertText!: Phaser.GameObjects.Text;

    // Object pools for single-player performance optimization
    private enemyPool!: ObjectPool<Enemy>;
    private collectiblePool!: ObjectPool<Collectible>;
    private projectilePool: MatterJS.BodyType[] = []; // Pool for projectile bodies

  constructor() {
    super({ key: 'Game' });
  }

  init(data: { mode?: 'single' | 'multi' }) {
    this.mode = data.mode || 'single';
  }

  create() {
    // Set up matter world bounds
    this.matter.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Create static boundary bodies
    this.createBoundaries();

    // Set up collision event listeners
    this.setupCollisionListeners();

    // Initialize object pools (needed for both modes)
    this.initializePools();

    // Create UI container (needed before mode-specific initialization)
    this.uiContainer = this.add.container(0, 0);

    // Create player at center
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 'player_idle');

    if (this.mode === 'multi') {
      // Initialize network manager for multiplayer
      this.networkManager = new NetworkManager('ws://localhost:8080');
      this.networkManager.connect().then(() => {
        console.log('Connected to multiplayer server');
        this.setupNetworkHandlers();
        this.networkManager!.joinGame();
      }).catch((error) => {
        console.error('Failed to connect to server:', error);
        // Fallback to single player
        this.mode = 'single';
        this.initializeSinglePlayer();
      });
    } else {
      this.initializeSinglePlayer();
    }

    // Create waiting text (for multiplayer)
    this.waitingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.uiContainer.add(this.waitingText);

    // Create player count text (for multiplayer)
    this.playerCountText = this.add.text(10, 70, 'Players: 1', {
      fontSize: '24px',
      color: '#ffffff'
    });
    this.uiContainer.add(this.playerCountText);

    // Create death alert text (for multiplayer)
    this.deathAlertText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, '', {
      fontSize: '32px',
      color: '#ff0000'
    }).setOrigin(0.5);
    this.deathAlertText.setVisible(false);
    this.uiContainer.add(this.deathAlertText);

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

    // Add mode text
    const modeText = this.add.text(10, 10, `Mode: ${this.mode}`, {
      fontSize: '24px',
      color: '#ffffff'
    });
    this.uiContainer.add(modeText);

    // Start background music
    this.startBackgroundMusic();
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

        // Player vs obstacle collision (walls)
        if ((bodyA.gameObject === this.player && bodyB.collisionFilter.category === COLLISION_CATEGORY_OBSTACLE) ||
            (bodyB.gameObject === this.player && bodyA.collisionFilter.category === COLLISION_CATEGORY_OBSTACLE)) {
          // Player hit obstacle - movement already prevented by physics
        }

        // Player vs Enemy collision (single-player only)
        if ((bodyA.gameObject === this.player && bodyB.collisionFilter.category === COLLISION_CATEGORY_ENEMY) ||
            (bodyB.gameObject === this.player && bodyA.collisionFilter.category === COLLISION_CATEGORY_ENEMY)) {
          const enemyBody = bodyA.gameObject === this.player ? bodyB : bodyA;
          const enemy = enemyBody.gameObject as any;
          if (enemy && enemy.damage) {
            this.player.takeDamage(enemy.damage);
          }
        }

        // Player vs Collectible collision (single-player only)
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
      projectile.collisionFilter = { category: COLLISION_CATEGORY_ATTACK, mask: COLLISION_CATEGORY_ENEMY, group: 0 };
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

  private initializeSinglePlayer() {
    // Create spawn manager with level up callback
    this.spawnManager = new SpawnManager(this, this.player, this.enemyPool, () => this.showUpgradeSelection());
    // Start first wave
    this.spawnManager.startWave();

    // Add wave text for single player
    this.waveText = this.add.text(10, 40, `Wave: 1`, {
      fontSize: '24px',
      color: '#ffffff'
    });
    this.uiContainer.add(this.waveText);

    // Initialize upgrade UI
    this.updateUpgradeUI();
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

  private startBackgroundMusic(): void {
    if (this.sound.get('background_music')) {
      const music = this.sound.add('background_music', { loop: true, volume: 0.5 });
      music.play();
    }
  }

  private updateSinglePlayer(delta: number) {
    // Check for player death
    if (this.player.state === PlayerStateEnum.DEAD) {
      const gameOverData: GameOverSceneData = {
        score: this.player.score,
        time: this.gameTimer / 1000
      };
      this.scene.start('GameOver', gameOverData);
      return;
    }

    // Update player (handles movement and animation)
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
    if (this.waveText && this.spawnManager) {
      this.waveText.setText(`Wave: ${this.spawnManager.getCurrentWave()}`);
    }
    this.updateBuffUI();
  }

  private updateMultiplayer(delta: number) {
    if (!this.networkManager) return;

    // Send player input to server (server-authoritative movement)
    const direction = this.getPlayerInputDirection();
    const action = this.getPlayerAction();

    // Update player's facing direction based on input for animation
    if (direction.x !== 0 || direction.y !== 0) {
      this.player.facingDirection = direction;
    }

    this.networkManager.sendInput(direction, action === 'attack' ? 'attack' : undefined);

    // Update game timer
    this.gameTimer += delta;

    // Update UI
    this.updateHealthBar();
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
    if (attackKey.isDown) {
      return 'attack';
    }
    return undefined;
  }

  private setupNetworkHandlers() {
    if (!this.networkManager) return;

    this.networkManager.onYouJoined((payload) => {
      console.log('You joined the game with ID:', payload.playerId);
    });

    this.networkManager.onGameStateUpdate((payload) => {
      this.handleGameStateUpdate(payload.gameState);
    });

    this.networkManager.onPlayerJoined((payload) => {
      console.log('Player joined:', payload.player.id);
    });

    this.networkManager.onPlayerLeft((payload) => {
      console.log('Player left:', payload.playerId);
      this.remotePlayers.delete(payload.playerId);
    });

    this.networkManager.onGameStart((payload) => {
      console.log('Game started');
      this.waitingText.setText('');
    });

    this.networkManager.onGameEnd((payload) => {
      console.log('Game ended');
      // Handle game end - show winner
      const winner = payload.winner;
      if (winner) {
        this.waitingText.setText(`Game Over! Winner: Player ${winner}`);
      } else {
        this.waitingText.setText('Game Over!');
      }
      // Return to menu after a delay
      this.time.delayedCall(3000, () => {
        this.scene.start('MainMenu');
      });
    });

    this.networkManager.onPlayerDied((payload) => {
      console.log('Player died:', payload.playerId);
      // Show death alert
      this.deathAlertText.setText(`${payload.playerId} is dead!`);
      this.deathAlertText.setVisible(true);
      // Hide after 3 seconds
      this.time.delayedCall(3000, () => {
        this.deathAlertText.setVisible(false);
      });
    });
  }

  private handleGameStateUpdate(gameState: GameStateData) {
    if (!this.player || !this.player.body) {
      console.warn('Player or body not ready');
      return;
    }

    // Update local player from server state
    const localPlayerData = gameState.players.find(p => p.id === this.networkManager!.getPlayerId());
    if (localPlayerData) {
      // Store previous position for animation determination
      const prevX = this.player.x;
      const prevY = this.player.y;

      // Update position directly (server-authoritative)
      this.player.x = localPlayerData.x;
      this.player.y = localPlayerData.y;

      this.player.health = localPlayerData.health;
      this.player.maxHealth = localPlayerData.maxHealth;
      // Sync facing direction with server data
      this.player.facingDirection = localPlayerData.facingDirection;
      this.player.score = localPlayerData.score;
      this.player.setLastAttackTime(localPlayerData.lastAttackTime);

      // Update animation based on current state
      let dir = 'down'; // default
      if (localPlayerData.facingDirection.x > 0) {
        dir = 'right';
      } else if (localPlayerData.facingDirection.x < 0) {
        dir = 'left';
      } else if (localPlayerData.facingDirection.y > 0) {
        dir = 'down';
      } else if (localPlayerData.facingDirection.y < 0) {
        dir = 'up';
      }

      if (localPlayerData.currentState === 'attacking') {
        this.player.state = PlayerStateEnum.ATTACKING;
        this.player.anims.play(`player-attack_${dir}`, true);
      } else if (localPlayerData.currentState === 'walking') {
        this.player.state = PlayerStateEnum.WALKING;
        this.player.anims.play(`player-walk_${dir}`, true);
      } else {
        this.player.state = PlayerStateEnum.IDLE;
        this.player.anims.play(`player-idle_${dir}`, true);
      }

      // Handle death
      if (localPlayerData.state === PlayerState.DEAD && this.player.health > 0) {
        this.player.health = 0; // Ensure health is 0
        this.player.state = PlayerStateEnum.DEAD;
        this.player.anims.play('player-death');
        this.player.setActive(false);
        this.player.setVisible(false);
      }

      // Handle revival
      if (localPlayerData.state === PlayerState.ALIVE && this.player.health <= 0) {
        this.player.health = localPlayerData.health;
        this.player.state = PlayerStateEnum.IDLE;
        this.player.setActive(true);
        this.player.setVisible(true);
      }
    }

    // Update remote players
    this.updateRemotePlayers(gameState.players);

    // Update remote enemies
    this.updateRemoteEnemies(gameState.enemies);

    // Update remote collectibles
    this.updateRemoteCollectibles(gameState.collectibles);

    // Update UI
    this.updateUIFromServer(gameState);
  }

  private updateRemotePlayers(players: PlayerData[]) {
    const localPlayerId = this.networkManager!.getPlayerId();

    // Update existing remote players
    players.forEach(playerData => {
      if (playerData.id === localPlayerId) return;

      let remotePlayer = this.remotePlayers.get(playerData.id);
      if (!remotePlayer) {
        remotePlayer = new RemotePlayer(this, playerData.x, playerData.y, 'player_idle');
        remotePlayer.setPlayerId(playerData.id);
        this.remotePlayers.set(playerData.id, remotePlayer);
      }

      if (remotePlayer) {
        if (playerData.state === PlayerState.DEAD) {
          remotePlayer.setActive(false);
          remotePlayer.setVisible(false);
        } else {
          remotePlayer.setActive(true);
          remotePlayer.setVisible(true);
          if (remotePlayer.body) {
            remotePlayer.update(16.67, playerData); // Assume 60 FPS delta
          }
        }
      }
    });

    // Remove disconnected players
    const currentPlayerIds = new Set(players.map(p => p.id));
    this.remotePlayers.forEach((remotePlayer, id) => {
      if (!currentPlayerIds.has(id)) {
        remotePlayer.destroy();
        this.remotePlayers.delete(id);
      }
    });
  }

  private updateRemoteEnemies(enemies: EnemyData[]) {
    // Update existing remote enemies
    enemies.forEach(enemyData => {
      let remoteEnemy = this.remoteEnemies.get(enemyData.id);
      if (!remoteEnemy) {
        const newEnemy = Enemy.createEnemy(enemyData.type, this, enemyData.x, enemyData.y);
        if (newEnemy) {
          this.remoteEnemies.set(enemyData.id, newEnemy);
          remoteEnemy = newEnemy;
        }
      }

      if (remoteEnemy) {
        remoteEnemy.x = enemyData.x;
        remoteEnemy.y = enemyData.y;
        remoteEnemy.health = enemyData.health;
        if (!enemyData.isAlive && remoteEnemy.active) {
          remoteEnemy.setActive(false);
          remoteEnemy.setVisible(false);
        } else if (enemyData.isAlive) {
          // Play walk animation based on facing direction
          let dir = 'down';
          if (Math.abs(enemyData.facingDirection.x) > Math.abs(enemyData.facingDirection.y)) {
            dir = enemyData.facingDirection.x > 0 ? 'right' : 'left';
          } else {
            dir = enemyData.facingDirection.y > 0 ? 'down' : 'up';
          }
          remoteEnemy.anims.play(`${enemyData.type}_walk_${dir}`, true);
        }
      }
    });

    // Remove dead enemies
    const currentEnemyIds = new Set(enemies.map(e => e.id));
    this.remoteEnemies.forEach((remoteEnemy, id) => {
      if (!currentEnemyIds.has(id)) {
        remoteEnemy.destroy();
        this.remoteEnemies.delete(id);
        this.enemyPool.release(remoteEnemy);
      }
    });
  }

  private updateRemoteCollectibles(collectibles: CollectibleData[]) {
    // Update existing remote collectibles
    collectibles.forEach(collectibleData => {
      let remoteCollectible = this.remoteCollectibles.get(collectibleData.id);
      if (!remoteCollectible) {
        remoteCollectible = new Collectible(this, collectibleData.x, collectibleData.y, 'coin', collectibleData.type, collectibleData.value);
        this.remoteCollectibles.set(collectibleData.id, remoteCollectible);
      }

      if (remoteCollectible) {
        remoteCollectible.x = collectibleData.x;
        remoteCollectible.y = collectibleData.y;
      }
    });

    // Remove collected collectibles
    const currentCollectibleIds = new Set(collectibles.map(c => c.id));
    this.remoteCollectibles.forEach((remoteCollectible, id) => {
      if (!currentCollectibleIds.has(id)) {
        remoteCollectible.destroy();
        this.remoteCollectibles.delete(id);
        this.collectiblePool.release(remoteCollectible);
      }
    });
  }

  private updateUIFromServer(gameState: GameStateData) {
    this.playerCountText.setText(`Players: ${gameState.players.length}`);

    // Update wave text
    if (!this.waveText) {
      this.waveText = this.add.text(10, 40, `Wave: ${gameState.wave}`, {
        fontSize: '24px',
        color: '#ffffff'
      });
      this.uiContainer.add(this.waveText);
    } else {
      this.waveText.setText(`Wave: ${gameState.wave}`);
    }

    if (gameState.state === GameState.WAITING) {
      this.waitingText.setText('Waiting for another player...');
    } else if (gameState.state === GameState.PLAYING) {
      this.waitingText.setText('');
    } else if (gameState.state === GameState.FINISHED) {
      this.waitingText.setText('Game Finished');
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

    // Destroy remote enemies
    this.remoteEnemies.forEach(remoteEnemy => {
      remoteEnemy.destroy();
      this.enemyPool.release(remoteEnemy);
    });
    this.remoteEnemies.clear();

    // Destroy remote collectibles
    this.remoteCollectibles.forEach(remoteCollectible => {
      remoteCollectible.destroy();
      this.collectiblePool.release(remoteCollectible);
    });
    this.remoteCollectibles.clear();

    // Destroy single-player enemies
    if (this.spawnManager) {
      const activeEnemies = (this.spawnManager as any).activeEnemies;
      if (activeEnemies) {
        activeEnemies.forEach((enemy: any) => {
          enemy.destroy();
          this.enemyPool.release(enemy);
        });
      }
    }

    // Disconnect network
    if (this.networkManager) {
      this.networkManager.disconnect();
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