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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
const ws_1 = __importDefault(require("ws"));
const msgpack = __importStar(require("msgpack-lite"));
const index_1 = require("../shared/types/index");
const constants_1 = require("../shared/config/constants");
const GameRoom_1 = require("./GameRoom");
class WebSocketServer {
    constructor(port) {
        this.connections = new Map();
        this.playerIdCounter = 0;
        this.wss = new ws_1.default.Server({ port });
        this.gameRoom = new GameRoom_1.GameRoom(this);
        this.wss.on('connection', this.handleConnection.bind(this));
        console.log(`[Server] WebSocket server started on port ${port}`);
        // Start game loop
        setInterval(() => this.gameLoop(), 1000 / constants_1.UPDATE_RATE);
    }
    gameLoop() {
        this.gameRoom.update();
        this.broadcastGameState();
    }
    handleConnection(ws, req) {
        const playerId = this.generatePlayerId();
        ws.playerId = playerId;
        this.connections.set(playerId, ws);
        console.log(`[Server] Player ${playerId} connected from ${req.socket.remoteAddress}:${req.socket.remotePort}`);
        ws.on('message', (data) => this.handleMessage(ws, data));
        ws.on('close', () => this.handleDisconnect(ws));
    }
    handleMessage(ws, data) {
        try {
            let buffer;
            if (Buffer.isBuffer(data)) {
                buffer = data;
            }
            else if (Array.isArray(data)) {
                buffer = Buffer.concat(data);
            }
            else {
                buffer = Buffer.from(data);
            }
            const message = msgpack.decode(buffer);
            const playerId = ws.playerId;
            console.log(`[Server] Received message from ${playerId}: ${message.type}`, message.data);
            this.gameRoom.handleMessage(playerId, message);
        }
        catch (e) {
            console.error(`[Server] Invalid message received from ${ws.playerId}:`, e);
        }
    }
    handleDisconnect(ws) {
        const playerId = ws.playerId;
        if (playerId) {
            console.log(`[Server] Player ${playerId} disconnected`);
            this.connections.delete(playerId);
            this.gameRoom.removePlayer(playerId);
        }
    }
    generatePlayerId() {
        return `player_${++this.playerIdCounter}`;
    }
    sendToPlayer(playerId, message) {
        const ws = this.connections.get(playerId);
        if (ws && ws.readyState === ws_1.default.OPEN) {
            const encoded = msgpack.encode(message);
            console.log(`[Server] Sending message to ${playerId}: ${message.type}`);
            ws.send(encoded);
        }
        else {
            console.warn(`[Server] Cannot send message to ${playerId}: connection not available`);
        }
    }
    broadcastToAll(message, excludePlayerId) {
        for (const [playerId, ws] of this.connections) {
            if (playerId !== excludePlayerId && ws.readyState === ws_1.default.OPEN) {
                this.sendToPlayer(playerId, message);
            }
        }
    }
    broadcastGameState() {
        const gameState = this.gameRoom.getGameState();
        const payload = {
            gameState,
            timestamp: Date.now()
        };
        const message = {
            type: index_1.MessageType.GAME_STATE_UPDATE,
            data: payload,
            timestamp: Date.now()
        };
        this.broadcastToAll(message);
    }
    // Methods called by GameRoom
    notifyPlayerJoined(playerId, playerData) {
        const payload = { player: playerData };
        const message = {
            type: index_1.MessageType.PLAYER_JOINED,
            data: payload
        };
        this.broadcastToAll(message, playerId);
    }
    notifyPlayerLeft(playerId) {
        const payload = { playerId };
        const message = {
            type: index_1.MessageType.PLAYER_LEFT,
            data: payload
        };
        this.broadcastToAll(message);
    }
    notifyGameStart() {
        const gameState = this.gameRoom.getGameState();
        const payload = { gameState };
        const message = {
            type: index_1.MessageType.GAME_START,
            data: payload
        };
        this.broadcastToAll(message);
    }
    notifyGameEnd(winner) {
        const finalScores = this.gameRoom.getFinalScores();
        const payload = { winner, finalScores };
        const message = {
            type: index_1.MessageType.GAME_END,
            data: payload
        };
        this.broadcastToAll(message);
    }
}
exports.WebSocketServer = WebSocketServer;
