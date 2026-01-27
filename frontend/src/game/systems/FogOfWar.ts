/**
 * Fog of War System
 * -----------------
 * Manages visibility state and renders fog overlay for the overworld.
 * Features smooth circular gradients at sub-tile resolution.
 *
 * Usage:
 *   const fog = new FogOfWar(scene, mapWidth, mapHeight, tileSize);
 *   fog.addVisionSource(heroX, heroY, 4);  // Hero with 4-tile vision
 *   fog.update();
 */

import Phaser from 'phaser';

/** Vision source (hero, town, etc.) */
export interface VisionSource {
  id: string;
  x: number;           // Tile X position
  y: number;           // Tile Y position
  radius: number;      // Vision radius in tiles
}

/** Fog rendering configuration */
export interface FogConfig {
  cellSize: number;           // Sub-tile cell size (default: 4)
  softEdgeTiles: number;      // Soft edge fade in tiles (default: 1.5)
  exploredOpacity: number;    // Opacity for explored but not visible (default: 0.5)
  unexploredColor: number;    // Color for unexplored areas (default: 0x1a1812)
  exploredColor: number;      // Color for explored areas (default: 0x2a2218)
}

const DEFAULT_CONFIG: FogConfig = {
  cellSize: 4,
  softEdgeTiles: 1.5,
  exploredOpacity: 0.5,
  unexploredColor: 0x1a1812,  // Soft dark brown-gray
  exploredColor: 0x2a2218,    // Warm brown tint
};

/**
 * Fog of War system with smooth circular vision
 */
export class FogOfWar {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private config: FogConfig;

  // Map dimensions
  private mapWidth: number;   // In tiles
  private mapHeight: number;  // In tiles
  private tileSize: number;   // Pixels per tile

  // Fog state at sub-tile resolution
  private cellsX: number;
  private cellsY: number;
  private exploredState: number[][] = [];  // 0-1 gradient of exploration

  // Vision sources
  private visionSources: Map<string, VisionSource> = new Map();

  constructor(
    scene: Phaser.Scene,
    mapWidth: number,
    mapHeight: number,
    tileSize: number,
    config: Partial<FogConfig> = {}
  ) {
    this.scene = scene;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.tileSize = tileSize;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Calculate sub-tile grid dimensions
    this.cellsX = Math.ceil((mapWidth * tileSize) / this.config.cellSize);
    this.cellsY = Math.ceil((mapHeight * tileSize) / this.config.cellSize);

    // Initialize explored state
    this.initExploredState();

    // Create graphics object for rendering
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(50);  // Above tiles and entities, below UI
  }

  /**
   * Initialize the explored state array
   */
  private initExploredState(): void {
    this.exploredState = [];
    for (let y = 0; y < this.cellsY; y++) {
      this.exploredState[y] = [];
      for (let x = 0; x < this.cellsX; x++) {
        this.exploredState[y][x] = 0;  // Start unexplored
      }
    }
  }

  /**
   * Add or update a vision source
   */
  addVisionSource(id: string, x: number, y: number, radius: number): void {
    this.visionSources.set(id, { id, x, y, radius });
  }

  /**
   * Update a vision source's position
   */
  updateVisionSource(id: string, x: number, y: number): void {
    const source = this.visionSources.get(id);
    if (source) {
      source.x = x;
      source.y = y;
    }
  }

  /**
   * Remove a vision source
   */
  removeVisionSource(id: string): void {
    this.visionSources.delete(id);
  }

  /**
   * Update and render the fog of war
   */
  update(): void {
    this.render();
  }

  /**
   * Render the fog overlay
   */
  private render(): void {
    this.graphics.clear();

    const { cellSize, softEdgeTiles, exploredOpacity, unexploredColor, exploredColor } = this.config;
    const softEdgePixels = this.tileSize * softEdgeTiles;

    // Pre-calculate vision source positions in pixels
    const sources = Array.from(this.visionSources.values()).map(s => ({
      pixelX: s.x * this.tileSize + this.tileSize / 2,
      pixelY: s.y * this.tileSize + this.tileSize / 2,
      radiusPixels: s.radius * this.tileSize,
    }));

    // Process each fog cell
    for (let cy = 0; cy < this.cellsY; cy++) {
      for (let cx = 0; cx < this.cellsX; cx++) {
        const px = cx * cellSize;
        const py = cy * cellSize;
        const cellCenterX = px + cellSize / 2;
        const cellCenterY = py + cellSize / 2;

        // Calculate current visibility from all sources
        let currentVisibility = 0;
        for (const source of sources) {
          const distance = Math.sqrt(
            Math.pow(cellCenterX - source.pixelX, 2) +
            Math.pow(cellCenterY - source.pixelY, 2)
          );

          if (distance <= source.radiusPixels) {
            currentVisibility = 1;
            break;  // Fully visible, no need to check more
          } else if (distance <= source.radiusPixels + softEdgePixels) {
            const edgeFactor = 1 - (distance - source.radiusPixels) / softEdgePixels;
            currentVisibility = Math.max(currentVisibility, edgeFactor);
          }
        }

        // Update explored state (keep max visibility ever seen)
        const storedExplored = this.exploredState[cy]?.[cx] ?? 0;
        const newExplored = Math.max(storedExplored, currentVisibility);
        if (this.exploredState[cy]) {
          this.exploredState[cy][cx] = newExplored;
        }

        // Determine fog opacity
        let fogOpacity = 0;
        if (currentVisibility >= 0.99) {
          // Fully visible - no fog
          fogOpacity = 0;
        } else if (currentVisibility > 0) {
          // Partially visible (soft edge)
          fogOpacity = exploredOpacity * (1 - currentVisibility);
        } else if (newExplored > 0) {
          // Explored but not currently visible
          fogOpacity = exploredOpacity + (1 - exploredOpacity) * (1 - newExplored);
        } else {
          // Never explored - full fog
          fogOpacity = 1.0;
        }

        // Draw fog cell if needed
        if (fogOpacity > 0.01) {
          const isExplored = newExplored > 0;
          const fogColor = isExplored ? exploredColor : unexploredColor;
          this.graphics.fillStyle(fogColor, fogOpacity);
          this.graphics.fillRect(px, py, cellSize, cellSize);
        }
      }
    }
  }

  /**
   * Check if a tile is currently visible
   */
  isTileVisible(tileX: number, tileY: number): boolean {
    const tileCenterX = tileX * this.tileSize + this.tileSize / 2;
    const tileCenterY = tileY * this.tileSize + this.tileSize / 2;

    for (const source of this.visionSources.values()) {
      const sourcePixelX = source.x * this.tileSize + this.tileSize / 2;
      const sourcePixelY = source.y * this.tileSize + this.tileSize / 2;
      const radiusPixels = source.radius * this.tileSize;

      const distance = Math.sqrt(
        Math.pow(tileCenterX - sourcePixelX, 2) +
        Math.pow(tileCenterY - sourcePixelY, 2)
      );

      if (distance <= radiusPixels) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a tile has been explored
   */
  isTileExplored(tileX: number, tileY: number): boolean {
    const cellX = Math.floor((tileX * this.tileSize) / this.config.cellSize);
    const cellY = Math.floor((tileY * this.tileSize) / this.config.cellSize);
    return (this.exploredState[cellY]?.[cellX] ?? 0) > 0;
  }

  /**
   * Get the average explored value for a tile (for minimap rendering)
   */
  getTileExploredValue(tileX: number, tileY: number): number {
    const cellSize = this.config.cellSize;
    const cellStartX = Math.floor((tileX * this.tileSize) / cellSize);
    const cellStartY = Math.floor((tileY * this.tileSize) / cellSize);
    const cellEndX = Math.floor(((tileX + 1) * this.tileSize) / cellSize);
    const cellEndY = Math.floor(((tileY + 1) * this.tileSize) / cellSize);

    let totalExplored = 0;
    let count = 0;

    for (let cy = cellStartY; cy < cellEndY; cy++) {
      for (let cx = cellStartX; cx < cellEndX; cx++) {
        totalExplored += this.exploredState[cy]?.[cx] ?? 0;
        count++;
      }
    }

    return count > 0 ? totalExplored / count : 0;
  }

  /**
   * Get the graphics object (for depth management)
   */
  getGraphics(): Phaser.GameObjects.Graphics {
    return this.graphics;
  }

  /**
   * Set the depth of the fog graphics
   */
  setDepth(depth: number): void {
    this.graphics.setDepth(depth);
  }

  /**
   * Destroy the fog system
   */
  destroy(): void {
    this.graphics.destroy();
    this.visionSources.clear();
    this.exploredState = [];
  }
}
