/**
 * SaveLoadPanel Component
 * -----------------------
 * Controls for saving, loading, and creating new maps.
 */

import React, { useRef, useState } from 'react';
import { MapData, EDITOR_CONSTANTS } from '../../types/mapEditor';
import { editorEvents } from '../../game/scenes/MapEditorScene';

interface SaveLoadPanelProps {
  onNewMap: (width: number, height: number) => void;
  onLoadMap: (mapData: MapData) => void;
}

export const SaveLoadPanel: React.FC<SaveLoadPanelProps> = ({
  onNewMap,
  onLoadMap,
}) => {
  const [showNewMapDialog, setShowNewMapDialog] = useState(false);
  const [newMapWidth, setNewMapWidth] = useState(EDITOR_CONSTANTS.DEFAULT_MAP_WIDTH);
  const [newMapHeight, setNewMapHeight] = useState(EDITOR_CONSTANTS.DEFAULT_MAP_HEIGHT);
  const [mapName, setMapName] = useState('untitled');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewMap = () => {
    onNewMap(newMapWidth, newMapHeight);
    editorEvents.emit('newMap', { width: newMapWidth, height: newMapHeight });
    setShowNewMapDialog(false);
  };

  const handleSave = () => {
    // Request map data from Phaser
    const handleExport = (data: { mapData: MapData }) => {
      const mapData = { ...data.mapData, name: mapName };
      const json = JSON.stringify(mapData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${mapName}.json`;
      a.click();

      URL.revokeObjectURL(url);
      editorEvents.off('mapExported', handleExport);
    };

    editorEvents.on('mapExported', handleExport);
    editorEvents.emit('saveMap');
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const mapData = JSON.parse(event.target?.result as string) as MapData;
        setMapName(mapData.name || 'untitled');
        onLoadMap(mapData);
        editorEvents.emit('loadMap', { mapData });
      } catch (err) {
        console.error('Failed to parse map file:', err);
        alert('Invalid map file format');
      }
    };
    reader.readAsText(file);

    // Reset file input
    e.target.value = '';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>File</div>

      <div style={styles.nameRow}>
        <label style={styles.label}>Map Name:</label>
        <input
          type="text"
          value={mapName}
          onChange={(e) => setMapName(e.target.value)}
          style={styles.nameInput}
        />
      </div>

      <div style={styles.buttonRow}>
        <button
          style={styles.button}
          onClick={() => setShowNewMapDialog(true)}
        >
          New
        </button>
        <button style={styles.button} onClick={handleSave}>
          Save
        </button>
        <button style={styles.button} onClick={handleLoadClick}>
          Load
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {showNewMapDialog && (
        <div style={styles.dialog}>
          <div style={styles.dialogHeader}>New Map</div>
          <div style={styles.dialogRow}>
            <label style={styles.label}>Width:</label>
            <input
              type="number"
              min={10}
              max={200}
              value={newMapWidth}
              onChange={(e) => setNewMapWidth(parseInt(e.target.value) || 30)}
              style={styles.numberInput}
            />
          </div>
          <div style={styles.dialogRow}>
            <label style={styles.label}>Height:</label>
            <input
              type="number"
              min={10}
              max={200}
              value={newMapHeight}
              onChange={(e) => setNewMapHeight(parseInt(e.target.value) || 20)}
              style={styles.numberInput}
            />
          </div>
          <div style={styles.dialogButtons}>
            <button
              style={styles.dialogButton}
              onClick={() => setShowNewMapDialog(false)}
            >
              Cancel
            </button>
            <button
              style={{ ...styles.dialogButton, ...styles.primaryButton }}
              onClick={handleNewMap}
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#2a2a3e',
    borderRadius: '8px',
    padding: '8px',
    position: 'relative',
  },
  header: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  label: {
    color: '#aaa',
    fontSize: '12px',
  },
  nameInput: {
    flex: 1,
    padding: '4px 8px',
    border: '1px solid #444',
    borderRadius: '4px',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    fontSize: '14px',
  },
  buttonRow: {
    display: 'flex',
    gap: '4px',
  },
  button: {
    flex: 1,
    padding: '8px',
    border: '1px solid #444',
    borderRadius: '4px',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  dialog: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: '#2a2a3e',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '12px',
    zIndex: 100,
  },
  dialogHeader: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  dialogRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  numberInput: {
    width: '80px',
    padding: '4px 8px',
    border: '1px solid #444',
    borderRadius: '4px',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    fontSize: '14px',
  },
  dialogButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '12px',
  },
  dialogButton: {
    padding: '6px 12px',
    border: '1px solid #444',
    borderRadius: '4px',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  primaryButton: {
    backgroundColor: '#4a4a6e',
    borderColor: '#00ff00',
  },
};
