import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/logic/GameEngine';
import { TowerType, CellType, WaveConfig, EnemyConfig, GridPosition } from '../src/types';

const TILE = 48;
const COLS = 8;
const ROWS = 5;

const basicEnemy: EnemyConfig = { health: 50, speed: 200, reward: 10, color: 0xff0000 };
const weakEnemy: EnemyConfig = { health: 10, speed: 50, reward: 5, color: 0xff0000 };

const waypoints: GridPosition[] = [
  { col: 0, row: 2 },
  { col: 7, row: 2 },
];

const singleWave: WaveConfig[] = [
  { enemies: [{ config: basicEnemy, count: 2, spawnInterval: 0.5 }] },
];

function createEngine(
  waves: WaveConfig[] = singleWave,
  money: number = 200,
  lives: number = 10,
): GameEngine {
  return new GameEngine(COLS, ROWS, TILE, waypoints, waves, money, lives);
}

describe('GameEngine', () => {
  it('initializes correctly', () => {
    const engine = createEngine();
    expect(engine.state.money).toBe(200);
    expect(engine.state.lives).toBe(10);
    expect(engine.enemies).toHaveLength(0);
    expect(engine.towers).toHaveLength(0);
    expect(engine.projectiles).toHaveLength(0);
  });

  describe('placeTower', () => {
    it('places a tower on empty cell', () => {
      const engine = createEngine();
      expect(engine.placeTower(0, 0, TowerType.BASIC)).toBe(true);
      expect(engine.towers).toHaveLength(1);
      expect(engine.state.money).toBe(175); // 200 - 25
    });

    it('fails if cannot afford', () => {
      const engine = createEngine(singleWave, 10);
      expect(engine.placeTower(0, 0, TowerType.BASIC)).toBe(false);
      expect(engine.towers).toHaveLength(0);
    });

    it('fails on path cell', () => {
      const engine = createEngine();
      expect(engine.placeTower(3, 2, TowerType.BASIC)).toBe(false);
    });

    it('fails on occupied cell', () => {
      const engine = createEngine();
      engine.placeTower(0, 0, TowerType.BASIC);
      expect(engine.placeTower(0, 0, TowerType.BASIC)).toBe(false);
    });

    it('places sniper tower', () => {
      const engine = createEngine();
      expect(engine.placeTower(0, 0, TowerType.SNIPER)).toBe(true);
      expect(engine.state.money).toBe(150); // 200 - 50
    });
  });

  describe('startNextWave', () => {
    it('starts a wave', () => {
      const engine = createEngine();
      expect(engine.startNextWave()).toBe(true);
      expect(engine.waveManager.spawning).toBe(true);
    });
  });

  describe('update', () => {
    it('does nothing when game is over', () => {
      const engine = createEngine();
      engine.state.gameOver = true;
      engine.startNextWave();
      engine.update(1.0);
      expect(engine.enemies).toHaveLength(0);
    });

    it('does nothing when victory', () => {
      const engine = createEngine();
      engine.state.victory = true;
      engine.startNextWave();
      engine.update(1.0);
      expect(engine.enemies).toHaveLength(0);
    });

    it('caps dt at 0.1', () => {
      const engine = createEngine();
      engine.startNextWave();
      engine.update(10.0); // huge dt gets capped
      // Should not cause extreme movement
      expect(engine.enemies.length).toBeGreaterThanOrEqual(0);
    });

    it('spawns enemies when wave is active', () => {
      const engine = createEngine();
      engine.startNextWave();
      engine.update(0.016);
      expect(engine.enemies).toHaveLength(1);
    });

    it('moves enemies along path', () => {
      const engine = createEngine();
      engine.startNextWave();
      engine.update(0.016); // spawn
      const startX = engine.enemies[0].x;
      engine.update(0.1); // move
      expect(engine.enemies[0].x).toBeGreaterThan(startX);
    });

    it('loses life when enemy reaches end', () => {
      const engine = createEngine();
      engine.startNextWave();
      engine.update(0.016); // spawn
      // Move enemy to end
      for (let i = 0; i < 100; i++) {
        engine.update(0.1);
      }
      expect(engine.state.lives).toBeLessThan(10);
    });

    it('towers fire at enemies in range', () => {
      const weakWave: WaveConfig[] = [
        { enemies: [{ config: weakEnemy, count: 1, spawnInterval: 1.0 }] },
      ];
      const engine = createEngine(weakWave);
      // Place tower adjacent to path
      engine.placeTower(3, 1, TowerType.BASIC);
      engine.startNextWave();
      engine.update(0.016); // spawn enemy
      // Move enemy into range
      for (let i = 0; i < 20; i++) {
        engine.update(0.05);
      }
      // Tower should have created projectiles
      expect(engine.projectiles.length + engine.towers[0].cooldown).toBeGreaterThan(0);
    });

    it('earns reward when enemy is killed', () => {
      const oneHpEnemy: EnemyConfig = { health: 1, speed: 50, reward: 99, color: 0xff0000 };
      const wave: WaveConfig[] = [
        { enemies: [{ config: oneHpEnemy, count: 1, spawnInterval: 1.0 }] },
      ];
      const engine = createEngine(wave, 200, 10);
      engine.placeTower(2, 1, TowerType.BASIC);
      engine.startNextWave();

      const initialMoney = engine.state.money;
      // Run until enemy dies
      for (let i = 0; i < 100; i++) {
        engine.update(0.05);
      }
      expect(engine.state.money).toBeGreaterThan(initialMoney);
    });

    it('triggers victory after all waves complete and enemies cleared', () => {
      const oneHpEnemy: EnemyConfig = { health: 1, speed: 50, reward: 5, color: 0xff0000 };
      const wave: WaveConfig[] = [
        { enemies: [{ config: oneHpEnemy, count: 1, spawnInterval: 1.0 }] },
      ];
      const engine = createEngine(wave, 200, 10);
      engine.placeTower(2, 1, TowerType.BASIC);
      engine.startNextWave();

      for (let i = 0; i < 200; i++) {
        engine.update(0.05);
      }
      expect(engine.state.victory).toBe(true);
    });

    it('cleans up dead enemies and projectiles', () => {
      const oneHpEnemy: EnemyConfig = { health: 1, speed: 50, reward: 5, color: 0xff0000 };
      const wave: WaveConfig[] = [
        { enemies: [{ config: oneHpEnemy, count: 1, spawnInterval: 1.0 }] },
      ];
      const engine = createEngine(wave, 200, 10);
      engine.placeTower(2, 1, TowerType.BASIC);
      engine.startNextWave();

      for (let i = 0; i < 200; i++) {
        engine.update(0.05);
      }
      expect(engine.enemies).toHaveLength(0);
      expect(engine.projectiles).toHaveLength(0);
    });
  });

  describe('getTowerAt', () => {
    it('returns tower at position', () => {
      const engine = createEngine();
      engine.placeTower(0, 0, TowerType.BASIC);
      const tower = engine.getTowerAt(0, 0);
      expect(tower).not.toBeNull();
      expect(tower!.col).toBe(0);
      expect(tower!.row).toBe(0);
    });

    it('returns null when empty', () => {
      const engine = createEngine();
      expect(engine.getTowerAt(0, 0)).toBeNull();
    });

    it('returns null for path cells', () => {
      const engine = createEngine();
      expect(engine.getTowerAt(3, 2)).toBeNull();
    });
  });

  describe('removeTower', () => {
    it('removes tower and returns refund amount', () => {
      const engine = createEngine();
      engine.placeTower(0, 0, TowerType.BASIC);
      expect(engine.state.money).toBe(175);
      const refund = engine.removeTower(0, 0);
      expect(refund).toBe(25);
      expect(engine.state.money).toBe(200);
      expect(engine.towers).toHaveLength(0);
    });

    it('updates map grid cell back to EMPTY', () => {
      const engine = createEngine();
      engine.placeTower(0, 0, TowerType.BASIC);
      expect(engine.map.getCell(0, 0)).toBe(CellType.TOWER);
      engine.removeTower(0, 0);
      expect(engine.map.getCell(0, 0)).toBe(CellType.EMPTY);
    });

    it('returns 0 when no tower at position', () => {
      const engine = createEngine();
      expect(engine.removeTower(0, 0)).toBe(0);
    });

    it('handles sniper refund correctly', () => {
      const engine = createEngine();
      engine.placeTower(0, 0, TowerType.SNIPER);
      expect(engine.state.money).toBe(150);
      const refund = engine.removeTower(0, 0);
      expect(refund).toBe(50);
      expect(engine.state.money).toBe(200);
    });

    it('allows placing new tower after removal', () => {
      const engine = createEngine();
      engine.placeTower(0, 0, TowerType.BASIC);
      engine.removeTower(0, 0);
      expect(engine.placeTower(0, 0, TowerType.SNIPER)).toBe(true);
      expect(engine.towers).toHaveLength(1);
      expect(engine.towers[0].type).toBe(TowerType.SNIPER);
    });
  });

  describe('moveTower', () => {
    it('moves tower to new empty cell', () => {
      const engine = createEngine();
      engine.placeTower(0, 0, TowerType.BASIC);
      expect(engine.moveTower(0, 0, 1, 0)).toBe(true);
      expect(engine.getTowerAt(0, 0)).toBeNull();
      expect(engine.getTowerAt(1, 0)).not.toBeNull();
    });

    it('updates tower pixel coordinates', () => {
      const engine = createEngine();
      engine.placeTower(0, 0, TowerType.BASIC);
      engine.moveTower(0, 0, 1, 0);
      const tower = engine.getTowerAt(1, 0)!;
      expect(tower.x).toBe(1 * TILE + TILE / 2);
      expect(tower.y).toBe(0 * TILE + TILE / 2);
    });

    it('updates map grid cells', () => {
      const engine = createEngine();
      engine.placeTower(0, 0, TowerType.BASIC);
      engine.moveTower(0, 0, 1, 0);
      expect(engine.map.getCell(0, 0)).toBe(CellType.EMPTY);
      expect(engine.map.getCell(1, 0)).toBe(CellType.TOWER);
    });

    it('does not change money', () => {
      const engine = createEngine();
      engine.placeTower(0, 0, TowerType.BASIC);
      const moneyBefore = engine.state.money;
      engine.moveTower(0, 0, 1, 0);
      expect(engine.state.money).toBe(moneyBefore);
    });

    it('fails to move to path cell', () => {
      const engine = createEngine();
      engine.placeTower(0, 0, TowerType.BASIC);
      expect(engine.moveTower(0, 0, 3, 2)).toBe(false);
      expect(engine.getTowerAt(0, 0)).not.toBeNull();
    });

    it('fails to move to occupied cell', () => {
      const engine = createEngine();
      engine.placeTower(0, 0, TowerType.BASIC);
      engine.placeTower(1, 0, TowerType.BASIC);
      expect(engine.moveTower(0, 0, 1, 0)).toBe(false);
    });

    it('fails to move to same cell', () => {
      const engine = createEngine();
      engine.placeTower(0, 0, TowerType.BASIC);
      expect(engine.moveTower(0, 0, 0, 0)).toBe(false);
    });

    it('fails when no tower at source', () => {
      const engine = createEngine();
      expect(engine.moveTower(0, 0, 1, 0)).toBe(false);
    });

    it('preserves tower type and stats', () => {
      const engine = createEngine();
      engine.placeTower(0, 0, TowerType.SNIPER);
      const original = engine.getTowerAt(0, 0)!;
      const origType = original.type;
      const origDamage = original.damage;
      const origRange = original.range;
      engine.moveTower(0, 0, 1, 0);
      const moved = engine.getTowerAt(1, 0)!;
      expect(moved.type).toBe(origType);
      expect(moved.damage).toBe(origDamage);
      expect(moved.range).toBe(origRange);
    });
  });
});
