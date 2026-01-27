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
import {
  getOccupiedTiles,
  isTileOccupied,
  canUnitFitAt,
  getUnitWorldX,
  getUnitWorldY,
  getUnitDistance,
  GridUnit,
} from '../utils/GridUtils';
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

  constructor() {
    super({ key: 'CombatScene' });
  }

  init(): void {
    // Reset all state on scene start/restart
    this.units = [];
    this.fogState = [];
    this.combatStarted = false;
    this.turnNumber = 0;

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

    // Create the battlefield grid
    this.createBattlefield();

    // Create fog of war overlay (rendered on top)
    this.fogGraphics = this.add.graphics();
    this.fogGraphics.setDepth(100);

    // Create animations via AnimationSystem
    createUnitAnimations(this);

    // Spawn units
    this.spawnUnits();

    // Initial fog update based on unit positions
    this.updateFogOfWar();

    // Start auto-combat after a short delay
    this.time.delayedCall(2000, () => {
      this.combatStarted = true;
      this.runCombatLoop();
    });

    // Add title text
    this.add.text(this.cameras.main.width / 2, 20, 'AUTOBATTLER TEST', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Log stats to console
    console.log(formatStats(SKELETON_WARRIOR));
    console.log(formatStats(SKELETON_GUARD));
  }

  private createBattlefield(): void {
    const scaledTileSize = this.tileSize * this.pixelScale;
    const graphics = this.add.graphics();

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const worldX = this.gridOffsetX + x * scaledTileSize;
        const worldY = this.gridOffsetY + y * scaledTileSize;

        // Draw floor tile
        graphics.fillStyle(0x3d2845, 1);
        graphics.fillRect(worldX, worldY, scaledTileSize, scaledTileSize);

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
            // Fully visible
            this.fogState[y][x] = 1;
          } else if (distance <= vision + 1.5) {
            // Partial visibility at edge (gradient)
            const edgeFactor = 1 - (distance - vision) / 1.5;
            this.fogState[y][x] = Math.max(this.fogState[y][x], edgeFactor);
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
    return distance <= viewer.stats.vision + 1.5; // Include partial vision range
  }

  private spawnUnits(): void {
    const scaledTileSize = this.tileSize * this.pixelScale;
    const occupiedTiles = new Set<string>();

    const getRandomPosition = (minX: number, maxX: number): { x: number; y: number } => {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = minX + Math.floor(Math.random() * (maxX - minX));
        y = Math.floor(Math.random() * this.gridHeight);
        attempts++;
      } while (occupiedTiles.has(`${x},${y}`) && attempts < 100);
      occupiedTiles.add(`${x},${y}`);
      return { x, y };
    };

    // TEST: All units battle
    const playerUnitTypes = [SKELETON_WARRIOR, SKELETON_GUARD, ORC, SOLDIER, VAMPIRE, ARCHER, AXEMAN, KNIGHT, LANCER];
    const testPositions = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 0, y: 3 },
      { x: 0, y: 4 },
      { x: 0, y: 5 },
      { x: 0, y: 6 },
      { x: 0, y: 7 },
      { x: 0, y: 8 },
    ];
    for (let i = 0; i < playerUnitTypes.length; i++) {
      const unitStats = playerUnitTypes[i];
      const pos = testPositions[i];
      const unitSize = unitStats.size || 1;
      // Mark all tiles occupied by this unit
      for (let s = 0; s < unitSize; s++) {
        occupiedTiles.add(`${pos.x + s},${pos.y}`);
      }
      const animPrefix = unitStats.type;
      const spriteScale = getSpriteConfig(unitStats.type).scale;
      const originY = getSpriteConfig(unitStats.type).originY;

      // Center sprite across all tiles the unit occupies
      const spriteX = this.gridOffsetX + (pos.x + unitSize / 2) * scaledTileSize;
      const spriteY = this.gridOffsetY + pos.y * scaledTileSize + scaledTileSize / 2;

      const sprite = this.add.sprite(spriteX, spriteY, `${animPrefix}_idle`);
      sprite.setOrigin(0.5, originY);
      sprite.setScale(spriteScale);
      sprite.setDepth(10 + pos.y); // Lower rows render on top
      sprite.play(`${animPrefix}_idle_anim`);

      const unit: Unit = {
        id: `player${i + 1}`,
        sprite,
        stats: unitStats,
        currentHp: unitStats.hp,
        gridX: pos.x,
        gridY: pos.y,
        isPlayer: true,
        state: 'moving',
        setCounter: 0,
        target: null,
        chargeReady: true, // Lancers start with charge ready
      };
      this.units.push(unit);
      this.updateHealthTint(unit);
    }

    // TEST: All units battle - enemy side
    const enemyUnitTypes = [SKELETON_WARRIOR, SKELETON_GUARD, ORC, SOLDIER, VAMPIRE, ARCHER, AXEMAN, KNIGHT, LANCER];
    const enemyTestPositions = [
      { x: 15, y: 0 },
      { x: 15, y: 1 },
      { x: 15, y: 2 },
      { x: 15, y: 3 },
      { x: 15, y: 4 },
      { x: 15, y: 5 },
      { x: 15, y: 6 },
      { x: 15, y: 7 },
      { x: 14, y: 8 },  // Lancer is size 2, so x=14 occupies 14-15
    ];
    for (let i = 0; i < enemyUnitTypes.length; i++) {
      const unitStats = enemyUnitTypes[i];
      const pos = enemyTestPositions[i];
      const unitSize = unitStats.size || 1;
      // Mark all tiles occupied by this unit
      for (let s = 0; s < unitSize; s++) {
        occupiedTiles.add(`${pos.x + s},${pos.y}`);
      }
      const animPrefix = unitStats.type;
      const spriteScale = getSpriteConfig(unitStats.type).scale;
      const originY = getSpriteConfig(unitStats.type).originY;

      // Center sprite across all tiles the unit occupies
      const spriteX = this.gridOffsetX + (pos.x + unitSize / 2) * scaledTileSize;
      const spriteY = this.gridOffsetY + pos.y * scaledTileSize + scaledTileSize / 2;

      const sprite = this.add.sprite(spriteX, spriteY, `${animPrefix}_idle`);
      sprite.setOrigin(0.5, originY);
      sprite.setScale(spriteScale);
      sprite.setDepth(10 + pos.y); // Lower rows render on top
      sprite.setFlipX(true);
      sprite.play(`${animPrefix}_idle_anim`);

      const unit: Unit = {
        id: `enemy${i + 1}`,
        sprite,
        stats: unitStats,
        currentHp: unitStats.hp,
        gridX: pos.x,
        gridY: pos.y,
        isPlayer: false,
        state: 'moving',
        setCounter: 0,
        target: null,
        chargeReady: true, // Lancers start with charge ready
      };
      this.units.push(unit);
      this.updateHealthTint(unit);
    }
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
      return Math.max(dx, dy);
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

        // Check if unit can fit at new position (bounds + collision with size)
        if (!canUnitFitAt(unit, newX, newY, this.gridWidth, this.gridHeight, this.units)) {
          break; // Can't go further in this direction
        }

        // Also check that we don't pass through any units along the path
        let pathClear = true;
        for (let i = 1; i < steps; i++) {
          const checkX = unit.gridX + dir.dx * i;
          const checkY = unit.gridY + dir.dy * i;
          if (!canUnitFitAt(unit, checkX, checkY, this.gridWidth, this.gridHeight, this.units)) {
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

        // Check if unit can fit at destination
        if (!canUnitFitAt(unit, newX, newY, this.gridWidth, this.gridHeight, this.units)) {
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
            if (!canUnitFitAt(unit, checkX, checkY, this.gridWidth, this.gridHeight, this.units)) {
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

    // Calculate damage using the stats system
    const { damage, isCrit } = calculateDamage(attackerStats, defender.stats);

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

    // For ranged attacks, spawn a projectile
    const isRanged = attacker.stats.attackRange > 1;
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
