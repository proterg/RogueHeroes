/**
 * EditorTools
 * -----------
 * Implements tool behaviors for the map editor: paint, erase, and fill.
 */

import { EditorTilemap } from './EditorTilemap';
import { EditorTool, LayerName, BrushSize, TileRotation, TileStamp, OVERWORLD_TILESET } from '../../types/mapEditor';

export class EditorTools {
  private tilemap: EditorTilemap;
  private currentTool: EditorTool = 'paint';
  private stamp: TileStamp = { startTileId: 1, width: 1, height: 1 };
  private activeLayer: LayerName = 'terrain';
  private brushSize: BrushSize = 1;
  private rotation: TileRotation = 0;

  constructor(tilemap: EditorTilemap) {
    this.tilemap = tilemap;
  }

  /** Set the brush size (1, 2, or 3) */
  setBrushSize(size: BrushSize): void {
    this.brushSize = size;
  }

  /** Get current brush size */
  getBrushSize(): BrushSize {
    return this.brushSize;
  }

  /** Set the tile rotation */
  setRotation(rotation: TileRotation): void {
    this.rotation = rotation;
  }

  /** Get current rotation */
  getRotation(): TileRotation {
    return this.rotation;
  }

  /** Set the current tool */
  setTool(tool: EditorTool): void {
    this.currentTool = tool;
  }

  /** Set the selected stamp */
  setStamp(stamp: TileStamp): void {
    this.stamp = stamp;
  }

  /** Set the active layer */
  setActiveLayer(layer: LayerName): void {
    this.activeLayer = layer;
  }

  /** Get current tool */
  getTool(): EditorTool {
    return this.currentTool;
  }

  /** Get selected stamp */
  getStamp(): TileStamp {
    return this.stamp;
  }

  /** Get active layer */
  getActiveLayer(): LayerName {
    return this.activeLayer;
  }

  /** Apply the current tool at the given tile position */
  applyTool(tileX: number, tileY: number): void {
    const mapSize = this.tilemap.getMapSize();
    if (tileX < 0 || tileY < 0 || tileX >= mapSize.width || tileY >= mapSize.height) {
      return;
    }

    switch (this.currentTool) {
      case 'paint':
        this.paint(tileX, tileY);
        break;
      case 'erase':
        this.erase(tileX, tileY);
        break;
      case 'fill':
        this.fill(tileX, tileY);
        break;
    }
  }

  /** Paint stamp at position */
  private paint(x: number, y: number): void {
    // Calculate starting column/row from stamp's startTileId
    const startCol = (this.stamp.startTileId - 1) % OVERWORLD_TILESET.columns;
    const startRow = Math.floor((this.stamp.startTileId - 1) / OVERWORLD_TILESET.columns);

    // Place each tile in the stamp
    for (let dy = 0; dy < this.stamp.height; dy++) {
      for (let dx = 0; dx < this.stamp.width; dx++) {
        const srcCol = startCol + dx;
        const srcRow = startRow + dy;
        const tileId = srcRow * OVERWORLD_TILESET.columns + srcCol + 1;

        // Apply rotation transformation to position
        let destX = x + dx;
        let destY = y + dy;

        if (this.rotation === 90) {
          destX = x + (this.stamp.height - 1 - dy);
          destY = y + dx;
        } else if (this.rotation === 180) {
          destX = x + (this.stamp.width - 1 - dx);
          destY = y + (this.stamp.height - 1 - dy);
        } else if (this.rotation === 270) {
          destX = x + dy;
          destY = y + (this.stamp.width - 1 - dx);
        }

        this.tilemap.setTile(destX, destY, tileId, this.activeLayer, this.rotation);
      }
    }
  }

  /** Erase tiles based on brush size */
  private erase(x: number, y: number): void {
    this.applyBrush(x, y, (tx, ty) => {
      this.tilemap.eraseTile(tx, ty, this.activeLayer);
    });
  }

  /** Apply an action to all tiles in the brush area */
  private applyBrush(centerX: number, centerY: number, action: (x: number, y: number) => void): void {
    const offset = Math.floor(this.brushSize / 2);
    for (let dy = 0; dy < this.brushSize; dy++) {
      for (let dx = 0; dx < this.brushSize; dx++) {
        const tx = centerX - offset + dx;
        const ty = centerY - offset + dy;
        action(tx, ty);
      }
    }
  }

  /** Flood fill from starting position (uses first tile of stamp) */
  private fill(startX: number, startY: number): void {
    const mapSize = this.tilemap.getMapSize();
    const targetTile = this.tilemap.getTile(startX, startY, this.activeLayer);
    const fillTileId = this.stamp.startTileId; // Use first tile of stamp for fill

    // Don't fill if clicking on a tile that already matches
    if (targetTile === fillTileId) {
      return;
    }

    // BFS flood fill
    const visited = new Set<string>();
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];

    const makeKey = (x: number, y: number) => `${x},${y}`;

    while (queue.length > 0) {
      const pos = queue.shift()!;
      const key = makeKey(pos.x, pos.y);

      // Skip if already visited
      if (visited.has(key)) continue;
      visited.add(key);

      // Skip if out of bounds
      if (pos.x < 0 || pos.y < 0 || pos.x >= mapSize.width || pos.y >= mapSize.height) {
        continue;
      }

      // Skip if tile doesn't match the target
      const currentTile = this.tilemap.getTile(pos.x, pos.y, this.activeLayer);
      if (currentTile !== targetTile) {
        continue;
      }

      // Fill this tile
      this.tilemap.setTile(pos.x, pos.y, fillTileId, this.activeLayer, this.rotation);

      // Add neighbors to queue
      queue.push({ x: pos.x + 1, y: pos.y });
      queue.push({ x: pos.x - 1, y: pos.y });
      queue.push({ x: pos.x, y: pos.y + 1 });
      queue.push({ x: pos.x, y: pos.y - 1 });
    }
  }
}
