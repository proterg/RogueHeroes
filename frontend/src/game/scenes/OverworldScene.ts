/**
 * OverworldScene
 * --------------
 * Main exploration scene with HOMM3-style overworld map.
 * Handles hero movement, resource collection, and enemy encounters.
 *
 * Events emitted:
 * - 'start-combat': Triggers combat encounter
 */

import Phaser from 'phaser';
import { startCombat } from '../../api/combat';
import { UnitData } from '../../types/combat';

export class OverworldScene extends Phaser.Scene {
  private hero!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private mapSize = { width: 20, height: 15 };
  private tileSize = 64;

  constructor() {
    super({ key: 'OverworldScene' });
  }

  create(): void {
    // Create simple tile grid
    this.createMap();

    // Create hero
    this.hero = this.add.sprite(
      this.tileSize * 5 + this.tileSize / 2,
      this.tileSize * 7 + this.tileSize / 2,
      'hero'
    );
    this.hero.setDepth(10);

    // Set up keyboard input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();

      // Add spacebar for testing combat
      this.input.keyboard.on('keydown-SPACE', () => {
        this.startTestCombat();
      });
    }

    // Add instructions
    this.add.text(16, 16, 'Arrow keys to move\nSpace to start combat', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 8 },
    }).setDepth(100);

    // Camera follows hero
    this.cameras.main.startFollow(this.hero, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
  }

  update(): void {
    if (!this.cursors) return;

    const speed = 4;
    let moved = false;

    if (this.cursors.left.isDown) {
      this.hero.x -= speed;
      moved = true;
    } else if (this.cursors.right.isDown) {
      this.hero.x += speed;
      moved = true;
    }

    if (this.cursors.up.isDown) {
      this.hero.y -= speed;
      moved = true;
    } else if (this.cursors.down.isDown) {
      this.hero.y += speed;
      moved = true;
    }

    // Clamp to map bounds
    const minX = this.tileSize / 2;
    const maxX = this.mapSize.width * this.tileSize - this.tileSize / 2;
    const minY = this.tileSize / 2;
    const maxY = this.mapSize.height * this.tileSize - this.tileSize / 2;

    this.hero.x = Phaser.Math.Clamp(this.hero.x, minX, maxX);
    this.hero.y = Phaser.Math.Clamp(this.hero.y, minY, maxY);
  }

  private createMap(): void {
    for (let y = 0; y < this.mapSize.height; y++) {
      for (let x = 0; x < this.mapSize.width; x++) {
        const tile = this.add.sprite(
          x * this.tileSize + this.tileSize / 2,
          y * this.tileSize + this.tileSize / 2,
          'grass'
        );
        tile.setDepth(0);

        // Add some variation
        tile.setTint(
          Phaser.Display.Color.GetColor(
            39 + Math.random() * 10,
            174 + Math.random() * 20,
            96 + Math.random() * 10
          )
        );
      }
    }
  }

  private async startTestCombat(): Promise<void> {
    // Create test armies
    const playerUnits: UnitData[] = [
      {
        id: 'p1',
        type: 'warrior',
        name: 'Warrior',
        hp: 100,
        max_hp: 100,
        attack: 15,
        defense: 10,
        speed: 1.0,
        position: { x: 2, y: 1 },
        is_player: true,
      },
      {
        id: 'p2',
        type: 'archer',
        name: 'Archer',
        hp: 60,
        max_hp: 60,
        attack: 20,
        defense: 5,
        speed: 1.2,
        position: { x: 4, y: 1 },
        is_player: true,
      },
      {
        id: 'p3',
        type: 'mage',
        name: 'Mage',
        hp: 50,
        max_hp: 50,
        attack: 25,
        defense: 3,
        speed: 0.8,
        position: { x: 3, y: 2 },
        is_player: true,
      },
    ];

    const enemyUnits: UnitData[] = [
      {
        id: 'e1',
        type: 'warrior',
        name: 'Goblin Warrior',
        hp: 80,
        max_hp: 80,
        attack: 12,
        defense: 8,
        speed: 1.1,
        position: { x: 2, y: 8 },
        is_player: false,
      },
      {
        id: 'e2',
        type: 'archer',
        name: 'Goblin Archer',
        hp: 50,
        max_hp: 50,
        attack: 15,
        defense: 4,
        speed: 1.0,
        position: { x: 4, y: 8 },
        is_player: false,
      },
    ];

    try {
      const combatState = await startCombat({
        player_units: playerUnits,
        enemy_units: enemyUnits,
      });

      // Emit event to notify React
      this.events.emit('start-combat', { combatId: combatState.combat_id });
    } catch (error) {
      console.error('Failed to start combat:', error);
    }
  }
}
