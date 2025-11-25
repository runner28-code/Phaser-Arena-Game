"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpgradeScene = void 0;
const phaser_1 = __importDefault(require("phaser"));
const constants_1 = require("../../shared/config/constants");
const types_1 = require("../../shared/types");
class UpgradeScene extends phaser_1.default.Scene {
    constructor() {
        super({ key: 'Upgrade' });
        this.upgrades = [];
        this.upgradeCards = [];
    }
    getResponsiveFontSize(baseSize) {
        const scale = Math.min(this.cameras.main.width / 800, this.cameras.main.height / 600);
        return `${Math.max(12, Math.round(baseSize * scale))}px`;
    }
    getResponsiveX(x) {
        return (x / 800) * this.cameras.main.width;
    }
    getResponsiveY(y) {
        return (y / 600) * this.cameras.main.height;
    }
    getResponsiveWidth(width) {
        return (width / 800) * this.cameras.main.width;
    }
    getResponsiveHeight(height) {
        return (height / 600) * this.cameras.main.height;
    }
    init(data) {
        this.upgrades = data.upgrades;
        this.onSelect = data.onSelect;
    }
    create() {
        // Semi-transparent background
        const background = this.add.graphics();
        background.fillStyle(0x000000, 0.7);
        background.fillRect(0, 0, (0, constants_1.getGameWidth)(), (0, constants_1.getGameHeight)());
        background.setInteractive();
        // Title
        const title = this.add.text(this.getResponsiveX(400), this.getResponsiveY(100), 'LEVEL UP!', {
            fontSize: this.getResponsiveFontSize(48),
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        // Create upgrade cards
        const cardWidth = this.getResponsiveWidth(200);
        const cardHeight = this.getResponsiveHeight(250);
        const spacing = this.getResponsiveWidth(50);
        const startX = ((0, constants_1.getGameWidth)() - (3 * cardWidth + 2 * spacing)) / 2 + cardWidth / 2;
        for (let i = 0; i < this.upgrades.length; i++) {
            const upgrade = this.upgrades[i];
            const x = startX + i * (cardWidth + spacing);
            const y = this.getResponsiveY(300);
            const card = this.createUpgradeCard(x, y, cardWidth, cardHeight, upgrade);
            this.upgradeCards.push(card);
        }
        // Instructions
        const instructions = this.add.text(this.getResponsiveX(400), this.getResponsiveY(500), 'Click to choose your upgrade', {
            fontSize: this.getResponsiveFontSize(24),
            color: '#ffffff'
        }).setOrigin(0.5);
    }
    createUpgradeCard(x, y, width, height, upgrade) {
        const container = this.add.container(x, y);
        // Card background
        const background = this.add.graphics();
        background.fillStyle(0x333333);
        background.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        background.lineStyle(2, 0xffffff);
        background.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
        container.add(background);
        // Icon placeholder (text for now)
        const icon = this.add.text(0, -height / 2 + 40, upgrade.icon, {
            fontSize: this.getResponsiveFontSize(48),
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(icon);
        // Name
        const nameText = this.add.text(0, -height / 2 + 80, upgrade.name, {
            fontSize: this.getResponsiveFontSize(20),
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(nameText);
        // Description
        const descText = this.add.text(0, 0, upgrade.description, {
            fontSize: this.getResponsiveFontSize(16),
            color: '#cccccc',
            align: 'center',
            wordWrap: { width: width - 20 }
        }).setOrigin(0.5);
        container.add(descText);
        // Make card interactive
        background.setInteractive(new phaser_1.default.Geom.Rectangle(-width / 2, -height / 2, width, height), phaser_1.default.Geom.Rectangle.Contains);
        background.on('pointerdown', () => {
            this.selectUpgrade(upgrade.type);
        });
        // Hover effect
        background.on('pointerover', () => {
            background.clear();
            background.fillStyle(0x555555);
            background.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
            background.lineStyle(2, 0xffff00);
            background.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
        });
        background.on('pointerout', () => {
            background.clear();
            background.fillStyle(0x333333);
            background.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
            background.lineStyle(2, 0xffffff);
            background.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
        });
        return container;
    }
    selectUpgrade(upgradeType) {
        // Play selection sound if available
        if (this.sound.get('upgrade_select')) {
            this.sound.play('upgrade_select');
        }
        // Call the callback
        this.onSelect(upgradeType);
        // Return to game scene
        this.scene.stop();
        this.scene.resume('Game');
    }
    static generateRandomUpgrades(count = 3) {
        const allUpgrades = [
            {
                type: types_1.UpgradeType.DAMAGE,
                name: 'Damage +',
                description: 'Increase attack damage',
                icon: '⚔️'
            },
            {
                type: types_1.UpgradeType.SPEED,
                name: 'Speed +',
                description: 'Increase movement speed',
                icon: '💨'
            },
            {
                type: types_1.UpgradeType.HEALTH,
                name: 'Health +',
                description: 'Increase max health',
                icon: '❤️'
            }
        ];
        // Shuffle and take first 'count' upgrades
        const shuffled = phaser_1.default.Utils.Array.Shuffle(allUpgrades.slice());
        return shuffled.slice(0, count);
    }
}
exports.UpgradeScene = UpgradeScene;
