/**
 * Unit Stats Configuration
 * ------------------------
 * Detailed stats for all unit types in the game.
 * Includes sprite configuration for rendering.
 */

// Initiative determines attack order
export type Initiative = 'first' | 'regular' | 'last';

/**
 * Sprite configuration for rendering units
 */
export interface SpriteConfig {
  frameSize: number;    // Base frame size (32 or 100)
  scale: number;        // Display scale multiplier
  originY: number;      // Y origin (0-1, where feet are in frame)
  animations: {
    idle: { frames: number; frameRate: number };
    attack: { frames: number; frameRate: number };
    attackUp: { frames: number; frameRate: number };
    attackDown: { frames: number; frameRate: number };
    death: { frames: number; frameRate: number };
    move: { frames: number; frameRate: number };
    hurt: { frames: number; frameRate: number };
  };
}

export interface UnitStats {
  // Identity
  name: string;
  type: string;
  description: string;

  // Core Stats
  hp: number;           // Health points
  attack: number;       // Base damage per hit (actual damage has ±10% variance)
  defense: number;      // Damage reduction (flat)

  // Speed Stats
  moveSpeed: number;    // Tiles per action (1 = normal)
  attackSpeed: number;  // Attacks per round (1 = normal, 2 = double attack)
  initiative: Initiative; // Attack order: 'first' > 'regular' > 'last' (equal = simultaneous)

  // Combat Stats
  attackRange: number;  // Attack range in tiles (1 = melee, 2+ = ranged)
  critChance: number;   // Critical hit chance (0-100%)
  critDamage: number;   // Critical damage multiplier (1.5 = 150% damage)
  vision: number;       // Vision radius in tiles (circular, reveals fog of war)
  attackDelay: number;  // Turns to transition from move to attack state

  // Size
  size: number;         // Unit width in tiles (1 = normal, 2 = large like mounted units)

  // Special
  lifesteal: number;    // Percentage of damage healed (0.2 = 20%)
  abilities: string[];  // Special abilities (for future use)
}

/**
 * Skeleton Warrior (Type 1)
 * -------------------------
 * Expendable fodder unit - cheap and weak.
 * Low stats across the board, meant to be thrown in numbers.
 */
export const SKELETON_WARRIOR: UnitStats = {
  name: 'Skeleton Warrior',
  type: 'skeleton1',
  description: 'Fragile reanimated bones. Cheap fodder that dies quickly.',

  // Core Stats
  hp: 35,
  attack: 8,
  defense: 2,

  // Speed Stats
  moveSpeed: 1,
  attackSpeed: 1,
  initiative: 'regular',  // No special advantage

  // Combat Stats
  attackRange: 1,       // Melee
  critChance: 5,        // 5% crit chance (basic attacks)
  critDamage: 1.25,     // 125% damage on crit (low impact)
  vision: 4,            // Can see 4 tiles radius
  attackDelay: 1,       // 1 turn to ready attack

  size: 1,              // Normal size
  lifesteal: 0,
  abilities: [],
};

/**
 * Skeleton Guard (Type 2)
 * -----------------------
 * Shield tank - high defense, low damage.
 * Protects the backline and absorbs hits.
 */
export const SKELETON_GUARD: UnitStats = {
  name: 'Skeleton Guard',
  type: 'skeleton2',
  description: 'A skeletal defender with remnants of armor. Absorbs damage for the team.',

  // Core Stats
  hp: 60,
  attack: 8,
  defense: 6,

  // Speed Stats
  moveSpeed: 1,
  attackSpeed: 1,
  initiative: 'regular', // Normal attack order

  // Combat Stats
  attackRange: 1,       // Melee
  critChance: 5,        // 5% crit chance
  critDamage: 1.25,     // 125% damage on crit
  vision: 3,            // Can see 3 tiles radius
  attackDelay: 1,       // 1 turn to ready attack (reduced from 2)

  size: 1,              // Normal size
  lifesteal: 0,
  abilities: [],
};

/**
 * Orc
 * ---
 * Berserker - glass cannon that gets stronger when wounded.
 * Low defense but gains +50% attack when below 50% HP (Rage mechanic).
 */
export const ORC: UnitStats = {
  name: 'Orc',
  type: 'orc',
  description: 'A raging berserker. Deals +50% damage when below half health.',

  // Core Stats
  hp: 70,
  attack: 18,
  defense: 2,             // Glass cannon - low defense

  // Speed Stats
  moveSpeed: 1,
  attackSpeed: 1,
  initiative: 'last',     // Slow to act

  // Combat Stats
  attackRange: 1,         // Melee
  critChance: 20,         // 20% crit chance (more crit-focused)
  critDamage: 2.0,        // 200% damage on crit
  vision: 3,              // Can see 3 tiles radius
  attackDelay: 2,         // 2 turns to ready attack

  size: 1,                // Normal size
  lifesteal: 0,
  abilities: ['rage'],    // +50% ATK below 50% HP (implemented in CombatScene)
};

/**
 * Soldier
 * -------
 * Balanced human fighter with ranged capability.
 * Good all-rounder with decent stats.
 */
export const SOLDIER: UnitStats = {
  name: 'Soldier',
  type: 'soldier',
  description: 'A trained human warrior. Versatile fighter with good balance.',

  // Core Stats
  hp: 50,
  attack: 10,
  defense: 4,

  // Speed Stats
  moveSpeed: 1,
  attackSpeed: 1,
  initiative: 'regular',  // Normal speed

  // Combat Stats
  attackRange: 1,         // Melee (can be changed to 2 for ranged)
  critChance: 12,         // 12% crit chance
  critDamage: 1.5,        // 150% damage on crit
  vision: 5,              // Good vision
  attackDelay: 1,         // 1 turn to ready attack

  size: 1,                // Normal size
  lifesteal: 0,
  abilities: [],
};

/**
 * Vampire
 * -------
 * Fast and deadly undead. High damage, low HP.
 * First strike and life steal potential.
 */
export const VAMPIRE: UnitStats = {
  name: 'Vampire',
  type: 'vampire',
  description: 'A swift undead predator. Strikes fast and hits hard but fragile.',

  // Core Stats
  hp: 35,
  attack: 14,
  defense: 2,

  // Speed Stats
  moveSpeed: 1,
  attackSpeed: 1,
  initiative: 'first',    // Fast attacker

  // Combat Stats
  attackRange: 1,         // Melee
  critChance: 20,         // 20% crit chance
  critDamage: 1.75,       // 175% damage on crit
  vision: 5,              // Good night vision
  attackDelay: 1,         // Quick to attack

  size: 1,                // Normal size
  lifesteal: 0.2,         // 20% lifesteal
  abilities: [],
};

/**
 * Archer
 * ------
 * Ranged DPS - attacks last to give melee time to close distance.
 * Slightly more HP to compensate for late initiative.
 */
export const ARCHER: UnitStats = {
  name: 'Archer',
  type: 'archer',
  description: 'A skilled bowman. Attacks last, giving melee a chance to engage.',

  // Core Stats
  hp: 35,
  attack: 6,
  defense: 2,

  // Speed Stats
  moveSpeed: 1,
  attackSpeed: 1,
  initiative: 'last',     // Attacks last (gives melee chance to close)

  // Combat Stats
  attackRange: 5,         // Ranged - can shoot 5 tiles
  critChance: 18,         // 18% crit chance (aimed shots)
  critDamage: 1.75,       // 175% damage on crit
  vision: 6,              // Excellent vision
  attackDelay: 2,         // Takes time to aim (increased from 1)

  size: 1,                // Normal size
  lifesteal: 0,
  abilities: [],
};

/**
 * Armored Axeman
 * --------------
 * Armored bruiser - tankiest melee with reliable damage.
 * Highest HP and defense, consistent (not crit-focused).
 */
export const AXEMAN: UnitStats = {
  name: 'Armored Axeman',
  type: 'axeman',
  description: 'A heavily armored warrior. Slow but extremely durable.',

  // Core Stats
  hp: 80,
  attack: 15,
  defense: 7,               // Highest armor

  // Speed Stats
  moveSpeed: 1,
  attackSpeed: 1,
  initiative: 'last',       // Heavy armor slows attack

  // Combat Stats
  attackRange: 1,           // Melee
  critChance: 10,           // 10% crit chance (reliable, not crit-focused)
  critDamage: 1.5,          // 150% damage on crit (consistent damage)
  vision: 3,                // Limited vision in helmet
  attackDelay: 2,           // Slow to wind up

  size: 1,                  // Normal size
  lifesteal: 0,
  abilities: [],
};

/**
 * Knight
 * ------
 * Frontline fighter - balanced armor and damage.
 * Slightly tankier than Soldier, reliable in combat.
 */
export const KNIGHT: UnitStats = {
  name: 'Knight',
  type: 'knight',
  description: 'A noble warrior with sword and shield. Well-balanced and reliable.',

  // Core Stats
  hp: 65,
  attack: 14,
  defense: 5,

  // Speed Stats
  moveSpeed: 1,
  attackSpeed: 1,
  initiative: 'regular',    // Standard attack order

  // Combat Stats
  attackRange: 1,           // Melee
  critChance: 12,           // 12% crit chance
  critDamage: 1.75,         // 175% damage on crit
  vision: 4,                // Decent vision
  attackDelay: 1,           // Quick to engage

  size: 1,                  // Normal size
  lifesteal: 0,
  abilities: [],
};

/**
 * Lancer
 * ------
 * Mounted cavalry unit with lance. Fast movement, high charge damage.
 * First strike initiative due to mounted charge.
 */
export const LANCER: UnitStats = {
  name: 'Lancer',
  type: 'lancer',
  description: 'A mounted knight with lance. Fast and deadly on the charge.',

  // Core Stats
  hp: 55,
  attack: 16,
  defense: 4,

  // Speed Stats
  moveSpeed: 2,             // Fast - mounted unit
  attackSpeed: 1,
  initiative: 'first',      // Charge gives first strike

  // Combat Stats
  attackRange: 2,           // Lance reach
  critChance: 18,           // 18% crit chance (charge attack)
  critDamage: 2.0,          // 200% damage on crit
  vision: 5,                // Good vision from horseback
  attackDelay: 1,           // Quick to engage

  size: 2,                  // Large - mounted unit occupies 2 horizontal tiles
  lifesteal: 0,
  abilities: [],
};

/**
 * Get unit stats by type identifier
 */
export function getUnitStats(type: string): UnitStats {
  switch (type) {
    case 'skeleton1':
    case 'skeleton_warrior':
      return SKELETON_WARRIOR;
    case 'skeleton2':
    case 'skeleton_guard':
      return SKELETON_GUARD;
    case 'orc':
      return ORC;
    case 'soldier':
      return SOLDIER;
    case 'vampire':
      return VAMPIRE;
    case 'archer':
      return ARCHER;
    case 'axeman':
      return AXEMAN;
    case 'knight':
      return KNIGHT;
    case 'lancer':
      return LANCER;
    default:
      console.warn(`Unknown unit type: ${type}, using skeleton_warrior`);
      return SKELETON_WARRIOR;
  }
}

/**
 * Calculate damage dealt
 * Attack has ±10% variance (20% total spread), uniform distribution
 */
export function calculateDamage(
  attacker: UnitStats,
  defender: UnitStats,
  attackerCurrentStats?: { critChance?: number }
): { damage: number; isCrit: boolean } {
  // Check for critical hit
  const critRoll = Math.random() * 100;
  const critChance = attackerCurrentStats?.critChance ?? attacker.critChance;
  const isCrit = critRoll < critChance;

  // Stochastic attack: ±10% variance (uniform distribution)
  // Range: [0.9, 1.1] multiplier
  const attackVariance = 0.9 + Math.random() * 0.2;
  const effectiveAttack = Math.round(attacker.attack * attackVariance);

  // Base damage calculation
  let damage = effectiveAttack - defender.defense;

  // Apply critical damage
  if (isCrit) {
    damage = Math.floor(damage * attacker.critDamage);
  }

  // Minimum damage is 1
  damage = Math.max(1, damage);

  return { damage, isCrit };
}

/**
 * Check if a tile is within vision radius of a unit
 * Vision is circular, but we include any square whose center is within radius
 * or whose edge touches the radius circle
 */
export function isInVision(
  unitX: number,
  unitY: number,
  tileX: number,
  tileY: number,
  visionRadius: number
): boolean {
  // Calculate distance from unit center to tile center
  const dx = tileX - unitX;
  const dy = tileY - unitY;
  const distanceToCenter = Math.sqrt(dx * dx + dy * dy);

  // Include tile if its center is within radius
  // or if any part of the tile touches the vision circle
  // (tile extends 0.5 in each direction from center)
  const distanceToEdge = Math.max(0, distanceToCenter - 0.7); // ~sqrt(0.5^2) for corner
  return distanceToEdge <= visionRadius;
}

/**
 * Sprite configurations for all unit types
 */
export const SPRITE_CONFIGS: Record<string, SpriteConfig> = {
  skeleton1: {
    frameSize: 32,
    scale: 2,
    originY: 0.91,
    animations: {
      idle: { frames: 6, frameRate: 6 },
      attack: { frames: 9, frameRate: 12 },
      attackUp: { frames: 9, frameRate: 12 },
      attackDown: { frames: 9, frameRate: 12 },
      death: { frames: 17, frameRate: 12 },
      move: { frames: 10, frameRate: 10 },
      hurt: { frames: 5, frameRate: 10 },
    },
  },
  skeleton2: {
    frameSize: 32,
    scale: 2,
    originY: 0.91,
    animations: {
      idle: { frames: 6, frameRate: 6 },
      attack: { frames: 15, frameRate: 12 },
      attackUp: { frames: 15, frameRate: 12 },
      attackDown: { frames: 15, frameRate: 12 },
      death: { frames: 15, frameRate: 12 },
      move: { frames: 10, frameRate: 10 },
      hurt: { frames: 5, frameRate: 10 },
    },
  },
  orc: {
    frameSize: 100,
    scale: 1.92,
    originY: 0.56,
    animations: {
      idle: { frames: 6, frameRate: 6 },
      attack: { frames: 6, frameRate: 10 },
      attackUp: { frames: 6, frameRate: 10 },
      attackDown: { frames: 6, frameRate: 10 },
      death: { frames: 4, frameRate: 8 },
      move: { frames: 8, frameRate: 10 },
      hurt: { frames: 4, frameRate: 10 },
    },
  },
  soldier: {
    frameSize: 100,
    scale: 2.0,
    originY: 0.56,
    animations: {
      idle: { frames: 6, frameRate: 6 },
      attack: { frames: 6, frameRate: 10 },
      attackUp: { frames: 6, frameRate: 10 },
      attackDown: { frames: 6, frameRate: 10 },
      death: { frames: 4, frameRate: 8 },
      move: { frames: 8, frameRate: 10 },
      hurt: { frames: 4, frameRate: 10 },
    },
  },
  vampire: {
    frameSize: 32,
    scale: 2,
    originY: 0.91,
    animations: {
      idle: { frames: 6, frameRate: 6 },
      attack: { frames: 16, frameRate: 16 },
      attackUp: { frames: 16, frameRate: 16 },
      attackDown: { frames: 16, frameRate: 16 },
      death: { frames: 14, frameRate: 12 },
      move: { frames: 8, frameRate: 10 },
      hurt: { frames: 5, frameRate: 10 },
    },
  },
  archer: {
    frameSize: 100,
    scale: 2.0,
    originY: 0.56,
    animations: {
      idle: { frames: 6, frameRate: 8 },
      attack: { frames: 12, frameRate: 12 },
      attackUp: { frames: 9, frameRate: 12 },
      attackDown: { frames: 9, frameRate: 12 },
      death: { frames: 4, frameRate: 8 },
      move: { frames: 8, frameRate: 10 },
      hurt: { frames: 4, frameRate: 10 },
    },
  },
  axeman: {
    frameSize: 100,
    scale: 2.0,
    originY: 0.56,
    animations: {
      idle: { frames: 6, frameRate: 8 },
      attack: { frames: 9, frameRate: 12 },
      attackUp: { frames: 9, frameRate: 12 },
      attackDown: { frames: 9, frameRate: 12 },
      death: { frames: 4, frameRate: 8 },
      move: { frames: 8, frameRate: 10 },
      hurt: { frames: 4, frameRate: 10 },
    },
  },
  knight: {
    frameSize: 100,
    scale: 2.0,
    originY: 0.56,
    animations: {
      idle: { frames: 6, frameRate: 8 },
      attack: { frames: 7, frameRate: 12 },
      attackUp: { frames: 7, frameRate: 12 },
      attackDown: { frames: 7, frameRate: 12 },
      death: { frames: 4, frameRate: 8 },
      move: { frames: 8, frameRate: 10 },
      hurt: { frames: 4, frameRate: 10 },
    },
  },
  lancer: {
    frameSize: 100,
    scale: 2.0,
    originY: 0.57,
    animations: {
      idle: { frames: 6, frameRate: 8 },
      attack: { frames: 6, frameRate: 12 },
      attackUp: { frames: 6, frameRate: 12 },
      attackDown: { frames: 6, frameRate: 12 },
      death: { frames: 4, frameRate: 8 },
      move: { frames: 8, frameRate: 10 },
      hurt: { frames: 4, frameRate: 10 },
    },
  },
};

/**
 * Get sprite configuration for a unit type
 */
export function getSpriteConfig(type: string): SpriteConfig {
  return SPRITE_CONFIGS[type] || SPRITE_CONFIGS.skeleton1;
}

/**
 * Display stats as formatted string
 */
export function formatStats(stats: UnitStats): string {
  return `
═══════════════════════════════
  ${stats.name.toUpperCase()}
═══════════════════════════════
  ${stats.description}

  ❤️  HP:        ${stats.hp}
  ⚔️  Attack:    ${stats.attack} (±10%)
  🛡️  Defense:   ${stats.defense}

  👟 Move Speed:   ${stats.moveSpeed}
  ⚡ Attack Speed: ${stats.attackSpeed}
  🎯 Initiative:   ${stats.initiative === 'first' ? 'First Strike' : stats.initiative === 'last' ? 'Last Strike' : 'Regular'}

  📏 Range:      ${stats.attackRange === 1 ? 'Melee' : `${stats.attackRange} tiles`}
  💥 Crit:       ${stats.critChance}% @ ${stats.critDamage * 100}% dmg
  👁️  Vision:     ${stats.vision} tiles
  ⏱️  Atk Delay:  ${stats.attackDelay} turn${stats.attackDelay > 1 ? 's' : ''}
═══════════════════════════════
  `.trim();
}
