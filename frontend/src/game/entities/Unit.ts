/**
 * Unit Entity
 * -----------
 * Represents a combat unit on the battlefield.
 * Handles rendering, animation, and visual updates.
 */

import Phaser from 'phaser';
import { UnitData } from '../../types/combat';

export class Unit extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private healthBar: Phaser.GameObjects.Graphics;
  private selectionIndicator: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private data: UnitData;
  private tileSize = 64;

  constructor(scene: Phaser.Scene, x: number, y: number, data: UnitData) {
    super(scene, x, y);

    this.data = data;

    // Create selection indicator (rendered below unit)
    this.selectionIndicator = scene.add.graphics();
    this.selectionIndicator.setVisible(false);
    this.add(this.selectionIndicator);

    // Create unit sprite
    const textureKey = data.is_player
      ? `unit-${data.type}`
      : `unit-${data.type}-enemy`;
    this.sprite = scene.add.sprite(0, 0, textureKey);
    this.sprite.setDisplaySize(48, 48);
    this.add(this.sprite);

    // Create health bar
    this.healthBar = scene.add.graphics();
    this.add(this.healthBar);
    this.updateHealthBar();

    // Create name text
    this.nameText = scene.add.text(0, -35, data.name, {
      fontSize: '10px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.nameText.setOrigin(0.5);
    this.add(this.nameText);

    // Make interactive
    this.setSize(48, 48);
    this.setInteractive();

    // Add to scene
    scene.add.existing(this);
    this.setDepth(10);

    // Add hover effects
    this.on('pointerover', () => {
      this.sprite.setScale(1.1);
    });

    this.on('pointerout', () => {
      this.sprite.setScale(1);
    });
  }

  update(_delta: number): void {
    // Future: Add idle animations, etc.
  }

  /**
   * Update unit visuals from server data.
   */
  updateFromData(newData: UnitData): void {
    const oldHp = this.data.hp;
    const oldPosition = this.data.position;
    this.data = newData;

    // Update health bar
    this.updateHealthBar();

    // Flash on damage
    if (newData.hp < oldHp) {
      this.flashDamage();
    }

    // Animate movement
    if (newData.position && oldPosition) {
      if (newData.position.x !== oldPosition.x || newData.position.y !== oldPosition.y) {
        this.animateMoveTo(newData.position.x, newData.position.y);
      }
    }

    // Handle death
    if (newData.hp <= 0) {
      this.setAlpha(0.3);
    }
  }

  /**
   * Get the current unit data.
   */
  getData(): UnitData {
    return { ...this.data };
  }

  /**
   * Set selection state.
   */
  setSelected(selected: boolean): void {
    this.selectionIndicator.setVisible(selected);
    if (selected) {
      this.drawSelectionIndicator();
    }
  }

  private updateHealthBar(): void {
    this.healthBar.clear();

    const barWidth = 40;
    const barHeight = 4;
    const barY = 20;

    const hpPercent = Math.max(0, this.data.hp / this.data.max_hp);

    // Background
    this.healthBar.fillStyle(0x000000, 0.8);
    this.healthBar.fillRect(-barWidth / 2, barY, barWidth, barHeight);

    // Health fill
    const color = hpPercent > 0.3 ? 0x4caf50 : 0xf44336;
    this.healthBar.fillStyle(color, 1);
    this.healthBar.fillRect(-barWidth / 2, barY, barWidth * hpPercent, barHeight);
  }

  private drawSelectionIndicator(): void {
    this.selectionIndicator.clear();
    this.selectionIndicator.lineStyle(2, 0xffd700, 1);
    this.selectionIndicator.strokeCircle(0, 0, 30);

    // Pulsing animation
    this.scene.tweens.add({
      targets: this.selectionIndicator,
      alpha: { from: 1, to: 0.5 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private flashDamage(): void {
    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(150, () => {
      this.sprite.clearTint();
    });
  }

  private animateMoveTo(gridX: number, gridY: number): void {
    // Calculate parent container offset
    const parent = this.parentContainer;
    const offsetX = parent ? 0 : 0;
    const offsetY = parent ? 0 : 0;

    const targetX = gridX * this.tileSize + this.tileSize / 2 + offsetX;
    const targetY = gridY * this.tileSize + this.tileSize / 2 + offsetY;

    this.scene.tweens.add({
      targets: this,
      x: this.x + (targetX - this.x) * 0.5, // Relative movement
      y: this.y + (targetY - this.y) * 0.5,
      duration: 200,
      ease: 'Power2',
    });
  }
}
