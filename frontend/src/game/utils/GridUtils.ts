/**
 * Grid Utilities
 * ==============
 * Pure utility functions for grid-based calculations.
 * Used by CombatScene for collision detection, positioning, and distance calculations.
 */

import { UnitStats } from '../data/UnitStats';

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
 * Measures from nearest edges (Chebyshev distance).
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

  // Chebyshev distance (max of dx, dy)
  return Math.max(dx, dy);
}

/**
 * Calculate Chebyshev distance between two points.
 */
export function chebyshevDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}
