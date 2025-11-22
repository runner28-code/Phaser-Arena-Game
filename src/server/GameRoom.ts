import { Message, MessageType, PlayerState, EnemyState, GameState, RoomState, EnemyType, Collectible, CollectibleType } from '../shared/types/index';
import { PLAYER_HEALTH, PLAYER_MAX_HEALTH, PLAYER_SPEED, PLAYER_DAMAGE, GAME_WIDTH, GAME_HEIGHT, UPDATE_RATE } from '../shared/config/constants';
import { WebSocketServer } from './WebSocketServer';

export class GameRoom {
  public players: PlayerState[] = [];
  public enemies: EnemyState[] = [];
  public collectibles: Collectible[] = [];
  public state: GameState = GameState.WAITING;
  private maxPlayers = 4;
  private wave = 1;
  private deltaTime = 1 / UPDATE_RATE;

  constructor(private id: string, private wsServer: WebSocketServer) {}

  canJoin(): boolean {
    return this.players.length < this.maxPlayers && this.state === GameState.WAITING;
  }

  addPlayer(playerId: string) {
    const player: PlayerState = {
      id: playerId,
      x: 100,
      y: 100,
      health: PLAYER_HEALTH,
      maxHealth: PLAYER_MAX_HEALTH,
      speed: PLAYER_SPEED,
      damage: PLAYER_DAMAGE,
      isAlive: true,
      lastAttackTime: 0,
    };
    this.players.push(player);
    if (this.players.length >= 2 && this.state === GameState.WAITING) {
      this.startGame();
    }
  }

  removePlayer(playerId: string) {
    this.players = this.players.filter(p => p.id !== playerId);
    if (this.players.length < 2 && this.state === GameState.PLAYING) {
      this.state = GameState.FINISHED;
    }
  }

  isEmpty(): boolean {
    return this.players.length === 0;
  }

  handleMessage(playerId: string, message: Message) {
    switch (message.type) {
      case MessageType.INPUT:
        // Update player based on input
        const player = this.players.find(p => p.id === playerId);
        if (player && message.data) {
          const input = message.data;
          if (input.direction) {
            player.x += input.direction.x * player.speed * this.deltaTime;
            player.y += input.direction.y * player.speed * this.deltaTime;
          }
          if (input.action === 'attack') {
            const now = Date.now();
            if (now - player.lastAttackTime > 500) { // 500ms cooldown
              player.lastAttackTime = now;
              this.handlePlayerAttack(player);
            }
          }
        }
        // Don't broadcast here, let update() handle it
        break;
    }
  }

  private startGame() {
    this.state = GameState.STARTING;
    // Broadcast starting
    this.broadcastState();
    setTimeout(() => {
      this.state = GameState.PLAYING;
      // Spawn initial wave
      this.spawnWave();
      this.broadcastState();
    }, 3000);
  }

  private broadcastState() {
    const roomState: RoomState = {
      id: this.id,
      players: this.players,
      enemies: this.enemies,
      collectibles: this.collectibles,
      state: this.state,
      wave: this.wave,
    };
    this.wsServer.broadcastToRoom(this.id, { type: MessageType.STATE_UPDATE, data: roomState });
  }

  update() {
    if (this.state !== GameState.PLAYING) return;

    this.updateEnemies();
    this.checkCollisions();
    this.updateWave();
    this.broadcastState();
  }

  private updateEnemies() {
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;

      // Simple chase AI: move towards nearest player
      const nearestPlayer = this.getNearestPlayer(enemy);
      if (nearestPlayer) {
        const dx = nearestPlayer.x - enemy.x;
        const dy = nearestPlayer.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
          enemy.x += (dx / distance) * enemy.speed * this.deltaTime;
          enemy.y += (dy / distance) * enemy.speed * this.deltaTime;
        }

        // Attack if close
        if (distance < 50) { // attack range
          nearestPlayer.health -= enemy.damage * this.deltaTime; // damage over time
          if (nearestPlayer.health <= 0) {
            nearestPlayer.isAlive = false;
          }
        }
      }
    }
  }

  private getNearestPlayer(enemy: EnemyState): PlayerState | null {
    let nearest: PlayerState | null = null;
    let minDist = Infinity;
    for (const player of this.players) {
      if (!player.isAlive) continue;
      const dist = Math.sqrt((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = player;
      }
    }
    return nearest;
  }

  private handlePlayerAttack(player: PlayerState) {
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;
      const dist = Math.sqrt((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2);
      if (dist < 50) { // attack range
        enemy.health -= player.damage;
        if (enemy.health <= 0) {
          enemy.isAlive = false;
          this.spawnCollectible(enemy.x, enemy.y);
        }
      }
    }
  }

  private spawnCollectible(x: number, y: number) {
    const types = [CollectibleType.HEALTH, CollectibleType.COIN, CollectibleType.DAMAGE_BOOST, CollectibleType.SPEED_BOOST];
    const type = types[Math.floor(Math.random() * types.length)];
    const value = type === CollectibleType.HEALTH ? 20 : type === CollectibleType.COIN ? 10 : 5;
    const collectible: Collectible = {
      id: `collectible_${this.id}_${Date.now()}`,
      x,
      y,
      type,
      value
    };
    this.collectibles.push(collectible);
  }

  private checkCollisions() {
    // Player-boundary
    for (const player of this.players) {
      player.x = Math.max(0, Math.min(GAME_WIDTH, player.x));
      player.y = Math.max(0, Math.min(GAME_HEIGHT, player.y));
    }

    // Player-enemy collision (damage)
    for (const player of this.players) {
      if (!player.isAlive) continue;
      for (const enemy of this.enemies) {
        if (!enemy.isAlive) continue;
        const dist = Math.sqrt((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2);
        if (dist < 32) { // collision radius
          player.health -= enemy.damage * this.deltaTime;
          if (player.health <= 0) {
            player.isAlive = false;
          }
        }
      }
    }

    // Player-collectible
    for (const player of this.players) {
      if (!player.isAlive) continue;
      for (let i = this.collectibles.length - 1; i >= 0; i--) {
        const collectible = this.collectibles[i];
        const dist = Math.sqrt((player.x - collectible.x) ** 2 + (player.y - collectible.y) ** 2);
        if (dist < 32) {
          this.applyCollectible(player, collectible);
          this.collectibles.splice(i, 1);
        }
      }
    }
  }

  private applyCollectible(player: PlayerState, collectible: Collectible) {
    switch (collectible.type) {
      case CollectibleType.HEALTH:
        player.health = Math.min(player.maxHealth, player.health + collectible.value);
        break;
      case CollectibleType.COIN:
        // Maybe add score, but not implemented
        break;
      case CollectibleType.SHIELD:
        // Temporary shield, not implemented
        break;
      case CollectibleType.DAMAGE_BOOST:
        player.damage += collectible.value;
        break;
      case CollectibleType.SPEED_BOOST:
        player.speed += collectible.value;
        break;
    }
  }

  private updateWave() {
    const aliveEnemies = this.enemies.filter(e => e.isAlive).length;
    if (aliveEnemies === 0) {
      this.wave++;
      this.spawnWave();
    }
  }

  private spawnWave() {
    const enemyCount = 5 + this.wave * 2; // increase per wave
    for (let i = 0; i < enemyCount; i++) {
      const type = this.wave > 3 ? EnemyType.ORC : this.wave > 1 ? EnemyType.GOBLIN : EnemyType.SLIME;
      const enemy: EnemyState = {
        id: `enemy_${this.id}_${this.wave}_${i}`,
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        health: 50 + this.wave * 10,
        maxHealth: 50 + this.wave * 10,
        speed: 50 + this.wave * 5,
        damage: 10 + this.wave * 2,
        isAlive: true,
        type,
      };
      this.enemies.push(enemy);
    }
  }
}