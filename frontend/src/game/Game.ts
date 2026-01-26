/**
 * Phaser Game Configuration
 * -------------------------
 * Creates and configures the Phaser game instance.
 * Registers all scenes and sets up rendering options.
 */

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { OverworldScene } from './scenes/OverworldScene';
import { CombatScene } from './scenes/CombatScene';

export function createGameConfig(parentId: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: parentId,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#1a1a2e',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, OverworldScene, CombatScene],
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    render: {
      pixelArt: false,
      antialias: true,
    },
  };
}
