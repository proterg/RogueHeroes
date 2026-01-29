/**
 * Interaction System Types
 * ------------------------
 * Type definitions for the overworld interaction system.
 * Interactions are triggered when the hero steps on certain tiles.
 */

// =============================================================================
// INTERACTION TYPES
// =============================================================================

/** Types of interactions available in the overworld */
export type InteractionType = 'town' | 'shrine' | 'chest' | 'npc';

/** Data passed from Phaser to React when an interaction is triggered */
export interface InteractionTrigger {
  id: string;                    // Unique ID for this interaction instance
  type: InteractionType;         // Type of interaction
  tileX: number;                 // Tile X coordinate
  tileY: number;                 // Tile Y coordinate
  mapId: string;                 // Map where the interaction occurs
  locationId?: string;           // Optional location ID from map config
  data: TownData | ShrineData | ChestData | NpcData;  // Type-specific data
}

// =============================================================================
// INTERACTION-SPECIFIC DATA
// =============================================================================

/** Data for town interactions */
export interface TownData {
  name: string;
  description: string;
  availableUnits: RecruitableUnit[];
  availableBlessings: Blessing[];
}

/** Unit that can be recruited at a town */
export interface RecruitableUnit {
  type: string;        // Unit type (e.g., 'soldier', 'archer')
  name: string;        // Display name
  cost: number;        // Gold cost
  maxCount: number;    // Max recruitable per visit
}

/** Blessing available at a town */
export interface Blessing {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: InteractionEffect;
}

/** Data for shrine interactions */
export interface ShrineData {
  name: string;
  description: string;
  effect: InteractionEffect;
  isOneTime: boolean;
}

/** Data for chest interactions */
export interface ChestData {
  contents: ChestContents[];
  isLooted: boolean;
}

/** Possible chest contents */
export interface ChestContents {
  type: 'gold' | 'item' | 'unit';
  value: number | string;
  quantity?: number;
}

/** Data for NPC interactions */
export interface NpcData {
  name: string;
  portrait?: string;
  dialogue: string[];
  choices?: NpcChoice[];
}

/** NPC dialogue choice */
export interface NpcChoice {
  text: string;
  effect?: InteractionEffect;
  nextDialogue?: string[];
}

// =============================================================================
// EFFECTS
// =============================================================================

/** Effect applied when player makes a choice in an interaction */
export interface InteractionEffect {
  type: 'add_unit' | 'stat_modifier' | 'heal_army' | 'add_gold' | 'curse';
  target: 'all_units' | 'unit_type' | 'next_combat' | 'player';
  unitType?: string;           // For unit_type target
  value: StatModifiers | number | RecruitedUnit;
  duration?: 'permanent' | 'next_combat' | 'timed';
  turns?: number;              // For timed duration
}

/** Unit recruited through an interaction */
export interface RecruitedUnit {
  type: string;
  count: number;
}

// =============================================================================
// COMBAT MODIFIERS
// =============================================================================

/** Stat modifiers that can be applied to units */
export interface StatModifiers {
  hp?: number;
  attack?: number;
  defense?: number;
  critChance?: number;
  critDamage?: number;
  moveSpeed?: number;
  attackSpeed?: number;
  vision?: number;
  lifesteal?: number;
}

/** A modifier applied to combat from an interaction */
export interface CombatModifier {
  id: string;
  source: string;              // Human-readable source (e.g., "Shrine of Valor")
  modifiers: StatModifiers;
  target: 'all_units' | 'unit_type';
  unitType?: string;           // For unit_type target
  expiresAfterCombat: boolean;
}

// =============================================================================
// STORE STATE
// =============================================================================

/** State managed by the interaction store */
export interface InteractionStoreState {
  combatModifiers: CombatModifier[];
  recruitedUnits: RecruitedUnit[];
  gold: number;
  usedInteractionIds: Set<string>;
}
