import { describe, it, expect } from 'vitest';
import { generateWave } from '../src/logic/WaveGenerator';
import { ENEMY_CONFIGS } from '../src/config';

describe('WaveGenerator', () => {
  it('generates valid WaveConfig', () => {
    const wave = generateWave(1);
    expect(wave.enemies).toBeDefined();
    expect(wave.enemies.length).toBeGreaterThan(0);
    for (const group of wave.enemies) {
      expect(group.config.health).toBeGreaterThan(0);
      expect(group.config.speed).toBeGreaterThan(0);
      expect(group.config.reward).toBeGreaterThan(0);
      expect(group.count).toBeGreaterThan(0);
      expect(group.spawnInterval).toBeGreaterThan(0);
    }
  });

  describe('enemy type progression', () => {
    it('wave 0 has only aphids', () => {
      const wave = generateWave(0);
      expect(wave.enemies).toHaveLength(1);
      expect(wave.enemies[0].config.color).toBe(ENEMY_CONFIGS.aphid.color);
    });

    it('waves 1-2 add ants', () => {
      for (let w = 1; w <= 2; w++) {
        const wave = generateWave(w);
        expect(wave.enemies).toHaveLength(2);
        expect(wave.enemies[0].config.color).toBe(ENEMY_CONFIGS.aphid.color);
        expect(wave.enemies[1].config.color).toBe(ENEMY_CONFIGS.ant.color);
      }
    });

    it('waves 3+ add beetles', () => {
      const wave = generateWave(3);
      expect(wave.enemies).toHaveLength(3);
      expect(wave.enemies[0].config.color).toBe(ENEMY_CONFIGS.aphid.color);
      expect(wave.enemies[1].config.color).toBe(ENEMY_CONFIGS.ant.color);
      expect(wave.enemies[2].config.color).toBe(ENEMY_CONFIGS.beetle.color);
    });
  });

  describe('scaling formulas', () => {
    it('health scales by 40% per wave', () => {
      const wave5 = generateWave(5);
      const expectedHealth = Math.round(ENEMY_CONFIGS.aphid.health * (1 + 0.4 * 5));
      expect(wave5.enemies[0].config.health).toBe(expectedHealth);
    });

    it('speed scales by 8% per wave, capped at 2.5x', () => {
      const wave10 = generateWave(10);
      const expectedSpeed = Math.min(
        ENEMY_CONFIGS.aphid.speed * (1 + 0.08 * 10),
        ENEMY_CONFIGS.aphid.speed * 2.5,
      );
      expect(wave10.enemies[0].config.speed).toBe(expectedSpeed);

      // Very high wave - should be capped
      const wave100 = generateWave(100);
      expect(wave100.enemies[0].config.speed).toBe(ENEMY_CONFIGS.aphid.speed * 2.5);
    });

    it('count scales with wave number', () => {
      const wave0 = generateWave(0);
      expect(wave0.enemies[0].count).toBe(8); // 8 + floor(0 * 3.5) = 8

      const wave10 = generateWave(10);
      expect(wave10.enemies[0].count).toBe(43); // 8 + floor(10 * 3.5) = 43
    });

    it('spawn interval decreases with wave, min 0.15', () => {
      const wave0 = generateWave(0);
      expect(wave0.enemies[0].spawnInterval).toBe(0.8); // max(0.15, 0.8 - 0) = 0.8

      const wave3 = generateWave(3);
      expect(wave3.enemies[0].spawnInterval).toBeCloseTo(0.35); // max(0.15, 0.8 - 0.45) = 0.35

      const wave10 = generateWave(10);
      expect(wave10.enemies[0].spawnInterval).toBe(0.15); // capped at 0.15
    });

    it('reward scales slowly', () => {
      const wave10 = generateWave(10);
      const expectedReward = ENEMY_CONFIGS.aphid.reward + Math.floor(10 * 0.5);
      expect(wave10.enemies[0].config.reward).toBe(expectedReward);
    });
  });
});
