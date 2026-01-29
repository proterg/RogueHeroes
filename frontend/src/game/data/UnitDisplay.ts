/**
 * Unit Display Configuration
 * --------------------------
 * Helper functions for displaying unit icons in the UI.
 * Maps unit types to their sprite paths and frame sizes.
 */

import { getUnitStats, getSpriteConfig } from './UnitStats';

/** Information needed to display a unit icon */
export interface UnitIconInfo {
  type: string;       // Unit type identifier
  name: string;       // Display name
  frameSize: number;  // Frame size in pixels (32 or 100)
  spritePath: string; // Path to idle spritesheet
}

/**
 * Get unit icon display information
 * Maps unit types to their sprite paths, handling naming variations
 */
export function getUnitIconInfo(type: string): UnitIconInfo {
  const stats = getUnitStats(type);
  const spriteConfig = getSpriteConfig(stats.type);

  // Map type to sprite filename
  // Handle skeleton naming variations (skeleton1 -> enemies-skeleton1, etc.)
  let spritePrefix: string;
  switch (stats.type) {
    case 'skeleton1':
      spritePrefix = 'enemies-skeleton1';
      break;
    case 'skeleton2':
      spritePrefix = 'enemies-skeleton2';
      break;
    default:
      spritePrefix = stats.type;
  }

  return {
    type: stats.type,
    name: stats.name,
    frameSize: spriteConfig.frameSize,
    spritePath: `/assets/units/${spritePrefix}_idle.png`,
  };
}

/**
 * Get all available unit types for display
 */
export function getAllUnitTypes(): string[] {
  return [
    'soldier',
    'knight',
    'archer',
    'axeman',
    'lancer',
    'orc',
    'skeleton1',
    'skeleton2',
    'vampire',
  ];
}
