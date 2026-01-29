/**
 * BattlefieldSaveLoadPanel Component
 * ----------------------------------
 * Controls for saving, loading, and creating new battlefield maps.
 */

import React, { useRef, useState } from 'react';
import {
  BattlefieldData,
  BATTLEFIELD_EDITOR_CONSTANTS,
} from '../../types/combatTerrain';
import { battlefieldEditorEvents } from '../../game/scenes/BattlefieldEditorScene';

interface BattlefieldSaveLoadPanelProps {
  mapName: string;
  onMapNameChange: (name: string) => void;
  onNewMap: (width: number, height: number) => void;
  onLoadMap: (mapData: BattlefieldData) => void;
}

export const BattlefieldSaveLoadPanel: React.FC<BattlefieldSaveLoadPanelProps> = ({
  mapName,
  onMapNameChange,
  onNewMap,
  onLoadMap,
}) => {
  const [showNewMapDialog, setShowNewMapDialog] = useState(false);
  const [newMapWidth, setNewMapWidth] = useState(BATTLEFIELD_EDITOR_CONSTANTS.DEFAULT_WIDTH);
  const [newMapHeight, setNewMapHeight] = useState(BATTLEFIELD_EDITOR_CONSTANTS.DEFAULT_HEIGHT);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewMap = () => {
    onNewMap(newMapWidth, newMapHeight);
    battlefieldEditorEvents.emit('newMap', { width: newMapWidth, height: newMapHeight });
    setShowNewMapDialog(false);
  };

  const handleSave = () => {
    // Request map data from Phaser
    const handleExport = (data: { mapData: BattlefieldData }) => {
      const mapData = { ...data.mapData, name: mapName };
      const json = JSON.stringify(mapData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `battlefield_${mapName}.json`;
      a.click();

      URL.revokeObjectURL(url);
      battlefieldEditorEvents.off('mapExported', handleExport);
    };

    battlefieldEditorEvents.on('mapExported', handleExport);
    battlefieldEditorEvents.emit('saveMap', { name: mapName });
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
        const mapData = JSON.parse(event.target?.result as string) as BattlefieldData;

        // Validate it's a battlefield file
        if (!mapData.terrain || !Array.isArray(mapData.terrain)) {
          throw new Error('Invalid battlefield file: missing terrain data');
        }

        onMapNameChange(mapData.name || 'untitled');
        onLoadMap(mapData);
        battlefieldEditorEvents.emit('loadMap', { mapData });
      } catch (err) {
        console.error('Failed to parse battlefield file:', err);
        alert('Invalid battlefield file format');
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
          onChange={(e) => onMapNameChange(e.target.value)}
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
          <div style={styles.dialogHeader}>New Battlefield</div>
          <div style={styles.dialogRow}>
            <label style={styles.label}>Width:</label>
            <input
              type="number"
              min={8}
              max={32}
              value={newMapWidth}
              onChange={(e) => setNewMapWidth(parseInt(e.target.value) || 16)}
              style={styles.numberInput}
            />
          </div>
          <div style={styles.dialogRow}>
            <label style={styles.label}>Height:</label>
            <input
              type="number"
              min={6}
              max={16}
              value={newMapHeight}
              onChange={(e) => setNewMapHeight(parseInt(e.target.value) || 9)}
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
