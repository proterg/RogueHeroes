/**
 * MapEditorApp Component
 * ----------------------
 * Separate React application for the map editor.
 * Loads MapEditorScene directly and overlays the editor UI.
 */

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MapEditorScene } from './game/scenes/MapEditorScene';
import { MapEditorUI } from './components/editor';

const MapEditorApp: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'editor-container',
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#1a1a2e',
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [MapEditorScene],
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div style={styles.wrapper}>
      <div id="editor-container" style={styles.container} />
      <MapEditorUI />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    margin: 0,
    padding: 0,
    overflow: 'hidden',
  },
  container: {
    width: '100%',
    height: '100%',
  },
};

export default MapEditorApp;
