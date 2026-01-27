/**
 * Map Editor Type Definitions
 * ---------------------------
 * Types for the overworld map editor including map data, layers, and tools.
 * Walkability logic uses named constants from tiles.ts for clarity.
 */

import {
  ALL_BLOCKED_TERRAIN,
  ALL_WALKABLE_DECORATIONS,
  BRIDGE_OVERRIDE_TILES,
} from './tiles';

// =============================================================================
// MAP DATA STRUCTURES
// =============================================================================

/** Single layer of map tile data */
export interface MapLayer {
  name: string;
  data: number[][]; // 2D array of tile IDs (0 = empty)
}

/** Complete map data structure for save/load */
export interface MapData {
  name: string;
  width: number;
  height: number;
  tileSize: number;
  tileset: string;
  layers: MapLayer[];
}

// =============================================================================
// EDITOR TYPES
// =============================================================================

/** Available editor tools */
export type EditorTool = 'paint' | 'erase' | 'fill';

/** Brush size options */
export type BrushSize = 1 | 2 | 3;

/** Tile rotation in degrees */
export type TileRotation = 0 | 90 | 180 | 270;

/** Multi-tile stamp selection */
export interface TileStamp {
  startTileId: number;  // Top-left tile ID (1-based)
  width: number;        // Width in tiles
  height: number;       // Height in tiles
}

/** Layer names used in the editor */
export type LayerName = 'terrain' | 'decoration';

/** Editor state managed by React */
export interface EditorState {
  selectedTile: number;
  activeTool: EditorTool;
  activeLayer: LayerName;
  showGrid: boolean;
  zoom: number;
  mapWidth: number;
  mapHeight: number;
}

// =============================================================================
// TILESET CONFIGURATION
// =============================================================================

/** Tileset configuration */
export interface TilesetConfig {
  key: string;
  path: string;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
  totalTiles: number;
}

/** Default tileset configuration for overworld_tileset_grass */
export const OVERWORLD_TILESET: TilesetConfig = {
  key: 'overworld_tileset_grass',
  path: 'assets/tiles/overworld_tileset_grass.png',
  tileWidth: 16,
  tileHeight: 16,
  columns: 12,
  rows: 21,
  totalTiles: 252,
};

/** Editor constants */
export const EDITOR_CONSTANTS = {
  DEFAULT_MAP_WIDTH: 30,
  DEFAULT_MAP_HEIGHT: 20,
  MIN_ZOOM: 0.25,
  MAX_ZOOM: 4,
  DEFAULT_ZOOM: 2,
  GRID_COLOR: 0x444444,
  GRID_ALPHA: 0.5,
};

// =============================================================================
// WALKABILITY FUNCTIONS
// =============================================================================

/**
 * Check if a terrain tile is walkable
 * Default: walkable unless in blocked list
 */
export function isTerrainWalkable(tileId: number): boolean {
  if (tileId === 0) return true;  // Empty tile
  return !ALL_BLOCKED_TERRAIN.includes(tileId);
}

/**
 * Check if a decoration tile allows movement
 * Default: blocked if present, unless in walkable list
 */
export function isDecorationWalkable(tileId: number): boolean {
  if (tileId === 0) return true;  // No decoration
  return ALL_WALKABLE_DECORATIONS.includes(tileId);
}

/**
 * Check if a map position is walkable given both layers
 * Bridge tiles can override terrain blocking (walk over water)
 */
export function isTileWalkable(terrainTileId: number, decorationTileId: number): boolean {
  // Bridge tiles override terrain blocking
  if (BRIDGE_OVERRIDE_TILES.includes(decorationTileId)) {
    return true;
  }

  // Check terrain first
  if (!isTerrainWalkable(terrainTileId)) {
    return false;
  }

  // Then check decoration
  if (!isDecorationWalkable(decorationTileId)) {
    return false;
  }

  return true;
}

// =============================================================================
// EDITOR EVENTS
// =============================================================================

/** Events emitted between React and Phaser */
export type EditorEventType =
  | 'selectTile'
  | 'setTool'
  | 'setLayer'
  | 'toggleGrid'
  | 'setZoom'
  | 'newMap'
  | 'loadMap'
  | 'saveMap';

/** Event payload types */
export interface EditorEvents {
  selectTile: { tileId: number };
  setTool: { tool: EditorTool };
  setLayer: { layer: LayerName };
  toggleGrid: { show: boolean };
  setZoom: { zoom: number };
  newMap: { width: number; height: number };
  loadMap: { mapData: MapData };
  saveMap: Record<string, never>;
}
