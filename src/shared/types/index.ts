// ===== SHARED TYPES FOR MULTIPLAYER GAME =====

// Message types for client-server communication
export enum MessageType {
   // Lobby messages
   JOIN_GAME = 'JOIN_GAME',
   LEAVE_GAME = 'LEAVE_GAME',

   // Game messages
   PLAYER_INPUT = 'PLAYER_INPUT',
   GAME_STATE_UPDATE = 'GAME_STATE_UPDATE',
   PLAYER_JOINED = 'PLAYER_JOINED',
   PLAYER_LEFT = 'PLAYER_LEFT',
   YOU_JOINED = 'YOU_JOINED',
   GAME_START = 'GAME_START',
   GAME_END = 'GAME_END',
}

// Game state enums
export enum GameState {
   WAITING = 'WAITING',
   PLAYING = 'PLAYING',
   FINISHED = 'FINISHED',
}

export enum PlayerState {
   ALIVE = 'ALIVE',
   DEAD = 'DEAD',
}

// ===== DATA STRUCTURES =====

// Player data
export interface PlayerData {
     id: string;
     x: number;
     y: number;
     health: number;
     maxHealth: number;
     speed: number;
     damage: number;
     state: PlayerState;
     direction: { x: number; y: number };
     facingDirection: { x: number; y: number };
     lastAttackTime: number;
     score: number;
     isAttacking: boolean;
     attackEndTime: number;
     currentState: 'idle' | 'walking' | 'attacking';
}

// Enemy data
export interface EnemyData {
   id: string;
   x: number;
   y: number;
   health: number;
   maxHealth: number;
   speed: number;
   damage: number;
   type: EnemyType;
   isAlive: boolean;
}

// Collectible data
export interface CollectibleData {
   id: string;
   x: number;
   y: number;
   type: CollectibleType;
   value: number;
}

// Complete game state
export interface GameStateData {
   players: PlayerData[];
   enemies: EnemyData[];
   collectibles: CollectibleData[];
   state: GameState;
   wave: number;
   gameTime: number;
}

// ===== MESSAGE PAYLOADS =====

// Client to server messages
export interface JoinGamePayload {
   playerName?: string;
}

export interface PlayerInputPayload {
   direction: { x: number; y: number };
   action?: 'attack';
}

// Server to client messages
export interface GameStateUpdatePayload {
   gameState: GameStateData;
   timestamp: number;
}

export interface YouJoinedPayload {
   playerId: string;
   player: PlayerData;
}

export interface PlayerJoinedPayload {
   player: PlayerData;
}

export interface PlayerLeftPayload {
   playerId: string;
}

export interface GameStartPayload {
   gameState: GameStateData;
}

export interface GameEndPayload {
   winner?: string;
   finalScores: { playerId: string; score: number }[];
}

// Generic message structure
export interface GameMessage {
   type: MessageType;
   data: any;
   timestamp?: number;
}

// ===== SINGLE PLAYER TYPES =====

export enum UpgradeType {
    DAMAGE = 'DAMAGE',
    SPEED = 'SPEED',
    HEALTH = 'HEALTH',
}

export interface UpgradeOption {
    type: UpgradeType;
    name: string;
    description: string;
    icon: string;
}

export interface PlayerUpgrades {
    damageLevel: number;
    speedLevel: number;
    healthLevel: number;
}

export enum PlayerStateEnum {
    IDLE = 'IDLE',
    WALKING = 'WALKING',
    ATTACKING = 'ATTACKING',
    DEAD = 'DEAD',
}

export enum EnemyType {
    SLIME = 'SLIME',
    GOBLIN = 'GOBLIN',
    ORC = 'ORC',
}

export enum CollectibleType {
    HEALTH = 'health',
    COIN = 'coin',
    SHIELD = 'shield',
    DAMAGE_BOOST = 'damage_boost',
    SPEED_BOOST = 'speed_boost',
}

export interface EnemyConfig {
    id: string;
    name: string;
    health: number;
    speed: number;
    damage: number;
    animations: {
      idle: string;
      walk: string;
      attack: string;
      death: string;
    };
}

export interface Collectible {
    id: string;
    x: number;
    y: number;
    type: CollectibleType;
    value: number;
}

// Scene data interfaces
export interface GameOverSceneData {
   score: number;
   time: number;
}

export interface UpgradeSceneData {
   upgrades: UpgradeOption[];
   onSelect: (upgrade: UpgradeType) => void;
}
