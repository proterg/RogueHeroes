/**
 * Map Configuration Types
 * -----------------------
 * Type definitions for the multi-map architecture.
 * Maps are configured declaratively with spawn points, locations, and connections.
 */

import { Blessing, RecruitableUnit } from './interaction';

// =============================================================================
// CORE MAP CONFIGURATION
// =============================================================================

/** Complete configuration for a game map */
export interface MapConfig {
  /** Unique map identifier (e.g., 'tutorial00', 'snow_realm') */
  id: string;

  /** Display name for the map */
  name: string;

  /** Biome type affecting visuals and ambient sounds */
  biome: MapBiome;

  /** Path to the map JSON file (relative to public/) */
  mapFile: string;

  /** Spawn configuration for this map */
  spawn: SpawnConfig;

  /** Named locations on this map */
  locations: MapLocation[];

  /** Connections to other maps */
  connections: MapConnection[];

  /** Audio configuration (optional overrides) */
  audio?: MapAudio;
}

/** Biome types available for maps */
export type MapBiome = 'grassland' | 'snow' | 'desert' | 'swamp' | 'volcanic' | 'forest';

// =============================================================================
// SPAWN CONFIGURATION
// =============================================================================

/** Spawn point configuration for a map */
export interface SpawnConfig {
  /** Hero starting position when entering this map for the first time */
  heroStart: TilePosition;

  /** Player's home town position (for minimap marker) */
  playerTown?: TilePosition;

  /** Entry points from other maps, keyed by source map ID */
  entryPoints?: Record<string, TilePosition>;
}

/** A position on the tile grid */
export interface TilePosition {
  x: number;
  y: number;
}

// =============================================================================
// MAP LOCATIONS
// =============================================================================

/** A named location on the map (town, shrine, etc.) */
export interface MapLocation {
  /** Unique location identifier within this map */
  id: string;

  /** Location type determines interaction behavior */
  type: LocationType;

  /** Display name for this location */
  name: string;

  /** Tiles that trigger interaction with this location */
  entranceTiles: TilePosition[];

  /** Optional bounding box for the location (for minimap highlighting) */
  bounds?: LocationBounds;

  /** Type-specific configuration */
  config: TownConfig | ShrineConfig | DungeonConfig;
}

/** Types of locations */
export type LocationType = 'town' | 'shrine' | 'dungeon' | 'landmark';

/** Bounding box for a location */
export interface LocationBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// =============================================================================
// TOWN CONFIGURATION
// =============================================================================

/** Configuration specific to town locations */
export interface TownConfig {
  /** Features available at this town */
  features: TownFeature[];

  /** NPC IDs available in the tavern */
  tavernNpcs?: string[];

  /** Units available for recruitment */
  recruitableUnits?: RecruitableUnit[];

  /** Blessings available for purchase */
  blessings?: Blessing[];

  /** Is this the player's home base? */
  isPlayerHome?: boolean;

  /** Custom description override */
  description?: string;
}

/** Features available at a town */
export type TownFeature = 'tavern' | 'recruitment' | 'blessing' | 'blacksmith' | 'market';

// =============================================================================
// SHRINE CONFIGURATION
// =============================================================================

/** Configuration specific to shrine locations */
export interface ShrineConfig {
  /** Shrine type determines the blessing/curse offered */
  shrineType: 'valor' | 'fortitude' | 'precision' | 'cursed';

  /** Is this a one-time shrine? */
  isOneTime: boolean;

  /** Custom description override */
  description?: string;
}

// =============================================================================
// DUNGEON CONFIGURATION
// =============================================================================

/** Configuration specific to dungeon locations */
export interface DungeonConfig {
  /** Dungeon difficulty level */
  difficulty: 'easy' | 'medium' | 'hard' | 'boss';

  /** Enemy composition for combat */
  enemies?: string[];

  /** Rewards for completion */
  rewards?: DungeonReward[];

  /** Custom description override */
  description?: string;
}

/** Reward from completing a dungeon */
export interface DungeonReward {
  type: 'gold' | 'item' | 'unit' | 'artifact';
  value: string | number;
  quantity?: number;
}

// =============================================================================
// MAP CONNECTIONS
// =============================================================================

/** A connection to another map */
export interface MapConnection {
  /** Target map ID */
  targetMapId: string;

  /** Tiles that trigger the transition */
  triggerTiles: TilePosition[];

  /** Direction of travel (for UI hints) */
  direction: 'north' | 'south' | 'east' | 'west';

  /** Requirements to use this connection (optional) */
  requirements?: ConnectionRequirement;

  /** Entry point ID on the target map (uses 'default' if not specified) */
  targetEntryPoint?: string;
}

/** Requirements to use a map connection */
export interface ConnectionRequirement {
  /** Minimum level required */
  minLevel?: number;

  /** Quest that must be completed */
  questId?: string;

  /** Item required to pass */
  itemId?: string;

  /** Message shown when requirements not met */
  blockedMessage?: string;
}

// =============================================================================
// AUDIO CONFIGURATION
// =============================================================================

/** Audio settings for a map */
export interface MapAudio {
  /** Background music track */
  music?: string;

  /** Ambient sound track */
  ambience?: string;

  /** Music volume (0-1) */
  musicVolume?: number;

  /** Ambience volume (0-1) */
  ambienceVolume?: number;
}
