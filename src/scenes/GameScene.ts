import Phaser from 'phaser';
import { GameEngine } from '../logic/GameEngine';
import { Tower } from '../logic/Tower';
import { Enemy } from '../logic/Enemy';
import { TowerType, CellType } from '../types';
import {
  TILE_SIZE, GRID_COLS, GRID_ROWS, GAME_HEIGHT,
  STARTING_MONEY, STARTING_LIVES,
  WAVES, TOWER_CONFIGS,
} from '../config';
import { generateRandomPath } from '../logic/MapGenerator';

// Map tower types to spritesheet keys and animation config
const TOWER_SPRITE: Record<string, { key: string; idle: string }> = {
  [TowerType.LADYBUG]: { key: 'ladybug', idle: 'ladybug_idle' },
  [TowerType.MANTIS]: { key: 'dragonfly', idle: 'dragonfly_idle' },
};

// Map enemy colors to spritesheet keys and animation config
const ENEMY_SPRITE: Record<number, { key: string; move: string; originY: number }> = {
  0x88cc44: { key: 'larva', move: 'larva_move', originY: 0.5 },         // aphid — centered in frame
  0x664422: { key: 'scarab', move: 'scarab_move', originY: 0.9 },       // ant — artwork sits low in frame
  0x336633: { key: 'rhino_beetle', move: 'rhino_move', originY: 0.9 },  // beetle — artwork sits low in frame
};

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private selectedTowerType: TowerType = TowerType.LADYBUG;

  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private towerSprites: Map<Tower, Phaser.GameObjects.Sprite> = new Map();
  private enemySprites: Map<Enemy, Phaser.GameObjects.Sprite> = new Map();
  private ghostSprite!: Phaser.GameObjects.Sprite;

  private moneyText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;

  private ladybugBtn!: Phaser.GameObjects.Text;
  private mantisBtn!: Phaser.GameObjects.Text;
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

  preload(): void {
    // Map tiles
    this.load.image('grass', 'assets/grass.png');
    this.load.image('path_h', 'assets/path_h.png');
    this.load.image('path_v', 'assets/path_v.png');
    this.load.image('path_corner_se', 'assets/path_corner_se.png');
    this.load.image('path_corner_sw', 'assets/path_corner_sw.png');
    this.load.image('path_corner_ne', 'assets/path_corner_ne.png');
    this.load.image('path_corner_nw', 'assets/path_corner_nw.png');

    // Spritesheets - all 32x32 frames
    // Ladybug: 256x192 = 8 cols x 6 rows (Idle, Idle2, Movement, Flight, Death, Death2)
    this.load.spritesheet('ladybug', 'assets/sprites/ladybug.png', { frameWidth: 32, frameHeight: 32 });
    // Dragonfly: 224x128 = 7 cols x 4 rows (Idle, Movement, Damage, Death)
    this.load.spritesheet('dragonfly', 'assets/sprites/dragonfly.png', { frameWidth: 32, frameHeight: 32 });
    // Bug Larva: 192x128 = 6 cols x 4 rows (Idle, Movement, Damage, Death)
    this.load.spritesheet('larva', 'assets/sprites/larva.png', { frameWidth: 32, frameHeight: 32 });
    // Scarab: 160x160 = 5 cols x 5 rows (Idle, Movement, Attack, Damage, Death)
    this.load.spritesheet('scarab', 'assets/sprites/scarab.png', { frameWidth: 32, frameHeight: 32 });
    // Giant Rhino Beetle: 256x160 = 8 cols x 5 rows (Idle, Movement, Attack, Damage, Death)
    this.load.spritesheet('rhino_beetle', 'assets/sprites/rhino_beetle.png', { frameWidth: 32, frameHeight: 32 });
  }

  create(): void {
    const waypoints = generateRandomPath(GRID_COLS, GRID_ROWS);
    this.engine = new GameEngine(
      GRID_COLS, GRID_ROWS, TILE_SIZE,
      waypoints, WAVES,
      STARTING_MONEY, STARTING_LIVES,
    );

    this.createAnimations();
    this.createGrid();

    this.ghostSprite = this.add.sprite(0, 0, 'ladybug');
    this.ghostSprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
    this.ghostSprite.setDepth(5);
    this.ghostSprite.setVisible(false);

    this.overlayGraphics = this.add.graphics();
    this.overlayGraphics.setDepth(10);

    this.createUI();

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
  }

  private createAnimations(): void {
    // Ladybug: 8 cols per row
    this.anims.create({
      key: 'ladybug_idle',
      frames: this.anims.generateFrameNumbers('ladybug', { start: 0, end: 7 }),
      frameRate: 8,
      repeat: -1,
    });

    // Dragonfly: 7 cols per row — row 0 has ~4 frames
    this.anims.create({
      key: 'dragonfly_idle',
      frames: this.anims.generateFrameNumbers('dragonfly', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });

    // Bug Larva: 6 cols per row — row 1 = movement
    this.anims.create({
      key: 'larva_move',
      frames: this.anims.generateFrameNumbers('larva', { start: 6, end: 11 }),
      frameRate: 10,
      repeat: -1,
    });

    // Scarab: 5 cols per row — row 1 = movement
    this.anims.create({
      key: 'scarab_move',
      frames: this.anims.generateFrameNumbers('scarab', { start: 5, end: 9 }),
      frameRate: 10,
      repeat: -1,
    });

    // Giant Rhino Beetle: 8 cols per row — row 1 = movement
    this.anims.create({
      key: 'rhino_move',
      frames: this.anims.generateFrameNumbers('rhino_beetle', { start: 8, end: 15 }),
      frameRate: 8,
      repeat: -1,
    });
  }

  private createGrid(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = col * TILE_SIZE + TILE_SIZE / 2;
        const y = row * TILE_SIZE + TILE_SIZE / 2;
        const key = this.getTileKey(col, row);
        this.add.image(x, y, key).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(0);
      }
    }
  }

  private getTileKey(col: number, row: number): string {
    if (this.engine.map.getCell(col, row) !== CellType.PATH) return 'grass';

    const hasN = this.engine.map.getCell(col, row - 1) === CellType.PATH;
    const hasS = this.engine.map.getCell(col, row + 1) === CellType.PATH;
    const hasE = this.engine.map.getCell(col + 1, row) === CellType.PATH;
    const hasW = this.engine.map.getCell(col - 1, row) === CellType.PATH;

    if (hasW && hasS && !hasN && !hasE) return 'path_corner_sw';
    if (hasN && hasE && !hasS && !hasW) return 'path_corner_ne';
    if (hasW && hasN && !hasS && !hasE) return 'path_corner_nw';
    if (hasS && hasE && !hasN && !hasW) return 'path_corner_se';
    if (hasN || hasS) return 'path_v';
    return 'path_h';
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

    this.ladybugBtn = this.add.text(10, btnY,
      ` Ladybug ($${TOWER_CONFIGS[TowerType.LADYBUG].cost}) `,
      { fontSize: '13px', color: '#ffffff', fontFamily: 'monospace', backgroundColor: '#cc4444' },
    ).setInteractive({ useHandCursor: true });

    this.mantisBtn = this.add.text(150, btnY,
      ` Mantis ($${TOWER_CONFIGS[TowerType.MANTIS].cost}) `,
      { fontSize: '13px', color: '#ffffff', fontFamily: 'monospace', backgroundColor: '#4a3728' },
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
      { fontSize: '32px', color: '#ffffff', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 4 },
    ).setOrigin(0.5).setDepth(20);

    this.ladybugBtn.on('pointerdown', () => {
      this.selectedTowerType = TowerType.LADYBUG;
      this.selectedTower = null;
      this.updateButtonHighlights();
      this.updateSellButton();
    });

    this.mantisBtn.on('pointerdown', () => {
      this.selectedTowerType = TowerType.MANTIS;
      this.selectedTower = null;
      this.updateButtonHighlights();
      this.updateSellButton();
    });

    startWaveBtn.on('pointerdown', () => {
      this.engine.startNextWave();
    });

    this.sellBtn.on('pointerdown', () => {
      if (this.selectedTower) {
        this.engine.removeTower(this.selectedTower.col, this.selectedTower.row);
        this.selectedTower = null;
        this.updateSellButton();
      }
    });

    this.updateButtonHighlights();
  }

  private updateButtonHighlights(): void {
    this.ladybugBtn.setBackgroundColor(
      this.selectedTowerType === TowerType.LADYBUG ? '#cc4444' : '#4a3728'
    );
    this.mantisBtn.setBackgroundColor(
      this.selectedTowerType === TowerType.MANTIS ? '#44aa44' : '#4a3728'
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

    if (this.selectedTower) {
      this.selectedTower = null;
      this.updateSellButton();
      return;
    }

    this.engine.placeTower(col, row, this.selectedTowerType);
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
    }
  }

  private handlePointerUp(_pointer: Phaser.Input.Pointer): void {
    if (!this.pointerDown) return;

    if (this.isDragging && this.dragTower) {
      this.engine.moveTower(
        this.dragStartCol, this.dragStartRow,
        this.dragGhostCol, this.dragGhostRow,
      );
      this.selectedTower = null;
      this.updateSellButton();
    } else if (this.dragTower) {
      if (this.selectedTower === this.dragTower) {
        this.selectedTower = null;
      } else {
        this.selectedTower = this.dragTower;
      }
      this.updateSellButton();
    }

    this.dragTower = null;
    this.isDragging = false;
    this.pointerDown = false;
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.engine.update(dt);

    if (this.selectedTower && !this.engine.towers.includes(this.selectedTower)) {
      this.selectedTower = null;
      this.updateSellButton();
    }

    this.syncTowerSprites();
    this.syncEnemySprites();
    this.drawOverlays();
    this.updateUI();
  }

  private syncTowerSprites(): void {
    for (const [tower, sprite] of this.towerSprites) {
      if (!this.engine.towers.includes(tower)) {
        sprite.destroy();
        this.towerSprites.delete(tower);
      }
    }

    for (const tower of this.engine.towers) {
      let sprite = this.towerSprites.get(tower);
      if (!sprite) {
        const cfg = TOWER_SPRITE[tower.type];
        sprite = this.add.sprite(tower.x, tower.y, cfg.key);
        sprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
        sprite.setDepth(2);
        sprite.play(cfg.idle);
        this.towerSprites.set(tower, sprite);
      }
      sprite.setPosition(tower.x, tower.y);
      const isDragSource = this.isDragging && this.dragTower === tower;
      sprite.setAlpha(isDragSource ? 0.3 : 1);
    }
  }

  private syncEnemySprites(): void {
    for (const [enemy, sprite] of this.enemySprites) {
      if (!this.engine.enemies.includes(enemy)) {
        sprite.destroy();
        this.enemySprites.delete(enemy);
      }
    }

    for (const enemy of this.engine.enemies) {
      let sprite = this.enemySprites.get(enemy);
      if (!sprite) {
        const cfg = ENEMY_SPRITE[enemy.color] || ENEMY_SPRITE[0x88cc44];
        sprite = this.add.sprite(enemy.x, enemy.y, cfg.key);
        sprite.setDisplaySize(TILE_SIZE * 0.8, TILE_SIZE * 0.8);
        sprite.setOrigin(0.5, cfg.originY);
        sprite.setDepth(3);
        sprite.play(cfg.move);
        this.enemySprites.set(enemy, sprite);
      }
      sprite.setPosition(enemy.x, enemy.y);

      // Flip sprite based on horizontal movement direction
      const path = this.engine.map.getPathWorldPositions();
      if (enemy.currentWaypointIndex < path.length) {
        const target = path[enemy.currentWaypointIndex];
        const dx = target.x - enemy.x;
        // Default sprites face right; flip when moving left
        if (Math.abs(dx) > 1) {
          sprite.setFlipX(dx < 0);
        }
      }
    }
  }

  private drawOverlays(): void {
    this.overlayGraphics.clear();

    for (const tower of this.engine.towers) {
      if (tower === this.selectedTower) {
        this.overlayGraphics.lineStyle(3, 0xffff00);
        this.overlayGraphics.strokeRect(
          tower.x - TILE_SIZE / 2, tower.y - TILE_SIZE / 2,
          TILE_SIZE, TILE_SIZE,
        );
        this.overlayGraphics.lineStyle(2, 0xffff00, 0.5);
        this.overlayGraphics.strokeCircle(tower.x, tower.y, tower.range);
        this.overlayGraphics.fillStyle(0xffff00, 0.08);
        this.overlayGraphics.fillCircle(tower.x, tower.y, tower.range);
      } else {
        this.overlayGraphics.lineStyle(1, 0xffffff, 0.2);
        this.overlayGraphics.strokeCircle(tower.x, tower.y, tower.range);
      }
    }

    if (this.isDragging && this.dragTower) {
      const ghostX = this.dragGhostCol * TILE_SIZE + TILE_SIZE / 2;
      const ghostY = this.dragGhostRow * TILE_SIZE + TILE_SIZE / 2;
      const cfg = TOWER_SPRITE[this.dragTower.type];

      this.ghostSprite.setTexture(cfg.key);
      this.ghostSprite.setPosition(ghostX, ghostY);
      this.ghostSprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
      this.ghostSprite.setAlpha(0.6);
      this.ghostSprite.setVisible(true);

      const canPlace = this.engine.map.canPlaceTower(this.dragGhostCol, this.dragGhostRow);
      this.overlayGraphics.fillStyle(canPlace ? 0x00ff00 : 0xff0000, 0.2);
      this.overlayGraphics.fillRect(
        this.dragGhostCol * TILE_SIZE, this.dragGhostRow * TILE_SIZE,
        TILE_SIZE, TILE_SIZE,
      );
      this.overlayGraphics.lineStyle(1, 0xffffff, 0.3);
      this.overlayGraphics.strokeCircle(ghostX, ghostY, this.dragTower.range);
    } else {
      this.ghostSprite.setVisible(false);
    }

    for (const enemy of this.engine.enemies) {
      const barWidth = TILE_SIZE * 0.6;
      const barHeight = 4;
      const size = TILE_SIZE * 0.8;
      const barY = enemy.y - size / 2 - 6;

      this.overlayGraphics.fillStyle(0x333333);
      this.overlayGraphics.fillRect(enemy.x - barWidth / 2, barY, barWidth, barHeight);

      const healthPct = enemy.health / enemy.maxHealth;
      const healthColor = healthPct > 0.5 ? 0x00ff00 : healthPct > 0.25 ? 0xffff00 : 0xff0000;
      this.overlayGraphics.fillStyle(healthColor);
      this.overlayGraphics.fillRect(enemy.x - barWidth / 2, barY, barWidth * healthPct, barHeight);
    }

    for (const proj of this.engine.projectiles) {
      this.overlayGraphics.fillStyle(0xffff00);
      this.overlayGraphics.fillCircle(proj.x, proj.y, 3);
    }
  }

  private updateUI(): void {
    this.moneyText.setText(`Money: $${this.engine.state.money}`);
    this.livesText.setText(`Lives: ${this.engine.state.lives}`);
    this.waveText.setText(
      `Wave: ${this.engine.waveManager.currentWave}/${this.engine.waveManager.totalWaves}`
    );

    if (this.engine.state.gameOver) {
      this.messageText.setText('GARDEN DESTROYED!');
      this.messageText.setColor('#ff4444');
    } else if (this.engine.state.victory) {
      this.messageText.setText('GARDEN SAVED!');
      this.messageText.setColor('#44ff44');
    }
  }
}
