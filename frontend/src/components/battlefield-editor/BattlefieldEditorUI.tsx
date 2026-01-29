/**
 * BattlefieldEditorUI Component
 * -----------------------------
 * Main overlay container that combines all battlefield editor UI components.
 * Positioned over the Phaser canvas.
 */

import React, { useState, useEffect } from 'react';
import { TerrainPalette } from './TerrainPalette';
import { BattlefieldToolBar } from './BattlefieldToolBar';
import { BattlefieldSaveLoadPanel } from './BattlefieldSaveLoadPanel';
import { GridSizePanel } from './GridSizePanel';
import {
  BattlefieldData,
  BattlefieldEditorTool,
  BattlefieldBrushSize,
  BATTLEFIELD_EDITOR_CONSTANTS,
} from '../../types/combatTerrain';
import { battlefieldEditorEvents } from '../../game/scenes/BattlefieldEditorScene';

export const BattlefieldEditorUI: React.FC = () => {
  const [selectedTerrain, setSelectedTerrain] = useState('ground');
  const [activeTool, setActiveTool] = useState<BattlefieldEditorTool>('paint');
  const [brushSize, setBrushSize] = useState<BattlefieldBrushSize>(1);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(BATTLEFIELD_EDITOR_CONSTANTS.DEFAULT_ZOOM);
  const [mapName, setMapName] = useState('untitled');
  const [gridWidth, setGridWidth] = useState(BATTLEFIELD_EDITOR_CONSTANTS.DEFAULT_WIDTH);
  const [gridHeight, setGridHeight] = useState(BATTLEFIELD_EDITOR_CONSTANTS.DEFAULT_HEIGHT);

  // Listen for state changes from Phaser
  useEffect(() => {
    const handleStateChange = (data: {
      selectedTerrain: string;
      activeTool: BattlefieldEditorTool;
      brushSize: BattlefieldBrushSize;
      showGrid: boolean;
      zoom: number;
      mapName: string;
      gridWidth: number;
      gridHeight: number;
    }) => {
      setSelectedTerrain(data.selectedTerrain);
      setActiveTool(data.activeTool);
      setBrushSize(data.brushSize);
      setShowGrid(data.showGrid);
      setZoom(data.zoom);
      setMapName(data.mapName);
      setGridWidth(data.gridWidth);
      setGridHeight(data.gridHeight);
    };

    const handleZoomChange = (data: { zoom: number }) => {
      setZoom(data.zoom);
    };

    battlefieldEditorEvents.on('stateChanged', handleStateChange);
    battlefieldEditorEvents.on('zoomChanged', handleZoomChange);

    return () => {
      battlefieldEditorEvents.off('stateChanged', handleStateChange);
      battlefieldEditorEvents.off('zoomChanged', handleZoomChange);
    };
  }, []);

  const handleNewMap = (width: number, height: number) => {
    console.log(`Creating new battlefield: ${width}x${height}`);
    setMapName('untitled');
    setGridWidth(width);
    setGridHeight(height);
  };

  const handleGridSizeChange = (width: number, height: number) => {
    setGridWidth(width);
    setGridHeight(height);
  };

  const handleLoadMap = (mapData: BattlefieldData) => {
    console.log(`Loading battlefield: ${mapData.name}`);
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);
    battlefieldEditorEvents.emit('setZoom', { zoom: newZoom });
  };

  return (
    <div style={styles.overlay}>
      {/* Title */}
      <div style={styles.title}>Battlefield Editor</div>

      {/* Left Panel - Tools, Grid Size, and Save/Load */}
      <div style={styles.leftPanel}>
        <BattlefieldToolBar
          activeTool={activeTool}
          brushSize={brushSize}
          showGrid={showGrid}
          onSelectTool={setActiveTool}
          onSelectBrushSize={setBrushSize}
          onToggleGrid={setShowGrid}
        />
        <GridSizePanel
          width={gridWidth}
          height={gridHeight}
          onSizeChange={handleGridSizeChange}
        />
        <BattlefieldSaveLoadPanel
          mapName={mapName}
          onMapNameChange={setMapName}
          onNewMap={handleNewMap}
          onLoadMap={handleLoadMap}
        />
      </div>

      {/* Right Panel - Terrain Palette */}
      <div style={styles.rightPanel}>
        <TerrainPalette
          selectedTerrain={selectedTerrain}
          onSelectTerrain={setSelectedTerrain}
        />
      </div>

      {/* Bottom Bar - Zoom and Help */}
      <div style={styles.bottomBar}>
        <div style={styles.zoomControl}>
          <span style={styles.zoomLabel}>Zoom: {zoom.toFixed(2)}x</span>
          <input
            type="range"
            min={BATTLEFIELD_EDITOR_CONSTANTS.MIN_ZOOM}
            max={BATTLEFIELD_EDITOR_CONSTANTS.MAX_ZOOM}
            step={0.25}
            value={zoom}
            onChange={handleZoomChange}
            style={styles.zoomSlider}
          />
        </div>
        <div style={styles.helpText}>
          <span>Pan: Middle-mouse drag or Arrow keys</span>
          <span style={styles.separator}>|</span>
          <span>Zoom: Mouse wheel</span>
          <span style={styles.separator}>|</span>
          <span>Paint: Left-click</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    position: 'absolute',
    top: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#fff',
    fontSize: '20px',
    fontWeight: 'bold',
    backgroundColor: 'rgba(42, 42, 62, 0.9)',
    padding: '8px 20px',
    borderRadius: '8px',
    pointerEvents: 'none',
  },
  leftPanel: {
    position: 'absolute',
    top: '60px',
    left: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    pointerEvents: 'auto',
    width: '180px',
  },
  rightPanel: {
    position: 'absolute',
    top: '60px',
    right: '10px',
    pointerEvents: 'auto',
    width: '220px',
  },
  bottomBar: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    right: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 62, 0.9)',
    borderRadius: '8px',
    padding: '8px 16px',
    pointerEvents: 'auto',
  },
  zoomControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  zoomLabel: {
    color: '#fff',
    fontSize: '14px',
    minWidth: '80px',
  },
  zoomSlider: {
    width: '120px',
    cursor: 'pointer',
  },
  helpText: {
    color: '#aaa',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  separator: {
    color: '#666',
  },
};
