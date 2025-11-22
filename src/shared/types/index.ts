export enum MessageType {
  JOIN = 'JOIN',
  CREATE_ROOM = 'CREATE_ROOM',
  JOIN_ROOM = 'JOIN_ROOM',
  INPUT = 'INPUT',
  STATE_UPDATE = 'STATE_UPDATE',
  ROOM_JOINED = 'ROOM_JOINED',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
}

export enum GameState {
  WAITING = 'WAITING',
  STARTING = 'STARTING',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED',
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

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  isAlive: boolean;
  lastAttackTime: number;
  direction: { x: number; y: number };
}

export interface EnemyState {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  isAlive: boolean;
  type: EnemyType;
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

export interface Message {
  type: MessageType;
  data: any;
}

// Message payload interfaces
export interface JoinPayload {
  playerName: string;
}

export interface CreateRoomPayload {
  roomName: string;
}

export interface JoinRoomPayload {
  roomId: string;
}

export interface RoomJoinedPayload {
  roomId: string;
  playerId: string;
}

export interface PlayerJoinedPayload {
  playerId: string;
  playerName: string;
}

export interface PlayerLeftPayload {
  playerId: string;
}

export interface StateUpdatePayload {
  roomState: RoomState;
}

// MessagePack serialized message interface
export interface SerializedMessage {
  type: MessageType;
  data: Buffer;
}

export interface RoomState {
  id: string;
  players: PlayerState[];
  enemies: EnemyState[];
  collectibles: Collectible[];
  state: GameState;
  wave: number;
}

export interface Collectible {
  id: string;
  x: number;
  y: number;
  type: CollectibleType;
  value: number;
}

export interface InputMessage {
  playerId: string;
  direction: { x: number; y: number };
  action?: string;
}

// Scene data interfaces
export interface GameSceneData {
  mode: 'single' | 'multi';
}

export interface GameOverSceneData {
  score: number;
  time: number;
  mode: 'single' | 'multi';
}

export interface UpgradeSceneData {
  upgrades: UpgradeOption[];
  onSelect: (upgrade: UpgradeType) => void;
}