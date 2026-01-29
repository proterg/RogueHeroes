/**
 * App Component
 * -------------
 * Wrapper that loads the Phaser game with Skirmish battle mode.
 * Integrates deployment UI overlay for phased unit placement.
 * Loads battlefield terrain data and passes it to CombatScene.
 */

import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { CombatScene } from './game/scenes/CombatScene';
import { SkirmishDeploymentUI } from './components/ui/SkirmishDeploymentUI';
import { BattlefieldData } from './types/combatTerrain';

const App: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [game, setGame] = useState<Phaser.Game | null>(null);
  const [battlefield, setBattlefield] = useState<BattlefieldData | null>(null);

  // Load battlefield data on mount
  useEffect(() => {
    fetch('/battlefields/battlefield1.json')
      .then(res => res.json())
      .then((data: BattlefieldData) => setBattlefield(data))
      .catch(err => console.warn('Failed to load battlefield:', err));
  }, []);

  // Initialize Phaser game once battlefield is loaded
  useEffect(() => {
    if (gameRef.current || !battlefield) return;

    // Create scene instance to pass battlefield data
    const combatScene = new CombatScene();

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#1a1a2e',
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [], // Don't auto-start any scenes
    };

    gameRef.current = new Phaser.Game(config);

    // Add scene and start with battlefield data once game is ready
    gameRef.current.events.once('ready', () => {
      gameRef.current?.scene.add('CombatScene', combatScene, true, { battlefield });
    });

    setGame(gameRef.current);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      setGame(null);
    };
  }, [battlefield]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div
        id="game-container"
        style={{
          width: '100%',
          height: '100%',
          margin: 0,
          padding: 0,
        }}
      />
      <SkirmishDeploymentUI game={game} />
    </div>
  );
};

export default App;
