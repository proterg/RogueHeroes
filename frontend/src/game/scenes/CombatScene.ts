/**
 * CombatScene - Autobattler Combat System
 * =======================================
 *
 * A 16x9 grid-based autobattler where units automatically move and fight.
 *
 * ## Features (Alpha 1.0)
 * - Turn-based combat with initiative tiers (first > regular > last)
 * - Simultaneous attacks for units with the same initiative
 * - Directional attack animations (horizontal, up, down)
 * - Health-based sprite tinting (yellow at 50-75%, red below 50%)
 * - Fog of war with unit vision ranges
 * - Depth sorting (lower rows render on top for natural layering)
 *
 * ## Unit States
 * - 'moving': Unit is walking toward a target or forward
 * - 'setting': Unit is preparing to attack (attackDelay countdown)
 * - 'attacking': Unit is actively attacking each turn
 *
 * ## Attack Animation System
 * - Horizontal attacks use flipX for left/right facing
 * - Vertical attacks use separate sprite sheets (*_attack_up, *_attack_down)
 * - Hurt animations don't interrupt attack animations (async-safe)
 */

import Phaser from 'phaser';
import {
  UnitStats,
  Initiative,
  SKELETON_WARRIOR,
  SKELETON_GUARD,
  ORC,
  SOLDIER,
  VAMPIRE,
  ARCHER,
  AXEMAN,
  KNIGHT,
  LANCER,
  calculateDamage,
  formatStats,
  isInVision,
  getSpriteConfig,
} from '../data/UnitStats';

/** All unit types for test mode spawning */
const ALL_UNIT_STATS: UnitStats[] = [
  SKELETON_WARRIOR,
  SKELETON_GUARD,
  VAMPIRE,
  ORC,
  SOLDIER,
  ARCHER,
  AXEMAN,
  KNIGHT,
  LANCER,
];
import {
  getOccupiedTiles,
  isTileOccupied,
  canUnitFitAt,
  canUnitFitAtWithTerrain,
  getUnitWorldX,
  getUnitWorldY,
  getUnitDistance,
  getUnitMovementPenalty,
  isTerrainTileWalkable,
  getTerrainTileMeleeAttackPenalty,
  hasLineOfSight,
  hasProjectilePath,
  GridUnit,
} from '../utils/GridUtils';
import {
  BattlefieldData,
  getTerrainType,
  createEmptyBattlefield,
} from '../../types/combatTerrain';
import {
  preloadUnitSprites,
  createUnitAnimations,
  getAnimPrefix,
} from '../systems/AnimationSystem';

/** Unit behavior state machine */
type UnitState = 'moving' | 'setting' | 'attacking';

/** Runtime unit instance with sprite and combat state */
interface Unit {
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  stats: UnitStats;
  currentHp: number;
  gridX: number;
  gridY: number;
  isPlayer: boolean;
  state: UnitState;
  setCounter: number;  // Turns spent in 'setting' state (for attackDelay)
  target: Unit | null; // Locked attack target
  chargeReady: boolean; // Lancer charge attack ready (1.2x damage, no delay)
}

/** Deployment phase configuration */
interface DeploymentPhaseConfig {
  turn: number;      // Turn number when this phase triggers (0 = start)
  maxUnits: number;  // Maximum units to deploy this phase
}

/** Deployment phases for Skirmish mode */
const DEPLOYMENT_PHASES: DeploymentPhaseConfig[] = [
  { turn: 0, maxUnits: 3 },
  { turn: 10, maxUnits: 4 },
  { turn: 18, maxUnits: 2 },
];

export class CombatScene extends Phaser.Scene {
  private units: Unit[] = [];
  private gridWidth = 16;
  private gridHeight = 9;
  private tileSize = 16;
  private pixelScale = 2;
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private combatStarted = false;
  private combatSpeed = 800; // ms between actions
  private turnNumber = 0;
  private fogGraphics!: Phaser.GameObjects.Graphics;
  private fogState: number[][] = []; // 0 = full fog, 1 = fully visible, 0-1 = partial

  // Terrain system
  private terrainData: string[][] | null = null; // 2D grid of terrain IDs
  private terrainGraphics!: Phaser.GameObjects.Graphics;

  // Deployment state for Skirmish mode
  private isDeploying = true;
  private deploymentPhase = 0; // Index into DEPLOYMENT_PHASES (0, 1, 2)
  private unitsDeployedThisPhase = 0;
  private selectedUnitType: string = 'soldier';
  private availableUnits: Map<string, number> = new Map(); // type -> remaining count
  private enemyAvailableUnits: Map<string, number> = new Map();
  private deploymentHighlightGraphics!: Phaser.GameObjects.Graphics;
  private hoveredTile: { x: number; y: number } | null = null;
  private placementPreview: Phaser.GameObjects.Sprite | null = null;
  private unitIdCounter = 0;

  // Test mode: spawns one of each unit on both sides
  private testMode = false;

  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data?: { battlefield?: BattlefieldData; testMode?: boolean }): void {
    // Reset all state on scene start/restart
    this.units = [];
    this.fogState = [];
    this.combatStarted = false;
    this.turnNumber = 0;

    // Check for test mode (from init data or URL parameter)
    const urlParams = new URLSearchParams(window.location.search);
    this.testMode = data?.testMode || urlParams.get('test') === 'true';

    // Load battlefield data (terrain and dimensions)
    if (data?.battlefield) {
      this.terrainData = data.battlefield.terrain;
      this.gridWidth = data.battlefield.width;
      this.gridHeight = data.battlefield.height;
    } else {
      this.terrainData = null;
      this.gridWidth = 16;
      this.gridHeight = 9;
    }

    // Reset deployment state
    this.isDeploying = !this.testMode; // Skip deployment in test mode
    this.deploymentPhase = 0;
    this.unitsDeployedThisPhase = 0;
    this.selectedUnitType = 'soldier';
    this.unitIdCounter = 0;
    this.hoveredTile = null;

    // Initialize available units for both sides (10 soldiers, 10 archers, 1 lancer)
    this.availableUnits = new Map([
      ['soldier', 10],
      ['archer', 10],
      ['lancer', 1],
    ]);
    this.enemyAvailableUnits = new Map([
      ['soldier', 10],
      ['archer', 10],
      ['lancer', 1],
    ]);

    // Clear any lingering tweens/timers from previous run
    this.tweens?.killAll();
    this.time?.removeAllEvents();
  }

  preload(): void {
    // Load tileset
    this.load.image('tileset', 'assets/tiles/Dungeon_Tileset.png');

    // Load all unit sprite sheets via AnimationSystem
    preloadUnitSprites(this);

    // Load projectiles
    this.load.image('arrow', 'assets/units/arrow.png');
  }

  create(): void {
    // Calculate grid offset to center on screen
    const scaledTileSize = this.tileSize * this.pixelScale;
    this.gridOffsetX = (this.cameras.main.width - this.gridWidth * scaledTileSize) / 2;
    this.gridOffsetY = (this.cameras.main.height - this.gridHeight * scaledTileSize) / 2;

    // Initialize fog state (player sees left half by default)
    this.initFogState();

    // Create terrain graphics layer (below everything)
    this.terrainGraphics = this.add.graphics();
    this.terrainGraphics.setDepth(0);

    // Create the battlefield grid (includes terrain rendering)
    this.createBattlefield();

    // Create deployment highlight graphics (below fog)
    this.deploymentHighlightGraphics = this.add.graphics();
    this.deploymentHighlightGraphics.setDepth(5);

    // Create fog of war overlay (rendered on top)
    this.fogGraphics = this.add.graphics();
    this.fogGraphics.setDepth(100);

    // Create animations via AnimationSystem
    createUnitAnimations(this);

    // Initialize empty unit array for Skirmish mode (no auto-spawn)
    this.units = [];

    // Initial fog update
    this.updateFogOfWar();

    // Set up deployment input handlers
    this.setupDeploymentInput();

    // Set up event listeners for React communication
    this.setupEventListeners();

    // Test mode: spawn all units and start combat immediately
    if (this.testMode) {
      this.spawnTestUnits();
      this.updateFogOfWar();
      // Add title text for test mode
      this.add.text(this.cameras.main.width / 2, 20, 'TEST BATTLE - All Units', {
        fontSize: '24px',
        color: '#ffff00',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      // Start combat after short delay
      this.time.delayedCall(500, () => {
        this.combatStarted = true;
        this.runCombatLoop();
      });
    } else {
      // Start first deployment phase
      this.startDeploymentPhase(0);

      // Add title text
      this.add.text(this.cameras.main.width / 2, 20, 'SKIRMISH BATTLE', {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }
  }

  private createBattlefield(): void {
    const scaledTileSize = this.tileSize * this.pixelScale;
    const graphics = this.add.graphics();
    graphics.setDepth(1);

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const worldX = this.gridOffsetX + x * scaledTileSize;
        const worldY = this.gridOffsetY + y * scaledTileSize;

        // Draw terrain if available, otherwise default floor
        if (this.terrainData) {
          this.drawTerrainTile(x, y, worldX, worldY, scaledTileSize);
        } else {
          // Default floor tile
          graphics.fillStyle(0x3d2845, 1);
          graphics.fillRect(worldX, worldY, scaledTileSize, scaledTileSize);
        }

        // Draw grid lines
        graphics.lineStyle(1, 0x5c3d5e, 0.5);
        graphics.strokeRect(worldX, worldY, scaledTileSize, scaledTileSize);
      }
    }

    // Draw center line
    graphics.lineStyle(2, 0x8b5a8b, 0.8);
    const centerX = this.gridOffsetX + (this.gridWidth / 2) * scaledTileSize;
    graphics.lineBetween(
      centerX,
      this.gridOffsetY,
      centerX,
      this.gridOffsetY + this.gridHeight * scaledTileSize
    );
  }

  /** Draw a single terrain tile with visual effects */
  private drawTerrainTile(
    tileX: number,
    tileY: number,
    worldX: number,
    worldY: number,
    tileSize: number
  ): void {
    if (!this.terrainData) return;

    const terrainId = this.terrainData[tileY]?.[tileX] ?? 'ground';
    const terrain = getTerrainType(terrainId);

    // Draw base terrain color
    this.terrainGraphics.fillStyle(terrain.color, 1);
    this.terrainGraphics.fillRect(worldX, worldY, tileSize, tileSize);

    // Add visual texture based on terrain type
    const cx = worldX + tileSize / 2;
    const cy = worldY + tileSize / 2;

    switch (terrain.id) {
      case 'rock':
      case 'boulder':
        // Draw rock shape
        this.terrainGraphics.fillStyle(0x333333, 0.6);
        this.terrainGraphics.fillCircle(cx, cy, tileSize * 0.35);
        break;

      case 'tree':
        // Draw tree trunk and foliage
        this.terrainGraphics.fillStyle(0x4a3728, 1);
        this.terrainGraphics.fillRect(cx - 2, cy, 4, tileSize * 0.4);
        this.terrainGraphics.fillStyle(0x1a4a1a, 1);
        this.terrainGraphics.fillCircle(cx, cy - 4, tileSize * 0.35);
        break;

      case 'bush':
        // Draw bush circles with cover indicator
        this.terrainGraphics.fillStyle(0x2d7a2d, 0.7);
        this.terrainGraphics.fillCircle(cx - 4, cy, 6);
        this.terrainGraphics.fillCircle(cx + 4, cy, 6);
        this.terrainGraphics.fillCircle(cx, cy - 3, 6);
        break;

      case 'water_shallow':
      case 'water_deep':
        // Draw wave lines
        this.terrainGraphics.lineStyle(1, 0xffffff, 0.3);
        this.terrainGraphics.lineBetween(worldX + 4, cy - 3, worldX + tileSize - 4, cy - 3);
        this.terrainGraphics.lineBetween(worldX + 6, cy + 3, worldX + tileSize - 6, cy + 3);
        break;

      case 'wall':
        // Draw brick pattern
        this.terrainGraphics.lineStyle(1, 0x5a4a3a, 0.6);
        this.terrainGraphics.strokeRect(worldX + 2, worldY + 2, tileSize - 4, tileSize / 2 - 2);
        this.terrainGraphics.strokeRect(worldX + tileSize / 4, worldY + tileSize / 2 + 1,
          tileSize / 2, tileSize / 2 - 3);
        break;

      case 'mud':
        // Draw mud spots
        this.terrainGraphics.fillStyle(0x4a3a2a, 0.5);
        this.terrainGraphics.fillCircle(cx - 5, cy - 3, 4);
        this.terrainGraphics.fillCircle(cx + 4, cy + 2, 5);
        break;
    }
  }

  /** Load a battlefield with terrain data */
  public loadBattlefield(data: BattlefieldData): void {
    this.terrainData = data.terrain;
    this.gridWidth = data.width;
    this.gridHeight = data.height;

    // Recalculate grid offset
    const scaledTileSize = this.tileSize * this.pixelScale;
    this.gridOffsetX = (this.cameras.main.width - this.gridWidth * scaledTileSize) / 2;
    this.gridOffsetY = (this.cameras.main.height - this.gridHeight * scaledTileSize) / 2;

    // Re-render terrain
    this.terrainGraphics.clear();
    this.createBattlefield();
    this.initFogState();
    this.updateFogOfWar();
  }

  // ==================== DEPLOYMENT SYSTEM ====================

  /** Set up input handlers for deployment */
  private setupDeploymentInput(): void {
    const scaledTileSize = this.tileSize * this.pixelScale;

    // Track mouse movement for hover highlights
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDeploying) {
        this.hoveredTile = null;
        this.updateDeploymentHighlights();
        return;
      }

      // Convert pointer to grid coordinates
      const tileX = Math.floor((pointer.x - this.gridOffsetX) / scaledTileSize);
      const tileY = Math.floor((pointer.y - this.gridOffsetY) / scaledTileSize);

      // Check if within grid bounds
      if (tileX >= 0 && tileX < this.gridWidth && tileY >= 0 && tileY < this.gridHeight) {
        this.hoveredTile = { x: tileX, y: tileY };
      } else {
        this.hoveredTile = null;
      }

      this.updateDeploymentHighlights();
    });

    // Handle click to deploy or remove unit
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDeploying) return;

      const tileX = Math.floor((pointer.x - this.gridOffsetX) / scaledTileSize);
      const tileY = Math.floor((pointer.y - this.gridOffsetY) / scaledTileSize);

      // Check if clicking on an existing player unit to remove it
      const unitAtTile = this.getPlayerUnitAtTile(tileX, tileY);
      if (unitAtTile) {
        this.removeDeployedUnit(unitAtTile);
        return;
      }

      if (this.canDeployAt(tileX, tileY)) {
        this.deployUnit(this.selectedUnitType, tileX, tileY, true);
      }
    });
  }

  /** Set up event listeners for React communication */
  private setupEventListeners(): void {
    // React can emit these events to control deployment
    this.events.on('select-unit-type', (unitType: string) => {
      this.selectedUnitType = unitType;
      this.updateDeploymentHighlights();
      this.emitDeploymentState();
    });

    this.events.on('confirm-deployment', () => {
      this.confirmDeployment();
    });
  }

  /** Emit current deployment state to React */
  private emitDeploymentState(): void {
    const phaseConfig = DEPLOYMENT_PHASES[this.deploymentPhase];
    this.events.emit('deployment-state', {
      isDeploying: this.isDeploying,
      phase: this.deploymentPhase + 1, // 1-indexed for display
      maxUnits: phaseConfig?.maxUnits ?? 0,
      unitsDeployed: this.unitsDeployedThisPhase,
      selectedUnitType: this.selectedUnitType,
      availableUnits: Object.fromEntries(this.availableUnits),
    });
  }

  /** Start a deployment phase */
  private startDeploymentPhase(phaseIndex: number): void {
    if (phaseIndex >= DEPLOYMENT_PHASES.length) return;

    this.deploymentPhase = phaseIndex;
    this.isDeploying = true;
    this.unitsDeployedThisPhase = 0;
    this.combatStarted = false;

    // Emit state to React
    this.emitDeploymentState();
    this.updateDeploymentHighlights();

    console.log(`Starting deployment phase ${phaseIndex + 1}`);
  }

  /** Check if player can deploy at a specific tile */
  private canDeployAt(tileX: number, tileY: number): boolean {
    // Must be in deployment mode
    if (!this.isDeploying) return false;

    // Check phase limits
    const phaseConfig = DEPLOYMENT_PHASES[this.deploymentPhase];
    if (this.unitsDeployedThisPhase >= phaseConfig.maxUnits) return false;

    // Check if we have units of the selected type available
    const remaining = this.availableUnits.get(this.selectedUnitType) ?? 0;
    if (remaining <= 0) return false;

    // Player can only deploy in columns 0-1
    if (tileX < 0 || tileX > 1) return false;

    // Check grid bounds
    if (tileY < 0 || tileY >= this.gridHeight) return false;

    // For multi-tile units (lancer), check if all tiles fit
    const unitStats = this.getUnitStatsByType(this.selectedUnitType);
    const unitSize = unitStats.size || 1;
    for (let i = 0; i < unitSize; i++) {
      if (tileX + i > 1) return false; // Multi-tile unit must fit in columns 0-1
      if (isTileOccupied(tileX + i, tileY, this.units)) return false;
      // Check terrain walkability
      if (!isTerrainTileWalkable(tileX + i, tileY, this.terrainData)) return false;
    }

    return true;
  }

  /** Get unit stats by type string */
  private getUnitStatsByType(type: string): UnitStats {
    switch (type) {
      case 'soldier': return SOLDIER;
      case 'archer': return ARCHER;
      case 'lancer': return LANCER;
      default: return SOLDIER;
    }
  }

  /** Deploy a unit at a specific position */
  private deployUnit(unitType: string, gridX: number, gridY: number, isPlayer: boolean): void {
    const unitStats = this.getUnitStatsByType(unitType);
    const scaledTileSize = this.tileSize * this.pixelScale;
    const unitSize = unitStats.size || 1;

    const animPrefix = unitStats.type;
    const spriteScale = getSpriteConfig(unitStats.type).scale;
    const originY = getSpriteConfig(unitStats.type).originY;

    // Center sprite across all tiles the unit occupies
    const spriteX = this.gridOffsetX + (gridX + unitSize / 2) * scaledTileSize;
    const spriteY = this.gridOffsetY + gridY * scaledTileSize + scaledTileSize / 2;

    const sprite = this.add.sprite(spriteX, spriteY, `${animPrefix}_idle`);
    sprite.setOrigin(0.5, originY);
    sprite.setScale(spriteScale);
    sprite.setDepth(10 + gridY);
    sprite.play(`${animPrefix}_idle_anim`);

    // Enemy units face left
    if (!isPlayer) {
      sprite.setFlipX(true);
    }

    const unit: Unit = {
      id: `${isPlayer ? 'player' : 'enemy'}${++this.unitIdCounter}`,
      sprite,
      stats: unitStats,
      currentHp: unitStats.hp,
      gridX,
      gridY,
      isPlayer,
      state: 'moving',
      setCounter: 0,
      target: null,
      chargeReady: true,
    };

    this.units.push(unit);
    this.updateHealthTint(unit);

    // Update available units count
    if (isPlayer) {
      const remaining = (this.availableUnits.get(unitType) ?? 0) - 1;
      this.availableUnits.set(unitType, remaining);
      this.unitsDeployedThisPhase++;

      // Emit updated state
      this.emitDeploymentState();
      this.events.emit('unit-deployed', {
        unitType,
        remaining,
        unitsDeployed: this.unitsDeployedThisPhase,
      });
    } else {
      const remaining = (this.enemyAvailableUnits.get(unitType) ?? 0) - 1;
      this.enemyAvailableUnits.set(unitType, remaining);
    }

    // Update fog of war
    this.updateFogOfWar();
    this.updateDeploymentHighlights();
  }

  /** Get player unit at a specific tile (checks all tiles occupied by multi-tile units) */
  private getPlayerUnitAtTile(tileX: number, tileY: number): Unit | null {
    for (const unit of this.units) {
      if (!unit.isPlayer || unit.currentHp <= 0) continue;
      const occupied = getOccupiedTiles(unit);
      if (occupied.some(t => t.x === tileX && t.y === tileY)) {
        return unit;
      }
    }
    return null;
  }

  /** Remove a deployed unit and refund it to available pool */
  private removeDeployedUnit(unit: Unit): void {
    // Destroy the sprite
    unit.sprite.destroy();

    // Remove from units array
    const index = this.units.indexOf(unit);
    if (index > -1) {
      this.units.splice(index, 1);
    }

    // Refund to available units
    const unitType = unit.stats.type;
    const current = this.availableUnits.get(unitType) ?? 0;
    this.availableUnits.set(unitType, current + 1);

    // Decrement deployed count
    this.unitsDeployedThisPhase--;

    // Emit updated state
    this.emitDeploymentState();
    this.events.emit('unit-removed', {
      unitType,
      remaining: current + 1,
      unitsDeployed: this.unitsDeployedThisPhase,
    });

    // Update visuals
    this.updateFogOfWar();
    this.updateDeploymentHighlights();
  }

  /** Confirm deployment and proceed */
  private confirmDeployment(): void {
    if (!this.isDeploying) return;

    // Enemy deploys their units
    this.enemyDeploy();

    // End deployment phase
    this.isDeploying = false;
    this.hoveredTile = null;
    this.updateDeploymentHighlights();

    // Update fog after all units placed
    this.updateFogOfWar();

    // Emit state change
    this.emitDeploymentState();

    // Start or resume combat
    if (this.deploymentPhase === 0) {
      // First phase - start combat after delay
      this.time.delayedCall(1000, () => {
        this.combatStarted = true;
        this.runCombatLoop();
      });
    } else {
      // Subsequent phases - resume combat immediately
      this.combatStarted = true;
      this.time.delayedCall(500, () => {
        this.runCombatLoop();
      });
    }
  }

  /** AI enemy deployment */
  private enemyDeploy(): void {
    const phaseConfig = DEPLOYMENT_PHASES[this.deploymentPhase];
    const maxToDeploy = phaseConfig.maxUnits;
    let deployed = 0;

    // Get available unit types with remaining counts
    const availableTypes = Array.from(this.enemyAvailableUnits.entries())
      .filter(([_, count]) => count > 0)
      .map(([type, _]) => type);

    if (availableTypes.length === 0) return;

    // Try to spread units across rows
    const usedRows = new Set<number>();

    while (deployed < maxToDeploy && availableTypes.length > 0) {
      // Pick random unit type
      const typeIdx = Math.floor(Math.random() * availableTypes.length);
      const unitType = availableTypes[typeIdx];
      const unitStats = this.getUnitStatsByType(unitType);
      const unitSize = unitStats.size || 1;

      // Find empty position in columns 14-15 (enemy side)
      let placed = false;

      // Prefer rows not yet used for spreading
      const rows = Array.from({ length: this.gridHeight }, (_, i) => i);
      rows.sort((a, b) => {
        const aUsed = usedRows.has(a) ? 1 : 0;
        const bUsed = usedRows.has(b) ? 1 : 0;
        if (aUsed !== bUsed) return aUsed - bUsed;
        return Math.random() - 0.5;
      });

      for (const row of rows) {
        // Try column 15 first for size-1 units, column 14 for size-2
        const cols = unitSize === 1 ? [15, 14] : [14];
        for (const col of cols) {
          // Check if all tiles are free
          let canPlace = true;
          for (let i = 0; i < unitSize; i++) {
            if (col + i > 15 || isTileOccupied(col + i, row, this.units)) {
              canPlace = false;
              break;
            }
          }

          if (canPlace) {
            this.deployUnit(unitType, col, row, false);
            usedRows.add(row);
            deployed++;
            placed = true;
            break;
          }
        }
        if (placed) break;
      }

      // If couldn't place this type, remove from available
      if (!placed) {
        availableTypes.splice(typeIdx, 1);
      }

      // Check if this type is now exhausted
      const remaining = this.enemyAvailableUnits.get(unitType) ?? 0;
      if (remaining <= 0) {
        const idx = availableTypes.indexOf(unitType);
        if (idx >= 0) availableTypes.splice(idx, 1);
      }
    }
  }

  /** Spawn one of each unit on both sides for testing */
  private spawnTestUnits(): void {
    const scaledTileSize = this.tileSize * this.pixelScale;

    // Spawn one of each unit type on each side
    // Player units on left (columns 0-1), enemy units on right (columns 14-15)
    let playerRow = 0;
    let enemyRow = 0;

    for (const unitStats of ALL_UNIT_STATS) {
      const unitSize = unitStats.size || 1;

      // Spawn player unit
      if (playerRow < this.gridHeight) {
        const playerX = unitSize === 2 ? 0 : 1; // Lancer at column 0, others at column 1
        this.spawnTestUnit(unitStats, playerX, playerRow, true);
        playerRow++;
      }

      // Spawn enemy unit
      if (enemyRow < this.gridHeight) {
        const enemyX = unitSize === 2 ? 14 : 14; // All enemies at column 14
        this.spawnTestUnit(unitStats, enemyX, enemyRow, false);
        enemyRow++;
      }
    }

    console.log(`Test mode: Spawned ${this.units.length} units (${ALL_UNIT_STATS.length} per side)`);
  }

  /** Spawn a single unit for test mode */
  private spawnTestUnit(unitStats: UnitStats, gridX: number, gridY: number, isPlayer: boolean): void {
    const scaledTileSize = this.tileSize * this.pixelScale;
    const unitSize = unitStats.size || 1;

    const animPrefix = unitStats.type;
    const spriteScale = getSpriteConfig(unitStats.type).scale;
    const originY = getSpriteConfig(unitStats.type).originY;

    // Center sprite across all tiles the unit occupies
    const spriteX = this.gridOffsetX + (gridX + unitSize / 2) * scaledTileSize;
    const spriteY = this.gridOffsetY + gridY * scaledTileSize + scaledTileSize / 2;

    const sprite = this.add.sprite(spriteX, spriteY, `${animPrefix}_idle`);
    sprite.setOrigin(0.5, originY);
    sprite.setScale(spriteScale);
    sprite.setDepth(10 + gridY);
    sprite.play(`${animPrefix}_idle_anim`);

    // Enemy units face left
    if (!isPlayer) {
      sprite.setFlipX(true);
    }

    const unit: Unit = {
      id: `${isPlayer ? 'player' : 'enemy'}${++this.unitIdCounter}`,
      sprite,
      stats: unitStats,
      currentHp: unitStats.hp,
      gridX,
      gridY,
      isPlayer,
      state: 'moving',
      setCounter: 0,
      target: null,
      chargeReady: true,
    };

    this.units.push(unit);
    this.updateHealthTint(unit);
  }

  /** Update visual highlights during deployment */
  private updateDeploymentHighlights(): void {
    this.deploymentHighlightGraphics.clear();

    // Hide placement preview by default
    if (this.placementPreview) {
      this.placementPreview.setVisible(false);
    }

    // Reset cursor to default
    this.input.setDefaultCursor('default');

    if (!this.isDeploying) return;

    const scaledTileSize = this.tileSize * this.pixelScale;
    const phaseConfig = DEPLOYMENT_PHASES[this.deploymentPhase];
    const canDeployMore = this.unitsDeployedThisPhase < phaseConfig.maxUnits;
    const hasUnits = (this.availableUnits.get(this.selectedUnitType) ?? 0) > 0;

    // Check if hovering over a deployed player unit
    let hoveredUnit: Unit | null = null;
    if (this.hoveredTile) {
      hoveredUnit = this.getPlayerUnitAtTile(this.hoveredTile.x, this.hoveredTile.y);
    }

    // Change cursor to indicate removal when hovering over a deployed unit
    if (hoveredUnit) {
      // Use a custom cursor or the 'not-allowed' style to indicate removal
      this.input.setDefaultCursor('url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Ctext x=\'0\' y=\'24\' font-size=\'24\'%3E❌%3C/text%3E%3C/svg%3E") 16 16, pointer');
    }

    // Show placement preview if hovering over a valid deployment tile
    if (this.hoveredTile && !hoveredUnit && canDeployMore && hasUnits) {
      const canDeploy = this.canDeployAt(this.hoveredTile.x, this.hoveredTile.y);
      if (canDeploy) {
        this.showPlacementPreview(this.hoveredTile.x, this.hoveredTile.y);
      }
    }

    // Highlight valid deployment columns (0-1)
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x <= 1; x++) {
        const worldX = this.gridOffsetX + x * scaledTileSize;
        const worldY = this.gridOffsetY + y * scaledTileSize;

        const isOccupied = isTileOccupied(x, y, this.units);
        const isHovered = this.hoveredTile?.x === x && this.hoveredTile?.y === y;
        const isHoveredUnit = hoveredUnit && this.getPlayerUnitAtTile(x, y) === hoveredUnit;

        if (isHoveredUnit) {
          // Hovering over deployed unit - red highlight to show removal
          this.deploymentHighlightGraphics.fillStyle(0xff0000, 0.3);
        } else if (isOccupied) {
          // Occupied tile - subtle gray
          this.deploymentHighlightGraphics.fillStyle(0x666666, 0.2);
        } else if (isHovered && canDeployMore && hasUnits) {
          // Hovered valid tile - bright green
          this.deploymentHighlightGraphics.fillStyle(0x00ff00, 0.4);
        } else if (canDeployMore && hasUnits) {
          // Valid but not hovered - subtle green
          this.deploymentHighlightGraphics.fillStyle(0x00ff00, 0.15);
        } else {
          // Can't deploy more - subtle red
          this.deploymentHighlightGraphics.fillStyle(0xff0000, 0.1);
        }

        this.deploymentHighlightGraphics.fillRect(worldX, worldY, scaledTileSize, scaledTileSize);
      }
    }

    // For lancer (size 2), show extended highlight
    if (this.hoveredTile && this.selectedUnitType === 'lancer' && canDeployMore && hasUnits) {
      const x = this.hoveredTile.x;
      const y = this.hoveredTile.y;
      if (x <= 0 && !isTileOccupied(x + 1, y, this.units)) {
        const worldX = this.gridOffsetX + (x + 1) * scaledTileSize;
        const worldY = this.gridOffsetY + y * scaledTileSize;
        this.deploymentHighlightGraphics.fillStyle(0x00ff00, 0.3);
        this.deploymentHighlightGraphics.fillRect(worldX, worldY, scaledTileSize, scaledTileSize);
      }
    }
  }

  /** Show a ghost/preview of the unit at the hovered position */
  private showPlacementPreview(tileX: number, tileY: number): void {
    const unitStats = this.getUnitStatsByType(this.selectedUnitType);
    const unitSize = unitStats.size || 1;
    const scaledTileSize = this.tileSize * this.pixelScale;
    const spriteConfig = getSpriteConfig(unitStats.type);

    // Calculate position (centered for multi-tile units)
    const spriteX = this.gridOffsetX + (tileX + unitSize / 2) * scaledTileSize;
    const spriteY = this.gridOffsetY + tileY * scaledTileSize + scaledTileSize / 2;

    const textureKey = `${unitStats.type}_idle`;

    // Create or update the preview sprite
    if (!this.placementPreview) {
      this.placementPreview = this.add.sprite(spriteX, spriteY, textureKey);
      this.placementPreview.setDepth(15);
    } else {
      this.placementPreview.setTexture(textureKey);
      this.placementPreview.setPosition(spriteX, spriteY);
    }

    this.placementPreview.setOrigin(0.5, spriteConfig.originY);
    this.placementPreview.setScale(spriteConfig.scale);
    this.placementPreview.setAlpha(0.4);
    this.placementPreview.setVisible(true);
    this.placementPreview.play(`${unitStats.type}_idle_anim`);
  }

  private initFogState(): void {
    // Initialize fog: player can see left half (x < 8), enemy side is fogged
    this.fogState = [];
    for (let y = 0; y < this.gridHeight; y++) {
      this.fogState[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        // Player sees their half of the board (left side, x < 8)
        this.fogState[y][x] = x < this.gridWidth / 2 ? 1 : 0;
      }
    }
  }

  private updateFogOfWar(): void {
    // Reset to base visibility (player sees left half)
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.fogState[y][x] = x < this.gridWidth / 2 ? 1 : 0;
      }
    }

    // Add vision from player units with gradient at edges
    const playerUnits = this.units.filter(u => u.isPlayer && u.currentHp > 0);
    for (const unit of playerUnits) {
      const vision = unit.stats.vision;
      for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
          // Calculate distance from unit to tile center
          const dx = x - unit.gridX;
          const dy = y - unit.gridY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= vision) {
            // Check line of sight (terrain may block vision)
            if (hasLineOfSight(unit.gridX, unit.gridY, x, y, this.terrainData)) {
              // Fully visible
              this.fogState[y][x] = 1;
            }
          } else if (distance <= vision + 1.5) {
            // Partial visibility at edge (gradient) - still check LOS
            if (hasLineOfSight(unit.gridX, unit.gridY, x, y, this.terrainData)) {
              const edgeFactor = 1 - (distance - vision) / 1.5;
              this.fogState[y][x] = Math.max(this.fogState[y][x], edgeFactor);
            }
          }
        }
      }
    }

    // Render the fog
    this.renderFog();

    // Update unit visibility based on fog
    this.updateUnitVisibility();
  }

  private renderFog(): void {
    const scaledTileSize = this.tileSize * this.pixelScale;
    this.fogGraphics.clear();

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const visibility = this.fogState[y][x];
        if (visibility < 1) {
          const worldX = this.gridOffsetX + x * scaledTileSize;
          const worldY = this.gridOffsetY + y * scaledTileSize;

          // Draw fog with opacity based on visibility (0 = full fog, 1 = no fog)
          const fogOpacity = 0.8 * (1 - visibility);
          this.fogGraphics.fillStyle(0x000000, fogOpacity);
          this.fogGraphics.fillRect(worldX, worldY, scaledTileSize, scaledTileSize);
        }
      }
    }
  }

  private updateUnitVisibility(): void {
    // Hide/show enemy units based on fog (partial visibility counts as visible)
    for (const unit of this.units) {
      if (!unit.isPlayer && unit.currentHp > 0) {
        const visibility = this.fogState[unit.gridY]?.[unit.gridX] ?? 0;
        const isVisible = visibility > 0;
        unit.sprite.setVisible(isVisible);
      }
    }
  }

  private canSeeEnemy(viewer: Unit, target: Unit): boolean {
    // Player units use fog state (partial visibility counts as seeing)
    if (viewer.isPlayer) {
      const visibility = this.fogState[target.gridY]?.[target.gridX] ?? 0;
      return visibility > 0;
    }
    // Enemy units use their own vision (including edge detection for aggro)
    const dx = target.gridX - viewer.gridX;
    const dy = target.gridY - viewer.gridY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Must be within vision range
    if (distance > viewer.stats.vision + 1.5) return false;

    // Must have line of sight (terrain may block)
    return hasLineOfSight(viewer.gridX, viewer.gridY, target.gridX, target.gridY, this.terrainData);
  }

  private updateHealthTint(unit: Unit): void {
    const hpPercent = unit.currentHp / unit.stats.hp;

    if (hpPercent > 0.75) {
      // Healthy - no tint
      unit.sprite.clearTint();
    } else if (hpPercent > 0.50) {
      // Medium health (50%-75%) - yellow tint, intensity increases as health drops
      const intensity = 1 - (hpPercent - 0.50) / 0.25; // 0 at 75%, 1 at 50%
      // Blend from white toward yellow (reduce blue channel)
      const blue = Math.floor(255 * (1 - intensity * 0.8));
      const tint = 0xff0000 | (0xff << 8) | blue; // R=255, G=255, B=varies
      unit.sprite.setTint(tint);
    } else {
      // Low health (below 50%) - red tint, intensity increases as health drops
      const intensity = 1 - hpPercent / 0.50; // 0 at 50%, 1 at 0%
      // Blend from yellow toward red (reduce green and blue)
      const green = Math.floor(255 * (1 - intensity * 0.85));
      const blue = Math.floor(255 * (1 - intensity));
      const tint = 0xff0000 | (green << 8) | blue; // R=255, G=varies, B=varies
      unit.sprite.setTint(tint);
    }
  }

  private runCombatLoop(): void {
    if (!this.combatStarted) return;

    this.turnNumber++;

    // Check for deployment phase triggers (turn 5 = phase 2, turn 10 = phase 3)
    const nextPhaseIndex = this.deploymentPhase + 1;
    if (nextPhaseIndex < DEPLOYMENT_PHASES.length) {
      const nextPhase = DEPLOYMENT_PHASES[nextPhaseIndex];
      if (this.turnNumber === nextPhase.turn) {
        // Pause combat and start next deployment phase
        this.combatStarted = false;
        this.startDeploymentPhase(nextPhaseIndex);
        return;
      }
    }

    const aliveUnits = this.units.filter(u => u.currentHp > 0);
    const playerUnits = aliveUnits.filter(u => u.isPlayer);
    const enemyUnits = aliveUnits.filter(u => !u.isPlayer);

    // Check for combat end
    if (playerUnits.length === 0) {
      this.endCombat('ENEMY WINS!', '#f44336');
      return;
    }
    if (enemyUnits.length === 0) {
      this.endCombat('PLAYER WINS!', '#4caf50');
      return;
    }

    // Collect intended moves and attacks
    const intendedMoves: Map<Unit, { x: number; y: number }> = new Map();
    const pendingAttacks: { attacker: Unit; defender: Unit; initiative: string }[] = [];

    // First pass: determine what each unit wants to do
    for (const unit of aliveUnits) {
      if (unit.currentHp <= 0) continue;

      const enemies = unit.isPlayer ? enemyUnits : playerUnits;
      const visibleTarget = this.findNearestVisibleEnemy(unit, enemies);

      if (unit.state === 'attacking') {
        // Ranged units re-evaluate target each turn to always attack closest
        if (unit.stats.attackRange > 1 && visibleTarget && visibleTarget.currentHp > 0) {
          const distance = getUnitDistance(unit, visibleTarget);
          if (distance <= unit.stats.attackRange) {
            unit.target = visibleTarget;  // Update to closest target
            pendingAttacks.push({ attacker: unit, defender: unit.target, initiative: unit.stats.initiative });
          } else {
            unit.state = 'moving';
            unit.setCounter = 0;
            unit.target = null;
          }
        } else if (unit.target && unit.target.currentHp > 0) {
          // Melee units keep their locked target
          const distance = getUnitDistance(unit, unit.target);
          if (distance <= unit.stats.attackRange) {
            pendingAttacks.push({ attacker: unit, defender: unit.target, initiative: unit.stats.initiative });
          } else {
            unit.state = 'moving';
            unit.setCounter = 0;
            unit.target = null;
          }
        } else {
          unit.state = 'moving';
          unit.setCounter = 0;
          unit.target = null;
        }
      } else if (unit.state === 'setting') {
        if (!unit.target || unit.target.currentHp <= 0) {
          unit.state = 'moving';
          unit.setCounter = 0;
          unit.target = null;
        } else {
          unit.setCounter++;
          if (unit.setCounter >= unit.stats.attackDelay) {
            unit.state = 'attacking';
            pendingAttacks.push({ attacker: unit, defender: unit.target, initiative: unit.stats.initiative });
          }
        }
      } else {
        // Moving state
        if (visibleTarget && visibleTarget.currentHp > 0) {
          const distance = getUnitDistance(unit, visibleTarget);

          if (distance <= unit.stats.attackRange) {
            // Lancer charge: if chargeReady, skip setting and attack immediately
            if (unit.stats.type === 'lancer' && unit.chargeReady) {
              unit.state = 'attacking';
              unit.target = visibleTarget;
              pendingAttacks.push({ attacker: unit, defender: visibleTarget, initiative: unit.stats.initiative });
            } else {
              unit.state = 'setting';
              unit.setCounter = 0;
              unit.target = visibleTarget;
            }
          } else {
            const move = this.getIntendedMove(unit, visibleTarget);
            if (move) intendedMoves.set(unit, move);
          }
        } else {
          const move = this.getForwardMove(unit);
          if (move) intendedMoves.set(unit, move);
        }
      }
    }

    // Execute attacks by initiative tier (first > regular > last)
    const initiativeOrder = { first: 0, regular: 1, last: 2 };
    pendingAttacks.sort((a, b) => initiativeOrder[a.initiative] - initiativeOrder[b.initiative]);

    // Group attacks by initiative and execute each group together
    const attacksByInitiative = new Map<string, typeof pendingAttacks>();
    for (const attack of pendingAttacks) {
      if (!attacksByInitiative.has(attack.initiative)) {
        attacksByInitiative.set(attack.initiative, []);
      }
      attacksByInitiative.get(attack.initiative)!.push(attack);
    }

    // Execute all attacks in each initiative tier simultaneously
    for (const initiative of ['first', 'regular', 'last']) {
      const attacks = attacksByInitiative.get(initiative);
      if (attacks) {
        for (const { attacker, defender } of attacks) {
          if (attacker.currentHp > 0 && defender.currentHp > 0) {
            this.attack(attacker, defender);
          }
        }
      }
    }

    // Resolve move collisions
    this.resolveMovementCollisions(intendedMoves);

    // Post-movement charge attacks: lancers that just moved into range attack immediately
    const chargeAttacks: { attacker: Unit; defender: Unit }[] = [];
    for (const [unit] of intendedMoves) {
      if (unit.stats.type === 'lancer' && unit.chargeReady && unit.currentHp > 0) {
        // Find nearest enemy in range
        const enemies = unit.isPlayer
          ? this.units.filter(u => !u.isPlayer && u.currentHp > 0)
          : this.units.filter(u => u.isPlayer && u.currentHp > 0);

        for (const enemy of enemies) {
          const distance = getUnitDistance(unit, enemy);
          if (distance <= unit.stats.attackRange) {
            chargeAttacks.push({ attacker: unit, defender: enemy });
            // After charge, go to 'setting' state so it waits before next attack
            unit.state = 'setting';
            unit.setCounter = 0;
            unit.target = enemy;
            break; // Only attack one target
          }
        }
      }
    }

    // Execute charge attacks with a slight delay so movement animation completes first
    if (chargeAttacks.length > 0) {
      this.time.delayedCall(300, () => {
        for (const { attacker, defender } of chargeAttacks) {
          if (attacker.currentHp > 0 && defender.currentHp > 0) {
            this.attack(attacker, defender);
          }
        }
      });
    }

    // Update fog of war after all movements
    this.updateFogOfWar();

    // Schedule next combat tick
    this.time.delayedCall(this.combatSpeed, () => this.runCombatLoop());
  }

  private getIntendedMove(unit: Unit, target: Unit): { x: number; y: number } | null {
    const moveSpeed = unit.stats.moveSpeed || 1;
    const unitSize = unit.stats.size || 1;
    const targetSize = target.stats.size || 1;

    // Helper to calculate distance from hypothetical position to target
    const calcDist = (fromX: number, fromY: number): number => {
      const left1 = fromX;
      const right1 = fromX + unitSize - 1;
      const left2 = target.gridX;
      const right2 = target.gridX + targetSize - 1;

      let dx: number;
      if (right1 < left2) {
        dx = left2 - right1;
      } else if (right2 < left1) {
        dx = left1 - right2;
      } else {
        dx = 0;
      }
      const dy = Math.abs(fromY - target.gridY);
      // Manhattan distance (units can only move in 4 cardinal directions)
      return dx + dy;
    };

    const currentDist = calcDist(unit.gridX, unit.gridY);

    // Get all possible moves (4 cardinal directions, up to moveSpeed tiles)
    const possibleMoves: { x: number; y: number; dist: number }[] = [];
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    for (const dir of directions) {
      // Try moving 1 to moveSpeed tiles in this direction
      for (let steps = 1; steps <= moveSpeed; steps++) {
        const newX = unit.gridX + dir.dx * steps;
        const newY = unit.gridY + dir.dy * steps;

        // Check if unit can fit at new position (bounds + collision with size + terrain)
        if (!canUnitFitAtWithTerrain(unit, newX, newY, this.gridWidth, this.gridHeight, this.units, this.terrainData)) {
          break; // Can't go further in this direction
        }

        // Also check that we don't pass through any units/terrain along the path
        let pathClear = true;
        for (let i = 1; i < steps; i++) {
          const checkX = unit.gridX + dir.dx * i;
          const checkY = unit.gridY + dir.dy * i;
          if (!canUnitFitAtWithTerrain(unit, checkX, checkY, this.gridWidth, this.gridHeight, this.units, this.terrainData)) {
            pathClear = false;
            break;
          }
        }
        if (!pathClear) break;

        // Calculate distance to target from this new position
        const newDist = calcDist(newX, newY);
        possibleMoves.push({ x: newX, y: newY, dist: newDist });
      }
    }

    if (possibleMoves.length === 0) return null;

    // Filter to moves that make progress toward the target
    let bestMoves = possibleMoves.filter(m => m.dist < currentDist);

    // If no progress moves, try moves that maintain distance
    if (bestMoves.length === 0) {
      bestMoves = possibleMoves.filter(m => m.dist === currentDist);
    }

    // If still nothing, consider backwards moves but only 20% of the time
    if (bestMoves.length === 0) {
      if (Math.random() < 0.2) {
        bestMoves = possibleMoves.filter(m => m.dist > currentDist);
      }
    }

    // If no valid moves, stay put
    if (bestMoves.length === 0) {
      return null;
    }

    // Prefer the move that gets closest to target
    const bestDist = Math.min(...bestMoves.map(m => m.dist));
    bestMoves = bestMoves.filter(m => m.dist === bestDist);

    // Randomize among equally good options
    const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    return { x: chosen.x, y: chosen.y };
  }

  private getForwardMove(unit: Unit): { x: number; y: number } | null {
    const forwardDir = unit.isPlayer ? 1 : -1;
    const moveSpeed = unit.stats.moveSpeed || 1;

    // Try to move forward, but pathfind around obstacles
    const possibleMoves: { x: number; y: number; priority: number; distance: number }[] = [];

    // For moveSpeed > 1, prioritize moving multiple tiles forward
    for (let steps = moveSpeed; steps >= 1; steps--) {
      // Priority: straight forward > sidestep (no diagonals for multi-tile movers)
      const directions = [
        { dx: forwardDir * steps, dy: 0, priority: 0 },   // Forward (best)
      ];

      // Only allow sidestep for single-step moves
      // Multi-tile movers (like lancers) can only move in straight lines
      if (steps === 1) {
        // For units with moveSpeed > 1, only allow cardinal directions (no diagonals)
        if (moveSpeed === 1) {
          directions.push(
            { dx: forwardDir, dy: -1, priority: 1 },  // Forward-up (diagonal)
            { dx: forwardDir, dy: 1, priority: 1 },   // Forward-down (diagonal)
          );
        }
        directions.push(
          { dx: 0, dy: -1, priority: 2 },           // Up (sidestep, cardinal)
          { dx: 0, dy: 1, priority: 2 },            // Down (sidestep, cardinal)
        );
      }

      for (const dir of directions) {
        const newX = unit.gridX + dir.dx;
        const newY = unit.gridY + dir.dy;

        // Check if unit can fit at destination (including terrain)
        if (!canUnitFitAtWithTerrain(unit, newX, newY, this.gridWidth, this.gridHeight, this.units, this.terrainData)) {
          continue;
        }

        // For multi-tile moves, check all tiles in the path
        let pathClear = true;
        const totalSteps = Math.abs(dir.dx) + Math.abs(dir.dy);
        if (totalSteps > 1) {
          const stepDx = dir.dx > 0 ? 1 : dir.dx < 0 ? -1 : 0;
          const stepDy = dir.dy > 0 ? 1 : dir.dy < 0 ? -1 : 0;
          for (let i = 1; i < totalSteps; i++) {
            const checkX = unit.gridX + stepDx * i;
            const checkY = unit.gridY + stepDy * i;
            if (!canUnitFitAtWithTerrain(unit, checkX, checkY, this.gridWidth, this.gridHeight, this.units, this.terrainData)) {
              pathClear = false;
              break;
            }
          }
        }

        if (!pathClear) continue;

        possibleMoves.push({ x: newX, y: newY, priority: dir.priority, distance: steps });
      }
    }

    if (possibleMoves.length === 0) return null;

    // Prefer moving more tiles forward, then by priority
    const maxDist = Math.max(...possibleMoves.map(m => m.distance));
    let bestMoves = possibleMoves.filter(m => m.distance === maxDist);

    const bestPriority = Math.min(...bestMoves.map(m => m.priority));
    bestMoves = bestMoves.filter(m => m.priority === bestPriority);

    // Randomize among equally good options
    const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    return { x: chosen.x, y: chosen.y };
  }

  private resolveMovementCollisions(intendedMoves: Map<Unit, { x: number; y: number }>): void {
    const scaledTileSize = this.tileSize * this.pixelScale;

    // Check if two units would collide at their positions
    const wouldCollide = (unit1: Unit, pos1: { x: number; y: number }, unit2: Unit, pos2: { x: number; y: number }): boolean => {
      const size1 = unit1.stats.size || 1;
      const size2 = unit2.stats.size || 1;
      // Check if any tiles overlap
      for (let i = 0; i < size1; i++) {
        for (let j = 0; j < size2; j++) {
          if (pos1.x + i === pos2.x + j && pos1.y === pos2.y) {
            return true;
          }
        }
      }
      return false;
    };

    // Track which units have successfully moved
    const movedUnits: Set<Unit> = new Set();
    const finalPositions: Map<Unit, { x: number; y: number }> = new Map();

    // First pass: Check each move against stationary units
    for (const [unit, move] of intendedMoves) {
      // Check collision with stationary units (not moving this turn)
      let blocked = false;
      for (const other of this.units) {
        if (other === unit || other.currentHp <= 0 || intendedMoves.has(other)) continue;
        if (wouldCollide(unit, move, other, { x: other.gridX, y: other.gridY })) {
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        finalPositions.set(unit, move);
      }
    }

    // Second pass: Resolve collisions between moving units
    const unitsToMove = Array.from(finalPositions.keys());
    for (let i = 0; i < unitsToMove.length; i++) {
      const unit1 = unitsToMove[i];
      const pos1 = finalPositions.get(unit1)!;

      for (let j = i + 1; j < unitsToMove.length; j++) {
        const unit2 = unitsToMove[j];
        const pos2 = finalPositions.get(unit2)!;

        if (wouldCollide(unit1, pos1, unit2, pos2)) {
          // Collision! Randomly pick a winner
          const loser = Math.random() < 0.5 ? unit1 : unit2;
          finalPositions.delete(loser);
          // Update the list
          const loserIdx = unitsToMove.indexOf(loser);
          if (loserIdx > i) {
            unitsToMove.splice(loserIdx, 1);
            j--; // Adjust index since we removed an element
          }
        }
      }
    }

    // Execute all valid moves
    for (const [unit, move] of finalPositions) {
      this.executeMove(unit, move.x, move.y, scaledTileSize);
      movedUnits.add(unit);
    }

    // Reset state for units that couldn't move due to collision
    for (const [unit] of intendedMoves) {
      if (!movedUnits.has(unit)) {
        unit.state = 'moving';
        unit.setCounter = 0;
        unit.target = null;
      }
    }
  }

  private executeMove(unit: Unit, destX: number, destY: number, scaledTileSize: number): void {
    const dx = destX - unit.gridX;
    const dy = destY - unit.gridY;

    unit.gridX = destX;
    unit.gridY = destY;

    // Lancer charge: moving refreshes charge attack
    if (unit.stats.type === 'lancer') {
      unit.chargeReady = true;
    }

    // Update depth so lower rows render on top
    unit.sprite.setDepth(10 + unit.gridY);

    // Center sprite across all tiles the unit occupies
    const unitSize = unit.stats.size || 1;
    const worldX = this.gridOffsetX + (unit.gridX + unitSize / 2) * scaledTileSize;
    const worldY = this.gridOffsetY + unit.gridY * scaledTileSize + scaledTileSize / 2;

    // Play move animation
    const prefix = getAnimPrefix(unit.stats.type);
    unit.sprite.play(`${prefix}_move_anim`);

    this.tweens.add({
      targets: unit.sprite,
      x: worldX,
      y: worldY,
      duration: 250,
      ease: 'Power2',
      onUpdate: () => this.updateHealthTint(unit),
      onComplete: () => {
        // Return to idle after move
        if (unit.currentHp > 0) {
          unit.sprite.play(`${prefix}_idle_anim`);
        }
      },
    });

    // Face direction of movement
    if (dx > 0) unit.sprite.setFlipX(false);
    else if (dx < 0) unit.sprite.setFlipX(true);
  }

  private findNearestVisibleEnemy(unit: Unit, enemies: Unit[]): Unit | null {
    let nearest: Unit | null = null;
    let minDistance = Infinity;

    for (const enemy of enemies) {
      if (enemy.currentHp <= 0) continue;

      // Check if unit can see this enemy
      if (!this.canSeeEnemy(unit, enemy)) continue;

      // Use unit distance calculation that considers unit sizes
      const distance = getUnitDistance(unit, enemy);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = enemy;
      }
    }

    return nearest;
  }

  private attack(attacker: Unit, defender: Unit): void {
    // Check for lancer charge attack (1.2x base damage)
    let attackerStats = attacker.stats;
    const isChargeAttack = attacker.stats.type === 'lancer' && attacker.chargeReady;
    if (isChargeAttack) {
      // Create modified stats with 1.2x attack for charge
      attackerStats = { ...attacker.stats, attack: Math.round(attacker.stats.attack * 1.2) };
      attacker.chargeReady = false; // Consume the charge
    }

    // Orc Rage: +50% attack when below 50% HP
    const isOrcRage = attacker.stats.type === 'orc' && attacker.currentHp < attacker.stats.hp * 0.5;
    if (isOrcRage) {
      attackerStats = { ...attackerStats, attack: Math.round(attackerStats.attack * 1.5) };
    }

    // Check if this is a ranged or melee attack
    const isRanged = attacker.stats.attackRange > 1;

    // Apply terrain melee attack penalty (water/mud reduces melee attack by 30%)
    if (!isRanged) {
      const meleeAttackPenalty = getTerrainTileMeleeAttackPenalty(
        attacker.gridX, attacker.gridY, this.terrainData
      );
      if (meleeAttackPenalty > 0) {
        attackerStats = {
          ...attackerStats,
          attack: Math.round(attackerStats.attack * (1 - meleeAttackPenalty))
        };
      }
    }

    // Calculate base damage using the stats system
    let { damage, isCrit } = calculateDamage(attackerStats, defender.stats);

    // Check for ranged attacks blocked by terrain
    if (isRanged && !hasProjectilePath(attacker.gridX, attacker.gridY, defender.gridX, defender.gridY, this.terrainData)) {
      // Projectile blocked by terrain - no damage
      damage = 0;
    }

    defender.currentHp = Math.max(0, defender.currentHp - damage);

    // Apply lifesteal
    if (attacker.stats.lifesteal > 0) {
      const healAmount = Math.floor(damage * attacker.stats.lifesteal);
      attacker.currentHp = Math.min(attacker.stats.hp, attacker.currentHp + healAmount);
      this.updateHealthTint(attacker);
    }

    // Calculate direction to defender
    const dx = defender.gridX - attacker.gridX;
    const dy = defender.gridY - attacker.gridY;

    // Determine attack direction and play appropriate animation
    const attackerPrefix = getAnimPrefix(attacker.stats.type);
    let attackAnim = `${attackerPrefix}_attack_anim`;
    let attackAngle = 0;  // Rotation angle for diagonal attacks

    // Lancer never rotates and always uses regular attack animation
    const isLancer = attacker.stats.type === 'lancer';

    if (dx === 0) {
      // Vertical attack (same column)
      if (dy > 0) {
        // Attacking DOWN - use down animation if available (but not for lancer)
        if (!isLancer) {
          const downAnim = `${attackerPrefix}_attack_down_anim`;
          if (this.anims.exists(downAnim)) {
            attackAnim = downAnim;
          }
          // Rotate sprite to point sword swing downward
          attackAngle = 25;
          attacker.sprite.setAngle(attackAngle);
        }
      } else {
        // Attacking UP - use up animation if available (but not for lancer)
        if (!isLancer) {
          const upAnim = `${attackerPrefix}_attack_up_anim`;
          if (this.anims.exists(upAnim)) {
            attackAnim = upAnim;
          }
          // Rotate sprite to point sword swing upward
          attackAngle = -25;
          attacker.sprite.setAngle(attackAngle);
        }
      }
    } else {
      // Horizontal or diagonal - use flipX
      if (dx > 0) attacker.sprite.setFlipX(false);
      else attacker.sprite.setFlipX(true);

      // For diagonal attacks, rotate sprite slightly to face target
      if (dy !== 0) {
        // Calculate angle to target (in degrees)
        const angleRad = Math.atan2(dy, Math.abs(dx));
        attackAngle = angleRad * (180 / Math.PI);
        // Lancer uses smaller rotation, others use more
        const maxAngle = isLancer ? 25 : 45;
        attackAngle = Math.max(-maxAngle, Math.min(maxAngle, attackAngle));
        // When sprite is flipped, invert the angle so it points correctly
        if (dx < 0) {
          attackAngle = -attackAngle;
        }
        attacker.sprite.setAngle(attackAngle);
      }
    }

    // Play attack animation
    attacker.sprite.play(attackAnim);
    attacker.sprite.once('animationcomplete', () => {
      if (attacker.currentHp > 0) {
        attacker.sprite.play(`${attackerPrefix}_idle_anim`);
        // Reset rotation after attack
        attacker.sprite.setAngle(0);
      }
    });

    // For ranged attacks, spawn a projectile (isRanged already declared above)
    const defenderPrefix = getAnimPrefix(defender.stats.type);

    if (isRanged && attacker.stats.type === 'archer') {
      // Spawn arrow projectile at end of animation when bow releases (9 frames at 12fps = 750ms)
      this.time.delayedCall(750, () => {
        this.spawnProjectile(attacker, defender, 'arrow', damage, isCrit, defenderPrefix);
      });
    } else {
      // Melee attack - use fixed delay
      const hitDelay = 300;
      this.applyDamageEffects(defender, damage, isCrit, defenderPrefix, hitDelay);
    }
  }

  /** Spawn a projectile that flies from attacker to defender */
  private spawnProjectile(
    attacker: Unit,
    defender: Unit,
    projectileKey: string,
    damage: number,
    isCrit: boolean,
    defenderPrefix: string
  ): void {
    // Calculate angle to target
    const dx = defender.sprite.x - attacker.sprite.x;
    const dy = defender.sprite.y - attacker.sprite.y;
    const angle = Math.atan2(dy, dx);
    const angleDeg = angle * (180 / Math.PI);

    // Offset arrow spawn point to come from the bow (in front of archer)
    const bowOffset = 20; // pixels in front of archer where bow is held
    const bowHeightOffset = -19; // arrow height relative to sprite anchor
    const offsetX = Math.cos(angle) * bowOffset;
    const offsetY = Math.sin(angle) * bowOffset + bowHeightOffset;

    // Create projectile at bow position
    const projectile = this.add.image(
      attacker.sprite.x + offsetX,
      attacker.sprite.y + offsetY,
      projectileKey
    );
    projectile.setScale(1.0); // Scale the arrow
    projectile.setDepth(15); // Above units
    projectile.setAngle(angleDeg);

    // Calculate flight time based on distance
    const distance = Math.sqrt(dx * dx + dy * dy);
    const flightTime = Math.max(200, distance * 1.5); // Min 200ms, scales with distance

    // Animate projectile flying to target
    this.tweens.add({
      targets: projectile,
      x: defender.sprite.x,
      y: defender.sprite.y,
      duration: flightTime,
      ease: 'Linear',
      onComplete: () => {
        projectile.destroy();
        // Apply damage when projectile arrives
        this.applyDamageEffects(defender, damage, isCrit, defenderPrefix, 0);
      },
    });
  }

  /** Apply damage effects (hurt anim, flash, damage number, death check) */
  private applyDamageEffects(
    defender: Unit,
    damage: number,
    isCrit: boolean,
    defenderPrefix: string,
    delay: number
  ): void {
    const applyEffects = () => {
      // Play hurt animation on defender (but don't interrupt attack animations)
      const currentAnim = defender.sprite.anims.currentAnim?.key || '';
      const isDefenderAttacking = currentAnim.includes('_attack');

      if (defender.currentHp > 0 && !isDefenderAttacking) {
        defender.sprite.play(`${defenderPrefix}_hurt_anim`);
        defender.sprite.once('animationcomplete', () => {
          if (defender.currentHp > 0) {
            defender.sprite.play(`${defenderPrefix}_idle_anim`);
          }
        });
      }

      // Damage flash (then restore health-based tint)
      defender.sprite.setTint(isCrit ? 0xffff00 : 0xff0000);
      this.time.delayedCall(120, () => {
        if (defender.currentHp > 0) {
          this.updateHealthTint(defender);
        }
      });

      // Show damage number
      const damageColor = isCrit ? '#ffff00' : '#ff0000';
      const damageText = this.add.text(
        defender.sprite.x,
        defender.sprite.y - 20,
        isCrit ? `CRIT! -${damage}` : `-${damage}`,
        {
          fontSize: isCrit ? '18px' : '14px',
          color: damageColor,
          fontFamily: 'monospace',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 2,
        }
      ).setOrigin(0.5);

      this.tweens.add({
        targets: damageText,
        y: damageText.y - 30,
        alpha: 0,
        duration: 800,
        onComplete: () => damageText.destroy(),
      });

      // Update health tint
      this.updateHealthTint(defender);

      // Check for death
      if (defender.currentHp <= 0) {
        // Play death animation
        defender.sprite.play(`${defenderPrefix}_death_anim`);
        defender.sprite.setDepth(1); // Dead units below living
        defender.sprite.setTint(0x666666); // Gray tint for dead units
      }
    };

    if (delay > 0) {
      this.time.delayedCall(delay, applyEffects);
    } else {
      applyEffects();
    }
  }

  private endCombat(message: string, color: string): void {
    this.combatStarted = false;

    // Display result
    const text = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      message,
      {
        fontSize: '48px',
        color: color,
        fontFamily: 'monospace',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }
    ).setOrigin(0.5);

    // Show turn count
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 50,
      `Turns: ${this.turnNumber}`,
      {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }
    ).setOrigin(0.5);

    // Pulse animation
    this.tweens.add({
      targets: text,
      scale: { from: 0.5, to: 1.1 },
      duration: 400,
      yoyo: true,
      repeat: 2,
    });

    // Restart option
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 80,
      'Press SPACE to restart',
      {
        fontSize: '16px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      }
    ).setOrigin(0.5);

    this.input.keyboard?.once('keydown-SPACE', () => {
      this.scene.restart();
    });
  }
}
