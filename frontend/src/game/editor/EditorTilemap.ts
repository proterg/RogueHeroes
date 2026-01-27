/**
 * EditorTilemap
 * -------------
 * Manages the tile rendering and manipulation for the map editor.
 * Uses Phaser's tilemap system for efficient rendering of large maps.
 */

import Phaser from 'phaser';
import {
  MapData,
  MapLayer,
  LayerName,
  TileRotation,
  OVERWORLD_TILESET,
  EDITOR_CONSTANTS,
} from '../../types/mapEditor';

export class EditorTilemap {
  private scene: Phaser.Scene;
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private tileset: Phaser.Tilemaps.Tileset | null = null;
  private layers: Map<LayerName, Phaser.Tilemaps.TilemapLayer> = new Map();
  private mapWidth: number;
  private mapHeight: number;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private showGrid: boolean = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.mapWidth = EDITOR_CONSTANTS.DEFAULT_MAP_WIDTH;
    this.mapHeight = EDITOR_CONSTANTS.DEFAULT_MAP_HEIGHT;
  }

  /** Create a new empty map with specified dimensions */
  createNewMap(width: number, height: number): void {
    this.destroyExisting();
    this.mapWidth = width;
    this.mapHeight = height;

    // Create blank tilemap
    this.tilemap = this.scene.make.tilemap({
      tileWidth: OVERWORLD_TILESET.tileWidth,
      tileHeight: OVERWORLD_TILESET.tileHeight,
      width: this.mapWidth,
      height: this.mapHeight,
    });

    // Add tileset image
    this.tileset = this.tilemap.addTilesetImage(
      OVERWORLD_TILESET.key,
      OVERWORLD_TILESET.key,
      OVERWORLD_TILESET.tileWidth,
      OVERWORLD_TILESET.tileHeight,
      0,
      0
    );

    if (!this.tileset) {
      console.error('Failed to create tileset');
      return;
    }

    // Create terrain layer (base)
    const terrainLayer = this.tilemap.createBlankLayer(
      'terrain',
      this.tileset,
      0,
      0
    );
    if (terrainLayer) {
      this.layers.set('terrain', terrainLayer);
      // Fill with default grass tile (index 62 is a good grass tile)
      terrainLayer.fill(62, 0, 0, this.mapWidth, this.mapHeight);
    }

    // Create decoration layer (overlay)
    const decorationLayer = this.tilemap.createBlankLayer(
      'decoration',
      this.tileset,
      0,
      0
    );
    if (decorationLayer) {
      this.layers.set('decoration', decorationLayer);
      // Decoration layer starts empty (index -1 means no tile)
      decorationLayer.fill(-1, 0, 0, this.mapWidth, this.mapHeight);
    }

    this.createGrid();
  }

  /** Load map from JSON data */
  loadMap(mapData: MapData): void {
    this.createNewMap(mapData.width, mapData.height);

    // Apply layer data
    mapData.layers.forEach((layerData) => {
      const layer = this.layers.get(layerData.name as LayerName);
      if (layer) {
        for (let y = 0; y < layerData.data.length; y++) {
          for (let x = 0; x < layerData.data[y].length; x++) {
            const tileId = layerData.data[y][x];
            // Convert stored ID (1-based) to Phaser index (0-based), 0 means empty
            layer.putTileAt(tileId > 0 ? tileId - 1 : -1, x, y);
          }
        }
      }
    });
  }

  /** Export map to JSON format */
  exportMap(name: string): MapData {
    const layers: MapLayer[] = [];

    this.layers.forEach((layer, layerName) => {
      const data: number[][] = [];
      for (let y = 0; y < this.mapHeight; y++) {
        const row: number[] = [];
        for (let x = 0; x < this.mapWidth; x++) {
          const tile = layer.getTileAt(x, y);
          // Convert Phaser index (0-based) to stored ID (1-based), -1/null means empty (0)
          row.push(tile && tile.index >= 0 ? tile.index + 1 : 0);
        }
        data.push(row);
      }
      layers.push({ name: layerName, data });
    });

    return {
      name,
      width: this.mapWidth,
      height: this.mapHeight,
      tileSize: OVERWORLD_TILESET.tileWidth,
      tileset: OVERWORLD_TILESET.key,
      layers,
    };
  }

  /** Place a tile at the specified grid position with optional rotation */
  setTile(x: number, y: number, tileId: number, layer: LayerName, rotation: TileRotation = 0): void {
    const tilemapLayer = this.layers.get(layer);
    if (!tilemapLayer || x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) {
      return;
    }
    // tileId is 1-based from palette (1-252), convert to 0-based for Phaser
    const tile = tilemapLayer.putTileAt(tileId > 0 ? tileId - 1 : -1, x, y);
    if (tile && rotation !== 0) {
      // Convert degrees to radians for Phaser
      tile.rotation = (rotation * Math.PI) / 180;
    }
  }

  /** Get tile at grid position */
  getTile(x: number, y: number, layer: LayerName): number {
    const tilemapLayer = this.layers.get(layer);
    if (!tilemapLayer || x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) {
      return 0;
    }
    const tile = tilemapLayer.getTileAt(x, y);
    return tile && tile.index >= 0 ? tile.index + 1 : 0;
  }

  /** Erase tile at position (set to empty) */
  eraseTile(x: number, y: number, layer: LayerName): void {
    const tilemapLayer = this.layers.get(layer);
    if (!tilemapLayer || x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) {
      return;
    }
    tilemapLayer.putTileAt(-1, x, y);
  }

  /** Convert world coordinates to tile coordinates */
  worldToTile(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / OVERWORLD_TILESET.tileWidth),
      y: Math.floor(worldY / OVERWORLD_TILESET.tileHeight),
    };
  }

  /** Get map dimensions in pixels */
  getMapPixelSize(): { width: number; height: number } {
    return {
      width: this.mapWidth * OVERWORLD_TILESET.tileWidth,
      height: this.mapHeight * OVERWORLD_TILESET.tileHeight,
    };
  }

  /** Get map dimensions in tiles */
  getMapSize(): { width: number; height: number } {
    return { width: this.mapWidth, height: this.mapHeight };
  }

  /** Toggle grid visibility */
  setGridVisible(visible: boolean): void {
    this.showGrid = visible;
    if (this.gridGraphics) {
      this.gridGraphics.setVisible(visible);
    }
  }

  /** Create grid overlay */
  private createGrid(): void {
    if (this.gridGraphics) {
      this.gridGraphics.destroy();
    }

    this.gridGraphics = this.scene.add.graphics();
    this.gridGraphics.lineStyle(
      1,
      EDITOR_CONSTANTS.GRID_COLOR,
      EDITOR_CONSTANTS.GRID_ALPHA
    );

    const pixelWidth = this.mapWidth * OVERWORLD_TILESET.tileWidth;
    const pixelHeight = this.mapHeight * OVERWORLD_TILESET.tileHeight;

    // Draw vertical lines
    for (let x = 0; x <= this.mapWidth; x++) {
      const px = x * OVERWORLD_TILESET.tileWidth;
      this.gridGraphics.lineBetween(px, 0, px, pixelHeight);
    }

    // Draw horizontal lines
    for (let y = 0; y <= this.mapHeight; y++) {
      const py = y * OVERWORLD_TILESET.tileHeight;
      this.gridGraphics.lineBetween(0, py, pixelWidth, py);
    }

    this.gridGraphics.setDepth(100);
    this.gridGraphics.setVisible(this.showGrid);
  }

  /** Clean up existing tilemap resources */
  private destroyExisting(): void {
    this.layers.forEach((layer) => layer.destroy());
    this.layers.clear();
    if (this.tilemap) {
      this.tilemap.destroy();
      this.tilemap = null;
    }
    if (this.gridGraphics) {
      this.gridGraphics.destroy();
      this.gridGraphics = null;
    }
  }

  /** Destroy the tilemap */
  destroy(): void {
    this.destroyExisting();
  }
}
