/**
 * BattlefieldEditorApp Component
 * ------------------------------
 * Separate React application for the battlefield terrain editor.
 * Loads BattlefieldEditorScene directly and overlays the editor UI.
 */

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { BattlefieldEditorScene } from './game/scenes/BattlefieldEditorScene';
import { BattlefieldEditorUI } from './components/battlefield-editor/BattlefieldEditorUI';

const BattlefieldEditorApp: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'battlefield-editor-container',
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#1a1a2e',
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [BattlefieldEditorScene],
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div style={styles.wrapper}>
      <div id="battlefield-editor-container" style={styles.container} />
      <BattlefieldEditorUI />
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

export default BattlefieldEditorApp;
