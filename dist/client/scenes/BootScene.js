"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BootScene = void 0;
const phaser_1 = __importDefault(require("phaser"));
class BootScene extends phaser_1.default.Scene {
    constructor() {
        super({ key: 'Boot' });
    }
    create() {
        // Configure physics settings
        this.matter.world.setGravity(0);
        this.matter.world.drawDebug = false;
        // Start PreloadScene
        this.scene.start('Preload');
    }
}
exports.BootScene = BootScene;
