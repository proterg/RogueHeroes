/**
 * Grid Utilities
 * ==============
 * Pure utility functions for grid-based calculations.
 * Used by CombatScene for collision detection, positioning, and distance calculations.
 * Includes terrain-aware functions for movement and vision.
 */

import { UnitStats } from '../data/UnitStats';
import {
  getTerrainType,
  isTerrainWalkable as checkTerrainWalkable,
  getTerrainMovementPenalty,
  getTerrainMeleeAttackPenalty,
  doesTerrainBlockVision,
  doesTerrainBlockProjectiles,
  isTerrainDestructible,
  getTerrainHP,
} from '../../types/combatTerrain';

/** Minimal unit interface for grid calculations */
export interface GridUnit {
  gridX: number;
  gridY: number;
  currentHp: number;
  stats: { size?: number };
}

/**
 * Get all tiles occupied by a unit based on its size.
 * Size 2 units occupy gridX and gridX+1 (horizontal).
 */
export function getOccupiedTiles(unit: GridUnit): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = [];
  const size = unit.stats.size || 1;
  for (let i = 0; i < size; i++) {
    tiles.push({ x: unit.gridX + i, y: unit.gridY });
  }
  return tiles;
}

/**
 * Check if a specific tile is occupied by any unit (considering unit sizes).
 */
export function isTileOccupied(
  x: number,
  y: number,
  units: GridUnit[],
  excludeUnit?: GridUnit
): boolean {
  for (const unit of units) {
    if (unit === excludeUnit || unit.currentHp <= 0) continue;
    const occupied = getOccupiedTiles(unit);
    if (occupied.some(t => t.x === x && t.y === y)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a unit can fit at a position (all tiles must be free and in bounds).
 */
export function canUnitFitAt(
  unit: GridUnit,
  x: number,
  y: number,
  gridWidth: number,
  gridHeight: number,
  units: GridUnit[]
): boolean {
  const size = unit.stats.size || 1;
  for (let i = 0; i < size; i++) {
    const checkX = x + i;
    // Check bounds
    if (checkX < 0 || checkX >= gridWidth || y < 0 || y >= gridHeight) {
      return false;
    }
    // Check if occupied
    if (isTileOccupied(checkX, y, units, unit)) {
      return false;
    }
  }
  return true;
}

/**
 * Get the world X position for a unit's sprite (centered for multi-tile units).
 */
export function getUnitWorldX(
  unit: GridUnit,
  gridOffsetX: number,
  scaledTileSize: number
): number {
  const size = unit.stats.size || 1;
  // Center the sprite across all tiles the unit occupies
  return gridOffsetX + (unit.gridX + size / 2) * scaledTileSize;
}

/**
 * Get the world Y position for a unit's sprite.
 */
export function getUnitWorldY(
  unit: GridUnit,
  gridOffsetY: number,
  scaledTileSize: number
): number {
  return gridOffsetY + unit.gridY * scaledTileSize + scaledTileSize / 2;
}

/**
 * Calculate the distance between two units considering their sizes.
 * Measures from nearest edges (Manhattan distance for cardinal movement).
 */
export function getUnitDistance(unit1: GridUnit, unit2: GridUnit): number {
  const size1 = unit1.stats.size || 1;
  const size2 = unit2.stats.size || 1;

  // Unit1 occupies tiles [unit1.gridX, unit1.gridX + size1 - 1]
  // Unit2 occupies tiles [unit2.gridX, unit2.gridX + size2 - 1]
  const left1 = unit1.gridX;
  const right1 = unit1.gridX + size1 - 1;
  const left2 = unit2.gridX;
  const right2 = unit2.gridX + size2 - 1;

  // X distance: 0 if overlapping, otherwise distance between nearest edges
  let dx: number;
  if (right1 < left2) {
    dx = left2 - right1;
  } else if (right2 < left1) {
    dx = left1 - right2;
  } else {
    dx = 0; // Overlapping in X
  }

  // Y distance (units are only 1 tile tall)
  const dy = Math.abs(unit1.gridY - unit2.gridY);

  // Manhattan distance (units can only move in 4 cardinal directions)
  return dx + dy;
}

/**
 * Calculate Chebyshev distance between two points.
 */
export function chebyshevDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

// =============================================================================
// TERRAIN-AWARE FUNCTIONS
// =============================================================================

/**
 * Check if a terrain tile at position is walkable.
 * Returns true if no terrain data provided (backwards compatible).
 */
export function isTerrainTileWalkable(
  x: number,
  y: number,
  terrain: string[][] | null
): boolean {
  if (!terrain) return true;
  const terrainId = terrain[y]?.[x];
  if (!terrainId) return true;
  return checkTerrainWalkable(terrainId);
}

/**
 * Get movement penalty for a terrain tile (0-1, where 0.5 = 50% slower).
 * Returns 0 (no penalty) if no terrain data provided.
 */
export function getTerrainTileMovementPenalty(
  x: number,
  y: number,
  terrain: string[][] | null
): number {
  if (!terrain) return 0;
  const terrainId = terrain[y]?.[x];
  if (!terrainId) return 0;
  return getTerrainMovementPenalty(terrainId);
}

/**
 * Check if terrain at position blocks vision.
 */
export function doesTerrainTileBlockVision(
  x: number,
  y: number,
  terrain: string[][] | null
): boolean {
  if (!terrain) return false;
  const terrainId = terrain[y]?.[x];
  if (!terrainId) return false;
  return doesTerrainBlockVision(terrainId);
}

/**
 * Check if terrain at position blocks projectiles.
 */
export function doesTerrainTileBlockProjectiles(
  x: number,
  y: number,
  terrain: string[][] | null
): boolean {
  if (!terrain) return false;
  const terrainId = terrain[y]?.[x];
  if (!terrainId) return false;
  return doesTerrainBlockProjectiles(terrainId);
}

/**
 * Get melee attack penalty from terrain at position (0-1, where 0.3 = 30% reduction).
 * Returns 0 if no terrain data or no penalty.
 */
export function getTerrainTileMeleeAttackPenalty(
  x: number,
  y: number,
  terrain: string[][] | null
): number {
  if (!terrain) return 0;
  const terrainId = terrain[y]?.[x];
  if (!terrainId) return 0;
  return getTerrainMeleeAttackPenalty(terrainId);
}

/**
 * Check if a unit can fit at a position considering both units and terrain.
 * Enhanced version that includes terrain collision check.
 */
export function canUnitFitAtWithTerrain(
  unit: GridUnit,
  x: number,
  y: number,
  gridWidth: number,
  gridHeight: number,
  units: GridUnit[],
  terrain: string[][] | null
): boolean {
  const size = unit.stats.size || 1;
  for (let i = 0; i < size; i++) {
    const checkX = x + i;
    // Check bounds
    if (checkX < 0 || checkX >= gridWidth || y < 0 || y >= gridHeight) {
      return false;
    }
    // Check terrain walkability
    if (!isTerrainTileWalkable(checkX, y, terrain)) {
      return false;
    }
    // Check if occupied by another unit
    if (isTileOccupied(checkX, y, units, unit)) {
      return false;
    }
  }
  return true;
}

/**
 * Calculate total movement penalty for a unit at a position.
 * For multi-tile units, uses the max penalty of all tiles occupied.
 * Returns 0-1 where 0.5 = 50% slower movement.
 */
export function getUnitMovementPenalty(
  unit: GridUnit,
  x: number,
  y: number,
  terrain: string[][] | null
): number {
  if (!terrain) return 0;

  const size = unit.stats.size || 1;
  let maxPenalty = 0;

  for (let i = 0; i < size; i++) {
    const penalty = getTerrainTileMovementPenalty(x + i, y, terrain);
    maxPenalty = Math.max(maxPenalty, penalty);
  }

  return maxPenalty;
}

/**
 * Check line of sight between two points considering terrain that blocks vision.
 * Uses Bresenham's line algorithm.
 */
export function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  terrain: string[][] | null
): boolean {
  if (!terrain) return true;

  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;

  let x = x1;
  let y = y1;

  while (true) {
    // Skip the starting and ending tiles (they are the units' positions)
    if ((x !== x1 || y !== y1) && (x !== x2 || y !== y2)) {
      if (doesTerrainTileBlockVision(x, y, terrain)) {
        return false;
      }
    }

    if (x === x2 && y === y2) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return true;
}

/**
 * Check projectile path between two points considering terrain that blocks projectiles.
 * Uses Bresenham's line algorithm.
 */
export function hasProjectilePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  terrain: string[][] | null
): boolean {
  if (!terrain) return true;

  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;

  let x = x1;
  let y = y1;

  while (true) {
    // Skip the starting and ending tiles
    if ((x !== x1 || y !== y1) && (x !== x2 || y !== y2)) {
      if (doesTerrainTileBlockProjectiles(x, y, terrain)) {
        return false;
      }
    }

    if (x === x2 && y === y2) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return true;
}
