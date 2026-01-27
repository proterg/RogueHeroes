/**
 * Animation System
 * ================
 * Handles creation and management of unit animations.
 * Uses sprite configurations from UnitStats to create Phaser animations.
 */

import Phaser from 'phaser';
import { SPRITE_CONFIGS, getSpriteConfig, SpriteConfig } from '../data/UnitStats';

/** Unit types that have sprites in the game */
export const UNIT_TYPES = [
  'skeleton1',
  'skeleton2',
  'orc',
  'soldier',
  'vampire',
  'archer',
  'axeman',
  'knight',
  'lancer',
] as const;

export type UnitType = typeof UNIT_TYPES[number];

/** Sprite sheet file paths by unit type */
const SPRITE_PATHS: Record<string, Record<string, string>> = {
  skeleton1: {
    idle: 'assets/units/enemies-skeleton1_idle.png',
    attack: 'assets/units/enemies-skeleton1_attack.png',
    attack_down: 'assets/units/enemies-skeleton1_attack_down.png',
    attack_up: 'assets/units/enemies-skeleton1_attack_up.png',
    death: 'assets/units/enemies-skeleton1_death.png',
    move: 'assets/units/enemies-skeleton1_movement.png',
    hurt: 'assets/units/enemies-skeleton1_take_damage.png',
  },
  skeleton2: {
    idle: 'assets/units/enemies-skeleton2_idle.png',
    attack: 'assets/units/enemies-skeleton2_attack.png',
    attack_down: 'assets/units/enemies-skeleton2_attack_down.png',
    attack_up: 'assets/units/enemies-skeleton2_attack_up.png',
    death: 'assets/units/enemies-skeleton2_death.png',
    move: 'assets/units/enemies-skeleton2_movemen.png',
    hurt: 'assets/units/enemies-skeleton2_take_damage.png',
  },
  orc: {
    idle: 'assets/units/orc_idle.png',
    attack: 'assets/units/orc_attack.png',
    attack_down: 'assets/units/orc_attack_down.png',
    attack_up: 'assets/units/orc_attack_up.png',
    death: 'assets/units/orc_death.png',
    move: 'assets/units/orc_move.png',
    hurt: 'assets/units/orc_hurt.png',
  },
  soldier: {
    idle: 'assets/units/soldier_idle.png',
    attack: 'assets/units/soldier_attack.png',
    attack_down: 'assets/units/soldier_attack_down.png',
    attack_up: 'assets/units/soldier_attack_up.png',
    death: 'assets/units/soldier_death.png',
    move: 'assets/units/soldier_move.png',
    hurt: 'assets/units/soldier_hurt.png',
  },
  vampire: {
    idle: 'assets/units/vampire_idle.png',
    attack: 'assets/units/vampire_attack.png',
    attack_down: 'assets/units/vampire_attack_down.png',
    attack_up: 'assets/units/vampire_attack_up.png',
    death: 'assets/units/vampire_death.png',
    move: 'assets/units/vampire_move.png',
    hurt: 'assets/units/vampire_hurt.png',
  },
  archer: {
    idle: 'assets/units/archer_idle.png',
    attack: 'assets/units/archer_attack.png',
    attack_down: 'assets/units/archer_attack_down.png',
    attack_up: 'assets/units/archer_attack_up.png',
    death: 'assets/units/archer_death.png',
    move: 'assets/units/archer_move.png',
    hurt: 'assets/units/archer_hurt.png',
  },
  axeman: {
    idle: 'assets/units/axeman_idle.png',
    attack: 'assets/units/axeman_attack.png',
    attack_down: 'assets/units/axeman_attack_down.png',
    attack_up: 'assets/units/axeman_attack_up.png',
    death: 'assets/units/axeman_death.png',
    move: 'assets/units/axeman_move.png',
    hurt: 'assets/units/axeman_hurt.png',
  },
  knight: {
    idle: 'assets/units/knight_idle.png',
    attack: 'assets/units/knight_attack.png',
    attack_down: 'assets/units/knight_attack_down.png',
    attack_up: 'assets/units/knight_attack_up.png',
    death: 'assets/units/knight_death.png',
    move: 'assets/units/knight_move.png',
    hurt: 'assets/units/knight_hurt.png',
  },
  lancer: {
    idle: 'assets/units/lancer_idle.png',
    attack: 'assets/units/lancer_attack.png',
    attack_down: 'assets/units/lancer_attack_down.png',
    attack_up: 'assets/units/lancer_attack_up.png',
    death: 'assets/units/lancer_death.png',
    move: 'assets/units/lancer_move.png',
    hurt: 'assets/units/lancer_hurt.png',
  },
};

/**
 * Load all unit sprite sheets in preload phase.
 */
export function preloadUnitSprites(scene: Phaser.Scene): void {
  for (const unitType of UNIT_TYPES) {
    const config = getSpriteConfig(unitType);
    const paths = SPRITE_PATHS[unitType];
    const frameSize = config.frameSize;

    // Load each animation sprite sheet
    scene.load.spritesheet(`${unitType}_idle`, paths.idle, {
      frameWidth: frameSize,
      frameHeight: frameSize
    });
    scene.load.spritesheet(`${unitType}_attack`, paths.attack, {
      frameWidth: frameSize,
      frameHeight: frameSize
    });
    scene.load.spritesheet(`${unitType}_attack_down`, paths.attack_down, {
      frameWidth: frameSize,
      frameHeight: frameSize
    });
    scene.load.spritesheet(`${unitType}_attack_up`, paths.attack_up, {
      frameWidth: frameSize,
      frameHeight: frameSize
    });
    scene.load.spritesheet(`${unitType}_death`, paths.death, {
      frameWidth: frameSize,
      frameHeight: frameSize
    });
    scene.load.spritesheet(`${unitType}_move`, paths.move, {
      frameWidth: frameSize,
      frameHeight: frameSize
    });
    scene.load.spritesheet(`${unitType}_hurt`, paths.hurt, {
      frameWidth: frameSize,
      frameHeight: frameSize
    });
  }
}

/**
 * Create all unit animations in create phase.
 */
export function createUnitAnimations(scene: Phaser.Scene): void {
  for (const unitType of UNIT_TYPES) {
    const config = getSpriteConfig(unitType);
    createAnimationsForUnit(scene, unitType, config);
  }
}

/**
 * Create animations for a single unit type.
 */
function createAnimationsForUnit(
  scene: Phaser.Scene,
  unitType: string,
  config: SpriteConfig
): void {
  const anims = config.animations;

  // Idle animation (looping)
  scene.anims.create({
    key: `${unitType}_idle_anim`,
    frames: scene.anims.generateFrameNumbers(`${unitType}_idle`, {
      start: 0,
      end: anims.idle.frames - 1
    }),
    frameRate: anims.idle.frameRate,
    repeat: -1,
  });

  // Attack animation (play once)
  scene.anims.create({
    key: `${unitType}_attack_anim`,
    frames: scene.anims.generateFrameNumbers(`${unitType}_attack`, {
      start: 0,
      end: anims.attack.frames - 1
    }),
    frameRate: anims.attack.frameRate,
    repeat: 0,
  });

  // Attack down animation (play once)
  scene.anims.create({
    key: `${unitType}_attack_down_anim`,
    frames: scene.anims.generateFrameNumbers(`${unitType}_attack_down`, {
      start: 0,
      end: anims.attackDown.frames - 1
    }),
    frameRate: anims.attackDown.frameRate,
    repeat: 0,
  });

  // Attack up animation (play once)
  scene.anims.create({
    key: `${unitType}_attack_up_anim`,
    frames: scene.anims.generateFrameNumbers(`${unitType}_attack_up`, {
      start: 0,
      end: anims.attackUp.frames - 1
    }),
    frameRate: anims.attackUp.frameRate,
    repeat: 0,
  });

  // Death animation (play once)
  scene.anims.create({
    key: `${unitType}_death_anim`,
    frames: scene.anims.generateFrameNumbers(`${unitType}_death`, {
      start: 0,
      end: anims.death.frames - 1
    }),
    frameRate: anims.death.frameRate,
    repeat: 0,
  });

  // Move animation (looping)
  scene.anims.create({
    key: `${unitType}_move_anim`,
    frames: scene.anims.generateFrameNumbers(`${unitType}_move`, {
      start: 0,
      end: anims.move.frames - 1
    }),
    frameRate: anims.move.frameRate,
    repeat: -1,
  });

  // Hurt animation (play once)
  scene.anims.create({
    key: `${unitType}_hurt_anim`,
    frames: scene.anims.generateFrameNumbers(`${unitType}_hurt`, {
      start: 0,
      end: anims.hurt.frames - 1
    }),
    frameRate: anims.hurt.frameRate,
    repeat: 0,
  });
}

/**
 * Get the animation key for a unit type and animation name.
 */
export function getAnimationKey(unitType: string, animName: string): string {
  return `${unitType}_${animName}_anim`;
}

/**
 * Get animation prefix for a unit (just returns the type).
 */
export function getAnimPrefix(unitType: string): string {
  // All unit types use their type as prefix
  return unitType;
}
