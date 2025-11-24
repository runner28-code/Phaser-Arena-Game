"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameScene = void 0;
const phaser_1 = __importDefault(require("phaser"));
const constants_1 = require("../../shared/config/constants");
const Player_1 = require("../entities/Player");
const RemotePlayer_1 = require("../entities/RemotePlayer");
const Enemy_1 = require("../entities/Enemy");
const Collectible_1 = require("../entities/Collectible");
const SpawnManager_1 = require("../systems/SpawnManager");
const ObjectPool_1 = require("../systems/ObjectPool");
const NetworkManager_1 = require("../network/NetworkManager");
const UpgradeScene_1 = require("./UpgradeScene");
const types_1 = require("../../shared/types");
class GameScene extends phaser_1.default.Scene {
    constructor() {
        super({ key: 'Game' });
        this.mode = 'single';
        this.remotePlayers = new Map();
        this.buffTexts = [];
        this.upgradeTexts = [];
        this.gameTimer = 0;
        this.currentHealthBarWidth = 200;
        this.projectilePool = []; // Pool for projectile bodies
    }
    init(data) {
        this.mode = data.mode || 'single';
    }
    create() {
        // Set up matter world bounds
        this.matter.world.setBounds(0, 0, constants_1.GAME_WIDTH, constants_1.GAME_HEIGHT);
        // Create static boundary bodies
        this.createBoundaries();
        // Set up collision event listeners
        this.setupCollisionListeners();
        // Initialize object pools (needed for both modes)
        this.initializePools();
        // Create UI container (needed before mode-specific initialization)
        this.uiContainer = this.add.container(0, 0);
        // Create player at center
        this.player = new Player_1.Player(this, constants_1.GAME_WIDTH / 2, constants_1.GAME_HEIGHT / 2, 'player_idle');
        if (this.mode === 'multi') {
            // Initialize network manager for multiplayer
            this.networkManager = new NetworkManager_1.NetworkManager('ws://localhost:8080');
            this.networkManager.connect().then(() => {
                console.log('Connected to multiplayer server');
                this.setupNetworkHandlers();
                this.networkManager.joinGame();
            }).catch((error) => {
                console.error('Failed to connect to server:', error);
                // Fallback to single player
                this.mode = 'single';
                this.initializeSinglePlayer();
            });
        }
        else {
            this.initializeSinglePlayer();
        }
        // Create waiting text (for multiplayer)
        this.waitingText = this.add.text(constants_1.GAME_WIDTH / 2, constants_1.GAME_HEIGHT / 2, '', {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.uiContainer.add(this.waitingText);
        // Create player count text (for multiplayer)
        this.playerCountText = this.add.text(10, 70, 'Players: 1', {
            fontSize: '24px',
            color: '#ffffff'
        });
        this.uiContainer.add(this.playerCountText);
        // Create health bar
        this.createHealthBar();
        // Create score display
        this.scoreText = this.add.text(constants_1.GAME_WIDTH - 10, 10, `Score: ${this.player.score}`, {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(1, 0);
        this.uiContainer.add(this.scoreText);
        // Create timer display
        this.timerText = this.add.text(constants_1.GAME_WIDTH / 2, 10, `Time: 0.0s`, {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5, 0);
        this.uiContainer.add(this.timerText);
        // Add mode text
        const modeText = this.add.text(10, 10, `Mode: ${this.mode}`, {
            fontSize: '24px',
            color: '#ffffff'
        });
        this.uiContainer.add(modeText);
        // Start background music
        this.startBackgroundMusic();
    }
    createBoundaries() {
        // Top wall
        this.matter.add.rectangle(constants_1.GAME_WIDTH / 2, -10, constants_1.GAME_WIDTH, 20, {
            isStatic: true,
            collisionFilter: { category: constants_1.COLLISION_CATEGORY_OBSTACLE }
        });
        // Bottom wall
        this.matter.add.rectangle(constants_1.GAME_WIDTH / 2, constants_1.GAME_HEIGHT + 10, constants_1.GAME_WIDTH, 20, {
            isStatic: true,
            collisionFilter: { category: constants_1.COLLISION_CATEGORY_OBSTACLE }
        });
        // Left wall
        this.matter.add.rectangle(-10, constants_1.GAME_HEIGHT / 2, 20, constants_1.GAME_HEIGHT, {
            isStatic: true,
            collisionFilter: { category: constants_1.COLLISION_CATEGORY_OBSTACLE }
        });
        // Right wall
        this.matter.add.rectangle(constants_1.GAME_WIDTH + 10, constants_1.GAME_HEIGHT / 2, 20, constants_1.GAME_HEIGHT, {
            isStatic: true,
            collisionFilter: { category: constants_1.COLLISION_CATEGORY_OBSTACLE }
        });
    }
    createHealthBar() {
        const barWidth = 200;
        const barHeight = 20;
        const barX = 10;
        const barY = constants_1.GAME_HEIGHT - 30;
        // Background
        this.healthBarBackground = this.add.graphics();
        this.healthBarBackground.fillStyle(0xff0000);
        this.healthBarBackground.fillRect(barX, barY, barWidth, barHeight);
        this.uiContainer.add(this.healthBarBackground);
        // Fill
        this.currentHealthBarWidth = barWidth * (this.player.health / this.player.maxHealth);
        this.healthBarFill = this.add.graphics();
        this.healthBarFill.fillStyle(0x00ff00);
        this.healthBarFill.fillRect(barX, barY, this.currentHealthBarWidth, barHeight);
        this.uiContainer.add(this.healthBarFill);
    }
    updateHealthBar() {
        const barWidth = 200;
        const barHeight = 20;
        const barX = 10;
        const barY = constants_1.GAME_HEIGHT - 30;
        const targetWidth = barWidth * (this.player.health / this.player.maxHealth);
        if (this.currentHealthBarWidth !== targetWidth) {
            this.tweens.add({
                targets: { width: this.currentHealthBarWidth },
                width: targetWidth,
                duration: 300,
                ease: 'Power2',
                onUpdate: (tween) => {
                    this.currentHealthBarWidth = tween.getValue();
                    this.healthBarFill.clear();
                    this.healthBarFill.fillStyle(0x00ff00);
                    this.healthBarFill.fillRect(barX, barY, this.currentHealthBarWidth, barHeight);
                }
            });
        }
    }
    setupCollisionListeners() {
        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;
                // Player vs obstacle collision (walls)
                if ((bodyA.gameObject === this.player && bodyB.collisionFilter.category === constants_1.COLLISION_CATEGORY_OBSTACLE) ||
                    (bodyB.gameObject === this.player && bodyA.collisionFilter.category === constants_1.COLLISION_CATEGORY_OBSTACLE)) {
                    // Player hit obstacle - movement already prevented by physics
                }
                // Player vs Enemy collision (single-player only)
                if ((bodyA.gameObject === this.player && bodyB.collisionFilter.category === constants_1.COLLISION_CATEGORY_ENEMY) ||
                    (bodyB.gameObject === this.player && bodyA.collisionFilter.category === constants_1.COLLISION_CATEGORY_ENEMY)) {
                    const enemyBody = bodyA.gameObject === this.player ? bodyB : bodyA;
                    const enemy = enemyBody.gameObject;
                    if (enemy && enemy.damage) {
                        this.player.takeDamage(enemy.damage);
                    }
                }
                // Player vs Collectible collision (single-player only)
                if ((bodyA.gameObject === this.player && bodyB.collisionFilter.category === constants_1.COLLISION_CATEGORY_COLLECTIBLE) ||
                    (bodyB.gameObject === this.player && bodyA.collisionFilter.category === constants_1.COLLISION_CATEGORY_COLLECTIBLE)) {
                    const collectibleBody = bodyA.gameObject === this.player ? bodyB : bodyA;
                    const collectible = collectibleBody.gameObject;
                    if (collectible && typeof collectible.collect === 'function') {
                        collectible.collect(this.player);
                        // Release back to pool
                        this.collectiblePool.release(collectible);
                    }
                }
            });
        });
    }
    update(delta) {
        if (this.mode === 'multi' && this.networkManager) {
            // Multiplayer mode
            this.updateMultiplayer(delta);
        }
        else {
            // Single player mode
            this.updateSinglePlayer(delta);
        }
    }
    initializePools() {
        // Enemy pool
        this.enemyPool = new ObjectPool_1.ObjectPool((type, x, y) => {
            const enemy = Enemy_1.Enemy.createEnemy(type, this, x, y);
            if (enemy) {
                enemy.setActive(false);
                enemy.setVisible(false);
            }
            return enemy;
        }, (enemy) => {
            enemy.reset();
        }, 20, // initial size
        100 // max size
        );
        // Collectible pool
        this.collectiblePool = new ObjectPool_1.ObjectPool((texture, type, value, x, y) => {
            const collectible = new Collectible_1.Collectible(this, x, y, texture, type, value);
            return collectible;
        }, (collectible) => {
            collectible.reset();
        }, 10, // initial size
        50 // max size
        );
        // Pre-populate projectile pool
        for (let i = 0; i < 20; i++) {
            const projectile = this.matter.add.circle(0, 0, 8, { isSensor: true });
            projectile.collisionFilter = { category: constants_1.COLLISION_CATEGORY_ATTACK, mask: constants_1.COLLISION_CATEGORY_ENEMY, group: 0 };
            this.matter.world.remove(projectile); // Remove from world initially
            this.projectilePool.push(projectile);
        }
    }
    getProjectile(x, y, mask) {
        let projectile = this.projectilePool.pop();
        if (!projectile) {
            projectile = this.matter.add.circle(x, y, 8, { isSensor: true });
            projectile.collisionFilter = { category: constants_1.COLLISION_CATEGORY_ATTACK, mask: mask, group: 0 };
        }
        else {
            // Reset position
            projectile.position.x = x;
            projectile.position.y = y;
            projectile.velocity.x = 0;
            projectile.velocity.y = 0;
            projectile.collisionFilter = { category: constants_1.COLLISION_CATEGORY_ATTACK, mask: mask, group: 0 };
            this.matter.world.add(projectile); // Add back to world
        }
        return projectile;
    }
    releaseProjectile(projectile) {
        this.matter.world.remove(projectile);
        if (this.projectilePool.length < 50) { // Max pool size
            this.projectilePool.push(projectile);
        }
    }
    initializeSinglePlayer() {
        // Create spawn manager with level up callback
        this.spawnManager = new SpawnManager_1.SpawnManager(this, this.player, this.enemyPool, () => this.showUpgradeSelection());
        // Start first wave
        this.spawnManager.startWave();
        // Add wave text for single player
        this.waveText = this.add.text(10, 40, `Wave: 1`, {
            fontSize: '24px',
            color: '#ffffff'
        });
        this.uiContainer.add(this.waveText);
        // Initialize upgrade UI
        this.updateUpgradeUI();
    }
    updateBuffUI() {
        // Clear existing texts
        this.buffTexts.forEach(text => text.destroy());
        this.buffTexts = [];
        const timers = this.player.getBuffTimers();
        let yOffset = 70;
        if (timers.invulnerable > 0) {
            const text = this.add.text(10, yOffset, `Shield: ${timers.invulnerable.toFixed(1)}s`, {
                fontSize: '20px',
                color: '#0000ff'
            });
            this.buffTexts.push(text);
            this.uiContainer.add(text);
            yOffset += 25;
        }
        if (timers.damageBoost > 0) {
            const text = this.add.text(10, yOffset, `Damage Boost: ${timers.damageBoost.toFixed(1)}s`, {
                fontSize: '20px',
                color: '#ff0000'
            });
            this.buffTexts.push(text);
            this.uiContainer.add(text);
            yOffset += 25;
        }
        if (timers.speedBoost > 0) {
            const text = this.add.text(10, yOffset, `Speed Boost: ${timers.speedBoost.toFixed(1)}s`, {
                fontSize: '20px',
                color: '#ffff00'
            });
            this.buffTexts.push(text);
            this.uiContainer.add(text);
        }
    }
    showUpgradeSelection() {
        // Pause the game
        this.scene.pause();
        // Generate random upgrades
        const upgrades = UpgradeScene_1.UpgradeScene.generateRandomUpgrades(3);
        // Show upgrade scene
        this.scene.launch('Upgrade', {
            upgrades: upgrades,
            onSelect: (upgradeType) => {
                this.player.applyUpgrade(upgradeType);
                this.updateUpgradeUI();
                // Resume the next wave
                if (this.spawnManager) {
                    this.time.delayedCall(1000, () => {
                        this.spawnManager.startWave();
                    });
                }
            }
        });
    }
    updateUpgradeUI() {
        // Clear existing upgrade texts
        this.upgradeTexts.forEach(text => text.destroy());
        this.upgradeTexts = [];
        const upgrades = this.player.getUpgrades();
        let yOffset = constants_1.GAME_HEIGHT - 100;
        // Damage upgrade
        if (upgrades.damageLevel > 0) {
            const text = this.add.text(10, yOffset, `Damage: ${upgrades.damageLevel}`, {
                fontSize: '18px',
                color: '#ff4444'
            });
            this.upgradeTexts.push(text);
            this.uiContainer.add(text);
            yOffset += 25;
        }
        // Speed upgrade
        if (upgrades.speedLevel > 0) {
            const text = this.add.text(10, yOffset, `Speed: ${upgrades.speedLevel}`, {
                fontSize: '18px',
                color: '#44ff44'
            });
            this.upgradeTexts.push(text);
            this.uiContainer.add(text);
            yOffset += 25;
        }
        // Health upgrade
        if (upgrades.healthLevel > 0) {
            const text = this.add.text(10, yOffset, `Health: ${upgrades.healthLevel}`, {
                fontSize: '18px',
                color: '#4444ff'
            });
            this.upgradeTexts.push(text);
            this.uiContainer.add(text);
        }
    }
    startBackgroundMusic() {
        if (this.sound.get('background_music')) {
            const music = this.sound.add('background_music', { loop: true, volume: 0.5 });
            music.play();
        }
    }
    updateSinglePlayer(delta) {
        // Check for player death
        if (this.player.state === types_1.PlayerStateEnum.DEAD) {
            const gameOverData = {
                score: this.player.score,
                time: this.gameTimer / 1000
            };
            this.scene.start('GameOver', gameOverData);
            return;
        }
        // Update player (handles movement and animation)
        this.player.update(delta);
        if (this.spawnManager) {
            this.spawnManager.update(delta);
        }
        // Update game timer
        this.gameTimer += delta;
        // Update UI
        this.updateHealthBar();
        this.scoreText.setText(`Score: ${this.player.score}`);
        this.timerText.setText(`Time: ${(this.gameTimer / 1000).toFixed(1)}s`);
        if (this.spawnManager) {
            this.waveText.setText(`Wave: ${this.spawnManager.getCurrentWave()}`);
        }
        this.updateBuffUI();
    }
    updateMultiplayer(delta) {
        if (!this.networkManager)
            return;
        // Send player input to server (server-authoritative movement)
        const direction = this.getPlayerInputDirection();
        const action = this.getPlayerAction();
        // Update player's facing direction based on input for animation
        if (direction.x !== 0 || direction.y !== 0) {
            this.player.facingDirection = direction;
        }
        this.networkManager.sendInput(direction, action === 'attack' ? 'attack' : undefined);
        // Update game timer
        this.gameTimer += delta;
        // Update UI
        this.updateHealthBar();
    }
    getPlayerInputDirection() {
        let x = 0;
        let y = 0;
        const cursors = this.input.keyboard.createCursorKeys();
        const wasd = {
            up: this.input.keyboard.addKey(phaser_1.default.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(phaser_1.default.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(phaser_1.default.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(phaser_1.default.Input.Keyboard.KeyCodes.D),
        };
        if (cursors.left.isDown || wasd.left.isDown)
            x = -1;
        if (cursors.right.isDown || wasd.right.isDown)
            x = 1;
        if (cursors.up.isDown || wasd.up.isDown)
            y = -1;
        if (cursors.down.isDown || wasd.down.isDown)
            y = 1;
        return { x, y };
    }
    getPlayerAction() {
        const attackKey = this.input.keyboard.addKey(phaser_1.default.Input.Keyboard.KeyCodes.SPACE);
        if (phaser_1.default.Input.Keyboard.JustDown(attackKey)) {
            return 'attack';
        }
        return undefined;
    }
    setupNetworkHandlers() {
        if (!this.networkManager)
            return;
        this.networkManager.onYouJoined((payload) => {
            console.log('You joined the game with ID:', payload.playerId);
        });
        this.networkManager.onGameStateUpdate((payload) => {
            this.handleGameStateUpdate(payload.gameState);
        });
        this.networkManager.onPlayerJoined((payload) => {
            console.log('Player joined:', payload.player.id);
        });
        this.networkManager.onPlayerLeft((payload) => {
            console.log('Player left:', payload.playerId);
            this.remotePlayers.delete(payload.playerId);
        });
        this.networkManager.onGameStart((payload) => {
            console.log('Game started');
            this.waitingText.setText('');
        });
        this.networkManager.onGameEnd((payload) => {
            console.log('Game ended');
            // Handle game end - show winner
            const winner = payload.winner;
            if (winner) {
                this.waitingText.setText(`Game Over! Winner: Player ${winner}`);
            }
            else {
                this.waitingText.setText('Game Over!');
            }
            // Return to menu after a delay
            this.time.delayedCall(3000, () => {
                this.scene.start('MainMenu');
            });
        });
    }
    handleGameStateUpdate(gameState) {
        if (!this.player || !this.player.body) {
            console.warn('Player or body not ready');
            return;
        }
        // Update local player from server state
        const localPlayerData = gameState.players.find(p => p.id === this.networkManager.getPlayerId());
        if (localPlayerData) {
            // Store previous position for animation determination
            const prevX = this.player.x;
            const prevY = this.player.y;
            // Update position directly (server-authoritative)
            this.player.x = localPlayerData.x;
            this.player.y = localPlayerData.y;
            this.player.health = localPlayerData.health;
            this.player.maxHealth = localPlayerData.maxHealth;
            // Sync facing direction with server data
            this.player.facingDirection = localPlayerData.facingDirection;
            this.player.score = localPlayerData.score;
            this.player.setLastAttackTime(localPlayerData.lastAttackTime);
            // Update animation based on current state
            let dir = 'down'; // default
            if (localPlayerData.facingDirection.x > 0) {
                dir = 'right';
            }
            else if (localPlayerData.facingDirection.x < 0) {
                dir = 'left';
            }
            else if (localPlayerData.facingDirection.y > 0) {
                dir = 'down';
            }
            else if (localPlayerData.facingDirection.y < 0) {
                dir = 'up';
            }
            if (localPlayerData.currentState === 'attacking') {
                this.player.state = types_1.PlayerStateEnum.ATTACKING;
                this.player.anims.play(`player-attack_${dir}`, true);
            }
            else if (localPlayerData.currentState === 'walking') {
                this.player.state = types_1.PlayerStateEnum.WALKING;
                this.player.anims.play(`player-walk_${dir}`, true);
            }
            else {
                this.player.state = types_1.PlayerStateEnum.IDLE;
                this.player.anims.play(`player-idle_${dir}`, true);
            }
            // Handle death
            if (localPlayerData.state === types_1.PlayerState.DEAD && this.player.health > 0) {
                this.player.health = 0; // Ensure health is 0
                this.player.state = types_1.PlayerStateEnum.DEAD;
                this.player.anims.play('player-death');
                this.player.setActive(false);
                this.player.setVisible(false);
            }
            // Handle revival
            if (localPlayerData.state === types_1.PlayerState.ALIVE && this.player.health <= 0) {
                this.player.health = localPlayerData.health;
                this.player.state = types_1.PlayerStateEnum.IDLE;
                this.player.setActive(true);
                this.player.setVisible(true);
            }
        }
        // Update remote players
        this.updateRemotePlayers(gameState.players);
        // Update UI
        this.updateUIFromServer(gameState);
    }
    updateRemotePlayers(players) {
        const localPlayerId = this.networkManager.getPlayerId();
        // Update existing remote players
        players.forEach(playerData => {
            if (playerData.id === localPlayerId)
                return;
            let remotePlayer = this.remotePlayers.get(playerData.id);
            if (!remotePlayer) {
                remotePlayer = new RemotePlayer_1.RemotePlayer(this, playerData.x, playerData.y, 'player_idle');
                remotePlayer.setPlayerId(playerData.id);
                this.remotePlayers.set(playerData.id, remotePlayer);
            }
            if (remotePlayer && remotePlayer.body) {
                remotePlayer.update(16.67, playerData); // Assume 60 FPS delta
            }
        });
        // Remove disconnected players
        const currentPlayerIds = new Set(players.map(p => p.id));
        this.remotePlayers.forEach((remotePlayer, id) => {
            if (!currentPlayerIds.has(id)) {
                remotePlayer.destroy();
                this.remotePlayers.delete(id);
            }
        });
    }
    updateUIFromServer(gameState) {
        this.playerCountText.setText(`Players: ${gameState.players.length}`);
        if (gameState.state === types_1.GameState.WAITING) {
            this.waitingText.setText('Waiting for another player...');
        }
        else if (gameState.state === types_1.GameState.PLAYING) {
            this.waitingText.setText('');
        }
        else if (gameState.state === types_1.GameState.FINISHED) {
            this.waitingText.setText('Game Finished');
        }
    }
    destroy() {
        // Remove collision listeners
        this.matter.world.off('collisionstart');
        // Destroy player
        if (this.player) {
            this.player.destroy();
        }
        // Destroy remote players
        this.remotePlayers.forEach(remotePlayer => remotePlayer.destroy());
        this.remotePlayers.clear();
        // Destroy single-player enemies
        if (this.spawnManager) {
            const activeEnemies = this.spawnManager.activeEnemies;
            if (activeEnemies) {
                activeEnemies.forEach((enemy) => {
                    enemy.destroy();
                    this.enemyPool.release(enemy);
                });
            }
        }
        // Disconnect network
        if (this.networkManager) {
            this.networkManager.disconnect();
        }
        // Destroy UI elements
        if (this.uiContainer) {
            this.uiContainer.destroy();
        }
        // Stop background music
        const music = this.sound.get('background_music');
        if (music && music.isPlaying) {
            music.stop();
        }
    }
}
exports.GameScene = GameScene;
