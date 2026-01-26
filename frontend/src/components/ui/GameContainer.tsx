/**
 * GameContainer Component
 * -----------------------
 * Wrapper component that initializes and manages the Phaser game instance.
 * Handles React-Phaser communication via event emitters.
 */

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../../game/Game';

interface GameContainerProps {
  currentScene: 'OverworldScene' | 'CombatScene';
  onStartCombat: (combatId: string) => void;
}

export const GameContainer: React.FC<GameContainerProps> = ({
  currentScene,
  onStartCombat,
}) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Create Phaser game instance
    const config = createGameConfig('game-container');
    gameRef.current = new Phaser.Game(config);

    // Listen for combat start events from Phaser
    const handleCombatStart = (data: { combatId: string }) => {
      onStartCombat(data.combatId);
    };

    // Set up event listener when scenes are ready
    gameRef.current.events.on('ready', () => {
      const overworld = gameRef.current?.scene.getScene('OverworldScene');
      overworld?.events.on('start-combat', handleCombatStart);
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [onStartCombat]);

  // Handle scene switching
  useEffect(() => {
    if (!gameRef.current) return;

    const game = gameRef.current;

    // Wait for game to be ready
    if (!game.scene.isActive('OverworldScene') && !game.scene.isActive('CombatScene')) {
      return;
    }

    if (currentScene === 'CombatScene') {
      game.scene.stop('OverworldScene');
      game.scene.start('CombatScene');
    } else {
      game.scene.stop('CombatScene');
      game.scene.start('OverworldScene');
    }
  }, [currentScene]);

  return (
    <div
      ref={containerRef}
      id="game-container"
      style={styles.container}
    />
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
  },
};
