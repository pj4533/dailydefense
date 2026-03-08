import { describe, it, expect } from 'vitest';
import { Enemy } from '../src/logic/Enemy';
import { EnemyConfig, Point } from '../src/types';

const basicConfig: EnemyConfig = { health: 100, speed: 100, reward: 10, color: 0xff0000 };

const simplePath: Point[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
];

describe('Enemy', () => {
  it('initializes with correct values', () => {
    const enemy = new Enemy(basicConfig, 0, 0);
    expect(enemy.health).toBe(100);
    expect(enemy.maxHealth).toBe(100);
    expect(enemy.speed).toBe(100);
    expect(enemy.reward).toBe(10);
    expect(enemy.alive).toBe(true);
    expect(enemy.reachedEnd).toBe(false);
    expect(enemy.currentWaypointIndex).toBe(1);
  });

  describe('update', () => {
    it('moves toward next waypoint', () => {
      const enemy = new Enemy(basicConfig, 0, 0);
      enemy.update(0.5, simplePath); // 100 speed * 0.5 dt = 50 pixels
      expect(enemy.x).toBeCloseTo(50);
      expect(enemy.y).toBeCloseTo(0);
    });

    it('snaps to waypoint and advances when reaching it', () => {
      const enemy = new Enemy(basicConfig, 0, 0);
      enemy.update(1.0, simplePath); // exactly reaches waypoint at (100, 0)
      expect(enemy.x).toBe(100);
      expect(enemy.y).toBe(0);
      expect(enemy.currentWaypointIndex).toBe(2);
    });

    it('overshoots to next segment', () => {
      const enemy = new Enemy(basicConfig, 0, 0);
      // Move 100 pixels in 1 second, reaching first waypoint
      enemy.update(1.0, simplePath);
      expect(enemy.currentWaypointIndex).toBe(2);
      // Move another 50 pixels toward (100, 100)
      enemy.update(0.5, simplePath);
      expect(enemy.x).toBeCloseTo(100);
      expect(enemy.y).toBeCloseTo(50);
    });

    it('sets reachedEnd when passing last waypoint', () => {
      const enemy = new Enemy(basicConfig, 0, 0);
      enemy.update(1.0, simplePath); // reach (100, 0)
      enemy.update(1.0, simplePath); // reach (100, 100)
      expect(enemy.reachedEnd).toBe(true);
    });

    it('does not move when dead', () => {
      const enemy = new Enemy(basicConfig, 0, 0);
      enemy.alive = false;
      enemy.update(1.0, simplePath);
      expect(enemy.x).toBe(0);
      expect(enemy.y).toBe(0);
    });

    it('does not move after reaching end', () => {
      const enemy = new Enemy(basicConfig, 0, 0);
      enemy.reachedEnd = true;
      enemy.update(1.0, simplePath);
      expect(enemy.x).toBe(0);
    });
  });

  describe('applySlow', () => {
    it('reduces movement speed', () => {
      const enemy = new Enemy(basicConfig, 0, 0);
      enemy.applySlow(0.5, 2.0);
      enemy.update(0.5, simplePath); // 100 speed * 0.5 slow * 0.5 dt = 25 pixels
      expect(enemy.x).toBeCloseTo(25);
    });

    it('wears off after duration expires', () => {
      const enemy = new Enemy(basicConfig, 0, 0);
      enemy.applySlow(0.5, 0.5);
      enemy.update(0.3, simplePath); // still slowed: moves 100*0.5*0.3 = 15
      expect(enemy.slowFactor).toBe(0.5);
      expect(enemy.x).toBeCloseTo(15);
      enemy.update(0.3, simplePath); // timer was 0.2, now expires → moves at full speed
      expect(enemy.slowFactor).toBe(1);
      expect(enemy.slowTimer).toBe(0);
    });

    it('refreshes duration on subsequent hits (does not stack)', () => {
      const enemy = new Enemy(basicConfig, 0, 0);
      enemy.applySlow(0.5, 2.0);
      enemy.update(1.0, simplePath); // 1s passes, timer now ~1.0
      enemy.applySlow(0.5, 2.0); // refresh
      expect(enemy.slowTimer).toBe(2.0); // reset to full duration
      expect(enemy.slowFactor).toBe(0.5); // same factor
    });

    it('decrements slow timer each update', () => {
      const enemy = new Enemy(basicConfig, 0, 0);
      enemy.applySlow(0.5, 2.0);
      enemy.update(0.5, simplePath);
      expect(enemy.slowTimer).toBeCloseTo(1.5);
      expect(enemy.slowFactor).toBe(0.5);
    });
  });

  describe('takeDamage', () => {
    it('reduces health', () => {
      const enemy = new Enemy(basicConfig, 0, 0);
      enemy.takeDamage(30);
      expect(enemy.health).toBe(70);
      expect(enemy.alive).toBe(true);
    });

    it('kills enemy when health reaches 0', () => {
      const enemy = new Enemy(basicConfig, 0, 0);
      enemy.takeDamage(100);
      expect(enemy.health).toBe(0);
      expect(enemy.alive).toBe(false);
    });

    it('does not allow negative health', () => {
      const enemy = new Enemy(basicConfig, 0, 0);
      enemy.takeDamage(200);
      expect(enemy.health).toBe(0);
    });

    it('does nothing if already dead', () => {
      const enemy = new Enemy(basicConfig, 0, 0);
      enemy.alive = false;
      enemy.takeDamage(10);
      expect(enemy.health).toBe(100); // unchanged
    });
  });
});
