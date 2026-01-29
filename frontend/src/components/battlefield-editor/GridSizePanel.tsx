/**
 * GridSizePanel Component
 * -----------------------
 * Controls for dynamically resizing the battlefield grid.
 * Allows adding/removing rows and columns.
 */

import React from 'react';
import { battlefieldEditorEvents } from '../../game/scenes/BattlefieldEditorScene';

interface GridSizePanelProps {
  width: number;
  height: number;
  onSizeChange: (width: number, height: number) => void;
}

export const GridSizePanel: React.FC<GridSizePanelProps> = ({
  width,
  height,
  onSizeChange,
}) => {
  const handleAddColumn = () => {
    const newWidth = width + 1;
    console.log('GridSizePanel: Adding column to right, emitting resizeGrid', { width: newWidth, height, edge: 'right' });
    onSizeChange(newWidth, height);
    battlefieldEditorEvents.emit('resizeGrid', { width: newWidth, height, edge: 'right' });
  };

  const handleRemoveColumn = () => {
    if (width <= 4) return; // Minimum width
    const newWidth = width - 1;
    onSizeChange(newWidth, height);
    battlefieldEditorEvents.emit('resizeGrid', { width: newWidth, height, edge: 'right' });
  };

  const handleAddRow = () => {
    const newHeight = height + 1;
    console.log('GridSizePanel: Adding row to bottom, emitting resizeGrid', { width, height: newHeight, edge: 'bottom' });
    onSizeChange(width, newHeight);
    battlefieldEditorEvents.emit('resizeGrid', { width, height: newHeight, edge: 'bottom' });
  };

  const handleRemoveRow = () => {
    if (height <= 4) return; // Minimum height
    const newHeight = height - 1;
    onSizeChange(width, newHeight);
    battlefieldEditorEvents.emit('resizeGrid', { width, height: newHeight, edge: 'bottom' });
  };

  const handleAddColumnLeft = () => {
    const newWidth = width + 1;
    onSizeChange(newWidth, height);
    battlefieldEditorEvents.emit('resizeGrid', { width: newWidth, height, edge: 'left' });
  };

  const handleRemoveColumnLeft = () => {
    if (width <= 4) return;
    const newWidth = width - 1;
    onSizeChange(newWidth, height);
    battlefieldEditorEvents.emit('resizeGrid', { width: newWidth, height, edge: 'left', remove: true });
  };

  const handleAddRowTop = () => {
    const newHeight = height + 1;
    onSizeChange(width, newHeight);
    battlefieldEditorEvents.emit('resizeGrid', { width, height: newHeight, edge: 'top' });
  };

  const handleRemoveRowTop = () => {
    if (height <= 4) return;
    const newHeight = height - 1;
    onSizeChange(width, newHeight);
    battlefieldEditorEvents.emit('resizeGrid', { width, height: newHeight, edge: 'top', remove: true });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>Grid Size</div>

      <div style={styles.sizeDisplay}>
        <span style={styles.sizeText}>{width} x {height}</span>
      </div>

      {/* Width controls */}
      <div style={styles.controlRow}>
        <span style={styles.label}>Width:</span>
        <div style={styles.buttonGroup}>
          <button
            style={styles.smallButton}
            onClick={handleRemoveColumnLeft}
            disabled={width <= 4}
            title="Remove column from left"
          >
            -L
          </button>
          <button
            style={styles.smallButton}
            onClick={handleRemoveColumn}
            disabled={width <= 4}
            title="Remove column from right"
          >
            -R
          </button>
          <button
            style={styles.smallButton}
            onClick={handleAddColumnLeft}
            title="Add column to left"
          >
            +L
          </button>
          <button
            style={styles.smallButton}
            onClick={handleAddColumn}
            title="Add column to right"
          >
            +R
          </button>
        </div>
      </div>

      {/* Height controls */}
      <div style={styles.controlRow}>
        <span style={styles.label}>Height:</span>
        <div style={styles.buttonGroup}>
          <button
            style={styles.smallButton}
            onClick={handleRemoveRowTop}
            disabled={height <= 4}
            title="Remove row from top"
          >
            -T
          </button>
          <button
            style={styles.smallButton}
            onClick={handleRemoveRow}
            disabled={height <= 4}
            title="Remove row from bottom"
          >
            -B
          </button>
          <button
            style={styles.smallButton}
            onClick={handleAddRowTop}
            title="Add row to top"
          >
            +T
          </button>
          <button
            style={styles.smallButton}
            onClick={handleAddRow}
            title="Add row to bottom"
          >
            +B
          </button>
        </div>
      </div>

      <div style={styles.hint}>
        L=Left, R=Right, T=Top, B=Bottom
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
  sizeDisplay: {
    textAlign: 'center',
    marginBottom: '8px',
    padding: '6px',
    backgroundColor: '#1a1a2e',
    borderRadius: '4px',
  },
  sizeText: {
    color: '#00ff00',
    fontSize: '16px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  label: {
    color: '#aaa',
    fontSize: '12px',
    width: '45px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '2px',
    flex: 1,
  },
  smallButton: {
    flex: 1,
    padding: '4px 2px',
    border: '1px solid #444',
    borderRadius: '3px',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  },
  hint: {
    color: '#666',
    fontSize: '9px',
    textAlign: 'center',
    marginTop: '4px',
  },
};
