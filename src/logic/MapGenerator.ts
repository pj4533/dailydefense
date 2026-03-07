import { GridPosition } from '../types';
import { PATH_WAYPOINTS } from '../config';

/**
 * Generate a random path from left edge to right edge.
 * Uses a band-based zigzag algorithm with retry logic.
 * Falls back to PATH_WAYPOINTS if generation fails.
 */
export function generateRandomPath(
  cols: number,
  rows: number,
  rng: () => number = Math.random,
): GridPosition[] {
  for (let attempt = 0; attempt < 50; attempt++) {
    const waypoints = tryGeneratePath(cols, rows, rng);
    if (
      waypoints &&
      !hasSelfIntersection(waypoints) &&
      countPathCells(waypoints) >= 25
    ) {
      return waypoints;
    }
  }
  return [...PATH_WAYPOINTS];
}

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function tryGeneratePath(
  cols: number,
  rows: number,
  rng: () => number,
): GridPosition[] | null {
  const minRow = 1;
  const maxRow = rows - 2;

  if (minRow > maxRow) return null;

  const entryRow = randomInt(minRow, maxRow, rng);
  const exitRow = randomInt(minRow, maxRow, rng);

  // Generate 2-4 turn columns spaced across the grid
  const numTurns = randomInt(2, 4, rng);
  const usable = cols - 4; // columns 2 through cols-3
  if (usable < numTurns) return null;

  const turnCols: number[] = [];
  for (let i = 0; i < numTurns; i++) {
    const ideal = Math.round(2 + (i + 0.5) * (usable / numTurns));
    const jitter = randomInt(-1, 1, rng);
    turnCols.push(Math.max(2, Math.min(cols - 3, ideal + jitter)));
  }
  turnCols.sort((a, b) => a - b);

  // Ensure minimum 3-column gap between turns to avoid cramped U-turns
  const MIN_COL_GAP = 3;
  for (let i = 1; i < turnCols.length; i++) {
    if (turnCols[i] < turnCols[i - 1] + MIN_COL_GAP) {
      turnCols[i] = turnCols[i - 1] + MIN_COL_GAP;
    }
  }
  if (turnCols[turnCols.length - 1] >= cols - 1) return null;

  const waypoints: GridPosition[] = [{ col: 0, row: entryRow }];
  let currentRow = entryRow;
  let goingDown = rng() < 0.5;

  for (let i = 0; i < numTurns; i++) {
    const turnCol = turnCols[i];
    const isLast = i === numTurns - 1;

    // Horizontal segment to turn column
    waypoints.push({ col: turnCol, row: currentRow });

    // Determine target row for vertical segment
    let targetRow: number;
    if (isLast) {
      targetRow = exitRow;
    } else {
      const minDist = 2;
      if (goingDown) {
        const lo = currentRow + minDist;
        if (lo > maxRow) return null;
        targetRow = randomInt(lo, maxRow, rng);
      } else {
        const hi = currentRow - minDist;
        if (hi < minRow) return null;
        targetRow = randomInt(minRow, hi, rng);
      }
    }

    if (targetRow < minRow || targetRow > maxRow) return null;

    // Skip vertical segment if no movement needed
    if (targetRow === currentRow) {
      waypoints.pop(); // remove redundant horizontal waypoint
      continue;
    }

    waypoints.push({ col: turnCol, row: targetRow });
    currentRow = targetRow;
    goingDown = !goingDown;
  }

  // Final horizontal segment to exit
  waypoints.push({ col: cols - 1, row: currentRow });

  return waypoints;
}

export function countPathCells(waypoints: GridPosition[]): number {
  if (waypoints.length === 0) return 0;
  let count = 1; // first cell
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    count += Math.abs(to.col - from.col) + Math.abs(to.row - from.row);
  }
  return count;
}

export function hasSelfIntersection(waypoints: GridPosition[]): boolean {
  const visited = new Set<string>();

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];

    const colStep = Math.sign(to.col - from.col);
    const rowStep = Math.sign(to.row - from.row);

    let col = from.col;
    let row = from.row;

    while (col !== to.col || row !== to.row) {
      const key = `${col},${row}`;
      if (visited.has(key)) return true;
      visited.add(key);
      if (col !== to.col) col += colStep;
      else if (row !== to.row) row += rowStep;
    }
  }

  // Add the very last cell
  if (waypoints.length > 0) {
    const last = waypoints[waypoints.length - 1];
    const key = `${last.col},${last.row}`;
    if (visited.has(key)) return true;
    visited.add(key);
  }

  return false;
}
