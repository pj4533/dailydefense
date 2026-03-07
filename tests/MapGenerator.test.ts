import { describe, it, expect } from 'vitest';
import { generateRandomPath, countPathCells, hasSelfIntersection } from '../src/logic/MapGenerator';
import { GameMap } from '../src/logic/GameMap';
import { PATH_WAYPOINTS, GRID_COLS, GRID_ROWS } from '../src/config';

// Simple seeded PRNG (mulberry32)
function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('MapGenerator', () => {
  it('first waypoint is at col 0 (left edge)', () => {
    const rng = createRng(42);
    const path = generateRandomPath(GRID_COLS, GRID_ROWS, rng);
    expect(path[0].col).toBe(0);
  });

  it('last waypoint is at col 15 (right edge)', () => {
    const rng = createRng(42);
    const path = generateRandomPath(GRID_COLS, GRID_ROWS, rng);
    expect(path[path.length - 1].col).toBe(GRID_COLS - 1);
  });

  it('all waypoints are within grid bounds', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = createRng(seed);
      const path = generateRandomPath(GRID_COLS, GRID_ROWS, rng);
      for (const wp of path) {
        expect(wp.col).toBeGreaterThanOrEqual(0);
        expect(wp.col).toBeLessThan(GRID_COLS);
        expect(wp.row).toBeGreaterThanOrEqual(0);
        expect(wp.row).toBeLessThan(GRID_ROWS);
      }
    }
  });

  it('consecutive waypoints are axis-aligned (share row or col)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = createRng(seed);
      const path = generateRandomPath(GRID_COLS, GRID_ROWS, rng);
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const aligned = a.col === b.col || a.row === b.row;
        expect(aligned).toBe(true);
      }
    }
  });

  it('has no self-intersection across multiple seeded runs', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const rng = createRng(seed);
      const path = generateRandomPath(GRID_COLS, GRID_ROWS, rng);
      expect(hasSelfIntersection(path)).toBe(false);
    }
  });

  it('enforces minimum path length of 25 cells', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const rng = createRng(seed);
      const path = generateRandomPath(GRID_COLS, GRID_ROWS, rng);
      expect(countPathCells(path)).toBeGreaterThanOrEqual(25);
    }
  });

  it('produces deterministic output with seeded RNG', () => {
    const path1 = generateRandomPath(GRID_COLS, GRID_ROWS, createRng(123));
    const path2 = generateRandomPath(GRID_COLS, GRID_ROWS, createRng(123));
    expect(path1).toEqual(path2);
  });

  it('produces different output with different seeds', () => {
    const path1 = generateRandomPath(GRID_COLS, GRID_ROWS, createRng(1));
    const path2 = generateRandomPath(GRID_COLS, GRID_ROWS, createRng(999));
    // It's possible but extremely unlikely for two different seeds to produce
    // the same path, so just check they differ
    const same = JSON.stringify(path1) === JSON.stringify(path2);
    expect(same).toBe(false);
  });

  it('returns fallback PATH_WAYPOINTS on impossible grid', () => {
    // A 3-col grid can't fit turns at cols 2..cols-3=0, so generation fails
    const path = generateRandomPath(3, 10, createRng(1));
    expect(path).toEqual(PATH_WAYPOINTS);
  });

  it('generated waypoints work with GameMap constructor', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const rng = createRng(seed);
      const waypoints = generateRandomPath(GRID_COLS, GRID_ROWS, rng);
      // Should not throw
      const map = new GameMap(GRID_COLS, GRID_ROWS, 48, waypoints);
      expect(map.cols).toBe(GRID_COLS);
      expect(map.rows).toBe(GRID_ROWS);
    }
  });

  describe('countPathCells', () => {
    it('counts cells correctly for a simple path', () => {
      const wp = [
        { col: 0, row: 2 },
        { col: 5, row: 2 },
        { col: 5, row: 5 },
      ];
      // (0,2)->(5,2): 5 horizontal + (5,2)->(5,5): 3 vertical + 1 start = 9
      expect(countPathCells(wp)).toBe(9);
    });

    it('returns 0 for empty waypoints', () => {
      expect(countPathCells([])).toBe(0);
    });
  });

  describe('hasSelfIntersection', () => {
    it('returns false for a simple non-intersecting path', () => {
      const wp = [
        { col: 0, row: 2 },
        { col: 5, row: 2 },
        { col: 5, row: 5 },
        { col: 10, row: 5 },
      ];
      expect(hasSelfIntersection(wp)).toBe(false);
    });

    it('returns true for a path that crosses itself', () => {
      const wp = [
        { col: 0, row: 3 },
        { col: 5, row: 3 },
        { col: 5, row: 0 },
        { col: 3, row: 0 },
        { col: 3, row: 5 }, // crosses the first horizontal segment at (3,3)
      ];
      expect(hasSelfIntersection(wp)).toBe(true);
    });
  });
});
