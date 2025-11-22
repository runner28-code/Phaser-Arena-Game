export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const SERVER_PORT = 8080;
export const UPDATE_RATE = 20;
export const INPUT_RATE = 60;
export const TILE_SIZE = 32;
export const PLAYER_SPEED = 1;
export const PLAYER_HEALTH = 100;
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_DAMAGE = 20;
export const ATTACK_COOLDOWN = 50;
export const ENEMY_SPEED_BASE = 50;

// Matter.js collision categories
export const COLLISION_CATEGORY_PLAYER = 0x0001;
export const COLLISION_CATEGORY_ENEMY = 0x0002;
export const COLLISION_CATEGORY_ATTACK = 0x0004;
export const COLLISION_CATEGORY_COLLECTIBLE = 0x0008;
export const COLLISION_CATEGORY_OBSTACLE = 0x0010;