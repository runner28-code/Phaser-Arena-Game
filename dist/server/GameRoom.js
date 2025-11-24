"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = void 0;
const index_1 = require("../shared/types/index");
const constants_1 = require("../shared/config/constants");
class GameRoom {
    constructor(wsServer) {
        this.players = new Map();
        this.gameState = index_1.GameState.WAITING;
        this.gameTime = 0;
        this.deltaTime = 1 / constants_1.UPDATE_RATE;
        this.maxPlayers = 2; // Only 2 players for simple multiplayer
        this.wsServer = wsServer;
    }
    canJoin() {
        return this.players.size < this.maxPlayers && this.gameState === index_1.GameState.WAITING;
    }
    addPlayer(playerId, playerName) {
        if (!this.canJoin())
            return false;
        // Position players on opposite sides of the arena
        const isFirstPlayer = this.players.size === 0;
        const player = {
            id: playerId,
            x: isFirstPlayer ? constants_1.GAME_WIDTH * 0.25 : constants_1.GAME_WIDTH * 0.75,
            y: constants_1.GAME_HEIGHT / 2,
            health: constants_1.PLAYER_HEALTH,
            maxHealth: constants_1.PLAYER_MAX_HEALTH,
            speed: constants_1.PLAYER_SPEED,
            damage: constants_1.PLAYER_DAMAGE,
            state: index_1.PlayerState.ALIVE,
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
            type: index_1.MessageType.YOU_JOINED,
            data: { playerId, player }
        });
        // Notify other players that someone joined
        this.wsServer.notifyPlayerJoined(playerId, player);
        // Start game if we have 2 players
        if (this.players.size >= 2 && this.gameState === index_1.GameState.WAITING) {
            this.startGame();
        }
        return true;
    }
    removePlayer(playerId) {
        this.players.delete(playerId);
        this.wsServer.notifyPlayerLeft(playerId);
        // End game if a player disconnects
        if (this.gameState === index_1.GameState.PLAYING) {
            this.endGame();
        }
    }
    handleMessage(playerId, message) {
        switch (message.type) {
            case index_1.MessageType.JOIN_GAME:
                this.handleJoinGame(playerId, message.data);
                break;
            case index_1.MessageType.LEAVE_GAME:
                this.removePlayer(playerId);
                break;
            case index_1.MessageType.PLAYER_INPUT:
                this.handlePlayerInput(playerId, message.data);
                break;
        }
    }
    handleJoinGame(playerId, data) {
        this.addPlayer(playerId, data.playerName);
    }
    handlePlayerInput(playerId, input) {
        const player = this.players.get(playerId);
        if (!player || player.state === index_1.PlayerState.DEAD)
            return;
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
            player.x = Math.max(0, Math.min(constants_1.GAME_WIDTH, player.x));
            player.y = Math.max(0, Math.min(constants_1.GAME_HEIGHT, player.y));
        }
        // Determine current state
        if (input.action === 'attack') {
            const now = Date.now();
            if (now - player.lastAttackTime > 500) { // 500ms cooldown
                player.lastAttackTime = now;
                this.handlePlayerAttack(player);
                player.currentState = 'attacking';
            }
        }
        else if (input.direction.x !== 0 || input.direction.y !== 0) {
            player.currentState = 'walking';
        }
        else {
            player.currentState = 'idle';
        }
    }
    handlePlayerAttack(player) {
        const now = Date.now();
        player.isAttacking = true;
        player.attackEndTime = now + 300; // 300ms attack duration
        // Check for hits on other players
        for (const [otherPlayerId, otherPlayer] of this.players) {
            if (otherPlayerId === player.id || otherPlayer.state === index_1.PlayerState.DEAD)
                continue;
            const dx = otherPlayer.x - player.x;
            const dy = otherPlayer.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 50) { // attack range
                otherPlayer.health -= player.damage;
                if (otherPlayer.health <= 0) {
                    otherPlayer.state = index_1.PlayerState.DEAD;
                    // Game ends when a player dies
                    this.endGame();
                }
            }
        }
    }
    startGame() {
        this.gameState = index_1.GameState.PLAYING;
        this.gameTime = 0;
        this.wsServer.notifyGameStart();
    }
    endGame() {
        this.gameState = index_1.GameState.FINISHED;
        this.wsServer.notifyGameEnd();
    }
    update() {
        if (this.gameState !== index_1.GameState.PLAYING)
            return;
        this.gameTime += this.deltaTime;
        this.updatePlayers();
    }
    updatePlayers() {
        const now = Date.now();
        for (const [playerId, player] of this.players) {
            if (player.isAttacking && now > player.attackEndTime) {
                player.isAttacking = false;
                // Reset to walking or idle based on current direction
                if (player.direction.x !== 0 || player.direction.y !== 0) {
                    player.currentState = 'walking';
                }
                else {
                    player.currentState = 'idle';
                }
            }
        }
    }
    getGameState() {
        return {
            players: Array.from(this.players.values()),
            enemies: [], // No enemies in simple multiplayer
            collectibles: [], // No collectibles in simple multiplayer
            state: this.gameState,
            wave: 1, // Always wave 1
            gameTime: this.gameTime
        };
    }
    getFinalScores() {
        return Array.from(this.players.values()).map(player => ({
            playerId: player.id,
            score: player.state === index_1.PlayerState.ALIVE ? 1 : 0 // 1 point for surviving
        }));
    }
}
exports.GameRoom = GameRoom;
