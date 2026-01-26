/**
 * BootScene
 * ---------
 * Initial scene that loads assets and transitions to the game.
 * Displays loading progress bar.
 */

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5, 0.5);

    // Update progress bar
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xe94560, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load placeholder assets (replace with real assets later)
    this.createPlaceholderTextures();
  }

  create(): void {
    // Start the overworld scene
    this.scene.start('OverworldScene');
  }

  private createPlaceholderTextures(): void {
    // Create placeholder graphics for units
    const unitTypes = ['warrior', 'archer', 'mage', 'knight', 'healer'];
    const colors: Record<string, number> = {
      warrior: 0xe94560,
      archer: 0x4caf50,
      mage: 0x2196f3,
      knight: 0xff9800,
      healer: 0x9c27b0,
    };

    unitTypes.forEach((type) => {
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(colors[type], 1);
      graphics.fillCircle(32, 32, 28);
      graphics.lineStyle(3, 0xffffff, 1);
      graphics.strokeCircle(32, 32, 28);
      graphics.generateTexture(`unit-${type}`, 64, 64);
      graphics.destroy();
    });

    // Create enemy variants
    unitTypes.forEach((type) => {
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(0x333333, 1);
      graphics.fillCircle(32, 32, 28);
      graphics.lineStyle(3, colors[type], 1);
      graphics.strokeCircle(32, 32, 28);
      graphics.generateTexture(`unit-${type}-enemy`, 64, 64);
      graphics.destroy();
    });

    // Create tile texture
    const tileGraphics = this.make.graphics({ x: 0, y: 0 });
    tileGraphics.fillStyle(0x2d3436, 1);
    tileGraphics.fillRect(0, 0, 64, 64);
    tileGraphics.lineStyle(1, 0x636e72, 0.5);
    tileGraphics.strokeRect(0, 0, 64, 64);
    tileGraphics.generateTexture('tile', 64, 64);
    tileGraphics.destroy();

    // Create hero texture for overworld
    const heroGraphics = this.make.graphics({ x: 0, y: 0 });
    heroGraphics.fillStyle(0xe94560, 1);
    heroGraphics.fillTriangle(32, 4, 4, 60, 60, 60);
    heroGraphics.generateTexture('hero', 64, 64);
    heroGraphics.destroy();

    // Create overworld tiles
    const overworldGraphics = this.make.graphics({ x: 0, y: 0 });
    overworldGraphics.fillStyle(0x27ae60, 1);
    overworldGraphics.fillRect(0, 0, 64, 64);
    overworldGraphics.generateTexture('grass', 64, 64);
    overworldGraphics.destroy();
  }
}
