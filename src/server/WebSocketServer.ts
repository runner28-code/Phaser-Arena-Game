import WebSocket from 'ws';
import * as msgpack from 'msgpack-lite';
import { Message, MessageType } from '../shared/types/index';
import { UPDATE_RATE } from '../shared/config/constants';
import { RoomManager } from './RoomManager';

declare module 'msgpack-lite';

export class WebSocketServer {
  private wss: WebSocket.Server;
  private roomManager: RoomManager;
  private connections: Map<string, WebSocket> = new Map();
  private playerIdCounter = 0;

  constructor(port: number, roomManager: RoomManager) {
    this.roomManager = roomManager;
    this.wss = new WebSocket.Server({ port });

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log(`[Server] WebSocket server started on port ${port}`);

    // Start game loop
    setInterval(() => this.gameLoop(), 1000 / UPDATE_RATE);
  }

  private gameLoop() {
    for (const room of this.roomManager.getAllRooms()) {
      room.update();
    }
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
      const message: Message = msgpack.decode(buffer);
      const playerId = (ws as any).playerId;

      console.log(`[Server] Received message from ${playerId}: ${message.type}`, message.data);

      // Route message to room manager
      this.roomManager.handleMessage(playerId, message);
    } catch (e) {
      console.error(`[Server] Invalid message received from ${(ws as any).playerId}:`, e);
    }
  }

  private handleDisconnect(ws: WebSocket) {
    const playerId = (ws as any).playerId;
    if (playerId) {
      console.log(`[Server] Player ${playerId} disconnected`);
      this.connections.delete(playerId);
      this.roomManager.removePlayer(playerId);
    }
  }

  private generatePlayerId(): string {
    return `player_${++this.playerIdCounter}`;
  }

  public sendToPlayer(playerId: string, message: Message) {
    const ws = this.connections.get(playerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const encoded = msgpack.encode(message);
      console.log(`[Server] Sending message to ${playerId}: ${message.type}`, message.data);
      ws.send(encoded);
    } else {
      console.warn(`[Server] Cannot send message to ${playerId}: connection not available`);
    }
  }

  public broadcastToRoom(roomId: string, message: Message, excludePlayerId?: string) {
    const room = this.roomManager.getRoom(roomId);
    if (room) {
      room.players.forEach(player => {
        if (player.id !== excludePlayerId) {
          this.sendToPlayer(player.id, message);
        }
      });
    }
  }
}