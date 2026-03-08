import { describe, it, expect } from 'vitest';
import { Projectile } from '../src/logic/Projectile';
import { Enemy } from '../src/logic/Enemy';
import { EnemyConfig } from '../src/types';

const enemyConfig: EnemyConfig = { health: 100, speed: 100, reward: 10, color: 0xff0000 };

describe('Projectile', () => {
  it('initializes with correct values', () => {
    const enemy = new Enemy(enemyConfig, 100, 100);
    const proj = new Projectile(0, 0, enemy, 25);
    expect(proj.x).toBe(0);
    expect(proj.y).toBe(0);
    expect(proj.damage).toBe(25);
    expect(proj.alive).toBe(true);
    expect(proj.target).toBe(enemy);
    expect(proj.speed).toBe(300);
  });

  describe('update', () => {
    it('moves toward target', () => {
      const enemy = new Enemy(enemyConfig, 300, 0);
      const proj = new Projectile(0, 0, enemy, 10);
      proj.update(0.5); // 300 speed * 0.5 = 150 pixels
      expect(proj.x).toBeCloseTo(150);
      expect(proj.y).toBeCloseTo(0);
      expect(proj.alive).toBe(true);
    });

    it('hits target when close enough', () => {
      const enemy = new Enemy(enemyConfig, 100, 0);
      const proj = new Projectile(0, 0, enemy, 25);
      proj.update(0.5); // 150 pixels, target at 100 -> hit
      expect(proj.alive).toBe(false);
      expect(enemy.health).toBe(75);
    });

    it('hits target when very close (dist < 1)', () => {
      const enemy = new Enemy(enemyConfig, 0.5, 0);
      const proj = new Projectile(0, 0, enemy, 10);
      proj.update(0.001);
      expect(proj.alive).toBe(false);
    });

    it('does not deal damage to dead target', () => {
      const enemy = new Enemy(enemyConfig, 100, 0);
      enemy.alive = false;
      const proj = new Projectile(0, 0, enemy, 50);
      proj.update(0.5);
      expect(proj.alive).toBe(false);
      expect(enemy.health).toBe(100); // unchanged
    });

    it('does nothing when already dead', () => {
      const enemy = new Enemy(enemyConfig, 100, 0);
      const proj = new Projectile(0, 0, enemy, 10);
      proj.alive = false;
      proj.update(1.0);
      expect(proj.x).toBe(0); // didn't move
    });

    it('tracks moving target', () => {
      const enemy = new Enemy(enemyConfig, 300, 0);
      const proj = new Projectile(0, 0, enemy, 10);
      proj.update(0.1); // move toward (300, 0)
      expect(proj.x).toBeGreaterThan(0);

      // Move enemy
      enemy.x = 300;
      enemy.y = 300;
      const prevX = proj.x;
      proj.update(0.1); // should now head toward (300, 300)
      expect(proj.y).toBeGreaterThan(0);
    });

    it('applies slow to target on hit', () => {
      const enemy = new Enemy(enemyConfig, 100, 0);
      const proj = new Projectile(0, 0, enemy, 10, 0.5, 2.0);
      proj.update(0.5); // hits enemy
      expect(proj.alive).toBe(false);
      expect(enemy.slowFactor).toBe(0.5);
      expect(enemy.slowTimer).toBe(2.0);
    });

    it('does not apply slow if target dies from damage', () => {
      const weakConfig: EnemyConfig = { health: 5, speed: 100, reward: 10, color: 0xff0000 };
      const enemy = new Enemy(weakConfig, 100, 0);
      const proj = new Projectile(0, 0, enemy, 10, 0.5, 2.0);
      proj.update(0.5);
      expect(enemy.alive).toBe(false);
      expect(enemy.slowFactor).toBe(1); // slow not applied to dead enemy
    });

    it('does not apply slow when projectile has no slow fields', () => {
      const enemy = new Enemy(enemyConfig, 100, 0);
      const proj = new Projectile(0, 0, enemy, 10);
      proj.update(0.5);
      expect(enemy.slowFactor).toBe(1);
      expect(enemy.slowTimer).toBe(0);
    });

    it('moves diagonally toward target', () => {
      const enemy = new Enemy(enemyConfig, 100, 100);
      const proj = new Projectile(0, 0, enemy, 10);
      proj.update(0.1); // 30 pixels diagonal
      const expectedDist = 30;
      const actualDist = Math.sqrt(proj.x * proj.x + proj.y * proj.y);
      expect(actualDist).toBeCloseTo(expectedDist, 0);
      expect(proj.x).toBeCloseTo(proj.y); // equal x and y movement
    });
  });
});
