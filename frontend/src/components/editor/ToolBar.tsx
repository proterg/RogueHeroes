/**
 * ToolBar Component
 * -----------------
 * Tool selection buttons for paint, erase, and fill tools.
 * Includes brush size selector.
 */

import React from 'react';
import { EditorTool, BrushSize } from '../../types/mapEditor';
import { editorEvents } from '../../game/scenes/MapEditorScene';

interface ToolBarProps {
  activeTool: EditorTool;
  brushSize: BrushSize;
  onSelectTool: (tool: EditorTool) => void;
  onSelectBrushSize: (size: BrushSize) => void;
}

const tools: Array<{ id: EditorTool; label: string; icon: string }> = [
  { id: 'paint', label: 'Paint', icon: '🖌' },
  { id: 'erase', label: 'Erase', icon: '🗑' },
  { id: 'fill', label: 'Fill', icon: '🪣' },
];

const brushSizes: Array<{ size: BrushSize; label: string }> = [
  { size: 1, label: '1x1' },
  { size: 2, label: '2x2' },
  { size: 3, label: '3x3' },
];

export const ToolBar: React.FC<ToolBarProps> = ({
  activeTool,
  brushSize,
  onSelectTool,
  onSelectBrushSize,
}) => {
  const handleToolClick = (tool: EditorTool) => {
    onSelectTool(tool);
    editorEvents.emit('setTool', { tool });
  };

  const handleBrushSizeClick = (size: BrushSize) => {
    onSelectBrushSize(size);
    editorEvents.emit('setBrushSize', { size });
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
    fontSize: '18px',
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
