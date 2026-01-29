/**
 * Artifact Data
 * -------------
 * Definitions for all collectible artifacts in the game.
 * Each artifact provides stat bonuses when collected.
 */

import { Artifact } from '../../types/artifact';

/** All available artifacts indexed by ID */
export const ARTIFACTS: Record<string, Artifact> = {
  art_of_the_ground: {
    id: 'art_of_the_ground',
    name: 'The Art of the Ground',
    description: 'A worn leather book containing fighting techniques from a distant land',
    icon: '📖',
    bonuses: { tactics: 1, deployments: 1 },
    source: 'Seraphina',
  },
  charm_of_the_fallen: {
    id: 'charm_of_the_fallen',
    name: 'Charm of the Fallen',
    description: 'A magical charm meant for someone who never received it',
    icon: '🔮',
    bonuses: { attack: 1, defense: 1 },
    source: 'Seraphina',
  },
};

/** Get an artifact by ID */
export function getArtifact(id: string): Artifact | undefined {
  return ARTIFACTS[id];
}

/** Get all artifacts */
export function getAllArtifacts(): Artifact[] {
  return Object.values(ARTIFACTS);
}
