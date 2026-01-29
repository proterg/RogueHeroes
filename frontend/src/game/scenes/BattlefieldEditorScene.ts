/**
 * BattlefieldEditorScene
 * ----------------------
 * Phaser scene for editing battlefield terrain.
 * Handles terrain placement, camera controls, and communicates with React UI.
 */

import Phaser from 'phaser';
import {
  BattlefieldData,
  BattlefieldEditorTool,
  BattlefieldBrushSize,
  BATTLEFIELD_EDITOR_CONSTANTS,
  COMBAT_TERRAIN_TYPES,
  CombatTerrainType,
  createEmptyBattlefield,
  getTerrainType,
} from '../../types/combatTerrain';

// Global event emitter for React-Phaser communication
export const battlefieldEditorEvents = new Phaser.Events.EventEmitter();

export class BattlefieldEditorScene extends Phaser.Scene {
  // Battlefield data
  private battlefieldData!: BattlefieldData;
  private tileSize = BATTLEFIELD_EDITOR_CONSTANTS.TILE_SIZE;

  // Graphics layers
  private terrainGraphics!: Phaser.GameObjects.Graphics;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private hoverGraphics!: Phaser.GameObjects.Graphics;

  // Editor state
  private selectedTerrain: string = 'ground';
  private activeTool: BattlefieldEditorTool = 'paint';
  private brushSize: BattlefieldBrushSize = 1;
  private showGrid: boolean = true;

  // Camera/input state
  private isDragging: boolean = false;
  private isPainting: boolean = false;
  private lastPaintPos: { x: number; y: number } | null = null;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;
  private currentZoom: number = BATTLEFIELD_EDITOR_CONSTANTS.DEFAULT_ZOOM;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  // Grid offset for centering
  private gridOffsetX: number = 0;
  private gridOffsetY: number = 0;

  constructor() {
    super({ key: 'BattlefieldEditorScene' });
  }

  preload(): void {
    // No assets needed for color-based rendering
    // Terrain sprites can be added later
  }

  create(): void {
    // Create empty battlefield
    this.battlefieldData = createEmptyBattlefield();

    // Calculate grid offset to center on screen
    this.calculateGridOffset();

    // Create graphics layers in order (terrain < grid < hover)
    this.terrainGraphics = this.add.graphics();
    this.terrainGraphics.setDepth(0);

    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(1);

    this.hoverGraphics = this.add.graphics();
    this.hoverGraphics.setDepth(2);

    // Initial render
    this.renderTerrain();
    this.renderGrid();

    // Set up camera
    this.setupCamera();

    // Set up input handlers
    this.setupInput();

    // Set up event listeners for React communication
    this.setupEventListeners();

    // Get cursor keys for keyboard panning
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Emit initial state to React
    this.emitState();
  }

  update(): void {
    this.handleKeyboardPan();
  }

  private calculateGridOffset(): void {
    // Center the battlefield grid on screen
    const mapPixelWidth = this.battlefieldData.width * this.tileSize;
    const mapPixelHeight = this.battlefieldData.height * this.tileSize;
    this.gridOffsetX = (this.cameras.main.width / this.currentZoom - mapPixelWidth) / 2;
    this.gridOffsetY = (this.cameras.main.height / this.currentZoom - mapPixelHeight) / 2;
  }

  private setupCamera(): void {
    const mapPixelWidth = this.battlefieldData.width * this.tileSize;
    const mapPixelHeight = this.battlefieldData.height * this.tileSize;

    // Set camera bounds with padding
    const padding = 200;
    this.cameras.main.setBounds(
      -padding,
      -padding,
      mapPixelWidth + padding * 2,
      mapPixelHeight + padding * 2
    );

    // Center camera on grid
    this.cameras.main.centerOn(mapPixelWidth / 2, mapPixelHeight / 2);

    // Set initial zoom
    this.cameras.main.setZoom(this.currentZoom);
  }

  private setupInput(): void {
    // Mouse wheel for zooming
    this.input.on('wheel', (
      _pointer: Phaser.Input.Pointer,
      _gameObjects: unknown[],
      _deltaX: number,
      deltaY: number
    ) => {
      const zoomDelta = deltaY > 0 ? -0.25 : 0.25;
      this.setZoom(this.currentZoom + zoomDelta);
    });

    // Pointer down
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Middle mouse button for panning
      if (pointer.middleButtonDown()) {
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.cameraStartX = this.cameras.main.scrollX;
        this.cameraStartY = this.cameras.main.scrollY;
        return;
      }

      // Left mouse button for tool usage
      if (pointer.leftButtonDown()) {
        this.isPainting = true;
        this.applyToolAtPointer(pointer);
      }
    });

    // Pointer move
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Handle panning
      if (this.isDragging && pointer.middleButtonDown()) {
        const dx = (this.dragStartX - pointer.x) / this.currentZoom;
        const dy = (this.dragStartY - pointer.y) / this.currentZoom;
        this.cameras.main.scrollX = this.cameraStartX + dx;
        this.cameras.main.scrollY = this.cameraStartY + dy;
        return;
      }

      // Handle painting while dragging
      if (this.isPainting && pointer.leftButtonDown()) {
        this.applyToolAtPointer(pointer);
      }

      // Update hover indicator
      this.updateHoverIndicator(pointer);
    });

    // Pointer up
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.middleButtonDown()) {
        this.isDragging = false;
      }
      if (!pointer.leftButtonDown()) {
        this.isPainting = false;
        this.lastPaintPos = null;
      }
    });
  }

  private applyToolAtPointer(pointer: Phaser.Input.Pointer): void {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / this.tileSize);
    const tileY = Math.floor(worldPoint.y / this.tileSize);

    // Check bounds
    if (tileX < 0 || tileX >= this.battlefieldData.width ||
        tileY < 0 || tileY >= this.battlefieldData.height) {
      return;
    }

    // Skip if same tile as last paint (prevents repeated fills)
    if (this.lastPaintPos &&
        this.lastPaintPos.x === tileX &&
        this.lastPaintPos.y === tileY) {
      return;
    }

    this.lastPaintPos = { x: tileX, y: tileY };
    this.applyTool(tileX, tileY);
  }

  private applyTool(tileX: number, tileY: number): void {
    switch (this.activeTool) {
      case 'paint':
        this.paintTerrain(tileX, tileY);
        break;
      case 'erase':
        this.eraseTerrain(tileX, tileY);
        break;
      case 'fill':
        this.fillTerrain(tileX, tileY);
        break;
    }
  }

  private paintTerrain(startX: number, startY: number): void {
    // Apply brush in brush size area
    for (let dy = 0; dy < this.brushSize; dy++) {
      for (let dx = 0; dx < this.brushSize; dx++) {
        const x = startX + dx;
        const y = startY + dy;
        if (x >= 0 && x < this.battlefieldData.width &&
            y >= 0 && y < this.battlefieldData.height) {
          this.battlefieldData.terrain[y][x] = this.selectedTerrain;
        }
      }
    }
    this.renderTerrain();
  }

  private eraseTerrain(startX: number, startY: number): void {
    // Erase = set to ground
    for (let dy = 0; dy < this.brushSize; dy++) {
      for (let dx = 0; dx < this.brushSize; dx++) {
        const x = startX + dx;
        const y = startY + dy;
        if (x >= 0 && x < this.battlefieldData.width &&
            y >= 0 && y < this.battlefieldData.height) {
          this.battlefieldData.terrain[y][x] = 'ground';
        }
      }
    }
    this.renderTerrain();
  }

  private fillTerrain(startX: number, startY: number): void {
    const targetTerrain = this.battlefieldData.terrain[startY][startX];
    if (targetTerrain === this.selectedTerrain) return;

    // Flood fill using BFS
    const visited = new Set<string>();
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= this.battlefieldData.width ||
          y < 0 || y >= this.battlefieldData.height) continue;
      if (this.battlefieldData.terrain[y][x] !== targetTerrain) continue;

      visited.add(key);
      this.battlefieldData.terrain[y][x] = this.selectedTerrain;

      // Add neighbors
      queue.push({ x: x + 1, y });
      queue.push({ x: x - 1, y });
      queue.push({ x, y: y + 1 });
      queue.push({ x, y: y - 1 });
    }

    this.renderTerrain();
  }

  private renderTerrain(): void {
    this.terrainGraphics.clear();

    for (let y = 0; y < this.battlefieldData.height; y++) {
      for (let x = 0; x < this.battlefieldData.width; x++) {
        const terrainId = this.battlefieldData.terrain[y][x];
        const terrain = getTerrainType(terrainId);

        const worldX = x * this.tileSize;
        const worldY = y * this.tileSize;

        // Draw terrain tile with its color
        this.terrainGraphics.fillStyle(terrain.color, 1);
        this.terrainGraphics.fillRect(worldX, worldY, this.tileSize, this.tileSize);

        // Add texture patterns for certain terrain types
        this.addTerrainTexture(terrain, worldX, worldY);
      }
    }
  }

  private addTerrainTexture(terrain: CombatTerrainType, worldX: number, worldY: number): void {
    // Add simple visual patterns to distinguish terrain types
    const cx = worldX + this.tileSize / 2;
    const cy = worldY + this.tileSize / 2;

    switch (terrain.id) {
      case 'rock':
      case 'boulder':
        // Draw rock shape
        this.terrainGraphics.fillStyle(0x333333, 0.6);
        this.terrainGraphics.fillCircle(cx, cy, this.tileSize * 0.35);
        break;

      case 'tree':
        // Draw tree trunk and foliage
        this.terrainGraphics.fillStyle(0x4a3728, 1);
        this.terrainGraphics.fillRect(cx - 2, cy, 4, this.tileSize * 0.4);
        this.terrainGraphics.fillStyle(0x1a4a1a, 1);
        this.terrainGraphics.fillCircle(cx, cy - 4, this.tileSize * 0.35);
        break;

      case 'bush':
        // Draw bush circles
        this.terrainGraphics.fillStyle(0x2d7a2d, 0.7);
        this.terrainGraphics.fillCircle(cx - 4, cy, 6);
        this.terrainGraphics.fillCircle(cx + 4, cy, 6);
        this.terrainGraphics.fillCircle(cx, cy - 3, 6);
        break;

      case 'water_shallow':
      case 'water_deep':
        // Draw wave lines
        this.terrainGraphics.lineStyle(1, 0xffffff, 0.3);
        this.terrainGraphics.lineBetween(worldX + 4, cy - 3, worldX + this.tileSize - 4, cy - 3);
        this.terrainGraphics.lineBetween(worldX + 6, cy + 3, worldX + this.tileSize - 6, cy + 3);
        break;

      case 'wall':
        // Draw brick pattern
        this.terrainGraphics.lineStyle(1, 0x5a4a3a, 0.6);
        this.terrainGraphics.strokeRect(worldX + 2, worldY + 2, this.tileSize - 4, this.tileSize / 2 - 2);
        this.terrainGraphics.strokeRect(worldX + this.tileSize / 4, worldY + this.tileSize / 2 + 1,
          this.tileSize / 2, this.tileSize / 2 - 3);
        break;

      case 'mud':
        // Draw mud spots
        this.terrainGraphics.fillStyle(0x4a3a2a, 0.5);
        this.terrainGraphics.fillCircle(cx - 5, cy - 3, 4);
        this.terrainGraphics.fillCircle(cx + 4, cy + 2, 5);
        break;
    }
  }

  private renderGrid(): void {
    this.gridGraphics.clear();

    if (!this.showGrid) return;

    this.gridGraphics.lineStyle(1, BATTLEFIELD_EDITOR_CONSTANTS.GRID_COLOR,
      BATTLEFIELD_EDITOR_CONSTANTS.GRID_ALPHA);

    // Draw vertical lines
    for (let x = 0; x <= this.battlefieldData.width; x++) {
      const worldX = x * this.tileSize;
      this.gridGraphics.lineBetween(
        worldX, 0,
        worldX, this.battlefieldData.height * this.tileSize
      );
    }

    // Draw horizontal lines
    for (let y = 0; y <= this.battlefieldData.height; y++) {
      const worldY = y * this.tileSize;
      this.gridGraphics.lineBetween(
        0, worldY,
        this.battlefieldData.width * this.tileSize, worldY
      );
    }

    // Draw center line (deployment boundary)
    this.gridGraphics.lineStyle(2, 0x8b5a8b, 0.8);
    const centerX = (this.battlefieldData.width / 2) * this.tileSize;
    this.gridGraphics.lineBetween(
      centerX, 0,
      centerX, this.battlefieldData.height * this.tileSize
    );
  }

  private updateHoverIndicator(pointer: Phaser.Input.Pointer): void {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / this.tileSize);
    const tileY = Math.floor(worldPoint.y / this.tileSize);

    this.hoverGraphics.clear();

    // Only show indicator if within map bounds
    if (tileX >= 0 && tileX < this.battlefieldData.width &&
        tileY >= 0 && tileY < this.battlefieldData.height) {

      let color = 0x00ff00; // Green for paint
      if (this.activeTool === 'erase') color = 0xff0000; // Red for erase
      if (this.activeTool === 'fill') color = 0x0088ff; // Blue for fill

      const worldX = tileX * this.tileSize;
      const worldY = tileY * this.tileSize;
      const width = this.brushSize * this.tileSize;
      const height = this.brushSize * this.tileSize;

      // Draw hover rectangle
      this.hoverGraphics.lineStyle(2, color, 0.8);
      this.hoverGraphics.strokeRect(worldX, worldY, width, height);

      // Add semi-transparent fill
      this.hoverGraphics.fillStyle(color, 0.2);
      this.hoverGraphics.fillRect(worldX, worldY, width, height);
    }
  }

  private handleKeyboardPan(): void {
    if (!this.cursors) return;

    const panSpeed = 5 / this.currentZoom;

    if (this.cursors.left.isDown) {
      this.cameras.main.scrollX -= panSpeed;
    }
    if (this.cursors.right.isDown) {
      this.cameras.main.scrollX += panSpeed;
    }
    if (this.cursors.up.isDown) {
      this.cameras.main.scrollY -= panSpeed;
    }
    if (this.cursors.down.isDown) {
      this.cameras.main.scrollY += panSpeed;
    }
  }

  private setZoom(zoom: number): void {
    this.currentZoom = Phaser.Math.Clamp(
      zoom,
      BATTLEFIELD_EDITOR_CONSTANTS.MIN_ZOOM,
      BATTLEFIELD_EDITOR_CONSTANTS.MAX_ZOOM
    );
    this.cameras.main.setZoom(this.currentZoom);

    // Emit zoom change event to React
    battlefieldEditorEvents.emit('zoomChanged', { zoom: this.currentZoom });
  }

  private emitState(): void {
    battlefieldEditorEvents.emit('stateChanged', {
      selectedTerrain: this.selectedTerrain,
      activeTool: this.activeTool,
      brushSize: this.brushSize,
      showGrid: this.showGrid,
      zoom: this.currentZoom,
      mapName: this.battlefieldData.name,
      gridWidth: this.battlefieldData.width,
      gridHeight: this.battlefieldData.height,
    });
  }

  private setupEventListeners(): void {
    // Listen for terrain selection from React
    battlefieldEditorEvents.on('selectTerrain', (data: { terrainId: string }) => {
      this.selectedTerrain = data.terrainId;
      this.emitState();
    });

    // Listen for tool changes from React
    battlefieldEditorEvents.on('setTool', (data: { tool: BattlefieldEditorTool }) => {
      this.activeTool = data.tool;
      this.emitState();
    });

    // Listen for brush size changes from React
    battlefieldEditorEvents.on('setBrushSize', (data: { size: BattlefieldBrushSize }) => {
      this.brushSize = data.size;
      this.emitState();
    });

    // Listen for grid toggle from React
    battlefieldEditorEvents.on('toggleGrid', (data: { show: boolean }) => {
      this.showGrid = data.show;
      this.renderGrid();
      this.emitState();
    });

    // Listen for zoom changes from React
    battlefieldEditorEvents.on('setZoom', (data: { zoom: number }) => {
      this.setZoom(data.zoom);
    });

    // Listen for new map creation from React
    battlefieldEditorEvents.on('newMap', (data: { width: number; height: number }) => {
      this.battlefieldData = createEmptyBattlefield(data.width, data.height);
      this.renderTerrain();
      this.renderGrid();
      this.setupCamera();
      this.emitState();
    });

    // Listen for map load from React
    battlefieldEditorEvents.on('loadMap', (data: { mapData: BattlefieldData }) => {
      this.battlefieldData = data.mapData;
      this.renderTerrain();
      this.renderGrid();
      this.setupCamera();
      this.emitState();
    });

    // Listen for save request from React
    battlefieldEditorEvents.on('saveMap', (data: { name: string }) => {
      this.battlefieldData.name = data.name;
      battlefieldEditorEvents.emit('mapExported', { mapData: this.battlefieldData });
    });

    // Request current state from React (used on initial load)
    battlefieldEditorEvents.on('requestState', () => {
      this.emitState();
    });

    // Listen for grid resize from React
    battlefieldEditorEvents.on('resizeGrid', (data: {
      width: number;
      height: number;
      edge: 'left' | 'right' | 'top' | 'bottom';
      remove?: boolean;
    }) => {
      console.log('resizeGrid event received:', data);
      this.resizeGrid(data.width, data.height, data.edge, data.remove);
    });
  }

  /** Resize the grid, adding or removing rows/columns from specified edge */
  private resizeGrid(
    newWidth: number,
    newHeight: number,
    edge: 'left' | 'right' | 'top' | 'bottom',
    remove?: boolean
  ): void {
    const oldTerrain = this.battlefieldData.terrain;
    const oldWidth = this.battlefieldData.width;
    const oldHeight = this.battlefieldData.height;

    console.log(`resizeGrid: ${oldWidth}x${oldHeight} -> ${newWidth}x${newHeight} (edge: ${edge}, remove: ${remove})`);

    // Create new terrain array
    const newTerrain: string[][] = [];

    for (let y = 0; y < newHeight; y++) {
      newTerrain[y] = [];
      for (let x = 0; x < newWidth; x++) {
        // Calculate source coordinates based on edge
        let srcX = x;
        let srcY = y;

        if (edge === 'left') {
          if (remove) {
            // Removing from left: shift source right
            srcX = x + 1;
          } else {
            // Adding to left: shift source left (new column at x=0)
            srcX = x - 1;
          }
        } else if (edge === 'top') {
          if (remove) {
            // Removing from top: shift source down
            srcY = y + 1;
          } else {
            // Adding to top: shift source up (new row at y=0)
            srcY = y - 1;
          }
        }
        // For 'right' and 'bottom' edges, no shift needed (srcX/srcY = x/y)

        // Get terrain from old array or use default
        if (srcX >= 0 && srcX < oldWidth && srcY >= 0 && srcY < oldHeight) {
          newTerrain[y][x] = oldTerrain[srcY][srcX];
        } else {
          newTerrain[y][x] = 'ground'; // Default for new tiles
        }
      }
    }

    // Update battlefield data
    this.battlefieldData.width = newWidth;
    this.battlefieldData.height = newHeight;
    this.battlefieldData.terrain = newTerrain;

    // Re-render
    this.renderTerrain();
    this.renderGrid();
    this.setupCamera();
    this.emitState();

    console.log(`resizeGrid complete: now ${this.battlefieldData.width}x${this.battlefieldData.height}, terrain rows: ${this.battlefieldData.terrain.length}`);
  }

  /** Clean up event listeners */
  shutdown(): void {
    battlefieldEditorEvents.removeAllListeners();
  }
}
