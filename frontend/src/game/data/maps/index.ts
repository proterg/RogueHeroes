/**
 * Map Registry
 * ------------
 * Central registry for all game maps.
 * Maps are referenced by ID throughout the game.
 */

import { MapConfig, MapLocation, TilePosition } from '../../../types/mapConfig';
import { TUTORIAL00_MAP } from './tutorial00.config';

// =============================================================================
// MAP REGISTRY
// =============================================================================

/** All maps keyed by their unique ID */
export const MAP_REGISTRY: Record<string, MapConfig> = {
  [TUTORIAL00_MAP.id]: TUTORIAL00_MAP,
};

/** The default starting map ID */
export const STARTING_MAP_ID = 'tutorial00';

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Get a map configuration by ID
 * @param mapId - The map's unique identifier
 * @returns The map configuration or undefined if not found
 */
export function getMapConfig(mapId: string): MapConfig | undefined {
  return MAP_REGISTRY[mapId];
}

/**
 * Get the starting/default map configuration
 * @returns The starting map configuration
 */
export function getStartingMap(): MapConfig {
  const map = MAP_REGISTRY[STARTING_MAP_ID];
  if (!map) {
    throw new Error(`Starting map '${STARTING_MAP_ID}' not found in registry`);
  }
  return map;
}

/**
 * Get all registered maps
 * @returns Array of all map configurations
 */
export function getAllMaps(): MapConfig[] {
  return Object.values(MAP_REGISTRY);
}

/**
 * Check if a map exists in the registry
 * @param mapId - The map's unique identifier
 * @returns True if the map exists
 */
export function hasMap(mapId: string): boolean {
  return mapId in MAP_REGISTRY;
}

// =============================================================================
// LOCATION HELPERS
// =============================================================================

/**
 * Find a location at a specific tile position on a map
 * @param mapId - The map's unique identifier
 * @param x - Tile X coordinate
 * @param y - Tile Y coordinate
 * @returns The location at that tile, or undefined
 */
export function getLocationAtTile(mapId: string, x: number, y: number): MapLocation | undefined {
  const map = MAP_REGISTRY[mapId];
  if (!map) return undefined;

  // First check entrance tiles (exact match)
  for (const location of map.locations) {
    const isEntrance = location.entranceTiles.some(
      tile => tile.x === x && tile.y === y
    );
    if (isEntrance) {
      return location;
    }
  }

  // Then check bounds (if defined)
  for (const location of map.locations) {
    if (location.bounds) {
      const { minX, minY, maxX, maxY } = location.bounds;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return location;
      }
    }
  }

  return undefined;
}

/**
 * Get the location key (legacy format) from a map location
 * This bridges the old hardcoded system with the new config system
 * @param location - The map location
 * @returns A location key string for backward compatibility
 */
export function getLocationKeyFromLocation(location: MapLocation): string {
  // Map location IDs to the old location keys used in InteractionData
  const keyMapping: Record<string, string> = {
    'player_castle': 'player_town',
    'black_tower': 'black_tower',
  };
  return keyMapping[location.id] ?? location.id;
}

/**
 * Check if a tile triggers a map transition
 * @param mapId - Current map's unique identifier
 * @param x - Tile X coordinate
 * @param y - Tile Y coordinate
 * @returns The map connection if found, or undefined
 */
export function getMapConnectionAtTile(
  mapId: string,
  x: number,
  y: number
): { targetMapId: string; entryPoint?: string } | undefined {
  const map = MAP_REGISTRY[mapId];
  if (!map) return undefined;

  for (const connection of map.connections) {
    const isTrigger = connection.triggerTiles.some(
      tile => tile.x === x && tile.y === y
    );
    if (isTrigger) {
      return {
        targetMapId: connection.targetMapId,
        entryPoint: connection.targetEntryPoint,
      };
    }
  }

  return undefined;
}

/**
 * Get the spawn position for entering a map
 * @param mapId - The map's unique identifier
 * @param entryFrom - Optional: the map we're coming from (to use entry points)
 * @returns The tile position to spawn at
 */
export function getSpawnPosition(mapId: string, entryFrom?: string): TilePosition {
  const map = MAP_REGISTRY[mapId];
  if (!map) {
    throw new Error(`Map '${mapId}' not found in registry`);
  }

  // If coming from another map, check for specific entry point
  if (entryFrom && map.spawn.entryPoints?.[entryFrom]) {
    return map.spawn.entryPoints[entryFrom];
  }

  // Default to hero start position
  return map.spawn.heroStart;
}
