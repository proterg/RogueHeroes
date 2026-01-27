/**
 * MapEditorScene
 * --------------
 * Main Phaser scene for the overworld map editor.
 * Handles tile placement, camera controls, and communicates with React UI.
 */

import Phaser from 'phaser';
import { EditorTilemap, EditorTools } from '../editor';
import {
  OVERWORLD_TILESET,
  EDITOR_CONSTANTS,
  EditorTool,
  LayerName,
  MapData,
  BrushSize,
  TileRotation,
  TileStamp,
} from '../../types/mapEditor';

// Global event emitter for React-Phaser communication
export const editorEvents = new Phaser.Events.EventEmitter();

export class MapEditorScene extends Phaser.Scene {
  private editorTilemap!: EditorTilemap;
  private editorTools!: EditorTools;
  private isDragging: boolean = false;
  private isPainting: boolean = false;
  private lastPaintPos: { x: number; y: number } | null = null;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;
  private currentZoom: number = EDITOR_CONSTANTS.DEFAULT_ZOOM;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private hoverGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'MapEditorScene' });
  }

  preload(): void {
    // Load the tileset
    this.load.image(OVERWORLD_TILESET.key, OVERWORLD_TILESET.path);
  }

  create(): void {
    // Initialize editor components
    this.editorTilemap = new EditorTilemap(this);
    this.editorTools = new EditorTools(this.editorTilemap);

    // Create new map with default size
    this.editorTilemap.createNewMap(
      EDITOR_CONSTANTS.DEFAULT_MAP_WIDTH,
      EDITOR_CONSTANTS.DEFAULT_MAP_HEIGHT
    );

    // Create hover indicator
    this.hoverGraphics = this.add.graphics();
    this.hoverGraphics.setDepth(101);

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
  }

  update(): void {
    // Handle keyboard panning
    this.handleKeyboardPan();
  }

  private setupCamera(): void {
    const mapSize = this.editorTilemap.getMapPixelSize();

    // Set camera bounds to map size with some padding
    const padding = 200;
    this.cameras.main.setBounds(
      -padding,
      -padding,
      mapSize.width + padding * 2,
      mapSize.height + padding * 2
    );

    // Center camera on map
    this.cameras.main.centerOn(mapSize.width / 2, mapSize.height / 2);

    // Set initial zoom
    this.cameras.main.setZoom(this.currentZoom);
  }

  private setupInput(): void {
    // Mouse wheel for zooming
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown[], _deltaX: number, deltaY: number) => {
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
    const tilePos = this.editorTilemap.worldToTile(worldPoint.x, worldPoint.y);

    // Skip if same tile as last paint (prevents repeated fills)
    if (
      this.lastPaintPos &&
      this.lastPaintPos.x === tilePos.x &&
      this.lastPaintPos.y === tilePos.y
    ) {
      return;
    }

    this.lastPaintPos = { x: tilePos.x, y: tilePos.y };
    this.editorTools.applyTool(tilePos.x, tilePos.y);
  }

  private updateHoverIndicator(pointer: Phaser.Input.Pointer): void {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tilePos = this.editorTilemap.worldToTile(worldPoint.x, worldPoint.y);
    const mapSize = this.editorTilemap.getMapSize();

    this.hoverGraphics.clear();

    // Only show indicator if within map bounds
    if (tilePos.x >= 0 && tilePos.y >= 0 && tilePos.x < mapSize.width && tilePos.y < mapSize.height) {
      const tool = this.editorTools.getTool();
      const stamp = this.editorTools.getStamp();
      const rotation = this.editorTools.getRotation();

      let color = 0x00ff00; // Green for paint
      if (tool === 'erase') color = 0xff0000; // Red for erase
      if (tool === 'fill') color = 0x0088ff; // Blue for fill

      // Calculate stamp dimensions (swap width/height for 90/270 rotation)
      let stampW = stamp.width;
      let stampH = stamp.height;
      if (rotation === 90 || rotation === 270) {
        stampW = stamp.height;
        stampH = stamp.width;
      }

      this.hoverGraphics.lineStyle(2, color, 0.8);
      this.hoverGraphics.strokeRect(
        tilePos.x * OVERWORLD_TILESET.tileWidth,
        tilePos.y * OVERWORLD_TILESET.tileHeight,
        OVERWORLD_TILESET.tileWidth * stampW,
        OVERWORLD_TILESET.tileHeight * stampH
      );

      // Add semi-transparent fill
      this.hoverGraphics.fillStyle(color, 0.2);
      this.hoverGraphics.fillRect(
        tilePos.x * OVERWORLD_TILESET.tileWidth,
        tilePos.y * OVERWORLD_TILESET.tileHeight,
        OVERWORLD_TILESET.tileWidth * stampW,
        OVERWORLD_TILESET.tileHeight * stampH
      );
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
      EDITOR_CONSTANTS.MIN_ZOOM,
      EDITOR_CONSTANTS.MAX_ZOOM
    );
    this.cameras.main.setZoom(this.currentZoom);

    // Emit zoom change event to React
    editorEvents.emit('zoomChanged', { zoom: this.currentZoom });
  }

  private setupEventListeners(): void {
    // Listen for stamp selection from React
    editorEvents.on('selectStamp', (data: { stamp: TileStamp }) => {
      this.editorTools.setStamp(data.stamp);
    });

    // Listen for tool changes from React
    editorEvents.on('setTool', (data: { tool: EditorTool }) => {
      this.editorTools.setTool(data.tool);
    });

    // Listen for layer changes from React
    editorEvents.on('setLayer', (data: { layer: LayerName }) => {
      this.editorTools.setActiveLayer(data.layer);
    });

    // Listen for brush size changes from React
    editorEvents.on('setBrushSize', (data: { size: BrushSize }) => {
      this.editorTools.setBrushSize(data.size);
    });

    // Listen for rotation changes from React
    editorEvents.on('setRotation', (data: { rotation: TileRotation }) => {
      this.editorTools.setRotation(data.rotation);
    });

    // Listen for grid toggle from React
    editorEvents.on('toggleGrid', (data: { show: boolean }) => {
      this.editorTilemap.setGridVisible(data.show);
    });

    // Listen for zoom changes from React
    editorEvents.on('setZoom', (data: { zoom: number }) => {
      this.setZoom(data.zoom);
    });

    // Listen for new map creation from React
    editorEvents.on('newMap', (data: { width: number; height: number }) => {
      this.editorTilemap.createNewMap(data.width, data.height);
      this.setupCamera();
    });

    // Listen for map load from React
    editorEvents.on('loadMap', (data: { mapData: MapData }) => {
      this.editorTilemap.loadMap(data.mapData);
      this.setupCamera();
    });

    // Listen for save request from React
    editorEvents.on('saveMap', () => {
      const mapData = this.editorTilemap.exportMap('untitled');
      editorEvents.emit('mapExported', { mapData });
    });

    // Request current state from React (used on initial load)
    editorEvents.on('requestState', () => {
      editorEvents.emit('stateResponse', {
        zoom: this.currentZoom,
        tool: this.editorTools.getTool(),
        layer: this.editorTools.getActiveLayer(),
        selectedTile: this.editorTools.getSelectedTile(),
      });
    });
  }

  /** Clean up event listeners */
  shutdown(): void {
    editorEvents.removeAllListeners();
  }
}
