import { GameMessage, MessageType, PlayerData, GameState, GameStateData, PlayerInputPayload, JoinGamePayload, PlayerState, EnemyData, CollectibleData, EnemyType, CollectibleType } from '../shared/types/index';
import { PLAYER_HEALTH, PLAYER_MAX_HEALTH, PLAYER_SPEED, PLAYER_DAMAGE, GAME_WIDTH, GAME_HEIGHT, UPDATE_RATE, ATTACK_COOLDOWN } from '../shared/config/constants';
import enemiesConfig from '../shared/config/enemies.json';
import { WebSocketServer } from './WebSocketServer';

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

  canJoin(): boolean {
    return this.players.size < this.maxPlayers && this.gameState === GameState.WAITING;
  }

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
    console.log(player.id, player.speed, player.direction, player.facingDirection, player.isAttacking);
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

  removePlayer(playerId: string) {
    this.players.delete(playerId);
    this.wsServer.notifyPlayerLeft(playerId);

    // End game if a player disconnects
    // if (this.gameState === GameState.PLAYING) {
    //   this.endGame();
    // }
  }

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

    // Update player direction
    player.direction = input.direction;

    // Update player direction and position
    if (input.direction) {
      // Update facing direction if there's actual input (not {0,0})
      if (input.direction.x !== 0 || input.direction.y !== 0) {
        player.facingDirection = input.direction;
      }

      // Movement is based on input direction
      player.x += input.direction.x * player.speed * this.deltaTime;
      player.y += input.direction.y * player.speed * this.deltaTime;

      // Keep player in bounds
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

      if (distance < 50) { // attack range
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

  update() {
    if (this.gameState !== GameState.PLAYING) return;

    this.gameTime += this.deltaTime;
    this.updatePlayers();
    this.updateEnemies();
    this.updateCollectibles();

    // Check for wave completion
    if (!this.waveCleared && this.enemies.size === 0) {
      this.waveCleared = true;
      this.currentWave++;
      // Start next wave after a short delay
      setTimeout(() => {
        this.startWave();
      }, 2000); // 2 second delay between waves
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

      // Update buff timers
      if (player.invulnerableTimer > 0) {
        player.invulnerableTimer -= this.deltaTime * 1000; // Convert to milliseconds
        if (player.invulnerableTimer <= 0) {
          player.invulnerableTimer = 0;
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

    // Scale enemy stats based on wave
    const waveMultiplier = 1 + (this.currentWave - 1) * 0.05; // 5% increase per wave
    const health = Math.floor(config.health * waveMultiplier);
    const damage = Math.floor(config.damage * waveMultiplier);
    const speed = config.speed * Math.min(1 + (this.currentWave - 1) * 0.05, 2.0); // Max 2x speed

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
      facingDirection: { x: 1, y: 0 }
    };

    this.enemies.set(enemy.id, enemy);
  }

  private startWave() {
    this.waveCleared = false;
    const baseEnemies = 3; // Base number of enemies
    const waveEnemies = baseEnemies + Math.floor((this.currentWave - 1) / 2); // +1 enemy every 2 waves

    for (let i = 0; i < waveEnemies; i++) {
      this.spawnEnemy();
    }
  }

  private updateEnemies() {
    for (const [enemyId, enemy] of this.enemies) {
      if (!enemy.isAlive) continue;

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
        // Update facing direction
        const dx = nearestPlayer.x - enemy.x;
        const dy = nearestPlayer.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
          enemy.facingDirection.x = dx / distance;
          enemy.facingDirection.y = dy / distance;
        }

        // Move towards player
        if (distance > 0) {
          enemy.x += (dx / distance) * enemy.speed * this.deltaTime;
          enemy.y += (dy / distance) * enemy.speed * this.deltaTime;
        }

        // Attack if close
        if (distance < 50) { // attack range
          if (nearestPlayer.invulnerableTimer <= 0) { // Only damage if not invulnerable
            nearestPlayer.health -= enemy.damage;
            if (nearestPlayer.health <= 0) {
              nearestPlayer.state = PlayerState.DEAD;
              // Notify all players that this player died
              this.wsServer.notifyPlayerDied(nearestPlayer.id);
              // Check if all players are dead
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
    } else if (rand < 0.9) {
      type = CollectibleType.SPEED_BOOST;
      texture = 'speed_boost';
      value = 10; // 10 seconds
    } else {
      type = CollectibleType.COIN;
      texture = 'coin';
      value = 10;
    }

    this.spawnCollectible(x, y, type, value);
  }

  private spawnCollectible(x: number, y: number, type: CollectibleType, value: number = 1) {
    const collectible: CollectibleData = {
      id: `collectible_${this.nextCollectibleId++}`,
      x,
      y,
      type,
      value
    };
    this.collectibles.set(collectible.id, collectible);
  }

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

  getFinalScores(): { playerId: string; score: number }[] {
    return Array.from(this.players.values()).map(player => ({
      playerId: player.id,
      score: player.score
    }));
  }
}