# Phaser Game Development Guide

## Overview

Phaser handles all game rendering - the overworld map, combat battlefield, and animations. React handles UI overlays.

## Directory Structure

```
game/
├── Game.ts          # Phaser configuration
├── scenes/          # Game scenes
│   ├── BootScene.ts
│   ├── OverworldScene.ts
│   └── CombatScene.ts
├── entities/        # Game objects
│   ├── Unit.ts
│   └── Hero.ts
└── utils/           # Helper functions
```

## Creating a New Scene

### Step 1: Create the Scene File

```typescript
// src/game/scenes/CombatScene.ts
/**
 * CombatScene
 * -----------
 * Tactical combat scene. Renders battlefield grid,
 * units, and combat animations.
 *
 * Events emitted:
 * - 'unit-selected': Unit clicked
 * - 'tile-clicked': Empty tile clicked
 * - 'combat-ended': Combat finished
 */

import Phaser from 'phaser';
import { Unit } from '../entities/Unit';
import { CombatState } from '../../types/combat';

export class CombatScene extends Phaser.Scene {
  private units: Map<string, Unit> = new Map();
  private selectedUnit: Unit | null = null;

  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data: { combatState: CombatState }) {
    // Initialize with combat state from API
    this.createUnits(data.combatState);
  }

  preload() {
    this.load.image('unit-warrior', 'assets/units/warrior.png');
    this.load.image('unit-archer', 'assets/units/archer.png');
    this.load.image('tile', 'assets/tiles/grass.png');
  }

  create() {
    this.createBattlefield();
    this.setupInput();
  }

  update(time: number, delta: number) {
    // Update unit animations, projectiles, etc.
    this.units.forEach((unit) => unit.update(delta));
  }

  // Public methods called from React
  public updateState(state: CombatState) {
    // Sync visual state with server state
  }

  public selectUnit(unitId: string) {
    const unit = this.units.get(unitId);
    if (unit) {
      this.selectedUnit = unit;
      this.events.emit('unit-selected', unit.getData());
    }
  }

  private createBattlefield() {
    // Create grid tiles
  }

  private createUnits(state: CombatState) {
    // Create unit sprites from state
  }

  private setupInput() {
    this.input.on('pointerdown', this.handleClick, this);
  }

  private handleClick(pointer: Phaser.Input.Pointer) {
    // Handle tile/unit clicks
  }
}
```

### Step 2: Register in Game Config

```typescript
// src/game/Game.ts
import { CombatScene } from './scenes/CombatScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  scene: [BootScene, OverworldScene, CombatScene],
  // ...
};
```

## Creating Game Entities

### Step 1: Create the Entity Class

```typescript
// src/game/entities/Unit.ts
/**
 * Unit Entity
 * -----------
 * Represents a combat unit on the battlefield.
 * Handles rendering, animation, and movement.
 */

import Phaser from 'phaser';
import { UnitData } from '../../types/combat';

export class Unit extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private healthBar: Phaser.GameObjects.Graphics;
  private data: UnitData;

  constructor(scene: Phaser.Scene, data: UnitData) {
    super(scene, data.x * 64, data.y * 64);

    this.data = data;
    this.sprite = scene.add.sprite(0, 0, `unit-${data.type}`);
    this.healthBar = scene.add.graphics();

    this.add([this.sprite, this.healthBar]);
    this.updateHealthBar();

    scene.add.existing(this);
  }

  update(delta: number) {
    // Update animations
  }

  moveTo(x: number, y: number) {
    this.scene.tweens.add({
      targets: this,
      x: x * 64,
      y: y * 64,
      duration: 300,
      ease: 'Power2',
    });
  }

  takeDamage(amount: number) {
    this.data.hp -= amount;
    this.updateHealthBar();

    // Flash red
    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      this.sprite.clearTint();
    });
  }

  getData(): UnitData {
    return { ...this.data };
  }

  private updateHealthBar() {
    this.healthBar.clear();
    const pct = this.data.hp / this.data.maxHp;

    this.healthBar.fillStyle(0x000000);
    this.healthBar.fillRect(-20, -30, 40, 6);

    this.healthBar.fillStyle(pct > 0.3 ? 0x00ff00 : 0xff0000);
    this.healthBar.fillRect(-20, -30, 40 * pct, 6);
  }
}
```

## React-Phaser Communication

### From Phaser to React (Events)

```typescript
// In Phaser scene
this.events.emit('unit-selected', unitData);
this.events.emit('combat-ended', { winner: 'player' });

// In React component
useEffect(() => {
  const scene = gameRef.current?.scene.getScene('CombatScene');
  scene?.events.on('unit-selected', setSelectedUnit);
  return () => scene?.events.off('unit-selected', setSelectedUnit);
}, []);
```

### From React to Phaser (Methods)

```typescript
// In React component
const handleSpellCast = (spell: Spell) => {
  const scene = gameRef.current?.scene.getScene('CombatScene') as CombatScene;
  scene?.castSpell(spell, targetPosition);
};

// In Phaser scene
public castSpell(spell: Spell, target: Position) {
  // Play spell animation
  // Apply effects
}
```

## Asset Loading

Load assets in preload():

```typescript
preload() {
  // Images
  this.load.image('key', 'assets/path/to/image.png');

  // Spritesheets
  this.load.spritesheet('hero', 'assets/hero.png', {
    frameWidth: 64,
    frameHeight: 64,
  });

  // Tilemaps
  this.load.tilemapTiledJSON('map', 'assets/maps/overworld.json');

  // Audio
  this.load.audio('attack', 'assets/sounds/attack.wav');
}
```

## Testing Scenes

```typescript
// tests/game/CombatScene.test.ts
import { CombatScene } from '../../src/game/scenes/CombatScene';

describe('CombatScene', () => {
  let scene: CombatScene;

  beforeEach(() => {
    // Create mock Phaser game
    const game = new Phaser.Game({
      type: Phaser.HEADLESS,
      scene: [CombatScene],
    });
    scene = game.scene.getScene('CombatScene') as CombatScene;
  });

  it('creates units from state', () => {
    scene.scene.start('CombatScene', { combatState: mockState });
    expect(scene.getUnitCount()).toBe(mockState.units.length);
  });
});
```
