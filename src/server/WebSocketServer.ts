import WebSocket from 'ws';
import * as msgpack from 'msgpack-lite';
import { GameMessage, MessageType, GameStateUpdatePayload, PlayerJoinedPayload, PlayerLeftPayload, PlayerDiedPayload, GameStartPayload, GameEndPayload } from '../shared/types/index';
import { UPDATE_RATE } from '../shared/config/constants';
import { GameRoom } from './GameRoom';

declare module 'msgpack-lite';

export class WebSocketServer {
  private wss: WebSocket.Server;
  private gameRoom: GameRoom;
  private connections: Map<string, WebSocket> = new Map();
  private playerIdCounter = 0;

  constructor(port: number) {
    this.wss = new WebSocket.Server({ port });
    this.gameRoom = new GameRoom(this);

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log(`[Server] WebSocket server started on port ${port}`);

    // Start game loop
    setInterval(() => this.gameLoop(), 1000 / UPDATE_RATE);
  }

  private gameLoop() {
    this.gameRoom.update();
    this.broadcastGameState();
  }

  private handleConnection(ws: WebSocket, req: any) {
    const playerId = this.generatePlayerId();
    (ws as any).playerId = playerId;
    this.connections.set(playerId, ws);

    console.log(`[Server] Player ${playerId} connected from ${req.socket.remoteAddress}:${req.socket.remotePort}`);

    ws.on('message', (data) => this.handleMessage(ws, data));
    ws.on('close', () => this.handleDisconnect(ws));
  }

  private handleMessage(ws: WebSocket, data: WebSocket.RawData) {
    try {
      let buffer: Buffer;
      if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (Array.isArray(data)) {
        buffer = Buffer.concat(data);
      } else {
        buffer = Buffer.from(data);
      }

      const message: GameMessage = msgpack.decode(buffer);
      const playerId = (ws as any).playerId;

      console.log(`[Server] Received message from ${playerId}: ${message.type}`, message.data);

      this.gameRoom.handleMessage(playerId, message);
    } catch (e) {
      console.error(`[Server] Invalid message received from ${(ws as any).playerId}:`, e);
    }
  }

  private handleDisconnect(ws: WebSocket) {
    const playerId = (ws as any).playerId;
    if (playerId) {
      console.log(`[Server] Player ${playerId} disconnected`);
      this.connections.delete(playerId);
      this.gameRoom.removePlayer(playerId);
    }
  }

  private generatePlayerId(): string {
    return `player_${++this.playerIdCounter}`;
  }

  public sendToPlayer(playerId: string, message: GameMessage) {
    const ws = this.connections.get(playerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const encoded = msgpack.encode(message);
      console.log(`[Server] Sending message to ${playerId}: ${message.type}`);
      ws.send(encoded);
    } else {
      console.warn(`[Server] Cannot send message to ${playerId}: connection not available`);
    }
  }

  private broadcastToAll(message: GameMessage, excludePlayerId?: string) {
    for (const [playerId, ws] of this.connections) {
      if (playerId !== excludePlayerId && ws.readyState === WebSocket.OPEN) {
        this.sendToPlayer(playerId, message);
      }
    }
  }

  private broadcastGameState() {
    const gameState = this.gameRoom.getGameState();
    const payload: GameStateUpdatePayload = {
      gameState,
      timestamp: Date.now()
    };

    const message: GameMessage = {
      type: MessageType.GAME_STATE_UPDATE,
      data: payload,
      timestamp: Date.now()
    };

    this.broadcastToAll(message);
  }

  // Methods called by GameRoom
  notifyPlayerJoined(playerId: string, playerData: any) {
    const payload: PlayerJoinedPayload = { player: playerData };
    const message: GameMessage = {
      type: MessageType.PLAYER_JOINED,
      data: payload
    };
    this.broadcastToAll(message, playerId);
  }

  notifyPlayerLeft(playerId: string) {
    const payload: PlayerLeftPayload = { playerId };
    const message: GameMessage = {
      type: MessageType.PLAYER_LEFT,
      data: payload
    };
    this.broadcastToAll(message);
  }

  notifyPlayerDied(playerId: string) {
    const payload: PlayerDiedPayload = { playerId };
    const message: GameMessage = {
      type: MessageType.PLAYER_DIED,
      data: payload
    };
    this.broadcastToAll(message);
  }

  notifyGameStart() {
    const gameState = this.gameRoom.getGameState();
    const payload: GameStartPayload = { gameState };
    const message: GameMessage = {
      type: MessageType.GAME_START,
      data: payload
    };
    this.broadcastToAll(message);
  }

  notifyGameEnd(winner?: string) {
    const finalScores = this.gameRoom.getFinalScores();
    const payload: GameEndPayload = { winner, finalScores };
    const message: GameMessage = {
      type: MessageType.GAME_END,
      data: payload
    };
    this.broadcastToAll(message);
  }
}