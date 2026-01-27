/**
 * MapEditorUI Component
 * ---------------------
 * Main overlay container that combines all editor UI components.
 * Positioned over the Phaser canvas.
 */

import React, { useState, useEffect } from 'react';
import { TilePalette } from './TilePalette';
import { ToolBar } from './ToolBar';
import { LayerPanel } from './LayerPanel';
import { SaveLoadPanel } from './SaveLoadPanel';
import {
  EditorTool,
  LayerName,
  MapData,
  BrushSize,
  TileRotation,
  TileStamp,
  EDITOR_CONSTANTS,
} from '../../types/mapEditor';
import { editorEvents } from '../../game/scenes/MapEditorScene';

export const MapEditorUI: React.FC = () => {
  const [stamp, setStamp] = useState<TileStamp>({ startTileId: 1, width: 1, height: 1 });
  const [activeTool, setActiveTool] = useState<EditorTool>('paint');
  const [activeLayer, setActiveLayer] = useState<LayerName>('terrain');
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(EDITOR_CONSTANTS.DEFAULT_ZOOM);
  const [brushSize, setBrushSize] = useState<BrushSize>(1);
  const [rotation, setRotation] = useState<TileRotation>(0);

  // Listen for zoom changes from Phaser
  useEffect(() => {
    const handleZoomChange = (data: { zoom: number }) => {
      setZoom(data.zoom);
    };

    editorEvents.on('zoomChanged', handleZoomChange);

    return () => {
      editorEvents.off('zoomChanged', handleZoomChange);
    };
  }, []);

  const handleNewMap = (width: number, height: number) => {
    // State updates happen via event handling in Phaser
    console.log(`Creating new map: ${width}x${height}`);
  };

  const handleLoadMap = (mapData: MapData) => {
    console.log(`Loading map: ${mapData.name}`);
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);
    editorEvents.emit('setZoom', { zoom: newZoom });
  };

  return (
    <div style={styles.overlay}>
      {/* Left Panel - Tools and Layers */}
      <div style={styles.leftPanel}>
        <ToolBar
          activeTool={activeTool}
          brushSize={brushSize}
          onSelectTool={setActiveTool}
          onSelectBrushSize={setBrushSize}
        />
        <LayerPanel
          activeLayer={activeLayer}
          showGrid={showGrid}
          onSelectLayer={setActiveLayer}
          onToggleGrid={setShowGrid}
        />
        <SaveLoadPanel onNewMap={handleNewMap} onLoadMap={handleLoadMap} />
      </div>

      {/* Right Panel - Tile Palette */}
      <div style={styles.rightPanel}>
        <TilePalette
          stamp={stamp}
          rotation={rotation}
          onSelectStamp={setStamp}
          onSelectRotation={setRotation}
        />
      </div>

      {/* Bottom Bar - Zoom and Info */}
      <div style={styles.bottomBar}>
        <div style={styles.zoomControl}>
          <span style={styles.zoomLabel}>Zoom: {zoom.toFixed(2)}x</span>
          <input
            type="range"
            min={EDITOR_CONSTANTS.MIN_ZOOM}
            max={EDITOR_CONSTANTS.MAX_ZOOM}
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
  leftPanel: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    pointerEvents: 'auto',
    width: '180px',
  },
  rightPanel: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    pointerEvents: 'auto',
    width: '400px',
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
