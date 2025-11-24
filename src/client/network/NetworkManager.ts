import { GameMessage, MessageType, GameStateUpdatePayload, PlayerJoinedPayload, PlayerLeftPayload, PlayerDiedPayload, YouJoinedPayload, GameStartPayload, GameEndPayload, PlayerInputPayload, JoinGamePayload } from '../../shared/types/index';

// @ts-ignore
import * as msgpack from 'msgpack-lite';

export class NetworkManager {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<MessageType, (data: any) => void> = new Map();
  private connected: boolean = false;
  private playerId: string | null = null;

  // State interpolation
  private previousState: any = null;
  private currentState: any = null;
  private stateTimestamp: number = 0;

  constructor(private serverUrl: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[Network] Connecting to ${this.serverUrl}`);
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log('[Network] Connected to server');
        this.connected = true;
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        console.log('[Network] Disconnected from server');
        this.connected = false;
      };

      this.ws.onerror = (error) => {
        console.error('[Network] Connection error:', error);
        reject(error);
      };
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  private handleMessage(data: any) {
    try {
      let buffer: ArrayBuffer;
      if (data instanceof ArrayBuffer) {
        buffer = data;
      } else if (data instanceof Blob) {
        // Convert Blob to ArrayBuffer
        const reader = new FileReader();
        reader.onload = () => {
          this.handleMessage(reader.result as ArrayBuffer);
        };
        reader.readAsArrayBuffer(data);
        return;
      } else {
        buffer = data;
      }

      const message: GameMessage = msgpack.decode(new Uint8Array(buffer));
      console.log(`[Network] Received: ${message.type}`, message.data);

      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message.data);
      }
    } catch (e) {
      console.error('[Network] Failed to decode message:', e);
    }
  }

  private sendMessage(message: GameMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Network] Cannot send message: not connected');
      return;
    }

    const encoded = msgpack.encode(message);
    this.ws.send(encoded);
    console.log(`[Network] Sent: ${message.type}`);
  }

  // Public API
  joinGame(playerName?: string) {
    const payload: JoinGamePayload = { playerName };
    this.sendMessage({
      type: MessageType.JOIN_GAME,
      data: payload
    });
  }

  leaveGame() {
    this.sendMessage({
      type: MessageType.LEAVE_GAME,
      data: {}
    });
  }

  sendInput(direction: { x: number; y: number }, action?: 'attack') {
    const payload: PlayerInputPayload = { direction, action };
    this.sendMessage({
      type: MessageType.PLAYER_INPUT,
      data: payload
    });
  }

  // Event handlers
  onGameStateUpdate(handler: (payload: GameStateUpdatePayload) => void) {
    this.messageHandlers.set(MessageType.GAME_STATE_UPDATE, (data: GameStateUpdatePayload) => {
      // Store states for interpolation
      this.previousState = this.currentState;
      this.currentState = data.gameState;
      this.stateTimestamp = data.timestamp;
      handler(data);
    });
  }

  onPlayerJoined(handler: (payload: PlayerJoinedPayload) => void) {
    this.messageHandlers.set(MessageType.PLAYER_JOINED, handler);
  }

  onYouJoined(handler: (payload: YouJoinedPayload) => void) {
    this.messageHandlers.set(MessageType.YOU_JOINED, (data: YouJoinedPayload) => {
      this.setPlayerId(data.playerId);
      handler(data);
    });
  }

  onPlayerLeft(handler: (payload: PlayerLeftPayload) => void) {
    this.messageHandlers.set(MessageType.PLAYER_LEFT, handler);
  }

  onGameStart(handler: (payload: GameStartPayload) => void) {
    this.messageHandlers.set(MessageType.GAME_START, handler);
  }

  onGameEnd(handler: (payload: GameEndPayload) => void) {
    this.messageHandlers.set(MessageType.GAME_END, handler);
  }

  onPlayerDied(handler: (payload: PlayerDiedPayload) => void) {
    this.messageHandlers.set(MessageType.PLAYER_DIED, handler);
  }

  // State interpolation
  getInterpolatedState() {
    if (!this.currentState) return null;
    if (!this.previousState) return this.currentState;

    const LERP_FACTOR = 0.3;
    const now = Date.now();
    const timeSinceUpdate = now - this.stateTimestamp;
    const interpolationFactor = Math.min(timeSinceUpdate / (1000 / 20), 1); // Cap at 20Hz

    // Interpolate player positions
    const interpolatedPlayers = this.currentState.players.map((currentPlayer: any) => {
      const previousPlayer = this.previousState.players.find((p: any) => p.id === currentPlayer.id);
      if (!previousPlayer) return currentPlayer;

      return {
        ...currentPlayer,
        x: Phaser.Math.Linear(previousPlayer.x, currentPlayer.x, LERP_FACTOR),
        y: Phaser.Math.Linear(previousPlayer.y, currentPlayer.y, LERP_FACTOR),
      };
    });

    return {
      ...this.currentState,
      players: interpolatedPlayers
    };
  }

  // Getters
  isConnected(): boolean {
    return this.connected;
  }

  getPlayerId(): string | null {
    return this.playerId;
  }

  setPlayerId(id: string) {
    this.playerId = id;
  }
}