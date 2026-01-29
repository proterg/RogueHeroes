/**
 * Tutorial Map Configuration
 * --------------------------
 * Configuration for the tutorial/starting map (The Kingdom of Greendale).
 * This captures all previously hardcoded values from OverworldScene and InteractionData.
 */

import { MapConfig, TownConfig, ShrineConfig } from '../../../types/mapConfig';
import { DEFAULT_BLESSINGS, DEFAULT_RECRUITABLE_UNITS } from '../defaults';

// =============================================================================
// TOWN CONFIGURATIONS
// =============================================================================

/** Player's home castle configuration */
const PLAYER_CASTLE_CONFIG: TownConfig = {
  features: ['tavern', 'recruitment', 'blessing'],
  tavernNpcs: ['marta_tavern_keeper', 'seraphina_fighter'],
  recruitableUnits: [
    { type: 'soldier', name: 'Soldier', cost: 20, maxCount: 5 },
    { type: 'archer', name: 'Archer', cost: 30, maxCount: 3 },
    { type: 'knight', name: 'Knight', cost: 45, maxCount: 2 },
    { type: 'lancer', name: 'Lancer', cost: 60, maxCount: 1 },
  ],
  blessings: DEFAULT_BLESSINGS,
  isPlayerHome: true,
  description: 'Your home base. Recruit soldiers and prepare for battle.',
};

/** Black Tower configuration */
const BLACK_TOWER_CONFIG: TownConfig = {
  features: ['tavern', 'recruitment', 'blessing'],
  tavernNpcs: [], // Could add undead NPCs here in the future
  recruitableUnits: [
    { type: 'skeleton1', name: 'Skeleton Warrior', cost: 15, maxCount: 5 },
    { type: 'skeleton2', name: 'Skeleton Guard', cost: 25, maxCount: 3 },
    { type: 'vampire', name: 'Vampire', cost: 55, maxCount: 1 },
  ],
  blessings: [
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
  isPlayerHome: false,
  description: 'A dark fortress offering undead warriors.',
};

/** Default town configuration for generic towns */
const DEFAULT_TOWN_CONFIG: TownConfig = {
  features: ['tavern', 'recruitment'],
  tavernNpcs: [],
  recruitableUnits: DEFAULT_RECRUITABLE_UNITS,
  blessings: DEFAULT_BLESSINGS,
  isPlayerHome: false,
  description: 'A small settlement where you can recruit soldiers and receive blessings.',
};

// =============================================================================
// SHRINE CONFIGURATIONS
// =============================================================================

const VALOR_SHRINE_CONFIG: ShrineConfig = {
  shrineType: 'valor',
  isOneTime: true,
  description: 'A sacred shrine that grants combat blessings.',
};

// =============================================================================
// MAP CONFIGURATION
// =============================================================================

export const TUTORIAL00_MAP: MapConfig = {
  id: 'tutorial00',
  name: 'The Kingdom of Greendale',
  biome: 'grassland',
  mapFile: 'assets/maps/tutorial00.json',

  spawn: {
    heroStart: { x: 2, y: 4 },
    playerTown: { x: 2, y: 3 },
    entryPoints: {
      // Future: entry points from other maps
      // 'snow_realm': { x: 28, y: 5 },
    },
  },

  locations: [
    {
      id: 'player_castle',
      type: 'town',
      name: 'Your Castle',
      entranceTiles: [{ x: 2, y: 3 }],
      bounds: {
        minX: 1,
        minY: 2,
        maxX: 4,
        maxY: 5,
      },
      config: PLAYER_CASTLE_CONFIG,
    },
    {
      id: 'black_tower',
      type: 'town',
      name: 'Black Tower',
      entranceTiles: [{ x: 22, y: 12 }],
      bounds: {
        minX: 20,
        minY: 10,
        maxX: 24,
        maxY: 14,
      },
      config: BLACK_TOWER_CONFIG,
    },
    // Future locations can be added here:
    // {
    //   id: 'shrine_of_valor',
    //   type: 'shrine',
    //   name: 'Shrine of Valor',
    //   entranceTiles: [{ x: 15, y: 8 }],
    //   config: VALOR_SHRINE_CONFIG,
    // },
  ],

  connections: [
    // Future: map connections
    // {
    //   targetMapId: 'snow_realm',
    //   triggerTiles: [{ x: 29, y: 5 }, { x: 29, y: 6 }],
    //   direction: 'east',
    //   requirements: {
    //     questId: 'tutorial_complete',
    //     blockedMessage: 'Complete the tutorial before venturing east.',
    //   },
    // },
  ],

  audio: {
    music: 'overworld_music',
    ambience: 'forest_ambience',
    musicVolume: 0.4,
    ambienceVolume: 0.2,
  },
};

// Export default town config for fallback
export { DEFAULT_TOWN_CONFIG };
