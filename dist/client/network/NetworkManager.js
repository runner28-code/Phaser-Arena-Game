"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkManager = void 0;
const index_1 = require("../../shared/types/index");
const constants_1 = require("../../shared/config/constants");
// @ts-ignore
const msgpack = __importStar(require("msgpack-lite"));
class NetworkManager {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.messageHandlers = new Map();
        this.connected = false;
        this.playerId = null;
        // State interpolation
        this.previousState = null;
        this.currentState = null;
        this.stateTimestamp = 0;
    }
    async connect() {
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
    handleMessage(data) {
        try {
            let buffer;
            if (data instanceof ArrayBuffer) {
                buffer = data;
            }
            else if (data instanceof Blob) {
                // Convert Blob to ArrayBuffer
                const reader = new FileReader();
                reader.onload = () => {
                    this.handleMessage(reader.result);
                };
                reader.readAsArrayBuffer(data);
                return;
            }
            else {
                buffer = data;
            }
            const message = msgpack.decode(new Uint8Array(buffer));
            console.log(`[Network] Received: ${message.type}`, message.data);
            const handler = this.messageHandlers.get(message.type);
            if (handler) {
                handler(message.data);
            }
        }
        catch (e) {
            console.error('[Network] Failed to decode message:', e);
        }
    }
    sendMessage(message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[Network] Cannot send message: not connected');
            return;
        }
        const encoded = msgpack.encode(message);
        this.ws.send(encoded);
        console.log(`[Network] Sent: ${message.type}`);
    }
    // Public API
    joinGame(playerName) {
        const payload = { playerName };
        this.sendMessage({
            type: index_1.MessageType.JOIN_GAME,
            data: payload
        });
    }
    leaveGame() {
        this.sendMessage({
            type: index_1.MessageType.LEAVE_GAME,
            data: {}
        });
    }
    sendInput(direction, action) {
        const payload = { direction, action };
        this.sendMessage({
            type: index_1.MessageType.PLAYER_INPUT,
            data: payload
        });
    }
    // Event handlers
    onGameStateUpdate(handler) {
        this.messageHandlers.set(index_1.MessageType.GAME_STATE_UPDATE, (data) => {
            // Store states for interpolation
            this.previousState = this.currentState;
            this.currentState = data.gameState;
            this.stateTimestamp = data.timestamp;
            handler(data);
        });
    }
    onPlayerJoined(handler) {
        this.messageHandlers.set(index_1.MessageType.PLAYER_JOINED, handler);
    }
    onYouJoined(handler) {
        this.messageHandlers.set(index_1.MessageType.YOU_JOINED, (data) => {
            this.setPlayerId(data.playerId);
            handler(data);
        });
    }
    onPlayerLeft(handler) {
        this.messageHandlers.set(index_1.MessageType.PLAYER_LEFT, handler);
    }
    onGameStart(handler) {
        this.messageHandlers.set(index_1.MessageType.GAME_START, handler);
    }
    onGameEnd(handler) {
        this.messageHandlers.set(index_1.MessageType.GAME_END, handler);
    }
    onPlayerDied(handler) {
        this.messageHandlers.set(index_1.MessageType.PLAYER_DIED, handler);
    }
    // State interpolation
    getInterpolatedState() {
        if (!this.currentState)
            return null;
        if (!this.previousState)
            return this.currentState;
        const LERP_FACTOR = 0.3;
        const now = Date.now();
        const timeSinceUpdate = now - this.stateTimestamp;
        const interpolationFactor = Math.min(timeSinceUpdate / (1000 / constants_1.UPDATE_RATE), 1); // Cap at UPDATE_RATE Hz
        // Interpolate player positions
        const interpolatedPlayers = this.currentState.players.map((currentPlayer) => {
            const previousPlayer = this.previousState.players.find((p) => p.id === currentPlayer.id);
            if (!previousPlayer)
                return currentPlayer;
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
    isConnected() {
        return this.connected;
    }
    getPlayerId() {
        return this.playerId;
    }
    setPlayerId(id) {
        this.playerId = id;
    }
}
exports.NetworkManager = NetworkManager;
