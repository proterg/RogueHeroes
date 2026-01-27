/**
 * Tile Constants and Configuration
 * ---------------------------------
 * Named constants for all tile IDs in the overworld tileset.
 * Makes walkability rules readable and maintainable.
 *
 * Tileset: overworld_tileset_grass.png (192x336, 12x21 grid, 252 tiles)
 */

// =============================================================================
// TERRAIN TILES (Base layer)
// =============================================================================

/** Grass and ground tiles */
export const TERRAIN_GRASS = {
  PLAIN: [4, 5, 6, 10, 11, 12, 19, 20, 21, 22, 23, 24],
  DIRT: [1, 2, 3, 13, 14, 15, 16, 17, 18, 25, 26, 27, 37, 38, 39],
} as const;

/** Road and path tiles */
export const TERRAIN_ROAD = {
  HORIZONTAL: 7,
  VERTICAL: [29, 30],
  CORNERS: [42, 44],
  BRIDGE: [50, 51],
  DECORATIVE: 199,
} as const;

/** Water tiles (blocking) */
export const TERRAIN_WATER = {
  SHORELINE_TOP: [58, 59, 60],
  BODY: [61, 62, 63],
  SHORELINE_MID: [70, 71, 72],
  EDGES: [73, 74, 75],
  SHORELINE_BOTTOM: [82, 83, 84],
  ALL: [58, 59, 60, 61, 62, 63, 70, 71, 72, 73, 74, 75, 82, 83, 84],
} as const;

/** Building tiles in terrain layer */
export const TERRAIN_BUILDINGS = {
  BLACK_TOWER: {
    ROW_1: [157, 158, 159, 160],
    ROW_2: [169, 170, 171, 172],
    ROW_3: [181, 182, 184],  // 183 = entrance (walkable)
    ENTRANCE: 183,
  },
  SANCTUARY: {
    ROW_1: [149, 150, 151],
    ROW_2: [161, 162, 163],
    ROW_3: [173, 174, 175],
    ROW_4: [185, 187],  // 186 = entrance (walkable)
    ENTRANCE: 186,
  },
} as const;

// =============================================================================
// DECORATION TILES (Overlay layer)
// =============================================================================

/** Bridge decorations (override water blocking) */
export const DECOR_BRIDGE = {
  TILES: [109, 110],
} as const;

/** Building decorations (blocking) */
export const DECOR_BUILDINGS = {
  BLACK_TOWER: {
    TILES: [145, 146, 147, 148, 157, 158, 159, 160, 169, 170, 171, 172, 181, 182, 183, 184],
    ENTRANCE: 189,  // Walkable entrance tile
  },
  CASTLE: {
    TILES: [149, 150, 151, 161, 162, 163, 173, 174, 175, 185, 186, 187],
  },
  SMALL_HOUSE: {
    TILES: [85, 86, 97, 98, 152, 153, 164, 165, 176, 177, 188],
    ENTRANCE: 242,  // Black house entrance
  },
  TOWER_STRUCTURE: {
    TILES: [109, 110, 121, 122],
  },
  CASTLE_WALLS: {
    TILES: [130, 132, 142, 144],  // 131, 143 = entrances
    ENTRANCES: [131, 143],
  },
} as const;

/** Nature decorations (blocking) */
export const DECOR_NATURE = {
  TREES: [55, 56, 57, 67, 68, 69, 79, 80, 81],
  GRAVEYARD: [91, 92, 103, 104],
  STATUES: [185, 230],
} as const;

/** Walkable decoration overlays */
export const DECOR_WALKABLE = {
  ROAD_OVERLAYS: [7, 20, 29, 42, 44],
  GRASS_OVERLAYS: [51, 75],
  BRIDGE_PLATFORMS: [166, 167, 168],
  ENTRANCES: [131, 143, 189, 242],
} as const;

// =============================================================================
// AGGREGATED LISTS (for walkability checks)
// =============================================================================

/** All terrain tiles that block movement */
export const ALL_BLOCKED_TERRAIN: number[] = [
  ...TERRAIN_WATER.ALL,
  ...TERRAIN_BUILDINGS.BLACK_TOWER.ROW_1,
  ...TERRAIN_BUILDINGS.BLACK_TOWER.ROW_2,
  ...TERRAIN_BUILDINGS.BLACK_TOWER.ROW_3,
  ...TERRAIN_BUILDINGS.SANCTUARY.ROW_1,
  ...TERRAIN_BUILDINGS.SANCTUARY.ROW_2,
  ...TERRAIN_BUILDINGS.SANCTUARY.ROW_3,
  ...TERRAIN_BUILDINGS.SANCTUARY.ROW_4,
];

/** All decoration tiles that allow movement */
export const ALL_WALKABLE_DECORATIONS: number[] = [
  ...DECOR_WALKABLE.ROAD_OVERLAYS,
  ...DECOR_WALKABLE.GRASS_OVERLAYS,
  ...DECOR_WALKABLE.BRIDGE_PLATFORMS,
  ...DECOR_WALKABLE.ENTRANCES,
];

/** Bridge tiles that override terrain blocking */
export const BRIDGE_OVERRIDE_TILES: number[] = [...DECOR_BRIDGE.TILES];

// =============================================================================
// MINIMAP COLORS
// =============================================================================

export const MINIMAP_COLORS = {
  // Terrain colors
  WATER: 0x2196f3,
  GRASS: 0x2d5a27,
  DIRT: 0x8b4513,
  ROAD: 0xa0522d,
  BUILDING: 0x607d8b,

  // Decoration colors
  TREES: 0x1b5e20,
  HOUSES: 0x795548,
  TOWER: 0x607d8b,
  SPECIAL: 0x4527a0,

  // UI colors
  PLAYER_TOWN: 0xe94560,
  HERO: 0xff69b4,
  VIEWPORT: 0xffff00,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a tile ID is in a range or list
 */
export function tileInRange(tileId: number, start: number, end: number): boolean {
  return tileId >= start && tileId <= end;
}

/**
 * Check if a tile ID is in a list
 */
export function tileInList(tileId: number, list: readonly number[]): boolean {
  return list.includes(tileId);
}
