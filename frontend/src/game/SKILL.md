# Phaser Game Development Guide

## Overview

Phaser handles all game rendering - the overworld map, combat battlefield, and animations. React handles UI overlays.

## Directory Structure

```
game/
├── Game.ts              # Phaser configuration
├── scenes/              # Game scenes
│   ├── BootScene.ts     # Asset loading
│   ├── OverworldScene.ts # Exploration map
│   └── CombatScene.ts   # Tactical combat
├── entities/            # Game objects
│   ├── index.ts         # Exports
│   ├── Hero.ts          # Overworld hero
│   └── Unit.ts          # Combat unit (TODO)
├── systems/             # Reusable game systems
│   ├── index.ts         # Exports
│   ├── FogOfWar.ts      # Visibility system
│   └── Minimap.ts       # Minimap renderer
└── utils/               # Helper functions
    ├── index.ts         # Exports
    └── Pathfinding.ts   # A* algorithm
```

## Architecture Principles

### 1. Scenes Orchestrate, Systems Do Work
Scenes (like `OverworldScene`) should be thin orchestration layers that:
- Create and wire up systems
- Handle input routing
- Manage scene lifecycle

Heavy logic goes in systems and utilities:
- `FogOfWar` - handles all visibility calculations and rendering
- `Minimap` - handles external canvas rendering
- `Pathfinding` - handles A* algorithm
- `Hero` - handles sprite, animation, and movement

### 2. Systems Are Reusable
Systems should be independent and reusable across scenes:
```typescript
// Can be used in any scene
const fog = new FogOfWar(scene, mapWidth, mapHeight, tileSize);
fog.addVisionSource('hero', x, y, radius);
fog.update();
```

### 3. Types Live in src/types/
All TypeScript types are centralized:
- `combat.ts` - Combat-related types
- `mapEditor.ts` - Map data structures, walkability
- `tiles.ts` - Named tile constants

## Creating a New Scene

### Step 1: Create the Scene File

```typescript
// src/game/scenes/MyScene.ts
/**
 * MyScene
 * -------
 * Brief description of what this scene does.
 *
 * Events emitted:
 * - 'event-name': Description
 */

import Phaser from 'phaser';

export class MyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MyScene' });
  }

  preload(): void {
    // Load assets
  }

  create(): void {
    // Create game objects
    this.setupInput();
  }

  update(): void {
    // Game loop
  }

  private setupInput(): void {
    // Input handlers
  }
}
```

### Step 2: Register in Game Config

```typescript
// src/game/Game.ts
import { MyScene } from './scenes/MyScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  // ...
  scene: [BootScene, OverworldScene, CombatScene, MyScene],
};
```

## Creating a New System

Systems encapsulate reusable game logic:

```typescript
// src/game/systems/MySystem.ts
/**
 * MySystem
 * --------
 * Description of what this system does.
 *
 * Usage:
 *   const system = new MySystem(scene, config);
 *   system.update();
 */

import Phaser from 'phaser';

export interface MySystemConfig {
  // Configuration options
}

export class MySystem {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, config: MySystemConfig) {
    this.scene = scene;
    // Initialize
  }

  update(): void {
    // Per-frame updates
  }

  destroy(): void {
    // Cleanup
  }
}
```

Don't forget to export from `systems/index.ts`:
```typescript
export { MySystem } from './MySystem';
export type { MySystemConfig } from './MySystem';
```

## Creating a New Entity

Entities represent in-world objects (hero, units, items):

```typescript
// src/game/entities/MyEntity.ts
/**
 * MyEntity
 * --------
 * Description.
 */

import Phaser from 'phaser';

export class MyEntity {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.add.sprite(x, y, 'texture-key');
  }

  // Static preload method for assets
  static preload(scene: Phaser.Scene): void {
    scene.load.image('texture-key', 'assets/path/to/image.png');
  }

  update(delta: number): void {
    // Per-frame updates
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
```

## Using Pathfinding

The `Pathfinding` utility provides A* with 8-directional movement:

```typescript
import { findPath, getDirectionFromDelta } from '../utils/Pathfinding';

// Find path from (0,0) to (5,5)
const path = findPath(
  0, 0,           // Start
  5, 5,           // End
  (x, y) => map.isWalkable(x, y),  // Walkability check
  mapWidth,
  mapHeight
);

// Path is array of {x, y} from start to end (excluding start)
for (const step of path) {
  console.log(`Move to (${step.x}, ${step.y})`);
}

// Get direction name for animations
const direction = getDirectionFromDelta(dx, dy);
// Returns: 'north', 'north_east', 'east', etc.
```

## Using Fog of War

The `FogOfWar` system handles visibility with smooth circular gradients:

```typescript
import { FogOfWar } from '../systems/FogOfWar';

// Create fog system
const fog = new FogOfWar(scene, mapWidth, mapHeight, tileSize);

// Add vision sources
fog.addVisionSource('hero', heroX, heroY, 4);  // 4-tile radius
fog.addVisionSource('tower', towerX, towerY, 6);

// Update when sources move
fog.updateVisionSource('hero', newX, newY);

// Render fog (call in update loop)
fog.update();

// Check visibility
if (fog.isTileVisible(x, y)) { /* ... */ }
if (fog.isTileExplored(x, y)) { /* ... */ }
```

## React-Phaser Communication

### From Phaser to React (Events)

```typescript
// In Phaser scene
this.events.emit('unit-selected', unitData);

// In React component
useEffect(() => {
  const scene = gameRef.current?.scene.getScene('CombatScene');
  scene?.events.on('unit-selected', setSelectedUnit);
  return () => scene?.events.off('unit-selected', setSelectedUnit);
}, []);
```

### From React to Phaser (Methods)

```typescript
// In React
const handleAction = () => {
  const scene = gameRef.current?.scene.getScene('CombatScene') as CombatScene;
  scene?.doSomething();
};

// In Phaser scene - public method
public doSomething(): void {
  // Handle React request
}
```

## Asset Loading

Load assets in `preload()`:

```typescript
preload(): void {
  // Images
  this.load.image('key', 'assets/path/to/image.png');

  // Spritesheets
  this.load.spritesheet('hero', 'assets/hero.png', {
    frameWidth: 64,
    frameHeight: 64,
  });

  // JSON data
  this.load.json('map', 'assets/maps/level1.json');

  // Entity assets (static preload)
  Hero.preload(this);
}
```

## Tile Configuration

Tile IDs are defined in `src/types/tiles.ts` with named constants:

```typescript
import { TERRAIN_WATER, DECOR_BRIDGE } from '../../types/tiles';

// Check if tile is water
if (TERRAIN_WATER.ALL.includes(tileId)) {
  // Handle water tile
}

// Check if decoration is a bridge
if (DECOR_BRIDGE.TILES.includes(decorationId)) {
  // Bridge overrides water blocking
}
```

Walkability is checked via `src/types/mapEditor.ts`:

```typescript
import { isTileWalkable } from '../../types/mapEditor';

if (isTileWalkable(terrainId, decorationId)) {
  // Tile is walkable
}
```
