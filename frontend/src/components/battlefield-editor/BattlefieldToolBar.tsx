/**
 * BattlefieldToolBar Component
 * ----------------------------
 * Tool selection buttons for paint, erase, and fill tools.
 * Includes brush size selector.
 */

import React from 'react';
import {
  BattlefieldEditorTool,
  BattlefieldBrushSize,
} from '../../types/combatTerrain';
import { battlefieldEditorEvents } from '../../game/scenes/BattlefieldEditorScene';

interface BattlefieldToolBarProps {
  activeTool: BattlefieldEditorTool;
  brushSize: BattlefieldBrushSize;
  showGrid: boolean;
  onSelectTool: (tool: BattlefieldEditorTool) => void;
  onSelectBrushSize: (size: BattlefieldBrushSize) => void;
  onToggleGrid: (show: boolean) => void;
}

const tools: Array<{ id: BattlefieldEditorTool; label: string; icon: string }> = [
  { id: 'paint', label: 'Paint', icon: 'P' },
  { id: 'erase', label: 'Erase', icon: 'E' },
  { id: 'fill', label: 'Fill', icon: 'F' },
];

const brushSizes: Array<{ size: BattlefieldBrushSize; label: string }> = [
  { size: 1, label: '1x1' },
  { size: 2, label: '2x2' },
  { size: 3, label: '3x3' },
];

export const BattlefieldToolBar: React.FC<BattlefieldToolBarProps> = ({
  activeTool,
  brushSize,
  showGrid,
  onSelectTool,
  onSelectBrushSize,
  onToggleGrid,
}) => {
  const handleToolClick = (tool: BattlefieldEditorTool) => {
    onSelectTool(tool);
    battlefieldEditorEvents.emit('setTool', { tool });
  };

  const handleBrushSizeClick = (size: BattlefieldBrushSize) => {
    onSelectBrushSize(size);
    battlefieldEditorEvents.emit('setBrushSize', { size });
  };

  const handleGridToggle = () => {
    const newShow = !showGrid;
    onToggleGrid(newShow);
    battlefieldEditorEvents.emit('toggleGrid', { show: newShow });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>Tools</div>
      <div style={styles.toolGrid}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            style={{
              ...styles.toolButton,
              ...(activeTool === tool.id ? styles.activeButton : {}),
            }}
            onClick={() => handleToolClick(tool.id)}
            title={tool.label}
          >
            <span style={styles.icon}>{tool.icon}</span>
            <span style={styles.label}>{tool.label}</span>
          </button>
        ))}
      </div>

      <div style={styles.divider} />

      <div style={styles.header}>Brush Size</div>
      <div style={styles.brushGrid}>
        {brushSizes.map((bs) => (
          <button
            key={bs.size}
            style={{
              ...styles.brushButton,
              ...(brushSize === bs.size ? styles.activeButton : {}),
            }}
            onClick={() => handleBrushSizeClick(bs.size)}
            title={`${bs.label} brush`}
          >
            {bs.label}
          </button>
        ))}
      </div>

      <div style={styles.divider} />

      <div style={styles.header}>Display</div>
      <button
        style={{
          ...styles.toolButton,
          ...(showGrid ? styles.activeButton : {}),
        }}
        onClick={handleGridToggle}
      >
        <span style={styles.icon}>G</span>
        <span style={styles.label}>Show Grid</span>
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#2a2a3e',
    borderRadius: '8px',
    padding: '8px',
  },
  header: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  toolGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  toolButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    border: '1px solid #444',
    borderRadius: '4px',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  activeButton: {
    backgroundColor: '#4a4a6e',
    borderColor: '#00ff00',
  },
  icon: {
    fontSize: '14px',
    fontWeight: 'bold',
    width: '20px',
    textAlign: 'center',
  },
  label: {
    flex: 1,
  },
  divider: {
    height: '1px',
    backgroundColor: '#444',
    margin: '8px 0',
  },
  brushGrid: {
    display: 'flex',
    gap: '4px',
  },
  brushButton: {
    flex: 1,
    padding: '8px',
    border: '1px solid #444',
    borderRadius: '4px',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  },
};
