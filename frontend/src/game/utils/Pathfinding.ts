/**
 * Pathfinding Utilities
 * ---------------------
 * A* pathfinding algorithm for grid-based movement.
 * Supports 8-directional movement with diagonal costs.
 *
 * Usage:
 *   const path = findPath(startX, startY, endX, endY, isWalkable, mapWidth, mapHeight);
 */

/** A single point on the grid */
export interface GridPoint {
  x: number;
  y: number;
}

/** Callback to check if a tile is walkable */
export type WalkableCheck = (x: number, y: number) => boolean;

/** Internal node for A* algorithm */
interface PathNode extends GridPoint {
  g: number;      // Cost from start
  h: number;      // Heuristic (estimated cost to end)
  f: number;      // Total cost (g + h)
  parent: PathNode | null;
}

/** Movement directions with costs */
const DIRECTIONS = [
  { dx: 0, dy: -1, cost: 1 },      // North
  { dx: 1, dy: -1, cost: 1.41 },   // Northeast (diagonal)
  { dx: 1, dy: 0, cost: 1 },       // East
  { dx: 1, dy: 1, cost: 1.41 },    // Southeast (diagonal)
  { dx: 0, dy: 1, cost: 1 },       // South
  { dx: -1, dy: 1, cost: 1.41 },   // Southwest (diagonal)
  { dx: -1, dy: 0, cost: 1 },      // West
  { dx: -1, dy: -1, cost: 1.41 },  // Northwest (diagonal)
] as const;

/**
 * Find a path between two points using A* algorithm
 *
 * @param startX - Starting X coordinate
 * @param startY - Starting Y coordinate
 * @param endX - Destination X coordinate
 * @param endY - Destination Y coordinate
 * @param isWalkable - Callback to check if a tile is walkable
 * @param mapWidth - Width of the map in tiles
 * @param mapHeight - Height of the map in tiles
 * @returns Array of points from start to end (excluding start), or empty if no path
 */
export function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  isWalkable: WalkableCheck,
  mapWidth: number,
  mapHeight: number
): GridPoint[] {
  // Early exit if destination is not walkable
  if (!isWalkable(endX, endY)) {
    return [];
  }

  // Early exit if already at destination
  if (startX === endX && startY === endY) {
    return [];
  }

  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();

  // Manhattan distance heuristic
  const heuristic = (x: number, y: number): number => {
    return Math.abs(x - endX) + Math.abs(y - endY);
  };

  // Create start node
  const startNode: PathNode = {
    x: startX,
    y: startY,
    g: 0,
    h: heuristic(startX, startY),
    f: heuristic(startX, startY),
    parent: null,
  };

  openSet.push(startNode);

  while (openSet.length > 0) {
    // Find node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    // Check if we reached the goal
    if (current.x === endX && current.y === endY) {
      return reconstructPath(current);
    }

    closedSet.add(nodeKey(current.x, current.y));

    // Check all neighbors
    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      // Check bounds
      if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) {
        continue;
      }

      // Check if already visited
      if (closedSet.has(nodeKey(nx, ny))) {
        continue;
      }

      // Check if walkable
      if (!isWalkable(nx, ny)) {
        continue;
      }

      const g = current.g + dir.cost;
      const h = heuristic(nx, ny);
      const f = g + h;

      // Check if already in open set with better score
      const existing = openSet.find((n) => n.x === nx && n.y === ny);
      if (existing) {
        if (existing.g <= g) {
          continue;
        }
        // Update existing node with better path
        existing.g = g;
        existing.h = h;
        existing.f = f;
        existing.parent = current;
      } else {
        // Add new node to open set
        openSet.push({ x: nx, y: ny, g, h, f, parent: current });
      }
    }
  }

  // No path found
  return [];
}

/**
 * Reconstruct path from end node back to start
 */
function reconstructPath(endNode: PathNode): GridPoint[] {
  const path: GridPoint[] = [];
  let node: PathNode | null = endNode;

  while (node?.parent) {
    path.unshift({ x: node.x, y: node.y });
    node = node.parent;
  }

  return path;
}

/**
 * Create a unique key for a grid position
 */
function nodeKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Get the direction name from a movement delta
 * Used for selecting directional sprites/animations
 */
export function getDirectionFromDelta(dx: number, dy: number): string {
  if (dx === 0 && dy < 0) return 'north';
  if (dx > 0 && dy < 0) return 'north_east';
  if (dx > 0 && dy === 0) return 'east';
  if (dx > 0 && dy > 0) return 'south_east';
  if (dx === 0 && dy > 0) return 'south';
  if (dx < 0 && dy > 0) return 'south_west';
  if (dx < 0 && dy === 0) return 'west';
  if (dx < 0 && dy < 0) return 'north_west';
  return 'south'; // Default
}

/**
 * Get arrow sprite key for path visualization
 */
export function getArrowSpriteKey(dx: number, dy: number): string {
  if (dx === 0 && dy < 0) return 'arrow_up';
  if (dx === 0 && dy > 0) return 'arrow_down';
  if (dx < 0 && dy === 0) return 'arrow_left';
  if (dx > 0 && dy === 0) return 'arrow_right';
  if (dx > 0 && dy < 0) return 'arrow_up_right';
  if (dx < 0 && dy < 0) return 'arrow_up_left';
  if (dx > 0 && dy > 0) return 'arrow_down_right';
  if (dx < 0 && dy > 0) return 'arrow_down_left';
  return 'arrow_up'; // Fallback
}

/**
 * Calculate Chebyshev distance (max of dx, dy)
 * Used for attack range in grid-based games
 */
export function chebyshevDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

/**
 * Calculate Manhattan distance (dx + dy)
 * Used for pathfinding heuristics
 */
export function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Calculate Euclidean distance
 * Used for vision/fog of war calculations
 */
export function euclideanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}
