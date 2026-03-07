import { WaveConfig, EnemyConfig } from '../types';
import { ENEMY_CONFIGS } from '../config';

export function generateWave(waveNumber: number): WaveConfig {
  const enemies: WaveConfig['enemies'] = [];

  const spawnInterval = Math.max(0.15, 0.8 - waveNumber * 0.15);
  const count = 8 + Math.floor(waveNumber * 3.5);

  // Aphids always present
  enemies.push({
    config: scaleEnemy(ENEMY_CONFIGS.aphid, waveNumber),
    count: count,
    spawnInterval: spawnInterval,
  });

  // Ants from wave 1+
  if (waveNumber >= 1) {
    enemies.push({
      config: scaleEnemy(ENEMY_CONFIGS.ant, waveNumber),
      count: Math.floor(count * 0.8),
      spawnInterval: spawnInterval,
    });
  }

  // Beetles from wave 3+
  if (waveNumber >= 3) {
    enemies.push({
      config: scaleEnemy(ENEMY_CONFIGS.beetle, waveNumber),
      count: Math.floor(count * 0.5),
      spawnInterval: spawnInterval,
    });
  }

  return { enemies };
}

function scaleEnemy(base: EnemyConfig, waveNumber: number): EnemyConfig {
  return {
    health: Math.round(base.health * (1 + 0.4 * waveNumber)),
    speed: Math.min(base.speed * (1 + 0.08 * waveNumber), base.speed * 2.5),
    reward: base.reward + Math.floor(waveNumber * 0.5),
    color: base.color,
  };
}
