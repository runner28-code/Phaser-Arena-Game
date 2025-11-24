"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = void 0;
const index_1 = require("../shared/types/index");
const constants_1 = require("../shared/config/constants");
const enemies_json_1 = __importDefault(require("../shared/config/enemies.json"));
class GameRoom {
    constructor(wsServer) {
        this.players = new Map();
        this.enemies = new Map();
        this.collectibles = new Map();
        this.gameState = index_1.GameState.WAITING;
        this.gameTime = 0;
        this.deltaTime = 1 / constants_1.UPDATE_RATE;
        this.maxPlayers = 2; // Only 2 players for simple multiplayer
        this.enemySpawnTimer = 0;
        this.nextEnemyId = 0;
        this.nextCollectibleId = 0;
        this.currentWave = 1;
        this.waveCleared = false;
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
            currentState: 'idle',
            invulnerableTimer: 0,
            damageBoostTimer: 0,
            speedBoostTimer: 0
        };
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
        // if (this.gameState === GameState.PLAYING) {
        //   this.endGame();
        // }
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
            player.x += input.direction.x * player.speed;
            player.y += input.direction.y * player.speed;
            // Keep player in bounds
            player.x = Math.max(0, Math.min(constants_1.GAME_WIDTH, player.x));
            player.y = Math.max(0, Math.min(constants_1.GAME_HEIGHT, player.y));
        }
        // Determine current state
        if (input.action === 'attack') {
            const now = Date.now();
            if (now - player.lastAttackTime > constants_1.ATTACK_COOLDOWN) {
                player.lastAttackTime = now;
                this.handlePlayerAttack(player);
                player.currentState = 'attacking';
            }
        }
        // Only update state if not currently attacking
        if (!player.isAttacking) {
            if (input.direction.x !== 0 || input.direction.y !== 0) {
                player.currentState = 'walking';
            }
            else {
                player.currentState = 'idle';
            }
        }
    }
    handlePlayerAttack(player) {
        const now = Date.now();
        player.isAttacking = true;
        player.attackEndTime = now + 600; // 600ms attack duration to match animation
        // Check for hits on other players
        for (const [otherPlayerId, otherPlayer] of this.players) {
            if (otherPlayerId === player.id || otherPlayer.state === index_1.PlayerState.DEAD)
                continue;
            const dx = otherPlayer.x - player.x;
            const dy = otherPlayer.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            // if (distance < 50) { // attack range
            //   otherPlayer.health -= player.damage;
            //   if (otherPlayer.health <= 0) {
            //     otherPlayer.state = PlayerState.DEAD;
            //     // Game ends when a player dies
            //     this.endGame();
            //   }
            // }
        }
        // Check for hits on enemies
        for (const [enemyId, enemy] of this.enemies) {
            if (!enemy.isAlive)
                continue;
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 50) { // attack range
                const effectiveDamage = player.damageBoostTimer > 0 ? player.damage * 1.5 : player.damage;
                enemy.health -= effectiveDamage;
                if (enemy.health <= 0) {
                    enemy.isAlive = false;
                    // Award score based on enemy type
                    const scoreReward = enemy.type === index_1.EnemyType.SLIME ? 10 : enemy.type === index_1.EnemyType.GOBLIN ? 20 : 10;
                    player.score += scoreReward;
                    // Spawn random collectible
                    this.spawnRandomCollectible(enemy.x, enemy.y);
                    // Remove enemy after a delay
                    setTimeout(() => {
                        this.enemies.delete(enemyId);
                    }, 1000);
                }
            }
        }
    }
    startGame() {
        this.gameState = index_1.GameState.PLAYING;
        this.gameTime = 0;
        this.currentWave = 1;
        this.startWave();
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
        this.updateEnemies();
        this.updateCollectibles();
        // Check for wave completion
        if (!this.waveCleared && this.enemies.size === 0) {
            this.waveCleared = true;
            this.currentWave++;
            // Start next wave after a short delay
            setTimeout(() => {
                this.startWave();
            }, 2000); // 2 second delay between waves
        }
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
            // Update buff timers
            if (player.invulnerableTimer > 0) {
                player.invulnerableTimer -= this.deltaTime * 1000; // Convert to milliseconds
                if (player.invulnerableTimer <= 0) {
                    player.invulnerableTimer = 0;
                }
            }
            if (player.damageBoostTimer > 0) {
                player.damageBoostTimer -= this.deltaTime * 1000;
                if (player.damageBoostTimer <= 0) {
                    player.damageBoostTimer = 0;
                }
            }
            if (player.speedBoostTimer > 0) {
                player.speedBoostTimer -= this.deltaTime * 1000;
                if (player.speedBoostTimer <= 0) {
                    player.speedBoostTimer = 0;
                }
            }
        }
    }
    spawnEnemy() {
        const enemyTypes = ['slime', 'goblin'];
        const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const config = enemies_json_1.default.find(e => e.id === randomType);
        if (!config)
            return;
        // Scale enemy stats based on wave
        const waveMultiplier = 1 + (this.currentWave - 1) * 0.05; // 5% increase per wave
        const health = Math.floor(config.health * waveMultiplier);
        const damage = Math.floor(config.damage * waveMultiplier);
        const speed = config.speed * 100 * Math.min(1 + (this.currentWave - 1) * 0.05, 2.0); // Scale to pixels per second, max 2x speed
        const enemy = {
            id: `enemy_${this.nextEnemyId++}`,
            x: Math.random() * constants_1.GAME_WIDTH,
            y: Math.random() * constants_1.GAME_HEIGHT,
            health: health,
            maxHealth: health,
            speed: speed,
            damage: damage,
            type: randomType,
            isAlive: true,
            facingDirection: { x: 1, y: 0 }
        };
        this.enemies.set(enemy.id, enemy);
    }
    startWave() {
        this.waveCleared = false;
        const baseEnemies = 3; // Base number of enemies
        const waveEnemies = baseEnemies + Math.floor((this.currentWave - 1) / 2); // +1 enemy every 2 waves
        for (let i = 0; i < waveEnemies; i++) {
            this.spawnEnemy();
        }
    }
    updateEnemies() {
        for (const [enemyId, enemy] of this.enemies) {
            if (!enemy.isAlive)
                continue;
            // Find nearest player
            let nearestPlayer = null;
            let minDistance = Infinity;
            for (const player of this.players.values()) {
                if (player.state === index_1.PlayerState.DEAD)
                    continue;
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestPlayer = player;
                }
            }
            if (nearestPlayer) {
                // Update facing direction
                const dx = nearestPlayer.x - enemy.x;
                const dy = nearestPlayer.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 0) {
                    enemy.facingDirection.x = dx / distance;
                    enemy.facingDirection.y = dy / distance;
                }
                // Move towards player
                if (distance > 0) {
                    enemy.x += (dx / distance) * enemy.speed * this.deltaTime;
                    enemy.y += (dy / distance) * enemy.speed * this.deltaTime;
                }
                // Attack if close
                if (distance < 50) { // attack range
                    if (nearestPlayer.invulnerableTimer <= 0) { // Only damage if not invulnerable
                        nearestPlayer.health -= enemy.damage;
                        if (nearestPlayer.health <= 0) {
                            nearestPlayer.state = index_1.PlayerState.DEAD;
                            // Notify all players that this player died
                            this.wsServer.notifyPlayerDied(nearestPlayer.id);
                            // Check if all players are dead
                            const livingPlayers = Array.from(this.players.values()).filter(p => p.state !== index_1.PlayerState.DEAD);
                            if (livingPlayers.length === 0) {
                                this.endGame();
                            }
                        }
                    }
                }
            }
        }
    }
    updateCollectibles() {
        for (const [collectibleId, collectible] of this.collectibles) {
            // Check if any player is close enough to collect
            for (const [playerId, player] of this.players) {
                if (player.state === index_1.PlayerState.DEAD)
                    continue;
                const dx = player.x - collectible.x;
                const dy = player.y - collectible.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 30) { // collection range
                    // Apply collectible effect
                    this.applyCollectibleToPlayer(player, collectible);
                    // Remove collectible
                    this.collectibles.delete(collectibleId);
                    break; // Only one player can collect it
                }
            }
        }
    }
    applyCollectibleToPlayer(player, collectible) {
        switch (collectible.type) {
            case index_1.CollectibleType.COIN:
                player.score += collectible.value;
                break;
            case index_1.CollectibleType.HEALTH:
                player.health = Math.min(player.maxHealth, player.health + collectible.value);
                break;
            case index_1.CollectibleType.SHIELD:
                player.invulnerableTimer = collectible.value * 1000; // Convert to milliseconds
                break;
            case index_1.CollectibleType.DAMAGE_BOOST:
                player.damageBoostTimer = collectible.value * 1000;
                break;
            case index_1.CollectibleType.SPEED_BOOST:
                player.speedBoostTimer = collectible.value * 1000;
                break;
        }
    }
    spawnRandomCollectible(x, y) {
        const rand = Math.random();
        let type;
        let texture;
        let value;
        if (rand < 0.4) {
            type = index_1.CollectibleType.HEALTH;
            texture = 'health_potion';
            value = 20;
        }
        else if (rand < 0.6) {
            type = index_1.CollectibleType.SHIELD;
            texture = 'shield';
            value = 5; // 5 seconds
        }
        else if (rand < 0.8) {
            type = index_1.CollectibleType.DAMAGE_BOOST;
            texture = 'damage_boost';
            value = 10; // 10 seconds
        }
        else if (rand < 0.9) {
            type = index_1.CollectibleType.SPEED_BOOST;
            texture = 'speed_boost';
            value = 10; // 10 seconds
        }
        else {
            type = index_1.CollectibleType.COIN;
            texture = 'coin';
            value = 10;
        }
        this.spawnCollectible(x, y, type, value);
    }
    spawnCollectible(x, y, type, value = 1) {
        const collectible = {
            id: `collectible_${this.nextCollectibleId++}`,
            x,
            y,
            type,
            value
        };
        this.collectibles.set(collectible.id, collectible);
    }
    getGameState() {
        return {
            players: Array.from(this.players.values()),
            enemies: Array.from(this.enemies.values()),
            collectibles: Array.from(this.collectibles.values()),
            state: this.gameState,
            wave: this.currentWave,
            gameTime: this.gameTime
        };
    }
    getFinalScores() {
        return Array.from(this.players.values()).map(player => ({
            playerId: player.id,
            score: player.score
        }));
    }
}
exports.GameRoom = GameRoom;
