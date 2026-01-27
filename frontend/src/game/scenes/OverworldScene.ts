/**
 * OverworldScene
 * --------------
 * Main exploration scene with HOMM3-style overworld map.
 * Orchestrates the hero, fog of war, minimap, and pathfinding systems.
 *
 * Events emitted:
 * - 'start-combat': Triggers combat encounter
 */

import Phaser from 'phaser';
import { startCombat } from '../../api/combat';
import { UnitData } from '../../types/combat';
import { MapData, OVERWORLD_TILESET, isTileWalkable } from '../../types/mapEditor';
import { MINIMAP_COLORS } from '../../types/tiles';
import { Hero } from '../entities/Hero';
import { FogOfWar } from '../systems/FogOfWar';
import { Minimap } from '../systems/Minimap';
import { findPath, getArrowSpriteKey } from '../utils/Pathfinding';

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Viewport size in tiles */
const VIEWPORT = {
  WIDTH: 15,
  HEIGHT: 12,
} as const;

/** Vision radii in tiles */
const VISION = {
  HERO_RADIUS: 4,
  TOWN_RADIUS: 5,
} as const;

/** Player's town location */
const PLAYER_TOWN = {
  X: 2,
  Y: 3,
} as const;

/** Hero starting position */
const HERO_START = {
  X: 2,
  Y: 12,
} as const;

/** Minimap scale (pixels per tile) */
const MINIMAP_SCALE = 6;

// =============================================================================
// SCENE
// =============================================================================

export class OverworldScene extends Phaser.Scene {
  // Core systems
  private hero!: Hero;
  private fog!: FogOfWar;
  private minimap!: Minimap;

  // Map data
  private mapData: MapData | null = null;
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private terrainLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private decorationLayer: Phaser.Tilemaps.TilemapLayer | null = null;

  // Viewport position (top-left tile)
  private viewportX = 0;
  private viewportY = 0;

  // Debug overlay
  private debugOverlay: Phaser.GameObjects.Graphics | null = null;
  private debugMode = false;

  // Town flag graphic
  private townFlag!: Phaser.GameObjects.Graphics;

  // Path preview
  private pendingPath: { x: number; y: number }[] = [];
  private pathSprites: Phaser.GameObjects.Sprite[] = [];
  private pendingDestination: { x: number; y: number } | null = null;

  constructor() {
    super({ key: 'OverworldScene' });
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  preload(): void {
    // Tileset
    this.load.image(OVERWORLD_TILESET.key, OVERWORLD_TILESET.path);

    // Map data
    this.load.json('tutorial00', 'assets/maps/tutorial00.json');

    // Path arrows
    this.loadPathArrows();

    // Hero sprites
    Hero.preload(this);
  }

  create(): void {
    // Load map data
    this.mapData = this.cache.json.get('tutorial00') as MapData;
    if (!this.mapData) {
      console.error('Failed to load map data');
      return;
    }

    // Create systems in order
    this.createTilemap();
    this.createTownFlag();
    this.createHero();
    this.createFogOfWar();
    this.createMinimap();

    // Setup camera and input
    this.setupCamera();
    this.setupInput();

    // Initial state
    this.centerViewportOnHero();
    this.updateFogAndMinimap();
  }

  update(): void {
    this.minimap?.render(this.fog);
  }

  // ===========================================================================
  // ASSET LOADING
  // ===========================================================================

  private loadPathArrows(): void {
    const arrows = [
      'arrow_up', 'arrow_down', 'arrow_left', 'arrow_right',
      'arrow_up_right', 'arrow_up_left', 'arrow_down_right', 'arrow_down_left',
      'marker_x',
    ];
    for (const arrow of arrows) {
      this.load.image(arrow, `assets/ui/path/${arrow}.png`);
    }
  }

  // ===========================================================================
  // TILEMAP
  // ===========================================================================

  private createTilemap(): void {
    if (!this.mapData) return;

    this.tilemap = this.make.tilemap({
      tileWidth: OVERWORLD_TILESET.tileWidth,
      tileHeight: OVERWORLD_TILESET.tileHeight,
      width: this.mapData.width,
      height: this.mapData.height,
    });

    const tileset = this.tilemap.addTilesetImage(
      OVERWORLD_TILESET.key,
      OVERWORLD_TILESET.key,
      OVERWORLD_TILESET.tileWidth,
      OVERWORLD_TILESET.tileHeight,
      0, 0
    );

    if (!tileset) {
      console.error('Failed to create tileset');
      return;
    }

    // Terrain layer
    this.terrainLayer = this.tilemap.createBlankLayer('terrain', tileset, 0, 0);
    if (this.terrainLayer) {
      this.populateLayer(this.terrainLayer, 'terrain');
      this.terrainLayer.setDepth(0);
    }

    // Decoration layer
    this.decorationLayer = this.tilemap.createBlankLayer('decoration', tileset, 0, 0);
    if (this.decorationLayer) {
      this.populateLayer(this.decorationLayer, 'decoration');
      this.decorationLayer.setDepth(1);
    }
  }

  private populateLayer(layer: Phaser.Tilemaps.TilemapLayer, layerName: string): void {
    const layerData = this.mapData?.layers.find(l => l.name === layerName);
    if (!layerData) return;

    for (let y = 0; y < layerData.data.length; y++) {
      for (let x = 0; x < layerData.data[y].length; x++) {
        const tileId = layerData.data[y][x];
        if (tileId > 0) {
          layer.putTileAt(tileId - 1, x, y);
        }
      }
    }
  }

  // ===========================================================================
  // TOWN FLAG
  // ===========================================================================

  private createTownFlag(): void {
    const tileW = OVERWORLD_TILESET.tileWidth;
    const tileH = OVERWORLD_TILESET.tileHeight;
    const flagX = PLAYER_TOWN.X * tileW + tileW / 2;
    const flagY = PLAYER_TOWN.Y * tileH - 4;

    this.townFlag = this.add.graphics();
    this.townFlag.setDepth(8);

    // Pole
    this.townFlag.lineStyle(2, 0x4a3728, 1);
    this.townFlag.lineBetween(flagX, flagY, flagX, flagY - 12);

    // Flag (red triangle)
    this.townFlag.fillStyle(0xe94560, 1);
    this.townFlag.fillTriangle(flagX, flagY - 12, flagX + 8, flagY - 9, flagX, flagY - 6);

    // Border
    this.townFlag.lineStyle(1, 0xb8354a, 1);
    this.townFlag.strokeTriangle(flagX, flagY - 12, flagX + 8, flagY - 9, flagX, flagY - 6);
  }

  // ===========================================================================
  // HERO
  // ===========================================================================

  private createHero(): void {
    this.hero = new Hero(
      this,
      HERO_START.X,
      HERO_START.Y,
      OVERWORLD_TILESET.tileWidth
    );
  }

  // ===========================================================================
  // FOG OF WAR
  // ===========================================================================

  private createFogOfWar(): void {
    if (!this.mapData) return;

    this.fog = new FogOfWar(
      this,
      this.mapData.width,
      this.mapData.height,
      OVERWORLD_TILESET.tileWidth
    );

    // Add vision sources
    this.fog.addVisionSource('hero', this.hero.tileX, this.hero.tileY, VISION.HERO_RADIUS);
    this.fog.addVisionSource('town', PLAYER_TOWN.X, PLAYER_TOWN.Y, VISION.TOWN_RADIUS);
  }

  private updateFogAndMinimap(): void {
    // Update hero position in fog
    this.fog.updateVisionSource('hero', this.hero.tileX, this.hero.tileY);
    this.fog.update();

    // Update minimap
    this.minimap?.setHeroPosition(this.hero.tileX, this.hero.tileY);
    this.minimap?.setVisionSources([
      { x: this.hero.tileX, y: this.hero.tileY, radius: VISION.HERO_RADIUS },
      { x: PLAYER_TOWN.X, y: PLAYER_TOWN.Y, radius: VISION.TOWN_RADIUS },
    ]);
  }

  // ===========================================================================
  // MINIMAP
  // ===========================================================================

  private createMinimap(): void {
    if (!this.mapData) return;

    this.minimap = new Minimap('minimap-canvas', this.mapData, MINIMAP_SCALE);

    // Add town marker
    this.minimap.addMarker({
      id: 'player-town',
      x: PLAYER_TOWN.X,
      y: PLAYER_TOWN.Y,
      color: `#${MINIMAP_COLORS.PLAYER_TOWN.toString(16)}`,
      shape: 'square',
      size: MINIMAP_SCALE + 2,
      borderColor: '#fff',
    });

    // Minimap click navigation
    this.minimap.onClick((tileX, tileY) => {
      this.viewportX = tileX - Math.floor(VIEWPORT.WIDTH / 2);
      this.viewportY = tileY - Math.floor(VIEWPORT.HEIGHT / 2);
      this.clampViewport();
      this.updateCameraPosition();
      this.minimap.setViewport(this.viewportX, this.viewportY, VIEWPORT.WIDTH, VIEWPORT.HEIGHT);
    });

    // Initial viewport
    this.minimap.setViewport(this.viewportX, this.viewportY, VIEWPORT.WIDTH, VIEWPORT.HEIGHT);
    this.minimap.setHeroPosition(this.hero.tileX, this.hero.tileY);
  }

  // ===========================================================================
  // CAMERA
  // ===========================================================================

  private setupCamera(): void {
    if (!this.mapData) return;

    const mapPixelW = this.mapData.width * OVERWORLD_TILESET.tileWidth;
    const mapPixelH = this.mapData.height * OVERWORLD_TILESET.tileHeight;

    this.cameras.main.setBounds(0, 0, mapPixelW, mapPixelH);

    // Zoom to fit viewport
    const viewportPixelW = VIEWPORT.WIDTH * OVERWORLD_TILESET.tileWidth;
    const viewportPixelH = VIEWPORT.HEIGHT * OVERWORLD_TILESET.tileHeight;
    const scaleX = this.cameras.main.width / viewportPixelW;
    const scaleY = this.cameras.main.height / viewportPixelH;

    this.cameras.main.setZoom(Math.min(scaleX, scaleY));
  }

  private centerViewportOnHero(): void {
    this.viewportX = this.hero.tileX - Math.floor(VIEWPORT.WIDTH / 2);
    this.viewportY = this.hero.tileY - Math.floor(VIEWPORT.HEIGHT / 2);
    this.clampViewport();
    this.updateCameraPosition();
  }

  private clampViewport(): void {
    if (!this.mapData) return;
    this.viewportX = Phaser.Math.Clamp(this.viewportX, 0, Math.max(0, this.mapData.width - VIEWPORT.WIDTH));
    this.viewportY = Phaser.Math.Clamp(this.viewportY, 0, Math.max(0, this.mapData.height - VIEWPORT.HEIGHT));
  }

  private updateCameraPosition(): void {
    const centerX = (this.viewportX + VIEWPORT.WIDTH / 2) * OVERWORLD_TILESET.tileWidth;
    const centerY = (this.viewportY + VIEWPORT.HEIGHT / 2) * OVERWORLD_TILESET.tileHeight;
    this.cameras.main.centerOn(centerX, centerY);
  }

  private scrollViewportToHero(): void {
    const targetX = this.hero.tileX - Math.floor(VIEWPORT.WIDTH / 2);
    const targetY = this.hero.tileY - Math.floor(VIEWPORT.HEIGHT / 2);

    if (targetX !== this.viewportX || targetY !== this.viewportY) {
      this.viewportX = targetX;
      this.viewportY = targetY;
      this.clampViewport();
      this.updateCameraPosition();
      this.minimap?.setViewport(this.viewportX, this.viewportY, VIEWPORT.WIDTH, VIEWPORT.HEIGHT);
    }
  }

  // ===========================================================================
  // INPUT
  // ===========================================================================

  private setupInput(): void {
    // Map click for movement
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.handleMapClick(pointer);
      }
    });

    if (this.input.keyboard) {
      // Spacebar for test combat
      this.input.keyboard.on('keydown-SPACE', () => this.startTestCombat());

      // D for debug mode
      this.input.keyboard.on('keydown-D', () => this.toggleDebugMode());

      // Escape to cancel path
      this.input.keyboard.on('keydown-ESC', () => this.clearPendingPath());
    }
  }

  // ===========================================================================
  // MOVEMENT & PATHFINDING
  // ===========================================================================

  private handleMapClick(pointer: Phaser.Input.Pointer): void {
    if (!this.mapData || this.hero.isMoving) return;

    // Convert to tile coordinates
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / OVERWORLD_TILESET.tileWidth);
    const tileY = Math.floor(worldPoint.y / OVERWORLD_TILESET.tileHeight);

    // Bounds check
    if (tileX < 0 || tileX >= this.mapData.width || tileY < 0 || tileY >= this.mapData.height) {
      return;
    }

    // Debug logging
    this.logTileInfo(tileX, tileY);

    // Second click on same destination - start movement
    if (this.pendingDestination?.x === tileX && this.pendingDestination?.y === tileY && this.pendingPath.length > 0) {
      this.startMovement();
      return;
    }

    // First click - show path preview
    this.showPathPreview(tileX, tileY);
  }

  private showPathPreview(destX: number, destY: number): void {
    if (!this.canWalkTo(destX, destY)) {
      this.showInvalidDestination(destX, destY);
      return;
    }

    // Find path
    const path = findPath(
      this.hero.tileX,
      this.hero.tileY,
      destX,
      destY,
      (x, y) => this.canWalkTo(x, y),
      this.mapData!.width,
      this.mapData!.height
    );

    if (path.length === 0) {
      this.showInvalidDestination(destX, destY);
      return;
    }

    // Store and draw path
    this.pendingPath = path;
    this.pendingDestination = { x: destX, y: destY };
    this.drawPathPreview();
  }

  private startMovement(): void {
    if (this.pendingPath.length === 0 || this.hero.isMoving) return;

    // Copy path and clear preview
    const path = [...this.pendingPath];
    this.clearPendingPath();

    // Move hero along path
    this.hero.moveAlongPath(
      path,
      // On each step
      () => {
        this.updateFogAndMinimap();
        this.scrollViewportToHero();
      },
      // On complete
      () => {
        // Path complete
      }
    );
  }

  private drawPathPreview(): void {
    // Clear existing sprites
    this.pathSprites.forEach(s => s.destroy());
    this.pathSprites = [];

    if (this.pendingPath.length === 0) return;

    const tileW = OVERWORLD_TILESET.tileWidth;
    const tileH = OVERWORLD_TILESET.tileHeight;

    // Build full path for direction calculation
    const fullPath = [{ x: this.hero.tileX, y: this.hero.tileY }, ...this.pendingPath];

    // Draw arrows (skip hero position and destination)
    for (let i = 1; i < fullPath.length - 1; i++) {
      const current = fullPath[i];
      const next = fullPath[i + 1];
      const dx = next.x - current.x;
      const dy = next.y - current.y;

      const arrow = this.add.sprite(
        current.x * tileW + tileW / 2,
        current.y * tileH + tileH / 2,
        getArrowSpriteKey(dx, dy)
      );
      arrow.setDepth(9);
      this.pathSprites.push(arrow);
    }

    // Draw X marker at destination
    const dest = this.pendingPath[this.pendingPath.length - 1];
    const marker = this.add.sprite(
      dest.x * tileW + tileW / 2,
      dest.y * tileH + tileH / 2,
      'marker_x'
    );
    marker.setDepth(9);
    this.pathSprites.push(marker);
  }

  private clearPendingPath(): void {
    this.pendingPath = [];
    this.pendingDestination = null;
    this.pathSprites.forEach(s => s.destroy());
    this.pathSprites = [];
  }

  private showInvalidDestination(tileX: number, tileY: number): void {
    const tileW = OVERWORLD_TILESET.tileWidth;
    const tileH = OVERWORLD_TILESET.tileHeight;
    const centerX = tileX * tileW + tileW / 2;
    const centerY = tileY * tileH + tileH / 2;

    const graphics = this.add.graphics();
    graphics.setDepth(100);
    graphics.lineStyle(3, 0xff4444, 1);
    graphics.lineBetween(centerX - 6, centerY - 6, centerX + 6, centerY + 6);
    graphics.lineBetween(centerX + 6, centerY - 6, centerX - 6, centerY + 6);

    this.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 500,
      onComplete: () => graphics.destroy(),
    });
  }

  // ===========================================================================
  // WALKABILITY
  // ===========================================================================

  private canWalkTo(tileX: number, tileY: number): boolean {
    if (!this.mapData) return false;

    const terrainLayer = this.mapData.layers.find(l => l.name === 'terrain');
    const decorationLayer = this.mapData.layers.find(l => l.name === 'decoration');

    const terrainTileId = terrainLayer?.data[tileY]?.[tileX] ?? 0;
    const decorationTileId = decorationLayer?.data[tileY]?.[tileX] ?? 0;

    return isTileWalkable(terrainTileId, decorationTileId);
  }

  // ===========================================================================
  // DEBUG
  // ===========================================================================

  private toggleDebugMode(): void {
    this.debugMode = !this.debugMode;

    if (this.debugMode) {
      this.drawDebugOverlay();
    } else if (this.debugOverlay) {
      this.debugOverlay.destroy();
      this.debugOverlay = null;
    }
  }

  private drawDebugOverlay(): void {
    if (!this.mapData) return;

    this.debugOverlay?.destroy();
    this.debugOverlay = this.add.graphics();
    this.debugOverlay.setDepth(5);

    const tileW = OVERWORLD_TILESET.tileWidth;
    const tileH = OVERWORLD_TILESET.tileHeight;

    for (let y = 0; y < this.mapData.height; y++) {
      for (let x = 0; x < this.mapData.width; x++) {
        if (!this.canWalkTo(x, y)) {
          this.debugOverlay.fillStyle(0xff0000, 0.3);
          this.debugOverlay.fillRect(x * tileW, y * tileH, tileW, tileH);
        }
      }
    }
  }

  private logTileInfo(tileX: number, tileY: number): void {
    const terrainLayer = this.mapData?.layers.find(l => l.name === 'terrain');
    const decorationLayer = this.mapData?.layers.find(l => l.name === 'decoration');
    const terrainId = terrainLayer?.data[tileY]?.[tileX] ?? 0;
    const decorationId = decorationLayer?.data[tileY]?.[tileX] ?? 0;
    const walkable = this.canWalkTo(tileX, tileY);

    console.log(`Tile (${tileX}, ${tileY}) - Terrain: ${terrainId}, Decoration: ${decorationId}, Walkable: ${walkable}`);
  }

  // ===========================================================================
  // COMBAT (TEST)
  // ===========================================================================

  private async startTestCombat(): Promise<void> {
    const playerUnits: UnitData[] = [
      { id: 'p1', type: 'warrior', name: 'Warrior', hp: 100, max_hp: 100, attack: 15, defense: 10, speed: 1.0, position: { x: 2, y: 1 }, is_player: true },
      { id: 'p2', type: 'archer', name: 'Archer', hp: 60, max_hp: 60, attack: 20, defense: 5, speed: 1.2, position: { x: 4, y: 1 }, is_player: true },
    ];

    const enemyUnits: UnitData[] = [
      { id: 'e1', type: 'warrior', name: 'Goblin Warrior', hp: 80, max_hp: 80, attack: 12, defense: 8, speed: 1.1, position: { x: 2, y: 8 }, is_player: false },
    ];

    try {
      const combatState = await startCombat({ player_units: playerUnits, enemy_units: enemyUnits });
      this.events.emit('start-combat', { combatId: combatState.combat_id });
    } catch (error) {
      console.error('Failed to start combat:', error);
    }
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /** Called from React to set sidebar width (reserved for future use) */
  public setSidebarWidth(_width: number): void {
    // Reserved for layout adjustments
  }
}
