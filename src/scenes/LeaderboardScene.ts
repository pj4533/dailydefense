import Phaser from 'phaser';
import { Leaderboard, LeaderboardEntry } from '../logic/Leaderboard';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';

export class LeaderboardScene extends Phaser.Scene {
  private playerScore: number = 0;
  private playerInitials: string = '';
  private seed: number = 0;
  private seedLabel: string = '';
  private blinkTimer: number = 0;
  private blinkVisible: boolean = true;
  private highlightTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  init(data: { score: number; initials: string; seed: number; seedLabel: string }): void {
    this.playerScore = data.score ?? 0;
    this.playerInitials = data.initials ?? '';
    this.seed = data.seed ?? 0;
    this.seedLabel = data.seedLabel ?? '';
    this.highlightTexts = [];
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#000000');
    const cx = CANVAS_WIDTH / 2;

    this.add.text(cx, 40, `HIGH SCORES - ${this.seedLabel}`, {
      fontSize: '36px',
      color: '#ffff00',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const loadingText = this.add.text(cx, 250, 'LOADING...', {
      fontSize: '18px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const leaderboard = new Leaderboard();
    leaderboard.getEntries(this.seed).then(entries => {
      loadingText.destroy();
      this.renderEntries(entries, cx);
    });
  }

  private renderEntries(entries: LeaderboardEntry[], cx: number): void {
    const startY = 100;
    const rowHeight = 32;

    // Header
    this.add.text(cx - 160, startY - 30, 'RANK', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    });
    this.add.text(cx - 40, startY - 30, 'NAME', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    });
    this.add.text(cx + 80, startY - 30, 'SCORE', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    });

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const y = startY + i * rowHeight;
      const isPlayer = entry.initials === this.playerInitials && entry.score === this.playerScore;

      const rankText = this.add.text(cx - 150, y, `${i + 1}.`, {
        fontSize: '18px', color: '#ffff00', fontFamily: 'monospace',
      });
      const nameText = this.add.text(cx - 40, y, entry.initials, {
        fontSize: '18px', color: '#00ffcc', fontFamily: 'monospace',
      });
      const scoreText = this.add.text(cx + 80, y, `${entry.score}`, {
        fontSize: '18px', color: '#ffffff', fontFamily: 'monospace',
      });

      if (isPlayer) {
        this.highlightTexts.push(rankText, nameText, scoreText);
      }
    }

    // Fill empty rows
    for (let i = entries.length; i < 10; i++) {
      const y = startY + i * rowHeight;
      this.add.text(cx - 150, y, `${i + 1}.`, {
        fontSize: '18px', color: '#444444', fontFamily: 'monospace',
      });
      this.add.text(cx - 40, y, '---', {
        fontSize: '18px', color: '#444444', fontFamily: 'monospace',
      });
      this.add.text(cx + 80, y, '0', {
        fontSize: '18px', color: '#444444', fontFamily: 'monospace',
      });
    }

    this.add.text(cx, startY + 10 * rowHeight + 30, 'PRESS ENTER TO PLAY AGAIN', {
      fontSize: '16px',
      color: '#44ff44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        this.scene.start('GameScene');
      }
    });
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
