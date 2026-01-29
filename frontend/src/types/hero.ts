/**
 * Hero and Army Type Definitions
 * ------------------------------
 * Types for hero identity, portrait, and army composition.
 * Used by the toolbar's ArmyDisplay component.
 */

/** Hero stat bonuses that modify troop stats */
export interface HeroStats {
  attack: number;      // +X bonus to troop attack
  defense: number;     // +X bonus to troop defense
  speed: number;       // +X bonus to troop movement speed
  vampiric: number;    // Lifesteal percentage (0.0 = 0%)
  attackSpeed: number; // +X bonus to troop attack speed
  magic: number;       // Magic power (future use)
  deployments: number; // +X bonus deployments in combat
  charisma: number;    // +X charisma bonus
  tactics: number;     // +X tactics bonus
}

/** Hero identity and status */
export interface HeroData {
  name: string;
  portraitPath: string;  // Path to hero portrait (e.g., 'assets/units/hero/hero_south.png')
  isAlive: boolean;
  stats: HeroStats;
}

/** Army slot representing a unit type and count */
export interface ArmySlot {
  type: string;   // Unit type (e.g., 'soldier', 'archer')
  count: number;  // Number of units
}

/** Current army state for display */
export interface ArmyState {
  slots: ArmySlot[];
  totalUnits: number;
}

/** Default hero stats (no bonuses) */
export const DEFAULT_HERO_STATS: HeroStats = {
  attack: 0,
  defense: 0,
  speed: 0,
  vampiric: 0,
  attackSpeed: 0,
  magic: 0,
  deployments: 0,
  charisma: 0,
  tactics: 2,
};

/** Default hero data */
export const DEFAULT_HERO: HeroData = {
  name: 'Hero',
  portraitPath: 'assets/units/hero/hero_south.png',
  isAlive: true,
  stats: DEFAULT_HERO_STATS,
};
