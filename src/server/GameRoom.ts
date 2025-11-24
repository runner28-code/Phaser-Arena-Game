import { GameMessage, MessageType, PlayerData, GameState, GameStateData, PlayerInputPayload, JoinGamePayload, PlayerState } from '../shared/types/index';
import { PLAYER_HEALTH, PLAYER_MAX_HEALTH, PLAYER_SPEED, PLAYER_DAMAGE, GAME_WIDTH, GAME_HEIGHT, UPDATE_RATE } from '../shared/config/constants';
import { WebSocketServer } from './WebSocketServer';

export class GameRoom {
  private players: Map<string, PlayerData> = new Map();
  private gameState: GameState = GameState.WAITING;
  private gameTime: number = 0;
  private deltaTime: number = 1 / UPDATE_RATE;
  private maxPlayers: number = 2; // Only 2 players for simple multiplayer
  private wsServer: WebSocketServer;

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
      currentState: 'idle'
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
    if (this.gameState === GameState.PLAYING) {
      this.endGame();
    }
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
      if (now - player.lastAttackTime > 500) { // 500ms cooldown
        player.lastAttackTime = now;
        this.handlePlayerAttack(player);
        player.currentState = 'attacking';
      }
    } else if (input.direction.x !== 0 || input.direction.y !== 0) {
      player.currentState = 'walking';
    } else {
      player.currentState = 'idle';
    }
  }

  private handlePlayerAttack(player: PlayerData) {
    const now = Date.now();
    player.isAttacking = true;
    player.attackEndTime = now + 300; // 300ms attack duration

    // Check for hits on other players
    for (const [otherPlayerId, otherPlayer] of this.players) {
      if (otherPlayerId === player.id || otherPlayer.state === PlayerState.DEAD) continue;

      const dx = otherPlayer.x - player.x;
      const dy = otherPlayer.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 50) { // attack range
        otherPlayer.health -= player.damage;
        if (otherPlayer.health <= 0) {
          otherPlayer.state = PlayerState.DEAD;
          // Game ends when a player dies
          this.endGame();
        }
      }
    }
  }

  private startGame() {
    this.gameState = GameState.PLAYING;
    this.gameTime = 0;
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
    }
  }

  getGameState(): GameStateData {
    return {
      players: Array.from(this.players.values()),
      enemies: [], // No enemies in simple multiplayer
      collectibles: [], // No collectibles in simple multiplayer
      state: this.gameState,
      wave: 1, // Always wave 1
      gameTime: this.gameTime
    };
  }

  getFinalScores(): { playerId: string; score: number }[] {
    return Array.from(this.players.values()).map(player => ({
      playerId: player.id,
      score: player.state === PlayerState.ALIVE ? 1 : 0 // 1 point for surviving
    }));
  }
}