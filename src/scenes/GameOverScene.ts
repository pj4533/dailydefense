import Phaser from 'phaser';
import { Leaderboard } from '../logic/Leaderboard';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';

export class GameOverScene extends Phaser.Scene {
  private score: number = 0;
  private seed: number = 0;
  private seedLabel: string = '';
  private sessionId: string = '';
  private secret: string = '';
  private initials: string[] = [];
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private leaderboard!: Leaderboard;
  private confirmed: boolean = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score: number; seed: number; seedLabel: string; sessionId: string; secret: string }): void {
    this.score = data.score ?? 0;
    this.seed = data.seed ?? 0;
    this.seedLabel = data.seedLabel ?? '';
    this.sessionId = data.sessionId ?? '';
    this.secret = data.secret ?? '';
    this.initials = [];
    this.slotTexts = [];
    this.confirmed = false;
  }

  create(): void {
    this.leaderboard = new Leaderboard();
    this.cameras.main.setBackgroundColor('#000000');

    const cx = CANVAS_WIDTH / 2;

    this.add.text(cx, 80, 'GAME OVER', {
      fontSize: '48px',
      color: '#ff4444',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, 140, `YOUR SCORE: ${this.score}`, {
      fontSize: '24px',
      color: '#00ffcc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, 200, 'ENTER YOUR INITIALS', {
      fontSize: '18px',
      color: '#44ff44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Three letter slots
    const slotSpacing = 50;
    const slotStartX = cx - slotSpacing;
    for (let i = 0; i < 3; i++) {
      const slot = this.add.text(slotStartX + i * slotSpacing, 260, '_', {
        fontSize: '40px',
        color: '#00ffcc',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.slotTexts.push(slot);
    }

    this.add.text(cx, 340, 'TYPE A-Z, BACKSPACE TO DELETE', {
      fontSize: '12px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, 370, 'PRESS ENTER WHEN DONE', {
      fontSize: '12px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.input.keyboard!.on('keydown', this.handleKey, this);

    // Ensure canvas has keyboard focus
    this.game.canvas.focus();
    this.game.canvas.setAttribute('tabindex', '0');
    this.input.on('pointerdown', () => {
      this.game.canvas.focus();
    });
  }

  private handleKey(event: KeyboardEvent): void {
    if (this.confirmed) return;

    if (event.key === 'Backspace') {
      if (this.initials.length > 0) {
        this.initials.pop();
        this.updateSlots();
      }
      return;
    }

    if (event.key === 'Enter') {
      if (this.initials.length === 3) {
        this.confirmed = true;
        const initialsStr = this.initials.join('');
        this.leaderboard.addEntry(this.seed, initialsStr, this.score, this.sessionId, this.secret).then(() => {
          this.scene.start('LeaderboardScene', {
            score: this.score,
            initials: initialsStr,
            seed: this.seed,
            seedLabel: this.seedLabel,
          });
        });
      }
      return;
    }

    if (/^[a-zA-Z]$/.test(event.key) && this.initials.length < 3) {
      this.initials.push(event.key.toUpperCase());
      this.updateSlots();
    }
  }

  private updateSlots(): void {
    for (let i = 0; i < 3; i++) {
      this.slotTexts[i].setText(this.initials[i] ?? '_');
    }
  }
}
