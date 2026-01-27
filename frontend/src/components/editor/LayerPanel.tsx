/**
 * LayerPanel Component
 * --------------------
 * Controls for switching between terrain and decoration layers.
 */

import React from 'react';
import { LayerName } from '../../types/mapEditor';
import { editorEvents } from '../../game/scenes/MapEditorScene';

interface LayerPanelProps {
  activeLayer: LayerName;
  showGrid: boolean;
  onSelectLayer: (layer: LayerName) => void;
  onToggleGrid: (show: boolean) => void;
}

const layers: Array<{ id: LayerName; label: string; description: string }> = [
  { id: 'terrain', label: 'Terrain', description: 'Base ground tiles' },
  { id: 'decoration', label: 'Decoration', description: 'Trees, rocks, etc.' },
];

export const LayerPanel: React.FC<LayerPanelProps> = ({
  activeLayer,
  showGrid,
  onSelectLayer,
  onToggleGrid,
}) => {
  const handleLayerClick = (layer: LayerName) => {
    onSelectLayer(layer);
    editorEvents.emit('setLayer', { layer });
  };

  const handleGridToggle = () => {
    const newValue = !showGrid;
    onToggleGrid(newValue);
    editorEvents.emit('toggleGrid', { show: newValue });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>Layers</div>
      <div style={styles.layerList}>
        {layers.map((layer) => (
          <button
            key={layer.id}
            style={{
              ...styles.layerButton,
              ...(activeLayer === layer.id ? styles.activeButton : {}),
            }}
            onClick={() => handleLayerClick(layer.id)}
            title={layer.description}
          >
            <span style={styles.layerName}>{layer.label}</span>
          </button>
        ))}
      </div>
      <div style={styles.divider} />
      <label style={styles.gridToggle}>
        <input
          type="checkbox"
          checked={showGrid}
          onChange={handleGridToggle}
          style={styles.checkbox}
        />
        <span>Show Grid</span>
      </label>
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
  layerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  layerButton: {
    display: 'flex',
    alignItems: 'center',
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
  layerName: {
    flex: 1,
  },
  divider: {
    height: '1px',
    backgroundColor: '#444',
    margin: '8px 0',
  },
  gridToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
};
