/**
 * Default Game Data
 * -----------------
 * Default configurations for blessings, recruitable units, and other game data.
 * This is a separate file to avoid circular dependencies between InteractionData and maps.
 */

import { Blessing, RecruitableUnit } from '../../types/interaction';

// =============================================================================
// DEFAULT RECRUITABLE UNITS
// =============================================================================

/** Default units available for recruitment at towns */
export const DEFAULT_RECRUITABLE_UNITS: RecruitableUnit[] = [
  { type: 'soldier', name: 'Soldier', cost: 25, maxCount: 3 },
  { type: 'archer', name: 'Archer', cost: 35, maxCount: 2 },
  { type: 'knight', name: 'Knight', cost: 50, maxCount: 2 },
];

// =============================================================================
// DEFAULT BLESSINGS
// =============================================================================

/** Default blessings available at towns */
export const DEFAULT_BLESSINGS: Blessing[] = [
  {
    id: 'blessing_valor',
    name: 'Blessing of Valor',
    description: '+2 Attack for all units in next combat',
    cost: 30,
    effect: {
      type: 'stat_modifier',
      target: 'all_units',
      value: { attack: 2 },
      duration: 'next_combat',
    },
  },
  {
    id: 'blessing_fortitude',
    name: 'Blessing of Fortitude',
    description: '+3 Defense for all units in next combat',
    cost: 30,
    effect: {
      type: 'stat_modifier',
      target: 'all_units',
      value: { defense: 3 },
      duration: 'next_combat',
    },
  },
  {
    id: 'blessing_precision',
    name: 'Blessing of Precision',
    description: '+10% Crit Chance for all units in next combat',
    cost: 40,
    effect: {
      type: 'stat_modifier',
      target: 'all_units',
      value: { critChance: 10 },
      duration: 'next_combat',
    },
  },
];
