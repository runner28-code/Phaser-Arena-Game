import { Message, MessageType, PlayerState, GameState } from '../shared/types/index';
import { PLAYER_HEALTH, PLAYER_MAX_HEALTH, PLAYER_SPEED, PLAYER_DAMAGE } from '../shared/config/constants';
import { GameRoom } from './GameRoom';
import { WebSocketServer } from './WebSocketServer';

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerToRoom: Map<string, string> = new Map();
  private roomIdCounter = 0;
  private wsServer!: WebSocketServer;

  constructor(wsServer?: WebSocketServer) {
    if (wsServer) {
      this.wsServer = wsServer;
    }
  }

  setWsServer(wsServer: WebSocketServer) {
    this.wsServer = wsServer;
  }

  createRoom(creatorId: string): string {
    const roomId = `room_${++this.roomIdCounter}`;
    const room = new GameRoom(roomId, this.wsServer);
    this.rooms.set(roomId, room);
    this.joinRoom(creatorId, roomId);
    return roomId;
  }

  joinRoom(playerId: string, roomId: string) {
    const room = this.rooms.get(roomId);
    if (room && room.canJoin()) {
      room.addPlayer(playerId);
      this.playerToRoom.set(playerId, roomId);
      this.wsServer.sendToPlayer(playerId, { type: MessageType.ROOM_JOINED, data: { roomId } });
      this.wsServer.broadcastToRoom(roomId, { type: MessageType.PLAYER_JOINED, data: { playerId } }, playerId);
    }
  }

  handleMessage(playerId: string, message: Message) {
    const roomId = this.playerToRoom.get(playerId);
    if (roomId) {
      const room = this.rooms.get(roomId);
      room?.handleMessage(playerId, message);
    } else {
      // Handle lobby messages
      switch (message.type) {
        case MessageType.CREATE_ROOM:
          this.createRoom(playerId);
          break;
        case MessageType.JOIN_ROOM:
          this.joinRoom(playerId, message.data.roomId);
          break;
      }
    }
  }

  removePlayer(playerId: string) {
    const roomId = this.playerToRoom.get(playerId);
    if (roomId) {
      const room = this.rooms.get(roomId);
      room?.removePlayer(playerId);
      this.playerToRoom.delete(playerId);
      this.wsServer.broadcastToRoom(roomId, { type: MessageType.PLAYER_LEFT, data: { playerId } });
      if (room && room.isEmpty()) {
        this.rooms.delete(roomId);
      }
    }
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }
}