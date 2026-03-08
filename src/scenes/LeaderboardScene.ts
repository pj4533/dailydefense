import Phaser from 'phaser';
import { Leaderboard, LeaderboardEntry } from '../logic/Leaderboard';
import { CANVAS_WIDTH } from '../config';

const ARCADE_FONT = '"Press Start 2P", monospace';

export class LeaderboardScene extends Phaser.Scene {
  private playerScore: number = 0;
  private playerInitials: string = '';
  private seed: number = 0;
  private seedLabel: string = '';
  private fromGame: boolean = false;
  private blinkTimer: number = 0;
  private blinkVisible: boolean = true;
  private highlightTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  init(data: { score: number; initials: string; seed: number; seedLabel: string; fromGame?: boolean }): void {
    this.playerScore = data.score ?? 0;
    this.playerInitials = data.initials ?? '';
    this.seed = data.seed ?? 0;
    this.seedLabel = data.seedLabel ?? '';
    this.fromGame = data.fromGame ?? false;
    this.highlightTexts = [];
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#06060f');
    const cx = CANVAS_WIDTH / 2;

    // Decorative double frame
    const frame = this.add.graphics();
    frame.fillStyle(0x004444);
    this.solidBorder(frame, 20, 15, CANVAS_WIDTH - 40, 545, 2);
    frame.fillStyle(0x220022);
    this.solidBorder(frame, 24, 19, CANVAS_WIDTH - 48, 537, 1);

    // Corner accents
    frame.fillStyle(0xaaaa00);
    frame.fillRect(22, 17, 14, 1);
    frame.fillRect(22, 17, 1, 10);
    frame.fillRect(CANVAS_WIDTH - 36, 17, 14, 1);
    frame.fillRect(CANVAS_WIDTH - 23, 17, 1, 10);
    frame.fillRect(22, 558, 14, 1);
    frame.fillRect(22, 549, 1, 10);
    frame.fillRect(CANVAS_WIDTH - 36, 558, 14, 1);
    frame.fillRect(CANVAS_WIDTH - 23, 549, 1, 10);

    // Title
    this.add.text(cx, 38, 'HIGH SCORES', {
      fontSize: '20px', color: '#ffff00', fontFamily: ARCADE_FONT,
      stroke: '#664400', strokeThickness: 4,
    }).setOrigin(0.5);

    // Seed label
    this.add.text(cx, 62, this.seedLabel, {
      fontSize: '10px', color: '#00ffff', fontFamily: ARCADE_FONT,
    }).setOrigin(0.5);

    const loadingText = this.add.text(cx, 280, 'LOADING...', {
      fontSize: '12px', color: '#444444', fontFamily: ARCADE_FONT,
    }).setOrigin(0.5);

    const leaderboard = new Leaderboard();
    leaderboard.getEntries(this.seed).then(entries => {
      loadingText.destroy();
      this.renderEntries(entries, cx);
    });
  }

  private solidBorder(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, t: number): void {
    g.fillRect(x, y, w, t);
    g.fillRect(x, y + h - t, w, t);
    g.fillRect(x, y + t, t, h - t * 2);
    g.fillRect(x + w - t, y + t, t, h - t * 2);
  }

  private renderEntries(entries: LeaderboardEntry[], cx: number): void {
    const startY = 100;
    const rowHeight = 30;

    // Header
    this.add.text(cx - 180, startY - 25, 'RANK', { fontSize: '8px', color: '#555555', fontFamily: ARCADE_FONT });
    this.add.text(cx - 40, startY - 25, 'NAME', { fontSize: '8px', color: '#555555', fontFamily: ARCADE_FONT });
    this.add.text(cx + 100, startY - 25, 'SCORE', { fontSize: '8px', color: '#555555', fontFamily: ARCADE_FONT });

    // Header separator
    const sep = this.add.graphics();
    sep.fillStyle(0x006666);
    sep.fillRect(50, startY - 12, CANVAS_WIDTH - 100, 1);

    const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
    const rankColorsHex = [0xffd700, 0xc0c0c0, 0xcd7f32];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const y = startY + i * rowHeight;
      const isPlayer = entry.initials === this.playerInitials && entry.score === this.playerScore;

      // Medal highlight for top 3
      if (i < 3) {
        const mc = rankColorsHex[i];
        const dimMedal = ((((mc >> 16) & 0xff) >> 2) << 16) | ((((mc >> 8) & 0xff) >> 2) << 8) | (((mc) & 0xff) >> 2);
        const medalG = this.add.graphics();
        medalG.fillStyle(dimMedal);
        medalG.fillRect(44, y - 2, CANVAS_WIDTH - 88, rowHeight - 4);
      }

      const rankColor = i < 3 ? rankColors[i] : '#ffff00';
      const nameColor = isPlayer ? '#ff00ff' : '#00ffff';
      const scoreColor = i < 3 ? rankColors[i] : '#ffffff';

      const rankText = this.add.text(cx - 170, y, `${i + 1}.`, { fontSize: '12px', color: rankColor, fontFamily: ARCADE_FONT });
      const nameText = this.add.text(cx - 40, y, entry.initials, { fontSize: '12px', color: nameColor, fontFamily: ARCADE_FONT });
      const entryScoreText = this.add.text(cx + 100, y, `${entry.score}`, { fontSize: '12px', color: scoreColor, fontFamily: ARCADE_FONT });

      if (isPlayer) {
        this.highlightTexts.push(rankText, nameText, entryScoreText);
      }

      // Row separator
      if (i < 9) {
        sep.fillStyle(0x181828);
        sep.fillRect(50, y + rowHeight - 5, CANVAS_WIDTH - 100, 1);
      }
    }

    // Empty rows
    for (let i = entries.length; i < 10; i++) {
      const y = startY + i * rowHeight;
      this.add.text(cx - 170, y, `${i + 1}.`, { fontSize: '12px', color: '#1a1a2a', fontFamily: ARCADE_FONT });
      this.add.text(cx - 40, y, '---', { fontSize: '12px', color: '#1a1a2a', fontFamily: ARCADE_FONT });
      this.add.text(cx + 100, y, '0', { fontSize: '12px', color: '#1a1a2a', fontFamily: ARCADE_FONT });
      if (i < 9) {
        sep.fillStyle(0x181828);
        sep.fillRect(50, y + rowHeight - 5, CANVAS_WIDTH - 100, 1);
      }
    }

    // Nav buttons
    const isViewOnly = this.playerInitials === '';
    const btnY = startY + 10 * rowHeight + 30;

    const resumeGame = () => {
      this.scene.stop();
      this.scene.wake('GameScene');
    };

    if (this.fromGame) {
      this.createNavButton(cx, btnY, 160, 44, 'BACK', 0xffff00, resumeGame);
    } else if (isViewOnly) {
      this.createNavButton(cx - 80, btnY, 230, 44, 'PLAY AGAIN', 0x00ff66, () => this.scene.start('GameScene'));
      this.createNavButton(cx + 140, btnY, 120, 44, 'BACK', 0xffff00, () => this.scene.start('GameScene'));
    } else {
      this.createNavButton(cx, btnY, 250, 44, 'PLAY AGAIN', 0x00ff66, () => this.scene.start('GameScene'));
    }

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (this.fromGame) {
        if (event.key === 'Enter' || event.key === 'Escape') resumeGame();
      } else {
        if (event.key === 'Enter' || event.key === 'Escape') this.scene.start('GameScene');
      }
    });
  }

  private drawNavGfx(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, hover: boolean): void {
    g.clear();

    const rc = (color >> 16) & 0xff;
    const gc = (color >> 8) & 0xff;
    const bc = color & 0xff;
    const dim = ((rc >> 1) << 16) | ((gc >> 1) << 8) | (bc >> 1);
    const quarter = ((rc >> 2) << 16) | ((gc >> 2) << 8) | (bc >> 2);
    const bright = (Math.min(255, rc + 80) << 16) | (Math.min(255, gc + 80) << 8) | Math.min(255, bc + 80);

    // Outer glow frame (hover)
    if (hover) {
      g.fillStyle(dim);
      this.solidBorder(g, x - 3, y - 3, w + 6, h + 6, 2);
    }

    // Drop shadow
    g.fillStyle(0x000000);
    g.fillRect(x + 3, y + h, w, 2);
    g.fillRect(x + w, y + 3, 2, h - 1);

    // Body
    g.fillStyle(hover ? 0x141430 : 0x0a0a1a);
    g.fillRect(x, y, w, h);

    // Top band
    g.fillStyle(hover ? 0x1e1e40 : 0x101024);
    g.fillRect(x + 2, y + 2, w - 4, Math.floor(h * 0.33));

    // Border (2px)
    g.fillStyle(hover ? color : dim);
    this.solidBorder(g, x, y, w, h, 2);

    // Top highlight
    g.fillStyle(hover ? bright : color);
    g.fillRect(x + 4, y, w - 8, 1);

    // Bottom shadow
    g.fillStyle(0x020208);
    g.fillRect(x + 4, y + h - 3, w - 8, 1);

    // Inner ring (hover)
    if (hover) {
      g.fillStyle(dim);
      this.solidBorder(g, x + 4, y + 4, w - 8, h - 8, 1);
    }
  }

  private createNavButton(centerX: number, centerY: number, w: number, h: number, label: string, borderColor: number, onClick: () => void): void {
    const x = centerX - w / 2;
    const y = centerY - h / 2;

    const g = this.add.graphics();
    this.drawNavGfx(g, x, y, w, h, borderColor, false);

    this.add.text(centerX, centerY, label, {
      fontSize: '10px', fontFamily: ARCADE_FONT,
      color: '#' + borderColor.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    const zone = this.add.zone(centerX, centerY, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', onClick);
    zone.on('pointerover', () => this.drawNavGfx(g, x, y, w, h, borderColor, true));
    zone.on('pointerout', () => this.drawNavGfx(g, x, y, w, h, borderColor, false));
  }

  update(_time: number, delta: number): void {
    this.blinkTimer += delta / 1000;
    if (this.blinkTimer >= 0.4) {
      this.blinkTimer = 0;
      this.blinkVisible = !this.blinkVisible;
      for (const text of this.highlightTexts) {
        text.setAlpha(this.blinkVisible ? 1 : 0.3);
      }
    }
  }
}
