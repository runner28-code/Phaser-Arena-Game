"use strict";
// ===== SHARED TYPES FOR MULTIPLAYER GAME =====
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectibleType = exports.EnemyType = exports.PlayerStateEnum = exports.UpgradeType = exports.PlayerState = exports.GameState = exports.MessageType = void 0;
// Message types for client-server communication
var MessageType;
(function (MessageType) {
    // Lobby messages
    MessageType["JOIN_GAME"] = "JOIN_GAME";
    MessageType["LEAVE_GAME"] = "LEAVE_GAME";
    // Game messages
    MessageType["PLAYER_INPUT"] = "PLAYER_INPUT";
    MessageType["GAME_STATE_UPDATE"] = "GAME_STATE_UPDATE";
    MessageType["PLAYER_JOINED"] = "PLAYER_JOINED";
    MessageType["PLAYER_LEFT"] = "PLAYER_LEFT";
    MessageType["YOU_JOINED"] = "YOU_JOINED";
    MessageType["GAME_START"] = "GAME_START";
    MessageType["GAME_END"] = "GAME_END";
})(MessageType || (exports.MessageType = MessageType = {}));
// Game state enums
var GameState;
(function (GameState) {
    GameState["WAITING"] = "WAITING";
    GameState["PLAYING"] = "PLAYING";
    GameState["FINISHED"] = "FINISHED";
})(GameState || (exports.GameState = GameState = {}));
var PlayerState;
(function (PlayerState) {
    PlayerState["ALIVE"] = "ALIVE";
    PlayerState["DEAD"] = "DEAD";
})(PlayerState || (exports.PlayerState = PlayerState = {}));
// ===== SINGLE PLAYER TYPES =====
var UpgradeType;
(function (UpgradeType) {
    UpgradeType["DAMAGE"] = "DAMAGE";
    UpgradeType["SPEED"] = "SPEED";
    UpgradeType["HEALTH"] = "HEALTH";
})(UpgradeType || (exports.UpgradeType = UpgradeType = {}));
var PlayerStateEnum;
(function (PlayerStateEnum) {
    PlayerStateEnum["IDLE"] = "IDLE";
    PlayerStateEnum["WALKING"] = "WALKING";
    PlayerStateEnum["ATTACKING"] = "ATTACKING";
    PlayerStateEnum["DEAD"] = "DEAD";
})(PlayerStateEnum || (exports.PlayerStateEnum = PlayerStateEnum = {}));
var EnemyType;
(function (EnemyType) {
    EnemyType["SLIME"] = "SLIME";
    EnemyType["GOBLIN"] = "GOBLIN";
    EnemyType["ORC"] = "ORC";
})(EnemyType || (exports.EnemyType = EnemyType = {}));
var CollectibleType;
(function (CollectibleType) {
    CollectibleType["HEALTH"] = "health";
    CollectibleType["COIN"] = "coin";
    CollectibleType["SHIELD"] = "shield";
    CollectibleType["DAMAGE_BOOST"] = "damage_boost";
    CollectibleType["SPEED_BOOST"] = "speed_boost";
})(CollectibleType || (exports.CollectibleType = CollectibleType = {}));
