import { TowerType, GridPosition } from '../types';

export interface BrowserSessionState {
  seed: number;
  waypoints: GridPosition[];
  money: number;
  lives: number;
  score: number;
  gameOver: boolean;
  currentWave: number;
  towers: { col: number; row: number; type: TowerType }[];
  createdAt: number;
  submitted: boolean;
  waveInProgress: boolean;
  playerId?: string;
}
