/**
 * TilePalette Component
 * ---------------------
 * Displays all tiles from the tileset in a grid for selection.
 * Supports click-and-drag to select multi-tile stamps (e.g., buildings).
 * Includes rotation controls for placing rotated tiles.
 */

import React, { useEffect, useRef, useState } from 'react';
import { OVERWORLD_TILESET, TileRotation, TileStamp } from '../../types/mapEditor';
import { editorEvents } from '../../game/scenes/MapEditorScene';

interface TilePaletteProps {
  stamp: TileStamp;
  rotation: TileRotation;
  onSelectStamp: (stamp: TileStamp) => void;
  onSelectRotation: (rotation: TileRotation) => void;
}

const rotations: Array<{ value: TileRotation; label: string }> = [
  { value: 0, label: '0°' },
  { value: 90, label: '90°' },
  { value: 180, label: '180°' },
  { value: 270, label: '270°' },
];

const DISPLAY_SCALE = 3;

export const TilePalette: React.FC<TilePaletteProps> = ({
  stamp,
  rotation,
  onSelectStamp,
  onSelectRotation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [tilesetLoaded, setTilesetLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ col: number; row: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ col: number; row: number } | null>(null);

  // Load tileset image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setTilesetLoaded(true);
    };
    img.src = OVERWORLD_TILESET.path;
  }, []);

  // Calculate selection rectangle from stamp
  const getSelectionFromStamp = (s: TileStamp) => {
    const startCol = (s.startTileId - 1) % OVERWORLD_TILESET.columns;
    const startRow = Math.floor((s.startTileId - 1) / OVERWORLD_TILESET.columns);
    return {
      startCol,
      startRow,
      endCol: startCol + s.width - 1,
      endRow: startRow + s.height - 1,
    };
  };

  // Draw tiles when tileset is loaded or selection changes
  useEffect(() => {
    if (!tilesetLoaded || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { columns, rows, tileWidth, tileHeight } = OVERWORLD_TILESET;
    const displayTileSize = tileWidth * DISPLAY_SCALE;

    canvas.width = columns * displayTileSize;
    canvas.height = rows * displayTileSize;
    ctx.imageSmoothingEnabled = false;

    // Draw each tile
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const srcX = col * tileWidth;
        const srcY = row * tileHeight;
        const destX = col * displayTileSize;
        const destY = row * displayTileSize;

        ctx.drawImage(
          imageRef.current,
          srcX, srcY, tileWidth, tileHeight,
          destX, destY, displayTileSize, displayTileSize
        );
      }
    }

    // Draw selection highlight
    let selection: { startCol: number; startRow: number; endCol: number; endRow: number };

    if (isDragging && dragStart && dragEnd) {
      // Show drag preview
      selection = {
        startCol: Math.min(dragStart.col, dragEnd.col),
        startRow: Math.min(dragStart.row, dragEnd.row),
        endCol: Math.max(dragStart.col, dragEnd.col),
        endRow: Math.max(dragStart.row, dragEnd.row),
      };
    } else {
      // Show current stamp selection
      selection = getSelectionFromStamp(stamp);
    }

    const selX = selection.startCol * displayTileSize;
    const selY = selection.startRow * displayTileSize;
    const selW = (selection.endCol - selection.startCol + 1) * displayTileSize;
    const selH = (selection.endRow - selection.startRow + 1) * displayTileSize;

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.strokeRect(selX + 1, selY + 1, selW - 2, selH - 2);

    // Add semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
    ctx.fillRect(selX, selY, selW, selH);
  }, [tilesetLoaded, stamp, isDragging, dragStart, dragEnd]);

  // Draw preview of selected stamp with rotation
  useEffect(() => {
    if (!tilesetLoaded || !previewCanvasRef.current || !imageRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { columns, tileWidth, tileHeight } = OVERWORLD_TILESET;
    const previewScale = 4;
    const previewW = stamp.width * tileWidth * previewScale;
    const previewH = stamp.height * tileHeight * previewScale;
    const maxSize = Math.max(previewW, previewH);

    canvas.width = maxSize;
    canvas.height = maxSize;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, maxSize, maxSize);

    // Center the stamp in canvas
    const offsetX = (maxSize - previewW) / 2;
    const offsetY = (maxSize - previewH) / 2;

    // Apply rotation around center
    ctx.save();
    ctx.translate(maxSize / 2, maxSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-maxSize / 2, -maxSize / 2);

    // Draw each tile in the stamp
    const startCol = (stamp.startTileId - 1) % columns;
    const startRow = Math.floor((stamp.startTileId - 1) / columns);

    for (let dy = 0; dy < stamp.height; dy++) {
      for (let dx = 0; dx < stamp.width; dx++) {
        const srcCol = startCol + dx;
        const srcRow = startRow + dy;
        const srcX = srcCol * tileWidth;
        const srcY = srcRow * tileHeight;

        ctx.drawImage(
          imageRef.current,
          srcX, srcY, tileWidth, tileHeight,
          offsetX + dx * tileWidth * previewScale,
          offsetY + dy * tileHeight * previewScale,
          tileWidth * previewScale,
          tileHeight * previewScale
        );
      }
    }

    ctx.restore();
  }, [tilesetLoaded, stamp, rotation]);

  const getTilePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const displayTileSize = OVERWORLD_TILESET.tileWidth * DISPLAY_SCALE;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / displayTileSize);
    const row = Math.floor(y / displayTileSize);
    if (col >= 0 && col < OVERWORLD_TILESET.columns && row >= 0 && row < OVERWORLD_TILESET.rows) {
      return { col, row };
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getTilePos(e);
    if (pos) {
      setIsDragging(true);
      setDragStart(pos);
      setDragEnd(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const pos = getTilePos(e);
      if (pos) {
        setDragEnd(pos);
      }
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart && dragEnd) {
      const startCol = Math.min(dragStart.col, dragEnd.col);
      const startRow = Math.min(dragStart.row, dragEnd.row);
      const endCol = Math.max(dragStart.col, dragEnd.col);
      const endRow = Math.max(dragStart.row, dragEnd.row);

      const newStamp: TileStamp = {
        startTileId: startRow * OVERWORLD_TILESET.columns + startCol + 1,
        width: endCol - startCol + 1,
        height: endRow - startRow + 1,
      };

      onSelectStamp(newStamp);
      editorEvents.emit('selectStamp', { stamp: newStamp });
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  const handleRotationClick = (rot: TileRotation) => {
    onSelectRotation(rot);
    editorEvents.emit('setRotation', { rotation: rot });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>Tile Palette</div>
      <div style={styles.hint}>Click & drag to select multi-tile stamps</div>

      {/* Preview and Rotation Controls */}
      <div style={styles.previewRow}>
        <div style={styles.previewContainer}>
          <canvas ref={previewCanvasRef} style={styles.previewCanvas} />
        </div>
        <div style={styles.rotationControls}>
          <div style={styles.rotationLabel}>Rotation</div>
          <div style={styles.rotationButtons}>
            {rotations.map((r) => (
              <button
                key={r.value}
                style={{
                  ...styles.rotationButton,
                  ...(rotation === r.value ? styles.activeRotation : {}),
                }}
                onClick={() => handleRotationClick(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.info}>
        {stamp.width}x{stamp.height} tiles @ {rotation}°
      </div>

      {/* Tile Grid */}
      <div style={styles.scrollContainer}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={styles.canvas}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#2a2a3e',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 40px)',
    maxHeight: '900px',
  },
  header: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  hint: {
    color: '#888',
    fontSize: '11px',
    marginBottom: '8px',
    fontStyle: 'italic',
  },
  previewRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '10px',
    alignItems: 'center',
  },
  previewContainer: {
    border: '2px solid #00ff00',
    borderRadius: '4px',
    padding: '4px',
    backgroundColor: '#1a1a2e',
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewCanvas: {
    display: 'block',
    maxWidth: '76px',
    maxHeight: '76px',
  },
  rotationControls: {
    flex: 1,
  },
  rotationLabel: {
    color: '#aaa',
    fontSize: '12px',
    marginBottom: '6px',
  },
  rotationButtons: {
    display: 'flex',
    gap: '4px',
  },
  rotationButton: {
    flex: 1,
    padding: '6px 8px',
    border: '1px solid #444',
    borderRadius: '4px',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  activeRotation: {
    backgroundColor: '#4a4a6e',
    borderColor: '#00ff00',
  },
  info: {
    color: '#aaa',
    fontSize: '12px',
    marginBottom: '8px',
  },
  scrollContainer: {
    overflow: 'auto',
    flex: 1,
    border: '1px solid #444',
    borderRadius: '4px',
  },
  canvas: {
    display: 'block',
    cursor: 'crosshair',
  },
};
