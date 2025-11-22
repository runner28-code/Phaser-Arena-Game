import Phaser from 'phaser';
import {
  Message,
  MessageType,
  JoinPayload,
  CreateRoomPayload,
  JoinRoomPayload,
  RoomJoinedPayload,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  StateUpdatePayload,
  RoomState
} from '../../shared/types/index';

// @ts-ignore
import * as msgpack from 'msgpack-lite';

export class NetworkManager {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<MessageType, (data: any) => void> = new Map();
  private inputInterval: NodeJS.Timeout | null = null;
  private currentDirection: { x: number; y: number } = { x: 0, y: 0 };
  private currentAction?: string;
  private previousState: RoomState | null = null;
  private currentState: RoomState | null = null;
  private stateTimestamp: number = 0;

  constructor(private serverUrl: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[Network] Attempting to connect to ${this.serverUrl}`);
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log(`[Network] Successfully connected to server at ${this.serverUrl}`);
        resolve();
      };

      this.ws.onmessage = (event) => {
        console.log(`[Network] Received message from server (${event.data.byteLength || event.data.length} bytes)`);
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('[Network] WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log(`[Network] Disconnected from server. Code: ${event.code}, Reason: ${event.reason}`);
      };
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopInputLoop();
  }

  private handleMessage(data: ArrayBuffer | Blob) {
    try {
      let buffer: ArrayBuffer;
      if (data instanceof ArrayBuffer) {
        buffer = data;
      } else if (data instanceof Blob) {
        // For Blob, we'd need to convert to ArrayBuffer, but assuming it's ArrayBuffer for now
        throw new Error('Blob data not supported');
      } else {
        buffer = data as ArrayBuffer;
      }

      const message: Message = msgpack.decode(new Uint8Array(buffer));
      console.log(`[Network] Processing message type: ${message.type}`, message.data);

      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message.data);
      } else {
        console.warn(`[Network] No handler for message type: ${message.type}`);
      }
    } catch (e) {
      console.error('[Network] Failed to decode message:', e);
    }
  }

  private sendMessage(type: MessageType, data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[Network] Cannot send message: WebSocket not connected');
      return;
    }

    const message: Message = { type, data };
    const encoded = msgpack.encode(message);
    console.log(`[Network] Sending message type: ${type}`, data);
    this.ws.send(encoded);
  }

  // Message handlers
  onRoomJoined(handler: (data: RoomJoinedPayload) => void) {
    this.messageHandlers.set(MessageType.ROOM_JOINED, handler);
  }

  onPlayerJoined(handler: (data: PlayerJoinedPayload) => void) {
    this.messageHandlers.set(MessageType.PLAYER_JOINED, handler);
  }

  onPlayerLeft(handler: (data: PlayerLeftPayload) => void) {
    this.messageHandlers.set(MessageType.PLAYER_LEFT, handler);
  }

  onStateUpdate(handler: (data: StateUpdatePayload) => void) {
    this.messageHandlers.set(MessageType.STATE_UPDATE, (data: StateUpdatePayload) => {
      // Store states for interpolation
      this.previousState = this.currentState;
      this.currentState = data.roomState;
      this.stateTimestamp = Date.now();
      // Call the user handler
      handler(data);
    });
  }

  // Input management
  setInput(direction: { x: number; y: number }, action?: string) {
    this.currentDirection = direction;
    this.currentAction = action;
  }

  startInputLoop() {
    if (this.inputInterval) return;
    this.inputInterval = setInterval(() => {
      this.sendInput(this.currentDirection, this.currentAction);
    }, 1000 / 60); // 60 FPS
  }

  stopInputLoop() {
    if (this.inputInterval) {
      clearInterval(this.inputInterval);
      this.inputInterval = null;
    }
  }

  // Get interpolated state for rendering
  getInterpolatedState(): RoomState | null {
    if (!this.currentState) return null;
    if (!this.previousState) return this.currentState;

    const LERP_FACTOR = 0.3;
    const now = Date.now();
    const timeSinceUpdate = now - this.stateTimestamp;
    const interpolationFactor = Math.min(timeSinceUpdate / (1000 / 20), 1); // Cap at 1 for 20Hz updates

    // Interpolate player positions
    const interpolatedPlayers = this.currentState.players.map(currentPlayer => {
      const previousPlayer = this.previousState!.players.find(p => p.id === currentPlayer.id);
      if (!previousPlayer) return currentPlayer;

      return {
        ...currentPlayer,
        x: Phaser.Math.Linear(previousPlayer.x, currentPlayer.x, LERP_FACTOR),
        y: Phaser.Math.Linear(previousPlayer.y, currentPlayer.y, LERP_FACTOR),
        // Snap discrete values
        health: currentPlayer.health,
        maxHealth: currentPlayer.maxHealth,
        isAlive: currentPlayer.isAlive,
        lastAttackTime: currentPlayer.lastAttackTime
      };
    });

    return {
      ...this.currentState,
      players: interpolatedPlayers
    };
  }

  // Send methods
  sendJoin(playerName: string) {
    this.sendMessage(MessageType.JOIN, { playerName } as JoinPayload);
  }

  sendCreateRoom(roomName: string) {
    this.sendMessage(MessageType.CREATE_ROOM, { roomName } as CreateRoomPayload);
  }

  sendJoinRoom(roomId: string) {
    this.sendMessage(MessageType.JOIN_ROOM, { roomId } as JoinRoomPayload);
  }

  sendInput(direction: { x: number; y: number }, action?: string) {
    this.sendMessage(MessageType.INPUT, { direction, action });
  }
}