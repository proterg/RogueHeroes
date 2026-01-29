/**
 * Interaction Data
 * ----------------
 * Definitions for all overworld interactions.
 * Maps tiles to interaction data and provides default interaction configurations.
 *
 * This module bridges the legacy hardcoded system with the new map config system.
 * Use getInteractionDataFromConfig() for the new map-based lookups.
 */

import {
  InteractionType,
  TownData,
  ShrineData,
  ChestData,
  NpcData,
} from '../../types/interaction';
import { MapLocation, TownConfig } from '../../types/mapConfig';
import { getLocationAtTile, getLocationKeyFromLocation } from './maps';
import { getNpcs } from './npcs';
import { DEFAULT_BLESSINGS, DEFAULT_RECRUITABLE_UNITS } from './defaults';

// Re-export defaults for backwards compatibility
export { DEFAULT_BLESSINGS, DEFAULT_RECRUITABLE_UNITS };

/** Town configurations by location key */
export const TOWN_DATA: Record<string, TownData> = {
  'default': {
    name: 'Town',
    description: 'A small settlement where you can recruit soldiers and receive blessings.',
    availableUnits: DEFAULT_RECRUITABLE_UNITS,
    availableBlessings: DEFAULT_BLESSINGS,
  },
  'player_town': {
    name: 'Your Castle',
    description: 'Your home base. Recruit soldiers and prepare for battle.',
    availableUnits: [
      { type: 'soldier', name: 'Soldier', cost: 20, maxCount: 5 },
      { type: 'archer', name: 'Archer', cost: 30, maxCount: 3 },
      { type: 'knight', name: 'Knight', cost: 45, maxCount: 2 },
      { type: 'lancer', name: 'Lancer', cost: 60, maxCount: 1 },
    ],
    availableBlessings: DEFAULT_BLESSINGS,
  },
  'black_tower': {
    name: 'Black Tower',
    description: 'A dark fortress offering undead warriors.',
    availableUnits: [
      { type: 'skeleton1', name: 'Skeleton Warrior', cost: 15, maxCount: 5 },
      { type: 'skeleton2', name: 'Skeleton Guard', cost: 25, maxCount: 3 },
      { type: 'vampire', name: 'Vampire', cost: 55, maxCount: 1 },
    ],
    availableBlessings: [
      {
        id: 'dark_blessing',
        name: 'Dark Blessing',
        description: '+5% Lifesteal for all units in next combat',
        cost: 50,
        effect: {
          type: 'stat_modifier',
          target: 'all_units',
          value: { lifesteal: 0.05 },
          duration: 'next_combat',
        },
      },
    ],
  },
};

// =============================================================================
// SHRINE DATA (Future)
// =============================================================================

export const SHRINE_DATA: Record<string, ShrineData> = {
  'shrine_of_valor': {
    name: 'Shrine of Valor',
    description: 'A sacred shrine that grants combat blessings.',
    isOneTime: true,
    effect: {
      type: 'stat_modifier',
      target: 'all_units',
      value: { attack: 3 },
      duration: 'permanent',
    },
  },
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get interaction data for a specific tile location
 */
export function getInteractionData(
  type: InteractionType,
  tileX: number,
  tileY: number,
  locationKey?: string
): TownData | ShrineData | ChestData | NpcData {
  switch (type) {
    case 'town':
      return TOWN_DATA[locationKey ?? 'default'] ?? TOWN_DATA['default'];
    case 'shrine':
      return SHRINE_DATA[locationKey ?? 'shrine_of_valor'] ?? SHRINE_DATA['shrine_of_valor'];
    case 'chest':
      return { contents: [{ type: 'gold', value: 50 }], isLooted: false };
    case 'npc':
      return { name: 'Traveler', dialogue: ['Greetings, adventurer!'] };
  }
}

/**
 * Get a unique ID for an interaction at a specific location
 */
export function getInteractionId(type: InteractionType, tileX: number, tileY: number): string {
  return `${type}_${tileX}_${tileY}`;
}

/**
 * Determine location key based on tile coordinates
 * This maps specific tile positions to named locations
 *
 * @deprecated Use getLocationAtTile() from maps/index.ts with map config instead
 */
export function getLocationKey(tileX: number, tileY: number): string | undefined {
  // Player town is at (2, 3) based on PLAYER_TOWN constant in OverworldScene
  if (tileX >= 1 && tileX <= 4 && tileY >= 2 && tileY <= 5) {
    return 'player_town';
  }
  // Black tower area (example)
  if (tileX >= 20 && tileX <= 24 && tileY >= 10 && tileY <= 14) {
    return 'black_tower';
  }
  return undefined;
}

// =============================================================================
// MAP CONFIG-BASED HELPERS
// =============================================================================

/**
 * Get interaction data using the new map configuration system
 * @param mapId - The current map ID
 * @param type - The interaction type
 * @param tileX - Tile X coordinate
 * @param tileY - Tile Y coordinate
 * @returns Interaction data and location info
 */
export function getInteractionDataFromConfig(
  mapId: string,
  type: InteractionType,
  tileX: number,
  tileY: number
): { data: TownData | ShrineData | ChestData | NpcData; locationId?: string } {
  // Try to find location from map config
  const location = getLocationAtTile(mapId, tileX, tileY);

  if (location && type === 'town' && location.type === 'town') {
    const townConfig = location.config as TownConfig;
    const data = getTownDataFromConfig(location.name, townConfig);
    return { data, locationId: location.id };
  }

  // Fall back to legacy system
  const locationKey = location ? getLocationKeyFromLocation(location) : getLocationKey(tileX, tileY);
  const data = getInteractionData(type, tileX, tileY, locationKey);
  return { data, locationId: location?.id };
}

/**
 * Convert a TownConfig to TownData for the interaction system
 */
export function getTownDataFromConfig(name: string, config: TownConfig): TownData {
  return {
    name,
    description: config.description ?? 'A settlement where you can recruit soldiers.',
    availableUnits: config.recruitableUnits ?? DEFAULT_RECRUITABLE_UNITS,
    availableBlessings: config.blessings ?? DEFAULT_BLESSINGS,
  };
}

/**
 * Get tavern NPC IDs for a location using map config
 * @param mapId - The current map ID
 * @param tileX - Tile X coordinate
 * @param tileY - Tile Y coordinate
 * @returns Array of NPC IDs or empty array
 */
export function getTavernNpcIds(mapId: string, tileX: number, tileY: number): string[] {
  const location = getLocationAtTile(mapId, tileX, tileY);
  if (!location || location.type !== 'town') return [];

  const townConfig = location.config as TownConfig;
  return townConfig.tavernNpcs ?? [];
}

/**
 * Get tavern NPCs for a location
 * @param mapId - The current map ID
 * @param locationId - The location ID
 * @returns Array of NPC characters
 */
export function getTavernNpcsForLocation(mapId: string, locationId: string) {
  const map = getLocationAtTile(mapId, 0, 0); // This won't work - need different approach
  // We need to get the location by ID, not by tile
  // For now, fall back to direct lookup
  return [];
}

/**
 * Get tavern NPCs by location ID from map config
 * @param mapId - The map ID
 * @param locationId - The location ID within the map
 * @returns Array of NPC characters from the registry
 */
export function getTavernNpcsByLocationId(mapId: string, locationId: string) {
  // Use dynamic import to avoid circular dependencies
  // The maps module imports from this file via defaults, so we need late binding
  const maps = require('./maps');
  const map = maps.getMapConfig(mapId);
  if (!map) return [];

  const location = map.locations.find((loc: MapLocation) => loc.id === locationId);
  if (!location || location.type !== 'town') return [];

  const townConfig = location.config as TownConfig;
  const npcIds = townConfig.tavernNpcs ?? [];
  return getNpcs(npcIds);
}
