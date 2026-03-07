import Phaser from 'phaser';
import { GameEngine } from '../logic/GameEngine';
import { Tower } from '../logic/Tower';
import { TowerType, CellType } from '../types';
import {
  TILE_SIZE, GRID_COLS, GRID_ROWS, GAME_HEIGHT,
  STARTING_MONEY, STARTING_LIVES,
  PATH_WAYPOINTS, WAVES, TOWER_CONFIGS,
} from '../config';

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private selectedTowerType: TowerType = TowerType.BASIC;

  private gridGraphics!: Phaser.GameObjects.Graphics;
  private entityGraphics!: Phaser.GameObjects.Graphics;

  private moneyText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;

  private basicTowerBtn!: Phaser.GameObjects.Text;
  private sniperTowerBtn!: Phaser.GameObjects.Text;
  private sellBtn!: Phaser.GameObjects.Text;

  private selectedTower: Tower | null = null;
  private dragTower: Tower | null = null;
  private dragStartCol: number = 0;
  private dragStartRow: number = 0;
  private isDragging: boolean = false;
  private dragGhostCol: number = 0;
  private dragGhostRow: number = 0;
  private pointerDown: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.engine = new GameEngine(
      GRID_COLS, GRID_ROWS, TILE_SIZE,
      PATH_WAYPOINTS, WAVES,
      STARTING_MONEY, STARTING_LIVES,
    );

    this.gridGraphics = this.add.graphics();
    this.entityGraphics = this.add.graphics();

    this.drawGrid();
    this.createUI();

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
  }

  private drawGrid(): void {
    this.gridGraphics.clear();

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = this.engine.map.getCell(col, row);
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;

        let fillColor: number;
        switch (cell) {
          case CellType.PATH:
            fillColor = 0x444444;
            break;
          case CellType.TOWER: {
            const isSelected = this.selectedTower?.col === col && this.selectedTower?.row === row;
            fillColor = isSelected ? 0x555599 : 0x333355;
            break;
          }
          case CellType.EMPTY:
          default:
            fillColor = 0x222222;
            break;
        }

        this.gridGraphics.fillStyle(fillColor);
        this.gridGraphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        this.gridGraphics.lineStyle(1, 0x333333);
        this.gridGraphics.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }

    // Draw drag ghost overlay
    if (this.isDragging) {
      const canPlace = this.engine.map.canPlaceTower(this.dragGhostCol, this.dragGhostRow);
      const ghostColor = canPlace ? 0x00ff00 : 0xff0000;
      this.gridGraphics.fillStyle(ghostColor, 0.3);
      this.gridGraphics.fillRect(
        this.dragGhostCol * TILE_SIZE, this.dragGhostRow * TILE_SIZE,
        TILE_SIZE, TILE_SIZE,
      );
    }
  }

  private createUI(): void {
    const uiY = GAME_HEIGHT + 8;
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    };

    this.moneyText = this.add.text(10, uiY, '', textStyle);
    this.livesText = this.add.text(160, uiY, '', textStyle);
    this.waveText = this.add.text(300, uiY, '', textStyle);

    const btnY = uiY + 30;

    this.basicTowerBtn = this.add.text(10, btnY,
      ` Basic ($${TOWER_CONFIGS[TowerType.BASIC].cost}) `,
      { fontSize: '13px', color: '#ffffff', fontFamily: 'monospace', backgroundColor: '#4488ff' },
    ).setInteractive({ useHandCursor: true });

    this.sniperTowerBtn = this.add.text(150, btnY,
      ` Sniper ($${TOWER_CONFIGS[TowerType.SNIPER].cost}) `,
      { fontSize: '13px', color: '#ffffff', fontFamily: 'monospace', backgroundColor: '#333333' },
    ).setInteractive({ useHandCursor: true });

    const startWaveBtn = this.add.text(310, btnY, ' Start Wave ', {
      fontSize: '13px', color: '#ffffff', fontFamily: 'monospace', backgroundColor: '#228822',
    }).setInteractive({ useHandCursor: true });

    this.sellBtn = this.add.text(450, btnY, '', {
      fontSize: '13px', color: '#ffffff', fontFamily: 'monospace', backgroundColor: '#882222',
    }).setInteractive({ useHandCursor: true }).setVisible(false);

    this.messageText = this.add.text(
      GRID_COLS * TILE_SIZE / 2,
      GAME_HEIGHT / 2,
      '',
      { fontSize: '32px', color: '#ffffff', fontFamily: 'monospace' },
    ).setOrigin(0.5);

    this.basicTowerBtn.on('pointerdown', () => {
      this.selectedTowerType = TowerType.BASIC;
      this.selectedTower = null;
      this.updateButtonHighlights();
      this.updateSellButton();
      this.drawGrid();
    });

    this.sniperTowerBtn.on('pointerdown', () => {
      this.selectedTowerType = TowerType.SNIPER;
      this.selectedTower = null;
      this.updateButtonHighlights();
      this.updateSellButton();
      this.drawGrid();
    });

    startWaveBtn.on('pointerdown', () => {
      this.engine.startNextWave();
    });

    this.sellBtn.on('pointerdown', () => {
      if (this.selectedTower) {
        this.engine.removeTower(this.selectedTower.col, this.selectedTower.row);
        this.selectedTower = null;
        this.updateSellButton();
        this.drawGrid();
      }
    });

    this.updateButtonHighlights();
  }

  private updateButtonHighlights(): void {
    this.basicTowerBtn.setBackgroundColor(
      this.selectedTowerType === TowerType.BASIC ? '#4488ff' : '#333333'
    );
    this.sniperTowerBtn.setBackgroundColor(
      this.selectedTowerType === TowerType.SNIPER ? '#ff4444' : '#333333'
    );
  }

  private updateSellButton(): void {
    if (this.selectedTower) {
      const value = this.engine.getSellValue(this.selectedTower);
      this.sellBtn.setText(` Sell ($${value}) `);
      this.sellBtn.setVisible(true);
    } else {
      this.sellBtn.setVisible(false);
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.y >= GAME_HEIGHT) return;

    const col = Math.floor(pointer.x / TILE_SIZE);
    const row = Math.floor(pointer.y / TILE_SIZE);

    const tower = this.engine.getTowerAt(col, row);
    if (tower) {
      this.dragTower = tower;
      this.dragStartCol = col;
      this.dragStartRow = row;
      this.isDragging = false;
      this.pointerDown = true;
      return;
    }

    // Clicking empty space with a selected tower → deselect
    if (this.selectedTower) {
      this.selectedTower = null;
      this.updateSellButton();
      this.drawGrid();
      return;
    }

    // Place new tower
    const placed = this.engine.placeTower(col, row, this.selectedTowerType);
    if (placed) {
      this.drawGrid();
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.pointerDown || !this.dragTower) return;

    const dx = pointer.x - (this.dragStartCol * TILE_SIZE + TILE_SIZE / 2);
    const dy = pointer.y - (this.dragStartRow * TILE_SIZE + TILE_SIZE / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!this.isDragging && dist >= TILE_SIZE / 2) {
      this.isDragging = true;
    }

    if (this.isDragging) {
      this.dragGhostCol = Math.floor(pointer.x / TILE_SIZE);
      this.dragGhostRow = Math.floor(pointer.y / TILE_SIZE);
      this.drawGrid();
    }
  }

  private handlePointerUp(_pointer: Phaser.Input.Pointer): void {
    if (!this.pointerDown) return;

    if (this.isDragging && this.dragTower) {
      this.engine.moveTower(
        this.dragStartCol, this.dragStartRow,
        this.dragGhostCol, this.dragGhostRow,
      );
      // Clear selection after move
      this.selectedTower = null;
      this.updateSellButton();
      this.drawGrid();
    } else if (this.dragTower) {
      // Was a click, not a drag → toggle selection
      if (this.selectedTower === this.dragTower) {
        this.selectedTower = null;
      } else {
        this.selectedTower = this.dragTower;
      }
      this.updateSellButton();
      this.drawGrid();
    }

    this.dragTower = null;
    this.isDragging = false;
    this.pointerDown = false;
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.engine.update(dt);

    // Guard: if selected tower was removed externally
    if (this.selectedTower && !this.engine.towers.includes(this.selectedTower)) {
      this.selectedTower = null;
      this.updateSellButton();
      this.drawGrid();
    }

    this.drawEntities();
    this.updateUI();
  }

  private drawEntities(): void {
    this.entityGraphics.clear();

    for (const tower of this.engine.towers) {
      const isSelected = this.selectedTower === tower;
      const isDragSource = this.isDragging && this.dragTower === tower;

      this.entityGraphics.fillStyle(tower.color, isDragSource ? 0.3 : 1);
      const size = TILE_SIZE * 0.7;
      this.entityGraphics.fillRect(
        tower.x - size / 2, tower.y - size / 2,
        size, size,
      );

      if (isSelected) {
        // Yellow border
        this.entityGraphics.lineStyle(3, 0xffff00);
        this.entityGraphics.strokeRect(
          tower.x - size / 2, tower.y - size / 2,
          size, size,
        );
        // Range circle - prominent
        this.entityGraphics.lineStyle(2, 0xffff00, 0.5);
        this.entityGraphics.strokeCircle(tower.x, tower.y, tower.range);
        this.entityGraphics.fillStyle(0xffff00, 0.08);
        this.entityGraphics.fillCircle(tower.x, tower.y, tower.range);
      } else {
        this.entityGraphics.lineStyle(1, tower.color, 0.2);
        this.entityGraphics.strokeCircle(tower.x, tower.y, tower.range);
      }
    }

    // Draw drag ghost tower at cursor position
    if (this.isDragging && this.dragTower) {
      const ghostX = this.dragGhostCol * TILE_SIZE + TILE_SIZE / 2;
      const ghostY = this.dragGhostRow * TILE_SIZE + TILE_SIZE / 2;
      const size = TILE_SIZE * 0.7;
      this.entityGraphics.fillStyle(this.dragTower.color, 0.7);
      this.entityGraphics.fillRect(
        ghostX - size / 2, ghostY - size / 2,
        size, size,
      );
      // Range circle at ghost position
      this.entityGraphics.lineStyle(1, this.dragTower.color, 0.3);
      this.entityGraphics.strokeCircle(ghostX, ghostY, this.dragTower.range);
    }

    for (const enemy of this.engine.enemies) {
      const size = TILE_SIZE * 0.5;

      this.entityGraphics.fillStyle(enemy.color);
      this.entityGraphics.fillRect(
        enemy.x - size / 2, enemy.y - size / 2,
        size, size,
      );

      const barWidth = TILE_SIZE * 0.6;
      const barHeight = 4;
      const barY = enemy.y - size / 2 - 8;
      this.entityGraphics.fillStyle(0x333333);
      this.entityGraphics.fillRect(enemy.x - barWidth / 2, barY, barWidth, barHeight);

      const healthPct = enemy.health / enemy.maxHealth;
      const healthColor = healthPct > 0.5 ? 0x00ff00 : healthPct > 0.25 ? 0xffff00 : 0xff0000;
      this.entityGraphics.fillStyle(healthColor);
      this.entityGraphics.fillRect(enemy.x - barWidth / 2, barY, barWidth * healthPct, barHeight);
    }

    for (const proj of this.engine.projectiles) {
      this.entityGraphics.fillStyle(0xffffff);
      this.entityGraphics.fillCircle(proj.x, proj.y, 3);
    }
  }

  private updateUI(): void {
    this.moneyText.setText(`Money: $${this.engine.state.money}`);
    this.livesText.setText(`Lives: ${this.engine.state.lives}`);
    this.waveText.setText(
      `Wave: ${this.engine.waveManager.currentWave}/${this.engine.waveManager.totalWaves}`
    );

    if (this.engine.state.gameOver) {
      this.messageText.setText('GAME OVER');
      this.messageText.setColor('#ff0000');
    } else if (this.engine.state.victory) {
      this.messageText.setText('VICTORY!');
      this.messageText.setColor('#00ff00');
    }
  }
}
