/**
 * Combat Terrain Type Definitions
 * -------------------------------
 * Types and constants for battlefield terrain in the combat system.
 * Terrain affects movement, vision, projectiles, and provides cover.
 */

// =============================================================================
// TERRAIN TYPE INTERFACE
// =============================================================================

/** Definition of a terrain type and its gameplay effects */
export interface CombatTerrainType {
  id: string;
  name: string;
  walkable: boolean;
  movementPenalty: number;       // 0 = normal, 0.5 = 50% slower movement
  meleeAttackPenalty: number;    // 0 = normal, 0.3 = 30% attack reduction for melee
  blocksVision: boolean;
  blocksProjectiles: boolean;
  destructible: boolean;         // Can be attacked and destroyed
  hp: number;                    // HP if destructible (0 = indestructible)
  spriteKey: string;             // Asset reference for rendering
  color: number;                 // Fallback color for rendering (hex)
}

// =============================================================================
// TERRAIN REGISTRY
// =============================================================================

/** All available terrain types */
export const COMBAT_TERRAIN_TYPES: Record<string, CombatTerrainType> = {
  // === NEUTRAL TERRAIN (no effect) ===
  ground: {
    id: 'ground',
    name: 'Ground',
    walkable: true,
    movementPenalty: 0,
    meleeAttackPenalty: 0,
    blocksVision: false,
    blocksProjectiles: false,
    destructible: false,
    hp: 0,
    spriteKey: 'terrain_ground',
    color: 0x4a7c4e,
  },
  dirt: {
    id: 'dirt',
    name: 'Dirt',
    walkable: true,
    movementPenalty: 0,
    meleeAttackPenalty: 0,
    blocksVision: false,
    blocksProjectiles: false,
    destructible: false,
    hp: 0,
    spriteKey: 'terrain_dirt',
    color: 0x8b6914,
  },
  stone: {
    id: 'stone',
    name: 'Stone Floor',
    walkable: true,
    movementPenalty: 0,
    meleeAttackPenalty: 0,
    blocksVision: false,
    blocksProjectiles: false,
    destructible: false,
    hp: 0,
    spriteKey: 'terrain_stone',
    color: 0x666666,
  },

  // === MOVEMENT PENALTY TERRAIN ===
  bush: {
    id: 'bush',
    name: 'Bush',
    walkable: true,
    movementPenalty: 0.5,        // 50% slower movement
    meleeAttackPenalty: 0,
    blocksVision: false,
    blocksProjectiles: false,
    destructible: false,
    hp: 0,
    spriteKey: 'terrain_bush',
    color: 0x3d8b3d,
  },

  // === ATTACK PENALTY TERRAIN (melee -30%) ===
  water_shallow: {
    id: 'water_shallow',
    name: 'Shallow Water',
    walkable: true,
    movementPenalty: 0,
    meleeAttackPenalty: 0.3,     // 30% attack reduction for melee
    blocksVision: false,
    blocksProjectiles: false,
    destructible: false,
    hp: 0,
    spriteKey: 'terrain_water_shallow',
    color: 0x4488cc,
  },
  mud: {
    id: 'mud',
    name: 'Mud',
    walkable: true,
    movementPenalty: 0,
    meleeAttackPenalty: 0.3,     // 30% attack reduction for melee
    blocksVision: false,
    blocksProjectiles: false,
    destructible: false,
    hp: 0,
    spriteKey: 'terrain_mud',
    color: 0x6b5a3a,
  },

  // === IMPASSABLE TERRAIN ===
  rock: {
    id: 'rock',
    name: 'Rock',
    walkable: false,
    movementPenalty: 0,
    meleeAttackPenalty: 0,
    blocksVision: true,
    blocksProjectiles: true,
    destructible: false,
    hp: 0,
    spriteKey: 'terrain_rock',
    color: 0x555555,
  },
  boulder: {
    id: 'boulder',
    name: 'Boulder',
    walkable: false,
    movementPenalty: 0,
    meleeAttackPenalty: 0,
    blocksVision: true,
    blocksProjectiles: true,
    destructible: false,
    hp: 0,
    spriteKey: 'terrain_boulder',
    color: 0x444444,
  },
  tree: {
    id: 'tree',
    name: 'Tree',
    walkable: false,
    movementPenalty: 0,
    meleeAttackPenalty: 0,
    blocksVision: true,
    blocksProjectiles: true,
    destructible: false,
    hp: 0,
    spriteKey: 'terrain_tree',
    color: 0x2d5a27,
  },
  water_deep: {
    id: 'water_deep',
    name: 'Deep Water',
    walkable: false,
    movementPenalty: 0,
    meleeAttackPenalty: 0,
    blocksVision: false,
    blocksProjectiles: false,
    destructible: false,
    hp: 0,
    spriteKey: 'terrain_water_deep',
    color: 0x224488,
  },

  // === DESTRUCTIBLE TERRAIN ===
  wall: {
    id: 'wall',
    name: 'Wall',
    walkable: false,
    movementPenalty: 0,
    meleeAttackPenalty: 0,
    blocksVision: true,
    blocksProjectiles: true,
    destructible: true,          // Can be attacked!
    hp: 50,                      // Wall HP
    spriteKey: 'terrain_wall',
    color: 0x8b7355,
  },
};

// =============================================================================
// BATTLEFIELD DATA STRUCTURE
// =============================================================================

/** Complete battlefield map data for save/load */
export interface BattlefieldData {
  name: string;
  width: number;             // Default 16
  height: number;            // Default 9
  terrain: string[][];       // 2D grid of terrain IDs
}

/** Default empty battlefield */
export function createEmptyBattlefield(
  width: number = 16,
  height: number = 9,
  name: string = 'untitled'
): BattlefieldData {
  const terrain: string[][] = [];
  for (let y = 0; y < height; y++) {
    terrain[y] = [];
    for (let x = 0; x < width; x++) {
      terrain[y][x] = 'ground'; // Default to ground
    }
  }
  return { name, width, height, terrain };
}

// =============================================================================
// TERRAIN HELPER FUNCTIONS
// =============================================================================

/** Get terrain type by ID, defaulting to ground if not found */
export function getTerrainType(terrainId: string): CombatTerrainType {
  return COMBAT_TERRAIN_TYPES[terrainId] ?? COMBAT_TERRAIN_TYPES.ground;
}

/** Check if a terrain tile is walkable */
export function isTerrainWalkable(terrainId: string): boolean {
  return getTerrainType(terrainId).walkable;
}

/** Get movement penalty (0-1, where 0.5 = 50% slower) */
export function getTerrainMovementPenalty(terrainId: string): number {
  return getTerrainType(terrainId).movementPenalty;
}

/** Get melee attack penalty (0-1, where 0.3 = 30% attack reduction) */
export function getTerrainMeleeAttackPenalty(terrainId: string): number {
  return getTerrainType(terrainId).meleeAttackPenalty;
}

/** Check if terrain blocks vision */
export function doesTerrainBlockVision(terrainId: string): boolean {
  return getTerrainType(terrainId).blocksVision;
}

/** Check if terrain blocks projectiles */
export function doesTerrainBlockProjectiles(terrainId: string): boolean {
  return getTerrainType(terrainId).blocksProjectiles;
}

/** Check if terrain is destructible */
export function isTerrainDestructible(terrainId: string): boolean {
  return getTerrainType(terrainId).destructible;
}

/** Get terrain HP (for destructible terrain) */
export function getTerrainHP(terrainId: string): number {
  return getTerrainType(terrainId).hp;
}

/** Get all terrain type IDs as array */
export function getAllTerrainIds(): string[] {
  return Object.keys(COMBAT_TERRAIN_TYPES);
}

/** Get terrain types grouped by category */
export function getTerrainByCategory(): Record<string, CombatTerrainType[]> {
  const terrains = Object.values(COMBAT_TERRAIN_TYPES);
  return {
    neutral: terrains.filter(t => t.walkable && t.movementPenalty === 0 && t.meleeAttackPenalty === 0),
    hazards: terrains.filter(t => t.walkable && (t.movementPenalty > 0 || t.meleeAttackPenalty > 0)),
    obstacles: terrains.filter(t => !t.walkable && !t.destructible),
    destructible: terrains.filter(t => t.destructible),
  };
}

// =============================================================================
// EDITOR TYPES
// =============================================================================

/** Available editor tools for battlefield */
export type BattlefieldEditorTool = 'paint' | 'erase' | 'fill';

/** Brush size options */
export type BattlefieldBrushSize = 1 | 2 | 3;

/** Editor constants */
export const BATTLEFIELD_EDITOR_CONSTANTS = {
  DEFAULT_WIDTH: 16,
  DEFAULT_HEIGHT: 9,
  TILE_SIZE: 32,      // Display tile size for editor
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 3,
  DEFAULT_ZOOM: 1.5,
  GRID_COLOR: 0x444444,
  GRID_ALPHA: 0.5,
};
