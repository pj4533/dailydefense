import Phaser from 'phaser';
import { GameEngine } from '../logic/GameEngine';
import { Tower } from '../logic/Tower';
import { Enemy } from '../logic/Enemy';
import { TowerType, CellType } from '../types';
import {
  TILE_SIZE, GRID_COLS, GRID_ROWS, GAME_HEIGHT, UI_HEIGHT,
  STARTING_MONEY, STARTING_LIVES,
  TOWER_CONFIGS,
} from '../config';
import { generateRandomPath } from '../logic/MapGenerator';
import { generateWave } from '../logic/WaveGenerator';
import { mulberry32 } from '../logic/seedRng';
import { getDailySeed, getDailySeedLabel } from '../logic/dailySeed';
import { Leaderboard, SessionData } from '../logic/Leaderboard';

// Map tower types to spritesheet keys and animation config
const TOWER_SPRITE: Record<string, { key: string; idle: string }> = {
  [TowerType.LADYBUG]: { key: 'ladybug', idle: 'ladybug_idle' },
  [TowerType.MANTIS]: { key: 'dragonfly', idle: 'dragonfly_idle' },
};

// Map enemy colors to spritesheet keys and animation config
const ENEMY_SPRITE: Record<number, { key: string; move: string; originY: number }> = {
  0x88cc44: { key: 'larva', move: 'larva_move', originY: 0.5 },
  0x664422: { key: 'scarab', move: 'scarab_move', originY: 0.9 },
  0x336633: { key: 'rhino_beetle', move: 'rhino_move', originY: 0.9 },
};

const ARCADE_FONT = '"Press Start 2P", monospace';

interface ArcadeBtn {
  g: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  x: number; y: number; w: number; h: number;
  color: number;
}

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
  private scoreText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;

  private ladybugBtn!: ArcadeBtn;
  private mantisBtn!: ArcadeBtn;
  private sellBtn!: ArcadeBtn;
  private startWaveBtn!: ArcadeBtn;

  private selectedTower: Tower | null = null;
  private dragTower: Tower | null = null;
  private dragStartCol: number = 0;
  private dragStartRow: number = 0;
  private isDragging: boolean = false;
  private dragGhostCol: number = 0;
  private dragGhostRow: number = 0;
  private pointerDown: boolean = false;

  private gameOverTriggered: boolean = false;
  private gameOverTimer: number = 0;
  private seed: number = 0;
  private seedLabel: string = '';
  private sessionData: SessionData | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    this.load.image('grass', 'assets/grass.png');
    this.load.image('path_h', 'assets/path_h.png');
    this.load.image('path_v', 'assets/path_v.png');
    this.load.image('path_corner_se', 'assets/path_corner_se.png');
    this.load.image('path_corner_sw', 'assets/path_corner_sw.png');
    this.load.image('path_corner_ne', 'assets/path_corner_ne.png');
    this.load.image('path_corner_nw', 'assets/path_corner_nw.png');

    this.load.spritesheet('ladybug', 'assets/sprites/ladybug.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('dragonfly', 'assets/sprites/dragonfly.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('larva', 'assets/sprites/larva.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('scarab', 'assets/sprites/scarab.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('rhino_beetle', 'assets/sprites/rhino_beetle.png', { frameWidth: 32, frameHeight: 32 });
  }

  create(): void {
    this.towerSprites = new Map();
    this.enemySprites = new Map();
    this.selectedTower = null;
    this.dragTower = null;
    this.isDragging = false;
    this.pointerDown = false;
    this.gameOverTriggered = false;
    this.gameOverTimer = 0;
    this.sessionData = null;

    this.seed = getDailySeed();
    this.seedLabel = getDailySeedLabel();
    const rng = mulberry32(this.seed);
    const waypoints = generateRandomPath(GRID_COLS, GRID_ROWS, rng);
    this.engine = new GameEngine(
      GRID_COLS, GRID_ROWS, TILE_SIZE,
      waypoints, generateWave,
      STARTING_MONEY, STARTING_LIVES,
    );

    const leaderboard = new Leaderboard();
    leaderboard.startSession(this.seed).then(data => {
      this.sessionData = data;
    });

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
    this.anims.create({ key: 'ladybug_idle', frames: this.anims.generateFrameNumbers('ladybug', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'dragonfly_idle', frames: this.anims.generateFrameNumbers('dragonfly', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'larva_move', frames: this.anims.generateFrameNumbers('larva', { start: 6, end: 11 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'scarab_move', frames: this.anims.generateFrameNumbers('scarab', { start: 5, end: 9 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'rhino_move', frames: this.anims.generateFrameNumbers('rhino_beetle', { start: 8, end: 15 }), frameRate: 8, repeat: -1 });
  }

  private createGrid(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = col * TILE_SIZE + TILE_SIZE / 2;
        const y = row * TILE_SIZE + TILE_SIZE / 2;
        this.add.image(x, y, this.getTileKey(col, row)).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(0);
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

  // ═══════════════════════════════════════════
  //  HUD
  // ═══════════════════════════════════════════

  private createUI(): void {
    const cw = GRID_COLS * TILE_SIZE;
    const hud = this.add.graphics();

    // Dark panel
    hud.fillStyle(0x06060f);
    hud.fillRect(0, GAME_HEIGHT, cw, UI_HEIGHT);

    // Top border — 2px solid with 1px bright highlight
    hud.fillStyle(0x006666);
    hud.fillRect(0, GAME_HEIGHT, cw, 2);
    hud.fillStyle(0x00ffff);
    hud.fillRect(0, GAME_HEIGHT, cw, 1);

    // Separator line
    const sepY = GAME_HEIGHT + 20;
    hud.fillStyle(0x002a2a);
    hud.fillRect(8, sepY, cw - 16, 1);

    // Corner accents (pixel L-shapes)
    hud.fillStyle(0x008888);
    hud.fillRect(4, GAME_HEIGHT + 4, 12, 1);
    hud.fillRect(4, GAME_HEIGHT + 4, 1, 8);
    hud.fillRect(cw - 16, GAME_HEIGHT + 4, 12, 1);
    hud.fillRect(cw - 5, GAME_HEIGHT + 4, 1, 8);
    hud.fillRect(4, GAME_HEIGHT + UI_HEIGHT - 6, 12, 1);
    hud.fillRect(4, GAME_HEIGHT + UI_HEIGHT - 13, 1, 8);
    hud.fillRect(cw - 16, GAME_HEIGHT + UI_HEIGHT - 6, 12, 1);
    hud.fillRect(cw - 5, GAME_HEIGHT + UI_HEIGHT - 13, 1, 8);

    // Stats
    const statsY = GAME_HEIGHT + 7;
    const s = (color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontSize: '9px', color, fontFamily: ARCADE_FONT,
    });

    this.add.text(10, statsY, this.seedLabel, s('#00ffff'));
    this.moneyText = this.add.text(110, statsY, '', s('#00ff66'));
    this.livesText = this.add.text(230, statsY, '', s('#ff4444'));
    this.waveText = this.add.text(350, statsY, '', s('#00ffff'));
    this.scoreText = this.add.text(480, statsY, '', s('#ffff00'));

    // Action buttons — fill the width evenly
    const btnY = GAME_HEIGHT + 24;
    const btnH = 42;
    const gap = 8;

    this.ladybugBtn = this.makeArcadeBtn(6, btnY, 160, btnH,
      `LADYBUG $${TOWER_CONFIGS[TowerType.LADYBUG].cost}`, 0xff4444, () => {
        this.selectedTowerType = TowerType.LADYBUG;
        this.selectedTower = null;
        this.updateButtonHighlights();
        this.updateSellButton();
      });
    this.addBtnHover(this.ladybugBtn, () => this.updateButtonHighlights());

    this.mantisBtn = this.makeArcadeBtn(6 + 160 + gap, btnY, 160, btnH,
      `MANTIS $${TOWER_CONFIGS[TowerType.MANTIS].cost}`, 0x44ff44, () => {
        this.selectedTowerType = TowerType.MANTIS;
        this.selectedTower = null;
        this.updateButtonHighlights();
        this.updateSellButton();
      });
    this.addBtnHover(this.mantisBtn, () => this.updateButtonHighlights());

    this.startWaveBtn = this.makeArcadeBtn(6 + 2 * (160 + gap), btnY, 150, btnH,
      'START WAVE', 0x00ff66, () => {
        this.engine.startNextWave();
      });

    this.sellBtn = this.makeArcadeBtn(6 + 2 * (160 + gap) + 150 + gap, btnY, 120, btnH, '', 0xff4444, () => {
      if (this.selectedTower) {
        this.engine.removeTower(this.selectedTower.col, this.selectedTower.row);
        this.selectedTower = null;
        this.updateSellButton();
      }
    });
    this.sellBtn.g.setVisible(false);
    this.sellBtn.label.setVisible(false);
    this.sellBtn.zone.removeInteractive();

    const scoresBtn = this.makeArcadeBtn(cw - 6 - 130, btnY, 130, btnH, 'SCORES', 0xffff00, () => {
      this.scene.start('LeaderboardScene', {
        score: 0, initials: '', seed: this.seed, seedLabel: this.seedLabel,
      });
    });
    this.addBtnHover(scoresBtn);

    this.messageText = this.add.text(
      cw / 2, GAME_HEIGHT / 2, '',
      { fontSize: '24px', color: '#ffffff', fontFamily: ARCADE_FONT,
        stroke: '#000000', strokeThickness: 4 },
    ).setOrigin(0.5).setDepth(20);

    this.updateButtonHighlights();
  }

  // ── Pixel-perfect neon button renderer ──

  private drawBtnGfx(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, active: boolean): void {
    g.clear();

    const rc = (color >> 16) & 0xff;
    const gc = (color >> 8) & 0xff;
    const bc = color & 0xff;
    const dim = ((rc >> 1) << 16) | ((gc >> 1) << 8) | (bc >> 1);
    const quarter = ((rc >> 2) << 16) | ((gc >> 2) << 8) | (bc >> 2);
    const bright = (Math.min(255, rc + 80) << 16) | (Math.min(255, gc + 80) << 8) | Math.min(255, bc + 80);

    const solidBorder = (bx: number, by: number, bw: number, bh: number, t: number) => {
      g.fillRect(bx, by, bw, t);
      g.fillRect(bx, by + bh - t, bw, t);
      g.fillRect(bx, by + t, t, bh - t * 2);
      g.fillRect(bx + bw - t, by + t, t, bh - t * 2);
    };

    // Outer glow frame (active only)
    if (active) {
      g.fillStyle(dim);
      solidBorder(x - 3, y - 3, w + 6, h + 6, 2);
    }

    // Drop shadow
    g.fillStyle(0x000000);
    g.fillRect(x + 3, y + h, w, 2);
    g.fillRect(x + w, y + 3, 2, h - 1);

    // Body
    g.fillStyle(active ? 0x141430 : 0x0a0a1a);
    g.fillRect(x, y, w, h);

    // Top light band
    g.fillStyle(active ? 0x1e1e40 : 0x101024);
    g.fillRect(x + 2, y + 2, w - 4, Math.floor(h * 0.33));

    // Main border (2px solid)
    g.fillStyle(active ? color : dim);
    solidBorder(x, y, w, h, 2);

    // Top edge highlight (1px bright)
    g.fillStyle(active ? bright : color);
    g.fillRect(x + 4, y, w - 8, 1);

    // Bottom inner shadow
    g.fillStyle(0x020208);
    g.fillRect(x + 4, y + h - 3, w - 8, 1);

    // Inner ring (active only)
    if (active) {
      g.fillStyle(dim);
      solidBorder(x + 4, y + 4, w - 8, h - 8, 1);
    }
  }

  private makeArcadeBtn(x: number, y: number, w: number, h: number, label: string, borderColor: number, onClick: () => void): ArcadeBtn {
    const g = this.add.graphics();
    this.drawBtnGfx(g, x, y, w, h, borderColor, false);

    const text = this.add.text(x + w / 2, y + h / 2, label, {
      fontSize: '9px',
      color: '#' + borderColor.toString(16).padStart(6, '0'),
      fontFamily: ARCADE_FONT,
    }).setOrigin(0.5);

    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', onClick);

    return { g, label: text, zone, x, y, w, h, color: borderColor };
  }

  private addBtnHover(btn: ArcadeBtn, restoreCallback?: () => void): void {
    btn.zone.on('pointerover', () => {
      this.drawBtnGfx(btn.g, btn.x, btn.y, btn.w, btn.h, btn.color, true);
      btn.label.setColor('#ffffff');
    });
    btn.zone.on('pointerout', () => {
      if (restoreCallback) {
        restoreCallback();
      } else {
        this.drawBtnGfx(btn.g, btn.x, btn.y, btn.w, btn.h, btn.color, false);
        btn.label.setColor('#' + btn.color.toString(16).padStart(6, '0'));
      }
    });
  }

  private updateButtonHighlights(): void {
    const isLadybug = this.selectedTowerType === TowerType.LADYBUG;

    this.drawBtnGfx(this.ladybugBtn.g, this.ladybugBtn.x, this.ladybugBtn.y,
      this.ladybugBtn.w, this.ladybugBtn.h, 0xff4444, isLadybug);
    this.ladybugBtn.label.setColor(isLadybug ? '#ffffff' : '#cc4444');

    this.drawBtnGfx(this.mantisBtn.g, this.mantisBtn.x, this.mantisBtn.y,
      this.mantisBtn.w, this.mantisBtn.h, 0x44ff44, !isLadybug);
    this.mantisBtn.label.setColor(!isLadybug ? '#ffffff' : '#44cc44');
  }

  private updateSellButton(): void {
    if (this.selectedTower) {
      const value = this.engine.getSellValue(this.selectedTower);
      this.sellBtn.label.setText(`SELL $${value}`);
      this.sellBtn.g.setVisible(true);
      this.sellBtn.label.setVisible(true);
      this.sellBtn.zone.setInteractive({ useHandCursor: true });
      this.drawBtnGfx(this.sellBtn.g, this.sellBtn.x, this.sellBtn.y,
        this.sellBtn.w, this.sellBtn.h, 0xff4444, false);
      this.sellBtn.label.setColor('#ff4444');
    } else {
      this.sellBtn.g.setVisible(false);
      this.sellBtn.label.setVisible(false);
      this.sellBtn.zone.removeInteractive();
    }
  }

  // ═══════════════════════════════════════════
  //  Input
  // ═══════════════════════════════════════════

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
    if (!this.isDragging && Math.sqrt(dx * dx + dy * dy) >= TILE_SIZE / 2) {
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
      this.engine.moveTower(this.dragStartCol, this.dragStartRow, this.dragGhostCol, this.dragGhostRow);
      this.selectedTower = null;
      this.updateSellButton();
    } else if (this.dragTower) {
      this.selectedTower = this.selectedTower === this.dragTower ? null : this.dragTower;
      this.updateSellButton();
    }
    this.dragTower = null;
    this.isDragging = false;
    this.pointerDown = false;
  }

  // ═══════════════════════════════════════════
  //  Game Loop
  // ═══════════════════════════════════════════

  update(time: number, delta: number): void {
    const dt = delta / 1000;

    if (this.gameOverTriggered) {
      this.gameOverTimer -= dt;
      if (this.gameOverTimer <= 0) {
        this.scene.start('GameOverScene', {
          score: this.engine.state.score,
          seed: this.seed,
          seedLabel: this.seedLabel,
          sessionId: this.sessionData?.sessionId ?? '',
          secret: this.sessionData?.secret ?? '',
        });
      }
      return;
    }

    // Pulse Start Wave button
    const btn = this.startWaveBtn;
    const pulse = (Math.sin(time / 500) + 1) / 2;
    const pGreen = Math.floor(0x55 + pulse * 0xaa);
    const pBlue = Math.floor(0x22 + pulse * 0x44);
    const pulseColor = (pGreen << 8) | pBlue;
    this.drawBtnGfx(btn.g, btn.x, btn.y, btn.w, btn.h, pulseColor, pulse > 0.6);
    btn.label.setColor(`#00${pGreen.toString(16).padStart(2, '0')}${pBlue.toString(16).padStart(2, '0')}`);

    this.engine.update(dt);

    if (this.selectedTower && !this.engine.towers.includes(this.selectedTower)) {
      this.selectedTower = null;
      this.updateSellButton();
    }

    this.syncTowerSprites();
    this.syncEnemySprites();
    this.drawOverlays();
    this.updateUI();

    if (this.engine.state.gameOver && !this.gameOverTriggered) {
      this.gameOverTriggered = true;
      this.gameOverTimer = 1.5;
      this.messageText.setText('GARDEN DESTROYED!');
      this.messageText.setColor('#ff4444');
    }
  }

  // ═══════════════════════════════════════════
  //  Rendering
  // ═══════════════════════════════════════════

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
      sprite.setAlpha(this.isDragging && this.dragTower === tower ? 0.3 : 1);
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
      const path = this.engine.map.getPathWorldPositions();
      if (enemy.currentWaypointIndex < path.length) {
        const dx = path[enemy.currentWaypointIndex].x - enemy.x;
        if (Math.abs(dx) > 1) sprite.setFlipX(dx < 0);
      }
    }
  }

  private drawOverlays(): void {
    this.overlayGraphics.clear();

    for (const tower of this.engine.towers) {
      if (tower === this.selectedTower) {
        this.overlayGraphics.lineStyle(3, 0xffff00);
        this.overlayGraphics.strokeRect(tower.x - TILE_SIZE / 2, tower.y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
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
      this.ghostSprite.setTexture(TOWER_SPRITE[this.dragTower.type].key);
      this.ghostSprite.setPosition(ghostX, ghostY);
      this.ghostSprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
      this.ghostSprite.setAlpha(0.6);
      this.ghostSprite.setVisible(true);
      const canPlace = this.engine.map.canPlaceTower(this.dragGhostCol, this.dragGhostRow);
      this.overlayGraphics.fillStyle(canPlace ? 0x00ff00 : 0xff0000, 0.2);
      this.overlayGraphics.fillRect(this.dragGhostCol * TILE_SIZE, this.dragGhostRow * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      this.overlayGraphics.lineStyle(1, 0xffffff, 0.3);
      this.overlayGraphics.strokeCircle(ghostX, ghostY, this.dragTower.range);
    } else {
      this.ghostSprite.setVisible(false);
    }

    for (const enemy of this.engine.enemies) {
      const barWidth = TILE_SIZE * 0.6;
      const barY = enemy.y - TILE_SIZE * 0.4 - 6;
      this.overlayGraphics.fillStyle(0x333333);
      this.overlayGraphics.fillRect(enemy.x - barWidth / 2, barY, barWidth, 4);
      const pct = enemy.health / enemy.maxHealth;
      this.overlayGraphics.fillStyle(pct > 0.5 ? 0x00ff00 : pct > 0.25 ? 0xffff00 : 0xff0000);
      this.overlayGraphics.fillRect(enemy.x - barWidth / 2, barY, barWidth * pct, 4);
    }

    for (const proj of this.engine.projectiles) {
      this.overlayGraphics.fillStyle(0xffff00);
      this.overlayGraphics.fillCircle(proj.x, proj.y, 3);
    }
  }

  private updateUI(): void {
    this.moneyText.setText(`$${this.engine.state.money}`);
    this.livesText.setText(`HP ${this.engine.state.lives}`);
    this.waveText.setText(`WAVE ${this.engine.waveManager.currentWave}`);
    this.scoreText.setText(`${this.engine.state.score} PTS`);
  }
}
