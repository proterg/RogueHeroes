/**
 * Hero Entity
 * -----------
 * Represents the player's hero on the overworld map.
 * Handles sprite rendering, animations, and movement.
 *
 * Usage:
 *   const hero = new Hero(scene, startTileX, startTileY, tileSize);
 *   hero.moveTo(targetX, targetY, onComplete);
 */

import Phaser from 'phaser';
import { getDirectionFromDelta } from '../utils/Pathfinding';

/** Hero configuration */
export interface HeroConfig {
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameRate: number;
  scale: number;
  moveDuration: number;  // ms per tile
}

const DEFAULT_CONFIG: HeroConfig = {
  frameWidth: 96,
  frameHeight: 68,
  frameCount: 8,
  frameRate: 10,
  scale: 0.5,
  moveDuration: 150,
};

/** All 8 movement directions */
const DIRECTIONS = [
  'south', 'south_east', 'east', 'north_east',
  'north', 'north_west', 'west', 'south_west'
] as const;

export type Direction = typeof DIRECTIONS[number];

/**
 * Hero entity for overworld exploration
 */
export class Hero {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Sprite;
  private config: HeroConfig;
  private tileSize: number;

  // Current position in tiles
  private _tileX: number;
  private _tileY: number;

  // Current facing direction
  private _direction: Direction = 'south';

  // Movement state
  private _isMoving = false;

  constructor(
    scene: Phaser.Scene,
    tileX: number,
    tileY: number,
    tileSize: number,
    config: Partial<HeroConfig> = {}
  ) {
    this.scene = scene;
    this._tileX = tileX;
    this._tileY = tileY;
    this.tileSize = tileSize;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Create animations
    this.createAnimations();

    // Create sprite
    const worldPos = this.tileToWorld(tileX, tileY);
    this.sprite = scene.add.sprite(worldPos.x, worldPos.y, 'hero_south', 0);
    this.sprite.setDepth(10);
    this.sprite.setOrigin(0.5, 1.0);  // Bottom-center anchor for stable feet
    this.sprite.setScale(this.config.scale);
  }

  /**
   * Preload hero assets (call in scene.preload)
   */
  static preload(scene: Phaser.Scene, config: Partial<HeroConfig> = {}): void {
    const frameConfig = {
      frameWidth: config.frameWidth ?? DEFAULT_CONFIG.frameWidth,
      frameHeight: config.frameHeight ?? DEFAULT_CONFIG.frameHeight,
    };

    for (const dir of DIRECTIONS) {
      scene.load.spritesheet(
        `hero_${dir}`,
        `assets/units/hero/hero_${dir}.png`,
        frameConfig
      );
    }
  }

  /**
   * Create walk and idle animations for all directions
   */
  private createAnimations(): void {
    const { frameCount, frameRate } = this.config;

    for (const dir of DIRECTIONS) {
      // Walking animation
      this.scene.anims.create({
        key: `hero_walk_${dir}`,
        frames: this.scene.anims.generateFrameNumbers(`hero_${dir}`, {
          start: 0,
          end: frameCount - 1,
        }),
        frameRate,
        repeat: -1,
      });

      // Idle animation (just first frame)
      this.scene.anims.create({
        key: `hero_idle_${dir}`,
        frames: [{ key: `hero_${dir}`, frame: 0 }],
        frameRate: 1,
      });
    }
  }

  /**
   * Convert tile position to world position
   * Returns bottom-center of tile for proper sprite anchoring
   */
  private tileToWorld(tileX: number, tileY: number): { x: number; y: number } {
    return {
      x: tileX * this.tileSize + this.tileSize / 2,
      y: tileY * this.tileSize + this.tileSize,
    };
  }

  /**
   * Move to an adjacent tile
   * @param targetTileX - Target tile X
   * @param targetTileY - Target tile Y
   * @param onComplete - Callback when movement completes
   */
  moveTo(targetTileX: number, targetTileY: number, onComplete?: () => void): void {
    if (this._isMoving) return;

    this._isMoving = true;

    // Calculate direction
    const dx = targetTileX - this._tileX;
    const dy = targetTileY - this._tileY;
    this._direction = getDirectionFromDelta(dx, dy) as Direction;

    // Play walking animation
    this.sprite.play(`hero_walk_${this._direction}`, true);

    // Calculate target world position
    const target = this.tileToWorld(targetTileX, targetTileY);

    // Animate movement
    this.scene.tweens.add({
      targets: this.sprite,
      x: target.x,
      y: target.y,
      duration: this.config.moveDuration,
      ease: 'Linear',
      onComplete: () => {
        this._tileX = targetTileX;
        this._tileY = targetTileY;
        this._isMoving = false;
        onComplete?.();
      },
    });
  }

  /**
   * Move along a path (array of tile positions)
   * @param path - Array of {x, y} positions
   * @param onStepComplete - Called after each step
   * @param onPathComplete - Called when entire path is complete
   */
  moveAlongPath(
    path: { x: number; y: number }[],
    onStepComplete?: (x: number, y: number) => void,
    onPathComplete?: () => void
  ): void {
    if (path.length === 0) {
      this.stopAnimation();
      onPathComplete?.();
      return;
    }

    const nextStep = path.shift()!;
    this.moveTo(nextStep.x, nextStep.y, () => {
      onStepComplete?.(nextStep.x, nextStep.y);
      this.moveAlongPath(path, onStepComplete, onPathComplete);
    });
  }

  /**
   * Stop any playing animation and show idle
   */
  stopAnimation(): void {
    this.sprite.anims.stop();
    this.sprite.play(`hero_idle_${this._direction}`, true);
  }

  /**
   * Set hero position instantly (no animation)
   */
  setPosition(tileX: number, tileY: number): void {
    this._tileX = tileX;
    this._tileY = tileY;
    const worldPos = this.tileToWorld(tileX, tileY);
    this.sprite.setPosition(worldPos.x, worldPos.y);
  }

  /**
   * Set hero facing direction
   */
  setDirection(direction: Direction): void {
    this._direction = direction;
    if (!this._isMoving) {
      this.sprite.play(`hero_idle_${direction}`, true);
    }
  }

  // Getters
  get tileX(): number { return this._tileX; }
  get tileY(): number { return this._tileY; }
  get direction(): Direction { return this._direction; }
  get isMoving(): boolean { return this._isMoving; }

  /**
   * Get the sprite object (for depth management, etc.)
   */
  getSprite(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  /**
   * Set sprite depth
   */
  setDepth(depth: number): void {
    this.sprite.setDepth(depth);
  }

  /**
   * Destroy the hero
   */
  destroy(): void {
    this.sprite.destroy();
  }
}
