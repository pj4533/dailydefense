import { TowerType, WaveConfig, GridPosition } from '../types';
import { TOWER_CONFIGS, SELL_REFUND_RATE, WAVE_CLEAR_BONUS } from '../config';
import { GameState } from './GameState';
import { GameMap } from './GameMap';
import { Enemy } from './Enemy';
import { Tower } from './Tower';
import { Projectile } from './Projectile';
import { WaveManager } from './WaveManager';

export class GameEngine {
  state: GameState;
  map: GameMap;
  waveManager: WaveManager;
  enemies: Enemy[] = [];
  towers: Tower[] = [];
  projectiles: Projectile[] = [];
  private waveInProgress: boolean = false;
  onWaveComplete?: () => void;

  constructor(
    cols: number,
    rows: number,
    tileSize: number,
    waypoints: GridPosition[],
    waveGenerator: (n: number) => WaveConfig,
    startingMoney: number,
    startingLives: number,
  ) {
    this.map = new GameMap(cols, rows, tileSize, waypoints);
    this.state = new GameState(startingMoney, startingLives);
    this.waveManager = new WaveManager(waveGenerator);
  }

  update(dt: number): void {
    if (this.state.gameOver) return;
    dt = Math.min(dt, 0.1);

    // 1. Spawn enemies
    const spawnedConfig = this.waveManager.update(dt);
    if (spawnedConfig) {
      const path = this.map.getPathWorldPositions();
      const start = path[0];
      this.enemies.push(new Enemy(spawnedConfig, start.x, start.y));
      this.waveInProgress = true;
    }

    // 2. Move enemies
    const path = this.map.getPathWorldPositions();
    for (const enemy of this.enemies) {
      enemy.update(dt, path);
    }

    // 3. Handle enemies that reached end
    for (const enemy of this.enemies) {
      if (enemy.reachedEnd && enemy.alive) {
        this.state.loseLife();
        enemy.alive = false;
      }
    }

    // 4. Towers fire at alive enemies
    const aliveEnemies = this.enemies.filter(e => e.alive);
    for (const tower of this.towers) {
      const target = tower.update(dt, aliveEnemies);
      if (target) {
        const cfg = TOWER_CONFIGS[tower.type];
        this.projectiles.push(new Projectile(tower.x, tower.y, target, tower.damage, cfg.slowAmount, cfg.slowDuration));
      }
    }

    // 5. Move projectiles (may kill enemies)
    for (const proj of this.projectiles) {
      proj.update(dt);
    }

    // 6. Collect rewards and score for killed enemies (not reached-end ones)
    for (const enemy of this.enemies) {
      if (!enemy.alive && !enemy.reachedEnd) {
        this.state.earn(enemy.reward);
        this.state.addScore(enemy.reward);
      }
    }

    // 7. Cleanup
    this.enemies = this.enemies.filter(e => e.alive);
    this.projectiles = this.projectiles.filter(p => p.alive);

    // 8. Wave-clear bonus
    if (
      this.waveInProgress &&
      !this.waveManager.spawning &&
      this.enemies.length === 0
    ) {
      const bonus = this.waveManager.currentWave * WAVE_CLEAR_BONUS;
      this.state.addScore(bonus);
      this.waveInProgress = false;
      this.onWaveComplete?.();
    }
  }

  placeTower(col: number, row: number, type: TowerType): boolean {
    const config = TOWER_CONFIGS[type];
    if (!this.state.canAfford(config.cost)) return false;
    if (!this.map.canPlaceTower(col, row)) return false;
    this.state.spend(config.cost);
    this.map.placeTower(col, row);
    this.towers.push(new Tower(col, row, config, this.map.tileSize));
    return true;
  }

  getTowerAt(col: number, row: number): Tower | null {
    return this.towers.find(t => t.col === col && t.row === row) ?? null;
  }

  getSellValue(tower: Tower): number {
    return Math.floor(TOWER_CONFIGS[tower.type].cost * SELL_REFUND_RATE);
  }

  removeTower(col: number, row: number): number {
    const index = this.towers.findIndex(t => t.col === col && t.row === row);
    if (index === -1) return 0;
    const tower = this.towers[index];
    const refund = this.getSellValue(tower);
    this.towers.splice(index, 1);
    this.map.removeTower(col, row);
    this.state.earn(refund);
    return refund;
  }

  moveTower(fromCol: number, fromRow: number, toCol: number, toRow: number): boolean {
    if (fromCol === toCol && fromRow === toRow) return false;
    if (!this.map.canPlaceTower(toCol, toRow)) return false;
    const tower = this.getTowerAt(fromCol, fromRow);
    if (!tower) return false;
    this.map.removeTower(fromCol, fromRow);
    this.map.placeTower(toCol, toRow);
    tower.col = toCol;
    tower.row = toRow;
    tower.x = toCol * this.map.tileSize + this.map.tileSize / 2;
    tower.y = toRow * this.map.tileSize + this.map.tileSize / 2;
    return true;
  }

  startNextWave(): boolean {
    return this.waveManager.startWave();
  }
}
