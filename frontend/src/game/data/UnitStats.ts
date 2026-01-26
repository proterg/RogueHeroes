/**
 * Unit Stats Configuration
 * ------------------------
 * Detailed stats for all unit types in the game.
 */

// Initiative determines attack order
export type Initiative = 'first' | 'regular' | 'last';

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

  // Special
  abilities: string[];  // Special abilities (for future use)
}

/**
 * Skeleton Warrior (Type 1)
 * -------------------------
 * Basic melee skeleton with balanced stats.
 * Good all-rounder, slightly favors offense.
 */
export const SKELETON_WARRIOR: UnitStats = {
  name: 'Skeleton Warrior',
  type: 'skeleton1',
  description: 'A reanimated warrior wielding a rusty sword. Balanced fighter with decent offense.',

  // Core Stats
  hp: 45,
  attack: 12,
  defense: 3,

  // Speed Stats
  moveSpeed: 1,
  attackSpeed: 1,
  initiative: 'first',    // Attacks first

  // Combat Stats
  attackRange: 1,       // Melee
  critChance: 10,       // 10% crit chance
  critDamage: 1.5,      // 150% damage on crit
  vision: 4,            // Can see 4 tiles radius
  attackDelay: 1,       // 1 turn to ready attack

  abilities: [],
};

/**
 * Skeleton Guard (Type 2)
 * -----------------------
 * Defensive skeleton with shield. Tanky but slower.
 * High HP and defense, lower attack.
 */
export const SKELETON_GUARD: UnitStats = {
  name: 'Skeleton Guard',
  type: 'skeleton2',
  description: 'A skeletal defender with remnants of armor. Tough but slow.',

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
  attackDelay: 2,       // 2 turns to ready attack (slower)

  abilities: [],
};

/**
 * Orc
 * ---
 * Heavy melee fighter with high HP and attack.
 * Slow but devastating when it connects.
 */
export const ORC: UnitStats = {
  name: 'Orc',
  type: 'orc',
  description: 'A brutal green-skinned warrior. Slow but hits like a truck.',

  // Core Stats
  hp: 80,
  attack: 18,
  defense: 4,

  // Speed Stats
  moveSpeed: 1,
  attackSpeed: 1,
  initiative: 'last',     // Slow to act

  // Combat Stats
  attackRange: 1,         // Melee
  critChance: 15,         // 15% crit chance
  critDamage: 2.0,        // 200% damage on crit
  vision: 3,              // Can see 3 tiles radius
  attackDelay: 2,         // 2 turns to ready attack

  abilities: [],
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
