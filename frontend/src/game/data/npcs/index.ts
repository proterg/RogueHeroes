/**
 * NPC Registry
 * ------------
 * Central registry for all NPC characters in the game.
 * NPCs are referenced by ID in map configurations.
 */

import { NpcCharacter } from '../../../types/npcCharacter';
import { MARTA, SERAPHINA } from '../TavernNpcs';

// =============================================================================
// NPC REGISTRY
// =============================================================================

/** All NPCs keyed by their unique ID */
export const NPC_REGISTRY: Record<string, NpcCharacter> = {
  [MARTA.id]: MARTA,
  [SERAPHINA.id]: SERAPHINA,
};

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Get a single NPC by ID
 * @param id - The NPC's unique identifier
 * @returns The NPC character or undefined if not found
 */
export function getNpc(id: string): NpcCharacter | undefined {
  return NPC_REGISTRY[id];
}

/**
 * Get multiple NPCs by their IDs
 * @param ids - Array of NPC identifiers
 * @returns Array of NPC characters (filters out any not found)
 */
export function getNpcs(ids: string[]): NpcCharacter[] {
  return ids
    .map(id => NPC_REGISTRY[id])
    .filter((npc): npc is NpcCharacter => npc !== undefined);
}

/**
 * Get all registered NPCs
 * @returns Array of all NPC characters
 */
export function getAllNpcs(): NpcCharacter[] {
  return Object.values(NPC_REGISTRY);
}

/**
 * Check if an NPC exists in the registry
 * @param id - The NPC's unique identifier
 * @returns True if the NPC exists
 */
export function hasNpc(id: string): boolean {
  return id in NPC_REGISTRY;
}
