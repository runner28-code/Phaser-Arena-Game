"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const phaser_1 = __importDefault(require("phaser"));
const BootScene_1 = require("./scenes/BootScene");
const PreloadScene_1 = require("./scenes/PreloadScene");
const MainMenuScene_1 = require("./scenes/MainMenuScene");
const GameScene_1 = require("./scenes/GameScene");
const GameOverScene_1 = require("./scenes/GameOverScene");
const UpgradeScene_1 = require("./scenes/UpgradeScene");
const constants_1 = require("../shared/config/constants");
const config = {
    type: phaser_1.default.AUTO,
    width: constants_1.GAME_WIDTH,
    height: constants_1.GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#000000',
    physics: {
        default: 'matter',
        matter: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scene: [
        BootScene_1.BootScene,
        PreloadScene_1.PreloadScene,
        MainMenuScene_1.MainMenuScene,
        GameScene_1.GameScene,
        GameOverScene_1.GameOverScene,
        UpgradeScene_1.UpgradeScene
    ],
    scale: {
        mode: phaser_1.default.Scale.FIT,
        autoCenter: phaser_1.default.Scale.CENTER_BOTH
    }
};
const game = new phaser_1.default.Game(config);
// Hide loading text when game starts
game.events.on('ready', () => {
    const loading = document.querySelector('.loading');
    if (loading) {
        loading.remove();
    }
});
