import { GameMessage, MessageType, PlayerData, GameState, GameStateData, PlayerInputPayload, JoinGamePayload, PlayerState, EnemyData, CollectibleData, EnemyType, CollectibleType } from '../shared/types/index';
import { PLAYER_HEALTH, PLAYER_MAX_HEALTH, PLAYER_SPEED, PLAYER_DAMAGE, GAME_WIDTH, GAME_HEIGHT, UPDATE_RATE, ATTACK_COOLDOWN } from '../shared/config/constants';
import enemiesConfig from '../shared/config/enemies.json';
import { WebSocketServer } from './WebSocketServer';

/**
 * Server-side game room that manages multiplayer game state, players, enemies, and collectibles.
 * Handles game logic, physics updates, and synchronization for all connected players.
 */
export class GameRoom {
  private players: Map<string, PlayerData> = new Map();
  private enemies: Map<string, EnemyData> = new Map();
  private collectibles: Map<string, CollectibleData> = new Map();
  private gameState: GameState = GameState.WAITING;
  private gameTime: number = 0;
  private deltaTime: number = 1 / UPDATE_RATE;
  private maxPlayers: number = 2; // Only 2 players for simple multiplayer
  private wsServer: WebSocketServer;
  private enemySpawnTimer: number = 0;
  private nextEnemyId: number = 0;
  private nextCollectibleId: number = 0;
  private currentWave: number = 1;
  private waveCleared: boolean = false;

  constructor(wsServer: WebSocketServer) {
    this.wsServer = wsServer;
  }

  /**
   * Checks if a new player can join the game room.
   * @returns True if the room has space and is in waiting state, false otherwise
   */
  canJoin(): boolean {
    return this.players.size < this.maxPlayers && this.gameState === GameState.WAITING;
  }

  /**
   * Adds a new player to the game room.
   * @param playerId - Unique identifier for the player
   * @param playerName - Optional display name for the player
   * @returns True if player was successfully added, false otherwise
   */
  addPlayer(playerId: string, playerName?: string): boolean {
    if (!this.canJoin()) return false;

    // Position players on opposite sides of the arena
    const isFirstPlayer = this.players.size === 0;
    const player: PlayerData = {
      id: playerId,
      x: isFirstPlayer ? GAME_WIDTH * 0.25 : GAME_WIDTH * 0.75,
      y: GAME_HEIGHT / 2,
      health: PLAYER_HEALTH,
      maxHealth: PLAYER_MAX_HEALTH,
      speed: PLAYER_SPEED,
      damage: PLAYER_DAMAGE,
      state: PlayerState.ALIVE,
      direction: { x: 0, y: 0 }, // Current movement direction
      facingDirection: { x: 1, y: 0 }, // Facing direction for animation
      lastAttackTime: 0,
      score: 0,
      isAttacking: false,
      attackEndTime: 0,
      currentState: 'idle',
      invulnerableTimer: 0,
      damageBoostTimer: 0,
      speedBoostTimer: 0
    };
    this.players.set(playerId, player);

    // Notify the joining player specifically
    this.wsServer.sendToPlayer(playerId, {
      type: MessageType.YOU_JOINED,
      data: { playerId, player }
    });

    // Notify other players that someone joined
    this.wsServer.notifyPlayerJoined(playerId, player);

    // Start game if we have 2 players
    if (this.players.size >= 2 && this.gameState === GameState.WAITING) {
      this.startGame();
    }

    return true;
  }

  /**
   * Removes a player from the game room.
   * @param playerId - The ID of the player to remove
   */
  removePlayer(playerId: string) {
    this.players.delete(playerId);
    this.wsServer.notifyPlayerLeft(playerId);

    // End game if a player disconnects
    // if (this.gameState === GameState.PLAYING) {
    //   this.endGame();
    // }
  }

  /**
   * Processes incoming messages from players.
   * @param playerId - The ID of the player sending the message
   * @param message - The game message to process
   */
  handleMessage(playerId: string, message: GameMessage) {
    switch (message.type) {
      case MessageType.JOIN_GAME:
        this.handleJoinGame(playerId, message.data as JoinGamePayload);
        break;
      case MessageType.LEAVE_GAME:
        this.removePlayer(playerId);
        break;
      case MessageType.PLAYER_INPUT:
        this.handlePlayerInput(playerId, message.data as PlayerInputPayload);
        break;
    }
  }

  private handleJoinGame(playerId: string, data: JoinGamePayload) {
    this.addPlayer(playerId, data.playerName);
  }

  private handlePlayerInput(playerId: string, input: PlayerInputPayload) {
    const player = this.players.get(playerId);
    if (!player || player.state === PlayerState.DEAD) return;

    // Store current direction for animation state determination
    player.direction = input.direction;

    // Server-authoritative movement prevents speed hacks and maintains consistency
    // Client sends normalized direction vectors (-1 to 1), server applies actual movement
    if (input.direction) {
      // Only update facing direction when there's actual movement to prevent
      // flickering during diagonal inputs that get normalized
      if (input.direction.x !== 0 || input.direction.y !== 0) {
        player.facingDirection = input.direction;
      }

      // Apply movement without delta time since input is processed per frame
      // This ensures consistent movement regardless of server tick rate
      player.x += input.direction.x * player.speed;
      player.y += input.direction.y * player.speed;

      // Boundary checking prevents players from escaping the arena
      // Math.max/Math.min is more performant than Phaser.Math.Clamp for simple bounds
      player.x = Math.max(0, Math.min(GAME_WIDTH, player.x));
      player.y = Math.max(0, Math.min(GAME_HEIGHT, player.y));
    }

    // Determine current state
    if (input.action === 'attack') {
      const now = Date.now();
      if (now - player.lastAttackTime > ATTACK_COOLDOWN) {
        player.lastAttackTime = now;
        this.handlePlayerAttack(player);
        player.currentState = 'attacking';
      }
    }

    // Only update state if not currently attacking
    if (!player.isAttacking) {
      if (input.direction.x !== 0 || input.direction.y !== 0) {
        player.currentState = 'walking';
      } else {
        player.currentState = 'idle';
      }
    }
  }

  private handlePlayerAttack(player: PlayerData) {
    const now = Date.now();
    player.isAttacking = true;
    player.attackEndTime = now + 600; // 600ms attack duration to match animation

    // Check for hits on other players
    for (const [otherPlayerId, otherPlayer] of this.players) {
      if (otherPlayerId === player.id || otherPlayer.state === PlayerState.DEAD) continue;

      const dx = otherPlayer.x - player.x;
      const dy = otherPlayer.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // if (distance < 50) { // attack range
      //   otherPlayer.health -= player.damage;
      //   if (otherPlayer.health <= 0) {
      //     otherPlayer.state = PlayerState.DEAD;
      //     // Game ends when a player dies
      //     this.endGame();
      //   }
      // }
    }

    // Check for hits on enemies
    for (const [enemyId, enemy] of this.enemies) {
      if (!enemy.isAlive) continue;

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 30) { // attack range
        const effectiveDamage = player.damageBoostTimer > 0 ? player.damage * 1.5 : player.damage;
        enemy.health -= effectiveDamage;
        if (enemy.health <= 0) {
          enemy.isAlive = false;
          // Award score based on enemy type
          const scoreReward = enemy.type === EnemyType.SLIME ? 10 : enemy.type === EnemyType.GOBLIN ? 20 : 10;
          player.score += scoreReward;
          // Spawn random collectible
          this.spawnRandomCollectible(enemy.x, enemy.y);
          // Remove enemy after a delay
          setTimeout(() => {
            this.enemies.delete(enemyId);
          }, 1000);
        }
      }
    }
  }

  private startGame() {
    this.gameState = GameState.PLAYING;
    this.gameTime = 0;
    this.currentWave = 1;
    this.startWave();
    this.wsServer.notifyGameStart();
  }

  private endGame() {
    this.gameState = GameState.FINISHED;
    this.wsServer.notifyGameEnd();
  }

  /**
   * Updates the game state for the current frame.
   * Handles player updates, enemy AI, collectible collection, and wave progression.
   */
  update() {
    if (this.gameState !== GameState.PLAYING) return;

    this.gameTime += this.deltaTime;
    this.updatePlayers();
    this.updateEnemies();
    this.updateCollectibles();

    // Wave progression creates increasing difficulty and pacing
    // Only advance when all enemies are defeated (not just when waveCleared flag is set)
    if (!this.waveCleared && this.enemies.size === 0) {
      this.waveCleared = true; // Prevent multiple triggers
      this.currentWave++;

      // Delay next wave to give players breathing room and time to collect items
      // 2 seconds allows for collectible gathering without feeling rushed
      setTimeout(() => {
        this.startWave();
      }, 2000);
    }
  }

  private updatePlayers() {
    const now = Date.now();
    for (const [playerId, player] of this.players) {
      if (player.isAttacking && now > player.attackEndTime) {
        player.isAttacking = false;
        // Reset to walking or idle based on current direction
        if (player.direction.x !== 0 || player.direction.y !== 0) {
          player.currentState = 'walking';
        } else {
          player.currentState = 'idle';
        }
      }

      // Update buff timers using delta time for frame-rate independent duration
      // Convert deltaTime (seconds) to milliseconds for timer consistency
      if (player.invulnerableTimer > 0) {
        player.invulnerableTimer -= this.deltaTime * 1000;
        if (player.invulnerableTimer <= 0) {
          player.invulnerableTimer = 0; // Prevent negative values
        }
      }
      if (player.damageBoostTimer > 0) {
        player.damageBoostTimer -= this.deltaTime * 1000;
        if (player.damageBoostTimer <= 0) {
          player.damageBoostTimer = 0;
        }
      }
      if (player.speedBoostTimer > 0) {
        player.speedBoostTimer -= this.deltaTime * 1000;
        if (player.speedBoostTimer <= 0) {
          player.speedBoostTimer = 0;
        }
      }
    }
  }

  private spawnEnemy() {
    const enemyTypes = ['slime', 'goblin'];
    const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)] as EnemyType;
    const config = enemiesConfig.find(e => e.id === randomType);
    if (!config) return;

    // Scale enemy stats based on wave for progressive difficulty
    // 5% increase per wave provides noticeable but not overwhelming scaling
    const waveMultiplier = 1 + (this.currentWave - 1) * 0.05;
    const health = Math.floor(config.health * waveMultiplier);
    const damage = Math.floor(config.damage * waveMultiplier);

    // Convert config speed (likely 0-1 range) to pixels per second with wave scaling
    // Cap at 2x base speed to prevent enemies from becoming too fast to dodge
    const speed = config.speed * 100 * Math.min(1 + (this.currentWave - 1) * 0.05, 2.0);

    const enemy: EnemyData = {
      id: `enemy_${this.nextEnemyId++}`,
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      health: health,
      maxHealth: health,
      speed: speed,
      damage: damage,
      type: randomType,
      isAlive: true,
      isAttacking: false,
      facingDirection: { x: 1, y: 0 }
    };

    this.enemies.set(enemy.id, enemy);
  }

  private startWave() {
    this.waveCleared = false;

    // Calculate enemy count with gradual increase for sustainable difficulty curve
    const baseEnemies = 3; // Starting enemies per wave
    // Add 1 enemy every 2 waves (wave 1: 3, wave 2: 3, wave 3: 4, wave 4: 4, etc.)
    // This creates manageable difficulty progression without overwhelming spikes
    const waveEnemies = baseEnemies + Math.floor((this.currentWave - 1) / 2);

    for (let i = 0; i < waveEnemies; i++) {
      this.spawnEnemy();
    }
  }

  private updateEnemies() {
    const now = Date.now();

    for (const [enemyId, enemy] of this.enemies) {
      if (!enemy.isAlive) continue;

      // Reset attack state if attack duration has passed
      if (enemy.isAttacking && (enemy as any).attackEndTime && now > (enemy as any).attackEndTime) {
        enemy.isAttacking = false;
      }

      // Find nearest player
      let nearestPlayer: PlayerData | null = null;
      let minDistance = Infinity;

      for (const player of this.players.values()) {
        if (player.state === PlayerState.DEAD) continue;
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPlayer = player;
        }
      }

      if (nearestPlayer) {
        // Calculate direction to player for both movement and facing
        const dx = nearestPlayer.x - enemy.x;
        const dy = nearestPlayer.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize direction vector for consistent facing regardless of distance
        if (distance > 0) {
          enemy.facingDirection.x = dx / distance;
          enemy.facingDirection.y = dy / distance;
        }

        // Move towards player only when not attacking to prevent movement during attack animation
        // This creates more predictable enemy behavior and prevents attack interruption
        if (distance > 0 && !enemy.isAttacking) {
          enemy.x += (dx / distance) * enemy.speed * this.deltaTime;
          enemy.y += (dy / distance) * enemy.speed * this.deltaTime;
        }

        // Attack range check - close enough to hit but not too close to prevent getting stuck
        // 30 units provides balance between aggression and player maneuverability
        if (distance < 30 && !enemy.isAttacking) {
          enemy.isAttacking = true;
          // Attack duration matches animation length for visual consistency
          (enemy as any).attackEndTime = now + 300;

          // Respect invulnerability frames to prevent unfair damage
          if (nearestPlayer.invulnerableTimer <= 0) {
            nearestPlayer.health -= enemy.damage;
            if (nearestPlayer.health <= 0) {
              nearestPlayer.state = PlayerState.DEAD;
              // Broadcast death to all clients for immediate UI updates
              this.wsServer.notifyPlayerDied(nearestPlayer.id);

              // End game if no living players remain (handles both single and multiplayer)
              const livingPlayers = Array.from(this.players.values()).filter(p => p.state !== PlayerState.DEAD);
              if (livingPlayers.length === 0) {
                this.endGame();
              }
            }
          }
        }
      }
    }
  }

  private updateCollectibles() {
    for (const [collectibleId, collectible] of this.collectibles) {
      // Check if any player is close enough to collect
      for (const [playerId, player] of this.players) {
        if (player.state === PlayerState.DEAD) continue;

        const dx = player.x - collectible.x;
        const dy = player.y - collectible.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 30) { // collection range
          // Apply collectible effect
          this.applyCollectibleToPlayer(player, collectible);
          // Remove collectible
          this.collectibles.delete(collectibleId);
          break; // Only one player can collect it
        }
      }
    }
  }

  private applyCollectibleToPlayer(player: PlayerData, collectible: CollectibleData) {
    switch (collectible.type) {
      case CollectibleType.COIN:
        player.score += collectible.value;
        break;
      case CollectibleType.HEALTH:
        player.health = Math.min(player.maxHealth, player.health + collectible.value);
        break;
      case CollectibleType.SHIELD:
        player.invulnerableTimer = collectible.value * 1000; // Convert to milliseconds
        break;
      case CollectibleType.DAMAGE_BOOST:
        player.damageBoostTimer = collectible.value * 1000;
        break;
      case CollectibleType.SPEED_BOOST:
        player.speedBoostTimer = collectible.value * 1000;
        break;
    }
  }

  private spawnRandomCollectible(x: number, y: number) {
    // Weighted random selection favors health potions for player survivability
    // Power-ups are less common to maintain balance and excitement
    const rand = Math.random();
    let type: CollectibleType;
    let texture: string;
    let value: number;

    if (rand < 0.4) { // 40% chance - Most common for healing
      type = CollectibleType.HEALTH;
      texture = 'health_potion';
      value = 20;
    } else if (rand < 0.6) { // 20% chance - Defensive power-up
      type = CollectibleType.SHIELD;
      texture = 'shield';
      value = 5; // 5 seconds of invulnerability
    } else if (rand < 0.8) { // 20% chance - Offensive power-up
      type = CollectibleType.DAMAGE_BOOST;
      texture = 'damage_boost';
      value = 10; // 10 seconds of 1.5x damage
    } else if (rand < 0.9) { // 10% chance - Mobility power-up
      type = CollectibleType.SPEED_BOOST;
      texture = 'speed_boost';
      value = 10; // 10 seconds of 1.5x speed
    } else { // 10% chance - Score currency
      type = CollectibleType.COIN;
      texture = 'coin';
      value = 10; // Score points
    }

    this.spawnCollectible(x, y, type, value);
  }

  private spawnCollectible(x: number, y: number, type: CollectibleType, value: number = 1) {
    // Add random offset to prevent immediate collection by the player who killed the enemy
    // This creates fair gameplay by requiring players to move to collect items
    const offsetX = (Math.random() - 0.5) * 40; // +/- 20 pixels
    const offsetY = (Math.random() - 0.5) * 40;

    const collectible: CollectibleData = {
      id: `collectible_${this.nextCollectibleId++}`,
      x: x + offsetX,
      y: y + offsetY,
      type,
      value
    };
    this.collectibles.set(collectible.id, collectible);
  }

  /**
   * Gets the current complete game state for synchronization.
   * @returns The full game state including players, enemies, collectibles, and metadata
   */
  getGameState(): GameStateData {
    return {
      players: Array.from(this.players.values()),
      enemies: Array.from(this.enemies.values()),
      collectibles: Array.from(this.collectibles.values()),
      state: this.gameState,
      wave: this.currentWave,
      gameTime: this.gameTime
    };
  }

  /**
   * Gets the final scores for all players at game end.
   * @returns Array of player scores for leaderboard/ranking
   */
  getFinalScores(): { playerId: string; score: number }[] {
    return Array.from(this.players.values()).map(player => ({
      playerId: player.id,
      score: player.score
    }));
  }
}