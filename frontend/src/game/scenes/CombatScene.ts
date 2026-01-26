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
  calculateDamage,
  formatStats,
  isInVision,
} from '../data/UnitStats';

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

    // Load skeleton1 sprite sheets (32x32 frames)
    this.load.spritesheet('skeleton1_idle', 'assets/units/enemies-skeleton1_idle.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('skeleton1_attack', 'assets/units/enemies-skeleton1_attack.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('skeleton1_death', 'assets/units/enemies-skeleton1_death.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('skeleton1_move', 'assets/units/enemies-skeleton1_movement.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('skeleton1_hurt', 'assets/units/enemies-skeleton1_take_damage.png', { frameWidth: 32, frameHeight: 32 });

    // Load skeleton2 sprite sheets (32x32 frames)
    this.load.spritesheet('skeleton2_idle', 'assets/units/enemies-skeleton2_idle.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('skeleton2_attack', 'assets/units/enemies-skeleton2_attack.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('skeleton2_death', 'assets/units/enemies-skeleton2_death.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('skeleton2_move', 'assets/units/enemies-skeleton2_movemen.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('skeleton2_hurt', 'assets/units/enemies-skeleton2_take_damage.png', { frameWidth: 32, frameHeight: 32 });

    // Load orc sprite sheets (100x100 frames)
    this.load.spritesheet('orc_idle', 'assets/units/orc_idle.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('orc_attack', 'assets/units/orc_attack.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('orc_attack_down', 'assets/units/orc_attack_down.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('orc_attack_up', 'assets/units/orc_attack_up.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('orc_death', 'assets/units/orc_death.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('orc_move', 'assets/units/orc_move.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('orc_hurt', 'assets/units/orc_hurt.png', { frameWidth: 100, frameHeight: 100 });

    // Load soldier sprite sheets (100x100 frames)
    this.load.spritesheet('soldier_idle', 'assets/units/soldier_idle.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('soldier_attack', 'assets/units/soldier_attack.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('soldier_attack_down', 'assets/units/soldier_attack_down.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('soldier_attack_up', 'assets/units/soldier_attack_up.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('soldier_death', 'assets/units/soldier_death.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('soldier_move', 'assets/units/soldier_move.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('soldier_hurt', 'assets/units/soldier_hurt.png', { frameWidth: 100, frameHeight: 100 });

    // Load vampire sprite sheets (32x32 frames)
    this.load.spritesheet('vampire_idle', 'assets/units/vampire_idle.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('vampire_attack', 'assets/units/vampire_attack.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('vampire_death', 'assets/units/vampire_death.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('vampire_move', 'assets/units/vampire_move.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('vampire_hurt', 'assets/units/vampire_hurt.png', { frameWidth: 32, frameHeight: 32 });
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

    // Create animations
    this.createAnimations();

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

  private createAnimations(): void {
    // Skeleton1 animations (32x32 frames)
    // idle: 192/32 = 6, attack: 288/32 = 9, death: 544/32 = 17, move: 320/32 = 10, hurt: 160/32 = 5
    this.anims.create({
      key: 'skeleton1_idle_anim',
      frames: this.anims.generateFrameNumbers('skeleton1_idle', { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: 'skeleton1_attack_anim',
      frames: this.anims.generateFrameNumbers('skeleton1_attack', { start: 0, end: 8 }),
      frameRate: 12,
      repeat: 0,
    });
    this.anims.create({
      key: 'skeleton1_death_anim',
      frames: this.anims.generateFrameNumbers('skeleton1_death', { start: 0, end: 16 }),
      frameRate: 12,
      repeat: 0,
    });
    this.anims.create({
      key: 'skeleton1_move_anim',
      frames: this.anims.generateFrameNumbers('skeleton1_move', { start: 0, end: 9 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'skeleton1_hurt_anim',
      frames: this.anims.generateFrameNumbers('skeleton1_hurt', { start: 0, end: 4 }),
      frameRate: 10,
      repeat: 0,
    });

    // Skeleton2 animations (32x32 frames)
    // idle: 192/32 = 6, attack: 480/32 = 15, death: 480/32 = 15, move: 320/32 = 10, hurt: 160/32 = 5
    this.anims.create({
      key: 'skeleton2_idle_anim',
      frames: this.anims.generateFrameNumbers('skeleton2_idle', { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: 'skeleton2_attack_anim',
      frames: this.anims.generateFrameNumbers('skeleton2_attack', { start: 0, end: 14 }),
      frameRate: 12,
      repeat: 0,
    });
    this.anims.create({
      key: 'skeleton2_death_anim',
      frames: this.anims.generateFrameNumbers('skeleton2_death', { start: 0, end: 14 }),
      frameRate: 12,
      repeat: 0,
    });
    this.anims.create({
      key: 'skeleton2_move_anim',
      frames: this.anims.generateFrameNumbers('skeleton2_move', { start: 0, end: 9 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'skeleton2_hurt_anim',
      frames: this.anims.generateFrameNumbers('skeleton2_hurt', { start: 0, end: 4 }),
      frameRate: 10,
      repeat: 0,
    });

    // Orc animations (100x100 frames)
    // idle: 600/100 = 6, attack: 600/100 = 6, death: 400/100 = 4, move: 800/100 = 8, hurt: 400/100 = 4
    this.anims.create({
      key: 'orc_idle_anim',
      frames: this.anims.generateFrameNumbers('orc_idle', { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: 'orc_attack_anim',
      frames: this.anims.generateFrameNumbers('orc_attack', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: 'orc_attack_down_anim',
      frames: this.anims.generateFrameNumbers('orc_attack_down', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: 'orc_attack_up_anim',
      frames: this.anims.generateFrameNumbers('orc_attack_up', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: 'orc_death_anim',
      frames: this.anims.generateFrameNumbers('orc_death', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: 'orc_move_anim',
      frames: this.anims.generateFrameNumbers('orc_move', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'orc_hurt_anim',
      frames: this.anims.generateFrameNumbers('orc_hurt', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: 0,
    });

    // Soldier animations (100x100 frames)
    // idle: 600/100 = 6, attack: 600/100 = 6, death: 400/100 = 4, move: 800/100 = 8, hurt: 400/100 = 4
    this.anims.create({
      key: 'soldier_idle_anim',
      frames: this.anims.generateFrameNumbers('soldier_idle', { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: 'soldier_attack_anim',
      frames: this.anims.generateFrameNumbers('soldier_attack', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: 'soldier_attack_down_anim',
      frames: this.anims.generateFrameNumbers('soldier_attack_down', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: 'soldier_attack_up_anim',
      frames: this.anims.generateFrameNumbers('soldier_attack_up', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: 'soldier_death_anim',
      frames: this.anims.generateFrameNumbers('soldier_death', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: 'soldier_move_anim',
      frames: this.anims.generateFrameNumbers('soldier_move', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'soldier_hurt_anim',
      frames: this.anims.generateFrameNumbers('soldier_hurt', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: 0,
    });

    // Vampire animations (32x32 frames)
    // idle: 192/32 = 6, attack: 512/32 = 16, death: 448/32 = 14, move: 256/32 = 8, hurt: 160/32 = 5
    this.anims.create({
      key: 'vampire_idle_anim',
      frames: this.anims.generateFrameNumbers('vampire_idle', { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: 'vampire_attack_anim',
      frames: this.anims.generateFrameNumbers('vampire_attack', { start: 0, end: 15 }),
      frameRate: 16,
      repeat: 0,
    });
    this.anims.create({
      key: 'vampire_death_anim',
      frames: this.anims.generateFrameNumbers('vampire_death', { start: 0, end: 13 }),
      frameRate: 12,
      repeat: 0,
    });
    this.anims.create({
      key: 'vampire_move_anim',
      frames: this.anims.generateFrameNumbers('vampire_move', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'vampire_hurt_anim',
      frames: this.anims.generateFrameNumbers('vampire_hurt', { start: 0, end: 4 }),
      frameRate: 10,
      repeat: 0,
    });
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

    // TEST: Soldier vs Orc vertical at (0,3) and (0,0)
    const playerUnitTypes = [SOLDIER];
    const testPositions = [
      { x: 0, y: 3 },  // Soldier at bottom
    ];
    for (let i = 0; i < playerUnitTypes.length; i++) {
      const unitStats = playerUnitTypes[i];
      const pos = testPositions[i];
      occupiedTiles.add(`${pos.x},${pos.y}`);
      const animPrefix = unitStats.type;
      const spriteScale = this.getSpriteScale(unitStats.type);
      const originY = this.getSpriteOriginY(unitStats.type);

      const sprite = this.add.sprite(
        this.gridOffsetX + pos.x * scaledTileSize + scaledTileSize / 2,
        this.gridOffsetY + pos.y * scaledTileSize + scaledTileSize / 2,
        `${animPrefix}_idle`
      );
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
      };
      this.units.push(unit);
      this.updateHealthTint(unit);
    }

    // TEST: Orc above Soldier
    const enemyUnitTypes = [ORC];
    const enemyTestPositions = [
      { x: 0, y: 0 },  // Orc at (0,0) above Soldier at (0,3)
    ];
    for (let i = 0; i < enemyUnitTypes.length; i++) {
      const unitStats = enemyUnitTypes[i];
      const pos = enemyTestPositions[i] || getRandomPosition(10, 15);
      occupiedTiles.add(`${pos.x},${pos.y}`);
      const animPrefix = unitStats.type;
      const spriteScale = this.getSpriteScale(unitStats.type);
      const originY = this.getSpriteOriginY(unitStats.type);

      const sprite = this.add.sprite(
        this.gridOffsetX + pos.x * scaledTileSize + scaledTileSize / 2,
        this.gridOffsetY + pos.y * scaledTileSize + scaledTileSize / 2,
        `${animPrefix}_idle`
      );
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
        // In attacking state - queue attack if target still in range
        if (unit.target && unit.target.currentHp > 0) {
          const distance = Math.max(Math.abs(unit.gridX - unit.target.gridX), Math.abs(unit.gridY - unit.target.gridY));
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
          const distance = Math.max(Math.abs(unit.gridX - visibleTarget.gridX), Math.abs(unit.gridY - visibleTarget.gridY));

          if (distance <= unit.stats.attackRange) {
            unit.state = 'setting';
            unit.setCounter = 0;
            unit.target = visibleTarget;
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

    // Update fog of war after all movements
    this.updateFogOfWar();

    // Schedule next combat tick
    this.time.delayedCall(this.combatSpeed, () => this.runCombatLoop());
  }

  private getIntendedMove(unit: Unit, target: Unit): { x: number; y: number } | null {
    const currentDist = Math.max(Math.abs(unit.gridX - target.gridX), Math.abs(unit.gridY - target.gridY));

    // Get all possible moves (4 cardinal directions)
    const possibleMoves: { x: number; y: number; dist: number }[] = [];
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    for (const dir of directions) {
      const newX = unit.gridX + dir.dx;
      const newY = unit.gridY + dir.dy;

      // Check bounds
      if (newX < 0 || newX >= this.gridWidth || newY < 0 || newY >= this.gridHeight) {
        continue;
      }

      // Check if tile is occupied by another unit
      const occupied = this.units.some(
        u => u !== unit && u.currentHp > 0 && u.gridX === newX && u.gridY === newY
      );
      if (occupied) continue;

      // Calculate distance to target from this new position
      const newDist = Math.max(Math.abs(newX - target.gridX), Math.abs(newY - target.gridY));
      possibleMoves.push({ x: newX, y: newY, dist: newDist });
    }

    if (possibleMoves.length === 0) return null;

    // Find the minimum distance among possible moves
    const minDist = Math.min(...possibleMoves.map(m => m.dist));

    // Filter to only moves that make progress (or at least don't go backwards)
    let bestMoves = possibleMoves.filter(m => m.dist < currentDist);

    // If no progress moves available, try moves that maintain distance
    if (bestMoves.length === 0) {
      bestMoves = possibleMoves.filter(m => m.dist === currentDist);
    }

    // If still nothing, take any available move
    if (bestMoves.length === 0) {
      bestMoves = possibleMoves;
    }

    // Randomize among equally good options
    const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    return { x: chosen.x, y: chosen.y };
  }

  private getForwardMove(unit: Unit): { x: number; y: number } | null {
    const forwardDir = unit.isPlayer ? 1 : -1;

    // Try to move forward, but pathfind around obstacles
    const possibleMoves: { x: number; y: number; priority: number }[] = [];
    const directions = [
      { dx: forwardDir, dy: 0, priority: 0 },   // Forward (best)
      { dx: forwardDir, dy: -1, priority: 1 },  // Forward-up
      { dx: forwardDir, dy: 1, priority: 1 },   // Forward-down
      { dx: 0, dy: -1, priority: 2 },           // Up (sidestep)
      { dx: 0, dy: 1, priority: 2 },            // Down (sidestep)
    ];

    for (const dir of directions) {
      const newX = unit.gridX + dir.dx;
      const newY = unit.gridY + dir.dy;

      // Check bounds
      if (newX < 0 || newX >= this.gridWidth || newY < 0 || newY >= this.gridHeight) {
        continue;
      }

      // Check if tile is occupied
      const occupied = this.units.some(
        u => u !== unit && u.currentHp > 0 && u.gridX === newX && u.gridY === newY
      );
      if (occupied) continue;

      possibleMoves.push({ x: newX, y: newY, priority: dir.priority });
    }

    if (possibleMoves.length === 0) return null;

    // Find best priority
    const bestPriority = Math.min(...possibleMoves.map(m => m.priority));
    const bestMoves = possibleMoves.filter(m => m.priority === bestPriority);

    // Randomize among equally good options
    const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    return { x: chosen.x, y: chosen.y };
  }

  private resolveMovementCollisions(intendedMoves: Map<Unit, { x: number; y: number }>): void {
    const scaledTileSize = this.tileSize * this.pixelScale;

    // Group moves by destination
    const movesByDest: Map<string, Unit[]> = new Map();
    for (const [unit, move] of intendedMoves) {
      const key = `${move.x},${move.y}`;
      if (!movesByDest.has(key)) movesByDest.set(key, []);
      movesByDest.get(key)!.push(unit);
    }

    // Process each destination
    for (const [destKey, units] of movesByDest) {
      const [destX, destY] = destKey.split(',').map(Number);

      // Check if destination is already occupied by a non-moving unit
      const occupiedByStationary = this.units.some(
        u => u.currentHp > 0 && u.gridX === destX && u.gridY === destY && !intendedMoves.has(u)
      );

      if (occupiedByStationary) {
        // Can't move there, none of these units move
        continue;
      }

      if (units.length === 1) {
        // Single unit moving to this spot - execute move
        const unit = units[0];
        this.executeMove(unit, destX, destY, scaledTileSize);
      } else {
        // Multiple units want same spot - randomize winner, neither enters attack mode
        const winner = units[Math.floor(Math.random() * units.length)];
        this.executeMove(winner, destX, destY, scaledTileSize);

        // Losers stay in moving state (reset any setting progress)
        for (const loser of units) {
          if (loser !== winner) {
            loser.state = 'moving';
            loser.setCounter = 0;
            loser.target = null;
          }
        }
      }
    }
  }

  private executeMove(unit: Unit, destX: number, destY: number, scaledTileSize: number): void {
    const dx = destX - unit.gridX;
    const dy = destY - unit.gridY;

    unit.gridX = destX;
    unit.gridY = destY;

    // Update depth so lower rows render on top
    unit.sprite.setDepth(10 + unit.gridY);

    const worldX = this.gridOffsetX + unit.gridX * scaledTileSize + scaledTileSize / 2;
    const worldY = this.gridOffsetY + unit.gridY * scaledTileSize + scaledTileSize / 2;

    // Play move animation
    const prefix = this.getAnimPrefix(unit);
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

      // Chebyshev distance - diagonals count as 1
      const distance = Math.max(Math.abs(unit.gridX - enemy.gridX), Math.abs(unit.gridY - enemy.gridY));
      if (distance < minDistance) {
        minDistance = distance;
        nearest = enemy;
      }
    }

    return nearest;
  }

  private getAnimPrefix(unit: Unit): string {
    switch (unit.stats.type) {
      case 'skeleton1': return 'skeleton1';
      case 'skeleton2': return 'skeleton2';
      case 'orc': return 'orc';
      case 'soldier': return 'soldier';
      case 'vampire': return 'vampire';
      default: return 'skeleton1';
    }
  }

  private getSpriteScale(unitType: string): number {
    // Different sprites have different base sizes AND different character sizes within frames
    // Target: all characters appear roughly the same size on screen (~64px)
    switch (unitType) {
      case 'orc':
        return 1.92; // 100x100 frame, reduced 20%
      case 'soldier':
        return 2.0; // 100x100 frame, reduced 20%
      default:
        return this.pixelScale; // 32x32 * 2 = 64x64 for skeleton/vampire
    }
  }

  private getSpriteFrameSize(unitType: string): number {
    // Returns the base frame size before scaling
    switch (unitType) {
      case 'orc':
      case 'soldier':
        return 100;
      default:
        return 32;
    }
  }

  private getSpriteYOffset(unitType: string): number {
    // Vertical adjustment - not needed with proper origin
    return 0;
  }

  private getSpriteOriginY(unitType: string): number {
    // Y origin based on where character's feet are in sprite frame
    // Value = feet position / frame height
    switch (unitType) {
      case 'orc':
        return 0.56; // Orc feet at y=56 in 100x100 frame
      case 'soldier':
        return 0.56; // Soldier feet at y=56 in 100x100 frame
      default:
        return 0.7; // Skeleton/vampire - character fills 32x32 frame
    }
  }

  private attack(attacker: Unit, defender: Unit): void {
    // Calculate damage using the stats system
    const { damage, isCrit } = calculateDamage(attacker.stats, defender.stats);

    defender.currentHp = Math.max(0, defender.currentHp - damage);

    // Calculate direction to defender
    const dx = defender.gridX - attacker.gridX;
    const dy = defender.gridY - attacker.gridY;

    // Determine attack direction and play appropriate animation
    const attackerPrefix = this.getAnimPrefix(attacker);
    let attackAnim = `${attackerPrefix}_attack_anim`;

    if (dx === 0) {
      // Vertical attack (same column)
      if (dy > 0) {
        // Attacking DOWN - use down animation if available
        const downAnim = `${attackerPrefix}_attack_down_anim`;
        if (this.anims.exists(downAnim)) {
          attackAnim = downAnim;
        }
      } else {
        // Attacking UP - use up animation if available
        const upAnim = `${attackerPrefix}_attack_up_anim`;
        if (this.anims.exists(upAnim)) {
          attackAnim = upAnim;
        }
      }
    } else {
      // Horizontal or diagonal - use flipX
      if (dx > 0) attacker.sprite.setFlipX(false);
      else attacker.sprite.setFlipX(true);
    }

    // Play attack animation
    attacker.sprite.play(attackAnim);
    attacker.sprite.once('animationcomplete', () => {
      if (attacker.currentHp > 0) {
        attacker.sprite.play(`${attackerPrefix}_idle_anim`);
      }
    });

    // Play hurt animation on defender (but don't interrupt attack animations)
    const defenderPrefix = this.getAnimPrefix(defender);
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

    // Update health bar
    this.updateHealthTint(defender);

    // Check for death
    if (defender.currentHp <= 0) {
      // Play death animation
      defender.sprite.play(`${defenderPrefix}_death_anim`);
      defender.sprite.setDepth(1); // Dead units below living
      defender.sprite.setTint(0x666666); // Gray tint for dead units
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
