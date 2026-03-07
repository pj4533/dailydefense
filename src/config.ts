import { TowerType, TowerConfig, EnemyConfig, WaveConfig, GridPosition } from './types';

export const TILE_SIZE = 48;
export const GRID_COLS = 16;
export const GRID_ROWS = 10;
export const GAME_WIDTH = TILE_SIZE * GRID_COLS;
export const GAME_HEIGHT = TILE_SIZE * GRID_ROWS;
export const UI_HEIGHT = 80;
export const CANVAS_WIDTH = GAME_WIDTH;
export const CANVAS_HEIGHT = GAME_HEIGHT + UI_HEIGHT;

export const STARTING_MONEY = 100;
export const STARTING_LIVES = 20;
export const SELL_REFUND_RATE = 1.0; // 100% refund

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  [TowerType.LADYBUG]: {
    type: TowerType.LADYBUG,
    cost: 25,
    damage: 10,
    range: 2.5,
    fireRate: 2,
    color: 0xcc4444,
  },
  [TowerType.MANTIS]: {
    type: TowerType.MANTIS,
    cost: 50,
    damage: 40,
    range: 4,
    fireRate: 0.5,
    color: 0x44aa44,
  },
};

export const ENEMY_CONFIGS = {
  aphid: { health: 50, speed: 80, reward: 10, color: 0x88cc44 } as EnemyConfig,
  ant: { health: 30, speed: 140, reward: 15, color: 0x664422 } as EnemyConfig,
  beetle: { health: 150, speed: 50, reward: 25, color: 0x336633 } as EnemyConfig,
};

// Fallback path used when random generation fails (see MapGenerator.ts)
export const PATH_WAYPOINTS: GridPosition[] = [
  { col: 0, row: 2 },
  { col: 5, row: 2 },
  { col: 5, row: 5 },
  { col: 10, row: 5 },
  { col: 10, row: 2 },
  { col: 15, row: 2 },
];

export const WAVES: WaveConfig[] = [
  { enemies: [{ config: ENEMY_CONFIGS.aphid, count: 5, spawnInterval: 1.0 }] },
  { enemies: [{ config: ENEMY_CONFIGS.aphid, count: 8, spawnInterval: 0.8 }] },
  {
    enemies: [
      { config: ENEMY_CONFIGS.aphid, count: 5, spawnInterval: 0.8 },
      { config: ENEMY_CONFIGS.ant, count: 3, spawnInterval: 0.6 },
    ],
  },
  {
    enemies: [
      { config: ENEMY_CONFIGS.ant, count: 8, spawnInterval: 0.5 },
      { config: ENEMY_CONFIGS.beetle, count: 2, spawnInterval: 1.5 },
    ],
  },
  {
    enemies: [
      { config: ENEMY_CONFIGS.aphid, count: 10, spawnInterval: 0.5 },
      { config: ENEMY_CONFIGS.ant, count: 5, spawnInterval: 0.4 },
      { config: ENEMY_CONFIGS.beetle, count: 3, spawnInterval: 1.0 },
    ],
  },
];
