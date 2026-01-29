/**
 * OverworldApp Component
 * ----------------------
 * Official overworld screen with HOMM3-style layout.
 * Main map view (owmap) on the left, toolbar on the right.
 * Handles interaction modals triggered by stepping on special tiles.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { OverworldScene } from './game/scenes/OverworldScene';
import { InteractionTrigger } from './types/interaction';
import { InteractionModal } from './components/ui/InteractionModal';
import { ArmyDisplay } from './components/ui/ArmyDisplay';
import { InteractionStoreProvider, useInteractionStore } from './stores';

// Layout configuration
const TOOLBAR_WIDTH = 200;
const SCREEN_MARGIN = 18; // Comfortable margin around the game
const BORDER_COLOR = '#333';
const BG_COLOR = '#0d0d1a';

/** Inner component that uses the interaction store */
const OverworldContent: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<OverworldScene | null>(null);
  const [activeInteraction, setActiveInteraction] = useState<InteractionTrigger | null>(null);
  const [gameSize, setGameSize] = useState({ width: 0, height: 0 });
  const { gold, recruitedUnits, combatModifiers } = useInteractionStore();

  // Calculate game dimensions
  const calculateGameSize = useCallback(() => {
    const width = window.innerWidth - TOOLBAR_WIDTH - (SCREEN_MARGIN * 3);
    const height = window.innerHeight - (SCREEN_MARGIN * 2);
    return { width, height };
  }, []);

  useEffect(() => {
    if (gameRef.current) return;

    const { width: gameWidth, height: gameHeight } = calculateGameSize();
    setGameSize({ width: gameWidth, height: gameHeight });

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'owmap-container',
      width: gameWidth,
      height: gameHeight,
      backgroundColor: '#1a1a2e',
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.NONE,
      },
      scene: [OverworldScene],
    };

    gameRef.current = new Phaser.Game(config);

    // Get scene reference when it's ready
    gameRef.current.events.once('ready', () => {
      const scene = gameRef.current?.scene.getScene('OverworldScene') as OverworldScene;
      if (scene) {
        sceneRef.current = scene;

        // Listen for interaction events from Phaser
        scene.events.on('interaction-triggered', (trigger: InteractionTrigger) => {
          console.log('React received interaction:', trigger);
          setActiveInteraction(trigger);
        });
      }
    });

    // Handle window resize
    const handleResize = () => {
      if (gameRef.current) {
        const { width: newWidth, height: newHeight } = calculateGameSize();
        gameRef.current.scale.resize(newWidth, newHeight);
        setGameSize({ width: newWidth, height: newHeight });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [calculateGameSize]);

  // Handle closing the interaction modal
  const handleCloseInteraction = useCallback(() => {
    setActiveInteraction(null);
    // Unlock input in the scene and resume audio
    if (sceneRef.current) {
      sceneRef.current.setInputLocked(false);
      sceneRef.current.resumeAudio();
    }
  }, []);

  // Resume audio when modal opens (in case AudioContext was suspended)
  useEffect(() => {
    if (activeInteraction && sceneRef.current) {
      sceneRef.current.resumeAudio();
    }
  }, [activeInteraction]);

  return (
    <div
      id="overworld-screen"
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        backgroundColor: BG_COLOR,
        padding: SCREEN_MARGIN,
        boxSizing: 'border-box',
        gap: SCREEN_MARGIN,
      }}
    >
      {/* Main Map Area (owmap) */}
      <div
        id="owmap"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          border: `2px solid ${BORDER_COLOR}`,
          borderRadius: 4,
          overflow: 'hidden',
          backgroundColor: '#1a1a2e',
          position: 'relative',
        }}
      >
        {/* Game canvas container */}
        <div
          id="owmap-container"
          style={{
            flex: 1,
            overflow: 'hidden',
          }}
        />

        {/* Interaction Modal */}
        {activeInteraction && (
          <InteractionModal
            interaction={activeInteraction}
            onClose={handleCloseInteraction}
            gameWidth={gameSize.width}
            gameHeight={gameSize.height}
          />
        )}
      </div>

      {/* Toolbar (right side) */}
      <div
        id="toolbar"
        style={{
          width: TOOLBAR_WIDTH,
          display: 'flex',
          flexDirection: 'column',
          gap: SCREEN_MARGIN,
        }}
      >
        {/* Minimap Section */}
        <div
          id="toolbar-minimap"
          style={{
            backgroundColor: '#1a1a2e',
            border: `2px solid ${BORDER_COLOR}`,
            borderRadius: 4,
            padding: 8,
          }}
        >
          <div
            style={{
              color: '#666',
              fontSize: '10px',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Minimap
          </div>
          <canvas
            id="minimap-canvas"
            style={{
              width: '100%',
              backgroundColor: '#000',
              border: '1px solid #444',
              borderRadius: 2,
            }}
          />
        </div>

        {/* Resources Section */}
        <div
          id="toolbar-resources"
          style={{
            backgroundColor: '#1a1a2e',
            border: `2px solid ${BORDER_COLOR}`,
            borderRadius: 4,
            padding: 8,
          }}
        >
          <div
            style={{
              color: '#666',
              fontSize: '10px',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Resources
          </div>
          <div style={{ color: '#ffd700', fontSize: '14px', fontWeight: 'bold' }}>
            Gold: {gold}
          </div>
          {combatModifiers.length > 0 && (
            <div style={{ color: '#9370db', fontSize: '11px', marginTop: 4 }}>
              Blessings: {combatModifiers.length}
            </div>
          )}
        </div>

        {/* Army Display Section */}
        <ArmyDisplay />
      </div>
    </div>
  );
};

/** Main app wrapped with providers */
const OverworldApp: React.FC = () => {
  return (
    <InteractionStoreProvider>
      <OverworldContent />
    </InteractionStoreProvider>
  );
};

export default OverworldApp;
