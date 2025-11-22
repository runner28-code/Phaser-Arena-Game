import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../shared/config/constants';
import { UpgradeType, UpgradeOption, UpgradeSceneData } from '../../shared/types';

export class UpgradeScene extends Phaser.Scene {
  private upgrades: UpgradeOption[] = [];
  private onSelect!: (upgrade: UpgradeType) => void;
  private upgradeCards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'Upgrade' });
  }

  init(data: UpgradeSceneData) {
    this.upgrades = data.upgrades;
    this.onSelect = data.onSelect;
  }

  create() {
    // Semi-transparent background
    const background = this.add.graphics();
    background.fillStyle(0x000000, 0.7);
    background.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    background.setInteractive();

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 100, 'LEVEL UP!', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Create upgrade cards
    const cardWidth = 200;
    const cardHeight = 250;
    const spacing = 50;
    const startX = (GAME_WIDTH - (3 * cardWidth + 2 * spacing)) / 2 + cardWidth / 2;

    for (let i = 0; i < this.upgrades.length; i++) {
      const upgrade = this.upgrades[i];
      const x = startX + i * (cardWidth + spacing);
      const y = GAME_HEIGHT / 2;

      const card = this.createUpgradeCard(x, y, cardWidth, cardHeight, upgrade);
      this.upgradeCards.push(card);
    }

    // Instructions
    const instructions = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 100, 'Click to choose your upgrade', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);
  }

  private createUpgradeCard(x: number, y: number, width: number, height: number, upgrade: UpgradeOption): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Card background
    const background = this.add.graphics();
    background.fillStyle(0x333333);
    background.fillRoundedRect(-width/2, -height/2, width, height, 10);
    background.lineStyle(2, 0xffffff);
    background.strokeRoundedRect(-width/2, -height/2, width, height, 10);
    container.add(background);

    // Icon placeholder (text for now)
    const icon = this.add.text(0, -height/2 + 40, upgrade.icon, {
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5);
    container.add(icon);

    // Name
    const nameText = this.add.text(0, -height/2 + 80, upgrade.name, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(nameText);

    // Description
    const descText = this.add.text(0, 0, upgrade.description, {
      fontSize: '16px',
      color: '#cccccc',
      align: 'center',
      wordWrap: { width: width - 20 }
    }).setOrigin(0.5);
    container.add(descText);

    // Make card interactive
    background.setInteractive(new Phaser.Geom.Rectangle(-width/2, -height/2, width, height), Phaser.Geom.Rectangle.Contains);
    background.on('pointerdown', () => {
      this.selectUpgrade(upgrade.type);
    });

    // Hover effect
    background.on('pointerover', () => {
      background.clear();
      background.fillStyle(0x555555);
      background.fillRoundedRect(-width/2, -height/2, width, height, 10);
      background.lineStyle(2, 0xffff00);
      background.strokeRoundedRect(-width/2, -height/2, width, height, 10);
    });

    background.on('pointerout', () => {
      background.clear();
      background.fillStyle(0x333333);
      background.fillRoundedRect(-width/2, -height/2, width, height, 10);
      background.lineStyle(2, 0xffffff);
      background.strokeRoundedRect(-width/2, -height/2, width, height, 10);
    });

    return container;
  }

  private selectUpgrade(upgradeType: UpgradeType): void {
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

  static generateRandomUpgrades(count: number = 3): UpgradeOption[] {
    const allUpgrades: UpgradeOption[] = [
      {
        type: UpgradeType.DAMAGE,
        name: 'Damage +',
        description: 'Increase attack damage',
        icon: '⚔️'
      },
      {
        type: UpgradeType.SPEED,
        name: 'Speed +',
        description: 'Increase movement speed',
        icon: '💨'
      },
      {
        type: UpgradeType.HEALTH,
        name: 'Health +',
        description: 'Increase max health',
        icon: '❤️'
      }
    ];

    // Shuffle and take first 'count' upgrades
    const shuffled = Phaser.Utils.Array.Shuffle(allUpgrades.slice());
    return shuffled.slice(0, count);
  }
}