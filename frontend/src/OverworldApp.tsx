/**
 * OverworldApp Component
 * ----------------------
 * Official overworld screen with HOMM3-style layout.
 * Main map view (owmap) on the left, toolbar on the right.
 */

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { OverworldScene } from './game/scenes/OverworldScene';

// Layout configuration
const TOOLBAR_WIDTH = 200;
const SCREEN_MARGIN = 18; // Comfortable margin around the game
const BORDER_COLOR = '#333';
const BG_COLOR = '#0d0d1a';

const OverworldApp: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;

    // Calculate game dimensions with margins
    const gameWidth = window.innerWidth - TOOLBAR_WIDTH - (SCREEN_MARGIN * 3); // left, middle, right margins
    const gameHeight = window.innerHeight - (SCREEN_MARGIN * 2); // top and bottom margins

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

    // Handle window resize
    const handleResize = () => {
      if (gameRef.current) {
        const newWidth = window.innerWidth - TOOLBAR_WIDTH - (SCREEN_MARGIN * 3);
        const newHeight = window.innerHeight - (SCREEN_MARGIN * 2);
        gameRef.current.scale.resize(newWidth, newHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

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

        {/* Tooltip / Info Section */}
        <div
          id="toolbar-tooltip"
          style={{
            backgroundColor: '#1a1a2e',
            border: `2px solid ${BORDER_COLOR}`,
            borderRadius: 4,
            padding: 8,
            minHeight: 80,
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
            Info
          </div>
          <div
            id="tooltip-content"
            style={{
              color: '#aaa',
              fontSize: '12px',
            }}
          >
            <div style={{ color: '#e94560', fontWeight: 'bold', marginBottom: 4 }}>
              Your Town
            </div>
            <div style={{ color: '#888', fontSize: '11px' }}>
              Click minimap to navigate
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div
          id="toolbar-controls"
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
            Controls
          </div>
          <div style={{ color: '#888', fontSize: '11px', lineHeight: 1.6 }}>
            <div><span style={{ color: '#aaa' }}>Click</span> - Show path</div>
            <div><span style={{ color: '#aaa' }}>Click again</span> - Move</div>
            <div><span style={{ color: '#aaa' }}>Esc</span> - Cancel path</div>
            <div><span style={{ color: '#aaa' }}>D</span> - Debug mode</div>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Footer */}
        <div
          id="toolbar-footer"
          style={{
            backgroundColor: '#1a1a2e',
            border: `2px solid ${BORDER_COLOR}`,
            borderRadius: 4,
            padding: 8,
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#555', fontSize: '10px' }}>
            RogueHeroes
          </div>
          <div style={{ color: '#444', fontSize: '9px' }}>
            Overworld
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverworldApp;
