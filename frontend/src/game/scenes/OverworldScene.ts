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
import { MINIMAP_COLORS, getInteractionType } from '../../types/tiles';
import { InteractionTrigger } from '../../types/interaction';
import { MapConfig, TownConfig } from '../../types/mapConfig';
import { getInteractionDataFromConfig, getInteractionId } from '../data/InteractionData';
import { getStartingMap, getMapConfig, getSpawnPosition, getLocationAtTile } from '../data/maps';
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
  HERO_RADIUS: 3,
} as const;

/** Minimap scale (pixels per tile) */
const MINIMAP_SCALE = 6;

/** Data passed to scene init() for map loading */
export interface OverworldSceneData {
  /** Map ID to load (defaults to starting map) */
  mapId?: string;
  /** Map ID we're entering from (for spawn point selection) */
  entryFrom?: string;
}

// =============================================================================
// SCENE
// =============================================================================

export class OverworldScene extends Phaser.Scene {
  // Core systems
  private hero!: Hero;
  private fog!: FogOfWar;
  private minimap!: Minimap;

  // Map configuration (from registry)
  private currentMapConfig!: MapConfig;

  // Map data (loaded from JSON file)
  private mapData: MapData | null = null;
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private terrainLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private decorationLayer: Phaser.Tilemaps.TilemapLayer | null = null;

  // Scene initialization data
  private initData: OverworldSceneData = {};

  // Viewport position (top-left tile)
  private viewportX = 0;
  private viewportY = 0;

  // Smooth camera tracking
  private cameraTargetX = 0;
  private cameraTargetY = 0;
  private cameraVelocityX = 0;
  private cameraVelocityY = 0;

  // Debug overlay
  private debugOverlay: Phaser.GameObjects.Graphics | null = null;
  private debugMode = false;

  // Path preview
  private pendingPath: { x: number; y: number }[] = [];
  private pathSprites: Phaser.GameObjects.Sprite[] = [];
  private pendingDestination: { x: number; y: number } | null = null;

  // Input locking (for modal interactions)
  private isInputLocked = false;

  // Background music and ambient sounds
  private overworldMusic: Phaser.Sound.BaseSound | null = null;
  private ambientSounds: Phaser.Sound.BaseSound | null = null;
  private horseWalkingSound: Phaser.Sound.BaseSound | null = null;

  constructor() {
    super({ key: 'OverworldScene' });
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Initialize the scene with optional map data
   * @param data - Optional scene data specifying which map to load
   */
  init(data?: OverworldSceneData): void {
    this.initData = data ?? {};

    // Load map config from registry
    if (this.initData.mapId) {
      const config = getMapConfig(this.initData.mapId);
      if (!config) {
        console.error(`Map '${this.initData.mapId}' not found in registry, using starting map`);
        this.currentMapConfig = getStartingMap();
      } else {
        this.currentMapConfig = config;
      }
    } else {
      this.currentMapConfig = getStartingMap();
    }
  }

  preload(): void {
    // Tileset
    this.load.image(OVERWORLD_TILESET.key, OVERWORLD_TILESET.path);

    // Map data - load from config
    this.load.json(this.currentMapConfig.id, this.currentMapConfig.mapFile);

    // Path arrows
    this.loadPathArrows();

    // Hero sprites
    Hero.preload(this);

    // Background music and ambient sounds - use config or defaults
    const audio = this.currentMapConfig.audio;
    this.load.audio('overworld_music', `audio/${audio?.music ?? 'overworld_music'}.mp3`);
    this.load.audio('forest_ambience', `audio/${audio?.ambience ?? 'forest_sound_effects'}.mp3`);
    this.load.audio('horse_walking', 'audio/horse_tracks_v2.mp3');
  }

  create(): void {
    // Load map data from cache using config ID
    this.mapData = this.cache.json.get(this.currentMapConfig.id) as MapData;
    if (!this.mapData) {
      console.error(`Failed to load map data for '${this.currentMapConfig.id}'`);
      return;
    }

    // Create systems in order
    this.createTilemap();
    this.createHero();
    this.createFogOfWar();
    this.createMinimap();

    // Setup camera and input
    this.setupCamera();
    this.setupInput();

    // Initial state
    this.centerViewportOnHero();
    this.updateFogAndMinimap();

    // Start background music
    this.startOverworldMusic();
  }

  update(): void {
    this.minimap?.render(this.fog);
    // Continuously smooth camera toward target position
    this.updateCameraPosition(false);
  }

  // ===========================================================================
  // MUSIC
  // ===========================================================================

  private startOverworldMusic(): void {
    if (this.overworldMusic) return; // Already playing

    this.overworldMusic = this.sound.add('overworld_music', {
      loop: true,
      volume: 0.4,
    });
    this.overworldMusic.play();

    this.ambientSounds = this.sound.add('forest_ambience', {
      loop: true,
      volume: 0.2,
    });
    this.ambientSounds.play();

    // Keep audio playing even when focus changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    document.addEventListener('click', this.resumeAudioContext);
  }

  private handleVisibilityChange = (): void => {
    if (!document.hidden) {
      this.resumeAudioContext();
    }
  };

  private resumeAudioContext = (): void => {
    // Resume the audio context if it was suspended
    if (this.sound.context && this.sound.context.state === 'suspended') {
      this.sound.context.resume();
    }
    // Also resume all sounds
    this.sound.resumeAll();
  };

  private stopOverworldMusic(): void {
    // Clean up event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('click', this.resumeAudioContext);

    if (this.overworldMusic) {
      this.overworldMusic.stop();
      this.overworldMusic.destroy();
      this.overworldMusic = null;
    }
    if (this.ambientSounds) {
      this.ambientSounds.stop();
      this.ambientSounds.destroy();
      this.ambientSounds = null;
    }
    this.stopHorseWalking();
  }

  private startHorseWalking(): void {
    if (this.horseWalkingSound) return; // Already playing

    // Check if audio loaded successfully
    if (!this.cache.audio.exists('horse_walking')) {
      return;
    }

    try {
      this.horseWalkingSound = this.sound.add('horse_walking', {
        loop: true,
        volume: 0.4,
      });
      this.horseWalkingSound.play();
    } catch (e) {
      console.warn('Failed to play horse walking sound:', e);
    }
  }

  private stopHorseWalking(): void {
    if (this.horseWalkingSound) {
      this.horseWalkingSound.stop();
      this.horseWalkingSound.destroy();
      this.horseWalkingSound = null;
    }
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
  // HERO
  // ===========================================================================

  private createHero(): void {
    // Get spawn position from config (handles entry points from other maps)
    const spawnPos = getSpawnPosition(this.currentMapConfig.id, this.initData.entryFrom);

    this.hero = new Hero(
      this,
      spawnPos.x,
      spawnPos.y,
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
  }

  private updateFogAndMinimap(): void {
    // Update hero position in fog
    this.fog.updateVisionSource('hero', this.hero.tileX, this.hero.tileY);
    this.fog.update();

    // Update minimap
    this.minimap?.setHeroPosition(this.hero.tileX, this.hero.tileY);
    this.minimap?.setVisionSources([
      { x: this.hero.tileX, y: this.hero.tileY, radius: VISION.HERO_RADIUS },
    ]);
  }

  // ===========================================================================
  // MINIMAP
  // ===========================================================================

  private createMinimap(): void {
    if (!this.mapData) return;

    this.minimap = new Minimap('minimap-canvas', this.mapData, MINIMAP_SCALE);

    // Add markers from map config
    this.addMinimapMarkersFromConfig();

    // Minimap click navigation
    this.minimap.onClick((tileX, tileY) => {
      if (this.isInputLocked) return;
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

  /**
   * Add minimap markers based on map configuration
   */
  private addMinimapMarkersFromConfig(): void {
    // Add player town marker if defined
    if (this.currentMapConfig.spawn.playerTown) {
      this.minimap.addMarker({
        id: 'player-town',
        x: this.currentMapConfig.spawn.playerTown.x,
        y: this.currentMapConfig.spawn.playerTown.y,
        color: `#${MINIMAP_COLORS.PLAYER_TOWN.toString(16)}`,
        shape: 'square',
        size: MINIMAP_SCALE + 2,
        borderColor: '#fff',
      });
    }

    // Add markers for locations
    for (const location of this.currentMapConfig.locations) {
      // Skip player home (already added above)
      if (location.type === 'town') {
        const townConfig = location.config as TownConfig;
        if (townConfig.isPlayerHome) continue;
      }

      // Use first entrance tile for marker position
      const pos = location.entranceTiles[0];
      if (!pos) continue;

      // Determine marker style based on location type
      let color = '#888888';
      let shape: 'circle' | 'square' | 'diamond' = 'circle';

      switch (location.type) {
        case 'town':
          color = '#aa8855'; // Brown for other towns
          shape = 'square';
          break;
        case 'shrine':
          color = '#9966ff'; // Purple for shrines
          shape = 'diamond';
          break;
        case 'dungeon':
          color = '#ff4444'; // Red for dungeons
          shape = 'circle';
          break;
      }

      this.minimap.addMarker({
        id: `location-${location.id}`,
        x: pos.x,
        y: pos.y,
        color,
        shape,
        size: MINIMAP_SCALE,
      });
    }
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

  private centerViewportOnHero(instant: boolean = true): void {
    this.viewportX = this.hero.tileX - Math.floor(VIEWPORT.WIDTH / 2);
    this.viewportY = this.hero.tileY - Math.floor(VIEWPORT.HEIGHT / 2);
    this.clampViewport();
    this.updateCameraPosition(instant);
  }

  private clampViewport(): void {
    if (!this.mapData) return;
    this.viewportX = Phaser.Math.Clamp(this.viewportX, 0, Math.max(0, this.mapData.width - VIEWPORT.WIDTH));
    this.viewportY = Phaser.Math.Clamp(this.viewportY, 0, Math.max(0, this.mapData.height - VIEWPORT.HEIGHT));
  }

  private updateCameraPosition(instant: boolean = false): void {
    // Get hero's actual sprite position (includes animation interpolation)
    const heroSprite = this.hero.getSprite();
    const heroWorldX = heroSprite.x;
    const heroWorldY = heroSprite.y - OVERWORLD_TILESET.tileHeight / 2; // Adjust for bottom-center anchor

    // Update target to follow hero's animated position
    this.cameraTargetX = heroWorldX;
    this.cameraTargetY = heroWorldY;

    if (instant) {
      // Snap immediately (used for initial positioning)
      this.cameras.main.centerOn(this.cameraTargetX, this.cameraTargetY);
      this.cameraVelocityX = 0;
      this.cameraVelocityY = 0;
    } else {
      // Smooth camera with spring-damper physics for natural easing
      const currentX = this.cameras.main.scrollX + this.cameras.main.width / 2;
      const currentY = this.cameras.main.scrollY + this.cameras.main.height / 2;

      // Spring constants - lower = smoother/slower, higher = snappier
      const stiffness = 0.04;  // How strongly it pulls toward target
      const damping = 0.75;    // How quickly oscillation dies (0-1, higher = less bounce)

      // Calculate spring force
      const dx = this.cameraTargetX - currentX;
      const dy = this.cameraTargetY - currentY;

      // Apply spring physics
      this.cameraVelocityX += dx * stiffness;
      this.cameraVelocityY += dy * stiffness;

      // Apply damping
      this.cameraVelocityX *= damping;
      this.cameraVelocityY *= damping;

      // Update position
      const newX = currentX + this.cameraVelocityX;
      const newY = currentY + this.cameraVelocityY;

      this.cameras.main.centerOn(newX, newY);
    }
  }

  private scrollViewportToHero(): void {
    const targetX = this.hero.tileX - Math.floor(VIEWPORT.WIDTH / 2);
    const targetY = this.hero.tileY - Math.floor(VIEWPORT.HEIGHT / 2);

    if (targetX !== this.viewportX || targetY !== this.viewportY) {
      this.viewportX = targetX;
      this.viewportY = targetY;
      this.clampViewport();
      this.minimap?.setViewport(this.viewportX, this.viewportY, VIEWPORT.WIDTH, VIEWPORT.HEIGHT);
    }
    // Always update camera for smooth lerp (called every frame during movement)
    this.updateCameraPosition(false);
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
    if (!this.mapData || this.hero.isMoving || this.isInputLocked) return;

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

    // Start horse walking sound
    this.startHorseWalking();

    // Move hero along path
    this.hero.moveAlongPath(
      path,
      // On each step
      () => {
        this.updateFogAndMinimap();
        this.scrollViewportToHero();
        // Check for tile interaction after each step
        this.checkTileInteraction(this.hero.tileX, this.hero.tileY);
      },
      // On complete
      () => {
        // Stop horse walking sound
        this.stopHorseWalking();
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
      arrow.setScale(0.8);  // 20% smaller
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
    marker.setScale(0.8);  // 20% smaller
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
      this.stopOverworldMusic();
      this.events.emit('start-combat', { combatId: combatState.combat_id });
    } catch (error) {
      console.error('Failed to start combat:', error);
    }
  }

  // ===========================================================================
  // INTERACTIONS
  // ===========================================================================

  /**
   * Check if the current tile triggers an interaction
   */
  private checkTileInteraction(tileX: number, tileY: number): void {
    if (!this.mapData) return;

    const terrainLayer = this.mapData.layers.find(l => l.name === 'terrain');
    const terrainId = terrainLayer?.data[tileY]?.[tileX] ?? 0;

    const interactionType = getInteractionType(terrainId);
    if (interactionType) {
      // Lock input while interaction modal is shown
      this.isInputLocked = true;

      // Get interaction data using the new config-based system
      const { data, locationId } = getInteractionDataFromConfig(
        this.currentMapConfig.id,
        interactionType,
        tileX,
        tileY
      );
      const id = getInteractionId(interactionType, tileX, tileY);

      // Emit event for React to handle
      const trigger: InteractionTrigger = {
        id,
        type: interactionType,
        tileX,
        tileY,
        mapId: this.currentMapConfig.id,
        locationId,
        data,
      };

      console.log('Interaction triggered:', trigger);
      this.events.emit('interaction-triggered', trigger);
    }
  }

  /**
   * Get the terrain tile ID at a position
   */
  private getTerrainTile(tileX: number, tileY: number): number {
    const terrainLayer = this.mapData?.layers.find(l => l.name === 'terrain');
    return terrainLayer?.data[tileY]?.[tileX] ?? 0;
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /** Lock or unlock input (used by interaction modals) */
  public setInputLocked(locked: boolean): void {
    this.isInputLocked = locked;
  }

  /** Called from React to set sidebar width (reserved for future use) */
  public setSidebarWidth(_width: number): void {
    // Reserved for layout adjustments
  }

  /** Resume audio - call this when modal opens/closes to keep music playing */
  public resumeAudio(): void {
    this.resumeAudioContext();
  }

  /** Get the current map ID */
  public getCurrentMapId(): string {
    return this.currentMapConfig.id;
  }

  /** Get the current map configuration */
  public getCurrentMapConfig(): MapConfig {
    return this.currentMapConfig;
  }
}
