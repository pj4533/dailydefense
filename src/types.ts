export interface Point {
  x: number;
  y: number;
}

export interface GridPosition {
  col: number;
  row: number;
}

export enum CellType {
  EMPTY = 0,
  PATH = 1,
  TOWER = 2,
}

export enum TowerType {
  LADYBUG = 'ladybug',
  MANTIS = 'mantis',
  SPIDER = 'spider',
}

export interface TowerConfig {
  type: TowerType;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  color: number;
  slowAmount?: number;
  slowDuration?: number;
}

export interface EnemyConfig {
  health: number;
  speed: number;
  reward: number;
  color: number;
}

export interface WaveConfig {
  enemies: EnemyGroup[];
}

export interface EnemyGroup {
  config: EnemyConfig;
  count: number;
  spawnInterval: number;
}
