/**
 * Minimap System
 * --------------
 * Renders a minimap to an external HTML canvas element.
 * Shows terrain, decorations, fog of war, and markers.
 *
 * Usage:
 *   const minimap = new Minimap('minimap-canvas', mapData, 6);
 *   minimap.setHeroPosition(heroX, heroY);
 *   minimap.setViewport(viewportX, viewportY, width, height);
 *   minimap.render(fogSystem);
 */

import { MapData } from '../../types/mapEditor';
import { FogOfWar } from './FogOfWar';
import { MINIMAP_COLORS } from '../../types/tiles';

/** Minimap marker types */
export interface MinimapMarker {
  id: string;
  x: number;
  y: number;
  color: string;
  shape: 'circle' | 'square';
  size: number;
  borderColor?: string;
}

/**
 * Minimap renderer for external canvas
 */
export class Minimap {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private mapData: MapData;
  private scale: number;

  // State
  private heroX = 0;
  private heroY = 0;
  private viewportX = 0;
  private viewportY = 0;
  private viewportWidth = 15;
  private viewportHeight = 12;

  // Custom markers
  private markers: Map<string, MinimapMarker> = new Map();

  // Vision sources for visibility checks
  private visionSources: { x: number; y: number; radius: number }[] = [];

  constructor(canvasId: string, mapData: MapData, scale: number = 6) {
    this.mapData = mapData;
    this.scale = scale;
    this.initCanvas(canvasId);
  }

  /**
   * Initialize the external canvas
   */
  private initCanvas(canvasId: string): void {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      console.warn(`Minimap canvas '${canvasId}' not found`);
      return;
    }

    // Set canvas size
    this.canvas.width = this.mapData.width * this.scale;
    this.canvas.height = this.mapData.height * this.scale;

    this.ctx = this.canvas.getContext('2d');

    // Set cursor style
    this.canvas.style.cursor = 'pointer';
  }

  /**
   * Add click handler for minimap navigation
   */
  onClick(callback: (tileX: number, tileY: number) => void): void {
    if (!this.canvas) return;

    const handleClick = (event: MouseEvent) => {
      const rect = this.canvas!.getBoundingClientRect();
      const scaleX = this.canvas!.width / rect.width;
      const scaleY = this.canvas!.height / rect.height;

      const localX = (event.clientX - rect.left) * scaleX;
      const localY = (event.clientY - rect.top) * scaleY;

      const tileX = Math.floor(localX / this.scale);
      const tileY = Math.floor(localY / this.scale);

      callback(tileX, tileY);
    };

    this.canvas.addEventListener('click', handleClick);
    this.canvas.addEventListener('mousemove', (event) => {
      if (event.buttons === 1) {
        handleClick(event);
      }
    });
  }

  /**
   * Set hero position
   */
  setHeroPosition(x: number, y: number): void {
    this.heroX = x;
    this.heroY = y;
  }

  /**
   * Set viewport position and size
   */
  setViewport(x: number, y: number, width: number, height: number): void {
    this.viewportX = x;
    this.viewportY = y;
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  /**
   * Set vision sources for visibility calculations
   */
  setVisionSources(sources: { x: number; y: number; radius: number }[]): void {
    this.visionSources = sources;
  }

  /**
   * Add a custom marker
   */
  addMarker(marker: MinimapMarker): void {
    this.markers.set(marker.id, marker);
  }

  /**
   * Remove a marker
   */
  removeMarker(id: string): void {
    this.markers.delete(id);
  }

  /**
   * Render the minimap
   */
  render(fog?: FogOfWar): void {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const scale = this.scale;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw terrain
    this.drawTerrain(ctx, scale);

    // Draw decorations
    this.drawDecorations(ctx, scale);

    // Draw fog of war
    if (fog) {
      this.drawFog(ctx, scale, fog);
    }

    // Draw custom markers
    this.drawMarkers(ctx, scale);

    // Draw viewport rectangle
    this.drawViewport(ctx, scale);

    // Draw hero
    this.drawHero(ctx, scale);
  }

  /**
   * Draw terrain tiles
   */
  private drawTerrain(ctx: CanvasRenderingContext2D, scale: number): void {
    const terrainData = this.mapData.layers.find(l => l.name === 'terrain');
    if (!terrainData) return;

    for (let y = 0; y < terrainData.data.length; y++) {
      for (let x = 0; x < terrainData.data[y].length; x++) {
        const tileId = terrainData.data[y][x];
        ctx.fillStyle = this.hexToRgb(this.getTerrainColor(tileId));
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }

  /**
   * Draw decoration tiles
   */
  private drawDecorations(ctx: CanvasRenderingContext2D, scale: number): void {
    const decorData = this.mapData.layers.find(l => l.name === 'decoration');
    if (!decorData) return;

    for (let y = 0; y < decorData.data.length; y++) {
      for (let x = 0; x < decorData.data[y].length; x++) {
        const tileId = decorData.data[y][x];
        if (tileId > 0) {
          ctx.fillStyle = this.hexToRgb(this.getDecorationColor(tileId));
          ctx.fillRect(x * scale + 1, y * scale + 1, scale - 2, scale - 2);
        }
      }
    }
  }

  /**
   * Draw fog of war overlay
   */
  private drawFog(ctx: CanvasRenderingContext2D, scale: number, fog: FogOfWar): void {
    for (let y = 0; y < this.mapData.height; y++) {
      for (let x = 0; x < this.mapData.width; x++) {
        // Check if currently visible
        const isVisible = this.isTileVisible(x, y);
        if (isVisible) continue;

        // Get explored value from fog system
        const avgExplored = fog.getTileExploredValue(x, y);

        // Calculate fog opacity
        let fogOpacity = 0;
        if (avgExplored >= 0.99) {
          fogOpacity = 0.4;
        } else if (avgExplored > 0) {
          fogOpacity = 0.4 + (1 - 0.4) * (1 - avgExplored);
        } else {
          fogOpacity = 1.0;
        }

        if (fogOpacity > 0.01) {
          ctx.fillStyle = `rgba(0,0,0,${fogOpacity})`;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }

  /**
   * Check if a tile is currently visible
   */
  private isTileVisible(x: number, y: number): boolean {
    for (const source of this.visionSources) {
      const dx = x - source.x;
      const dy = y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= source.radius) {
        return true;
      }
    }
    return false;
  }

  /**
   * Draw custom markers
   */
  private drawMarkers(ctx: CanvasRenderingContext2D, scale: number): void {
    for (const marker of this.markers.values()) {
      const px = marker.x * scale + scale / 2;
      const py = marker.y * scale + scale / 2;

      ctx.fillStyle = marker.color;

      if (marker.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(px, py, marker.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(
          marker.x * scale - 1,
          marker.y * scale - 1,
          scale + 2,
          scale + 2
        );
      }

      if (marker.borderColor) {
        ctx.strokeStyle = marker.borderColor;
        ctx.lineWidth = 1;
        if (marker.shape === 'circle') {
          ctx.stroke();
        } else {
          ctx.strokeRect(
            marker.x * scale - 1,
            marker.y * scale - 1,
            scale + 2,
            scale + 2
          );
        }
      }
    }
  }

  /**
   * Draw viewport rectangle
   */
  private drawViewport(ctx: CanvasRenderingContext2D, scale: number): void {
    ctx.strokeStyle = this.hexToRgb(MINIMAP_COLORS.VIEWPORT);
    ctx.lineWidth = 2;
    ctx.strokeRect(
      this.viewportX * scale,
      this.viewportY * scale,
      this.viewportWidth * scale,
      this.viewportHeight * scale
    );
  }

  /**
   * Draw hero marker
   */
  private drawHero(ctx: CanvasRenderingContext2D, scale: number): void {
    const px = this.heroX * scale + scale / 2;
    const py = this.heroY * scale + scale / 2;

    // Pink circle with white border
    ctx.fillStyle = this.hexToRgb(MINIMAP_COLORS.HERO);
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * Get terrain tile color
   */
  private getTerrainColor(tileId: number): number {
    // Water tiles
    if (tileId >= 58 && tileId <= 84) return MINIMAP_COLORS.WATER;
    // Buildings
    if (tileId >= 145 && tileId <= 189) return MINIMAP_COLORS.BUILDING;
    // Dirt/ground
    if (tileId >= 1 && tileId <= 3) return MINIMAP_COLORS.DIRT;
    if (tileId >= 13 && tileId <= 18) return MINIMAP_COLORS.DIRT;
    if (tileId >= 25 && tileId <= 27) return MINIMAP_COLORS.DIRT;
    if (tileId >= 37 && tileId <= 39) return MINIMAP_COLORS.DIRT;
    // Path/road
    if ([7, 29, 30, 42, 44, 50, 51].includes(tileId)) return MINIMAP_COLORS.ROAD;
    // Default grass
    return MINIMAP_COLORS.GRASS;
  }

  /**
   * Get decoration tile color
   */
  private getDecorationColor(tileId: number): number {
    if (tileId >= 145 && tileId <= 189) return 0x9e9e9e;  // Buildings
    if (tileId >= 85 && tileId <= 98) return MINIMAP_COLORS.HOUSES;
    if (tileId >= 109 && tileId <= 122) return MINIMAP_COLORS.TOWER;
    if (tileId >= 55 && tileId <= 81) return MINIMAP_COLORS.SPECIAL;
    return MINIMAP_COLORS.TREES;
  }

  /**
   * Convert hex color to CSS string
   */
  private hexToRgb(hex: number): string {
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;
    return `rgb(${r},${g},${b})`;
  }

  /**
   * Destroy the minimap
   */
  destroy(): void {
    this.canvas = null;
    this.ctx = null;
    this.markers.clear();
  }
}
