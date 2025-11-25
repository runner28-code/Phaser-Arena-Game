"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = void 0;
const index_1 = require("../shared/types/index");
const constants_1 = require("../shared/config/constants");
const enemies_json_1 = __importDefault(require("../shared/config/enemies.json"));
/**
 * Server-side game room that manages multiplayer game state, players, enemies, and collectibles.
 * Handles game logic, physics updates, and synchronization for all connected players.
 */
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
    /**
     * Checks if a new player can join the game room.
     * @returns True if the room has space and is in waiting state, false otherwise
     */
    canJoin() {
        return this.players.size < this.maxPlayers && this.gameState === index_1.GameState.WAITING;
    }
    /**
     * Adds a new player to the game room.
     * @param playerId - Unique identifier for the player
     * @param playerName - Optional display name for the player
     * @returns True if player was successfully added, false otherwise
     */
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
    /**
     * Removes a player from the game room.
     * @param playerId - The ID of the player to remove
     */
    removePlayer(playerId) {
        this.players.delete(playerId);
        this.wsServer.notifyPlayerLeft(playerId);
        // End game if a player disconnects
        // if (this.gameState === GameState.PLAYING) {
        //   this.endGame();
        // }
    }
    /**
     * Processes incoming messages from players.
     * @param playerId - The ID of the player sending the message
     * @param message - The game message to process
     */
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
        // Store current direction for animation state determination
        player.direction = input.direction;
        // Server-authoritative movement prevents speed hacks and maintains consistency
        // Client sends normalized direction vectors (-1 to 1), server applies actual movement
        if (input.direction) {
            // Only update facing direction when there's actual movement to prevent
            // flickering during diagonal inputs that get normalized
            if (input.direction.x !== 0 || input.direction.y !== 0) {
                player.facingDirection = input.direction;
            }
            // Apply movement without delta time since input is processed per frame
            // This ensures consistent movement regardless of server tick rate
            player.x += input.direction.x * player.speed;
            player.y += input.direction.y * player.speed;
            // Boundary checking prevents players from escaping the arena
            // Math.max/Math.min is more performant than Phaser.Math.Clamp for simple bounds
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
            if (distance < 30) { // attack range
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
    /**
     * Updates the game state for the current frame.
     * Handles player updates, enemy AI, collectible collection, and wave progression.
     */
    update() {
        if (this.gameState !== index_1.GameState.PLAYING)
            return;
        this.gameTime += this.deltaTime;
        this.updatePlayers();
        this.updateEnemies();
        this.updateCollectibles();
        // Wave progression creates increasing difficulty and pacing
        // Only advance when all enemies are defeated (not just when waveCleared flag is set)
        if (!this.waveCleared && this.enemies.size === 0) {
            this.waveCleared = true; // Prevent multiple triggers
            this.currentWave++;
            // Delay next wave to give players breathing room and time to collect items
            // 2 seconds allows for collectible gathering without feeling rushed
            setTimeout(() => {
                this.startWave();
            }, 2000);
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
            // Update buff timers using delta time for frame-rate independent duration
            // Convert deltaTime (seconds) to milliseconds for timer consistency
            if (player.invulnerableTimer > 0) {
                player.invulnerableTimer -= this.deltaTime * 1000;
                if (player.invulnerableTimer <= 0) {
                    player.invulnerableTimer = 0; // Prevent negative values
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
        // Scale enemy stats based on wave for progressive difficulty
        // 5% increase per wave provides noticeable but not overwhelming scaling
        const waveMultiplier = 1 + (this.currentWave - 1) * 0.05;
        const health = Math.floor(config.health * waveMultiplier);
        const damage = Math.floor(config.damage * waveMultiplier);
        // Convert config speed (likely 0-1 range) to pixels per second with wave scaling
        // Cap at 2x base speed to prevent enemies from becoming too fast to dodge
        const speed = config.speed * 100 * Math.min(1 + (this.currentWave - 1) * 0.05, 2.0);
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
            isAttacking: false,
            facingDirection: { x: 1, y: 0 }
        };
        this.enemies.set(enemy.id, enemy);
    }
    startWave() {
        this.waveCleared = false;
        // Calculate enemy count with gradual increase for sustainable difficulty curve
        const baseEnemies = 3; // Starting enemies per wave
        // Add 1 enemy every 2 waves (wave 1: 3, wave 2: 3, wave 3: 4, wave 4: 4, etc.)
        // This creates manageable difficulty progression without overwhelming spikes
        const waveEnemies = baseEnemies + Math.floor((this.currentWave - 1) / 2);
        for (let i = 0; i < waveEnemies; i++) {
            this.spawnEnemy();
        }
    }
    updateEnemies() {
        const now = Date.now();
        for (const [enemyId, enemy] of this.enemies) {
            if (!enemy.isAlive)
                continue;
            // Reset attack state if attack duration has passed
            if (enemy.isAttacking && enemy.attackEndTime && now > enemy.attackEndTime) {
                enemy.isAttacking = false;
            }
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
                // Calculate direction to player for both movement and facing
                const dx = nearestPlayer.x - enemy.x;
                const dy = nearestPlayer.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                // Normalize direction vector for consistent facing regardless of distance
                if (distance > 0) {
                    enemy.facingDirection.x = dx / distance;
                    enemy.facingDirection.y = dy / distance;
                }
                // Move towards player only when not attacking to prevent movement during attack animation
                // This creates more predictable enemy behavior and prevents attack interruption
                if (distance > 0 && !enemy.isAttacking) {
                    enemy.x += (dx / distance) * enemy.speed * this.deltaTime;
                    enemy.y += (dy / distance) * enemy.speed * this.deltaTime;
                }
                // Attack range check - close enough to hit but not too close to prevent getting stuck
                // 30 units provides balance between aggression and player maneuverability
                if (distance < 30 && !enemy.isAttacking) {
                    enemy.isAttacking = true;
                    // Attack duration matches animation length for visual consistency
                    enemy.attackEndTime = now + 300;
                    // Respect invulnerability frames to prevent unfair damage
                    if (nearestPlayer.invulnerableTimer <= 0) {
                        nearestPlayer.health -= enemy.damage;
                        if (nearestPlayer.health <= 0) {
                            nearestPlayer.state = index_1.PlayerState.DEAD;
                            // Broadcast death to all clients for immediate UI updates
                            this.wsServer.notifyPlayerDied(nearestPlayer.id);
                            // End game if no living players remain (handles both single and multiplayer)
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
        // Weighted random selection favors health potions for player survivability
        // Power-ups are less common to maintain balance and excitement
        const rand = Math.random();
        let type;
        let texture;
        let value;
        if (rand < 0.4) { // 40% chance - Most common for healing
            type = index_1.CollectibleType.HEALTH;
            texture = 'health_potion';
            value = 20;
        }
        else if (rand < 0.6) { // 20% chance - Defensive power-up
            type = index_1.CollectibleType.SHIELD;
            texture = 'shield';
            value = 5; // 5 seconds of invulnerability
        }
        else if (rand < 0.8) { // 20% chance - Offensive power-up
            type = index_1.CollectibleType.DAMAGE_BOOST;
            texture = 'damage_boost';
            value = 10; // 10 seconds of 1.5x damage
        }
        else if (rand < 0.9) { // 10% chance - Mobility power-up
            type = index_1.CollectibleType.SPEED_BOOST;
            texture = 'speed_boost';
            value = 10; // 10 seconds of 1.5x speed
        }
        else { // 10% chance - Score currency
            type = index_1.CollectibleType.COIN;
            texture = 'coin';
            value = 10; // Score points
        }
        this.spawnCollectible(x, y, type, value);
    }
    spawnCollectible(x, y, type, value = 1) {
        // Add random offset to prevent immediate collection by the player who killed the enemy
        // This creates fair gameplay by requiring players to move to collect items
        const offsetX = (Math.random() - 0.5) * 40; // +/- 20 pixels
        const offsetY = (Math.random() - 0.5) * 40;
        const collectible = {
            id: `collectible_${this.nextCollectibleId++}`,
            x: x + offsetX,
            y: y + offsetY,
            type,
            value
        };
        this.collectibles.set(collectible.id, collectible);
    }
    /**
     * Gets the current complete game state for synchronization.
     * @returns The full game state including players, enemies, collectibles, and metadata
     */
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
    /**
     * Gets the final scores for all players at game end.
     * @returns Array of player scores for leaderboard/ranking
     */
    getFinalScores() {
        return Array.from(this.players.values()).map(player => ({
            playerId: player.id,
            score: player.score
        }));
    }
}
exports.GameRoom = GameRoom;
