import Phaser from 'phaser';
import { Leaderboard } from '../logic/Leaderboard';
import { layout } from '../layout';

const ARCADE_FONT = '"Press Start 2P", monospace';

export class GameOverScene extends Phaser.Scene {
  private score: number = 0;
  private seed: number = 0;
  private seedLabel: string = '';
  private sessionId: string = '';
  private secret: string = '';
  private initials: string[] = [];
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private cursorGraphics!: Phaser.GameObjects.Graphics;
  private leaderboard!: Leaderboard;
  private confirmed: boolean = false;
  private blinkTimer: number = 0;
  private blinkVisible: boolean = true;

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
    this.blinkTimer = 0;
    this.blinkVisible = true;
  }

  create(): void {
    this.leaderboard = new Leaderboard();
    this.cameras.main.setBackgroundColor('#06060f');

    const { canvasWidth, canvasHeight, isMobile } = layout;
    const cx = canvasWidth / 2;
    const frameH = canvasHeight - 31;

    // Decorative frame
    const frame = this.add.graphics();
    frame.fillStyle(0x440000);
    this.solidBorder(frame, 20, 15, canvasWidth - 40, frameH, 2);
    frame.fillStyle(0x220022);
    this.solidBorder(frame, 24, 19, canvasWidth - 48, frameH - 8, 1);

    // Site title
    this.add.text(cx, 35, 'DAILY DEFENSE', {
      fontSize: '14px', color: '#00ffff', fontFamily: ARCADE_FONT,
      stroke: '#003333', strokeThickness: 3,
    }).setOrigin(0.5);

    // Title
    this.add.text(cx, isMobile ? 65 : 70, 'GAME OVER', {
      fontSize: isMobile ? '28px' : '32px', color: '#ff4444', fontFamily: ARCADE_FONT,
      stroke: '#440000', strokeThickness: 6,
    }).setOrigin(0.5);

    // Score
    this.add.text(cx, isMobile ? 115 : 130, `SCORE: ${this.score}`, {
      fontSize: isMobile ? '16px' : '18px', color: '#00ffff', fontFamily: ARCADE_FONT,
      stroke: '#003333', strokeThickness: 4,
    }).setOrigin(0.5);

    // Prompt
    this.add.text(cx, isMobile ? 160 : 185, 'ENTER YOUR INITIALS', {
      fontSize: '10px', color: '#00ff66', fontFamily: ARCADE_FONT,
    }).setOrigin(0.5);

    // Initial slots
    const slotBoxes = this.add.graphics();
    this.cursorGraphics = this.add.graphics();

    const slotW = isMobile ? 60 : 50;
    const slotH = isMobile ? 66 : 56;
    const slotGap = 14;
    const totalSlotW = 3 * slotW + 2 * slotGap;
    const slotStartX = cx - totalSlotW / 2;
    const slotY = isMobile ? 185 : 215;

    for (let i = 0; i < 3; i++) {
      const sx = slotStartX + i * (slotW + slotGap);

      // Slot body
      slotBoxes.fillStyle(0x0a0a1a);
      slotBoxes.fillRect(sx, slotY, slotW, slotH);

      // Slot border (2px solid cyan)
      slotBoxes.fillStyle(0x00aaaa);
      this.solidBorder(slotBoxes, sx, slotY, slotW, slotH, 2);

      // Top highlight
      slotBoxes.fillStyle(0x00ffff);
      slotBoxes.fillRect(sx + 4, slotY, slotW - 8, 1);

      const slot = this.add.text(sx + slotW / 2, slotY + slotH / 2, '_', {
        fontSize: '28px', color: '#00ffff', fontFamily: ARCADE_FONT,
      }).setOrigin(0.5);
      this.slotTexts.push(slot);
    }

    // Instructions
    const instrY = slotY + slotH + 18;
    this.add.text(cx, instrY, 'TAP LETTERS OR USE KEYBOARD', {
      fontSize: '7px', color: '#444444', fontFamily: ARCADE_FONT,
    }).setOrigin(0.5);

    // Virtual keyboard
    const rows = ['ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ'];
    const keyW = isMobile ? 52 : 40;
    const keyH = isMobile ? 52 : 40;
    const keyGap = 4;
    const kbStartY = instrY + 22;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const isLastRow = r === 2;
      const totalKeys = isLastRow ? row.length + 2 : row.length;
      const rowW = totalKeys * keyW + (totalKeys - 1) * keyGap;
      const rowStartX = cx - rowW / 2;
      const rowY = kbStartY + r * (keyH + keyGap);

      for (let k = 0; k < row.length; k++) {
        const letter = row[k];
        const kx = rowStartX + k * (keyW + keyGap);
        this.createVirtualKey(kx, rowY, keyW, keyH, letter, 0x00ffff, () => {
          if (!this.confirmed && this.initials.length < 3) {
            this.initials.push(letter);
            this.updateSlots();
          }
        });
      }

      if (isLastRow) {
        const delX = rowStartX + row.length * (keyW + keyGap);
        this.createVirtualKey(delX, rowY, keyW, keyH, 'DEL', 0xff4444, () => {
          if (!this.confirmed && this.initials.length > 0) {
            this.initials.pop();
            this.updateSlots();
          }
        });
        const okX = delX + keyW + keyGap;
        this.createVirtualKey(okX, rowY, keyW, keyH, 'OK', 0x00ff66, () => {
          this.confirmInitials();
        });
      }
    }

    // Physical keyboard
    this.input.keyboard!.on('keydown', this.handleKey, this);
    this.game.canvas.focus();
    this.game.canvas.setAttribute('tabindex', '0');
    this.input.on('pointerdown', () => this.game.canvas.focus());
  }

  private solidBorder(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, t: number): void {
    g.fillRect(x, y, w, t);
    g.fillRect(x, y + h - t, w, t);
    g.fillRect(x, y + t, t, h - t * 2);
    g.fillRect(x + w - t, y + t, t, h - t * 2);
  }

  private drawKeyGfx(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, hover: boolean): void {
    g.clear();

    const rc = (color >> 16) & 0xff;
    const gc = (color >> 8) & 0xff;
    const bc = color & 0xff;
    const dim = ((rc >> 1) << 16) | ((gc >> 1) << 8) | (bc >> 1);
    const bright = (Math.min(255, rc + 80) << 16) | (Math.min(255, gc + 80) << 8) | Math.min(255, bc + 80);

    // Body
    g.fillStyle(hover ? 0x141430 : 0x08081a);
    g.fillRect(x, y, w, h);

    // Border (1px)
    g.fillStyle(hover ? color : dim);
    g.fillRect(x, y, w, 1);
    g.fillRect(x, y + h - 1, w, 1);
    g.fillRect(x, y + 1, 1, h - 2);
    g.fillRect(x + w - 1, y + 1, 1, h - 2);

    // Top highlight
    if (hover) {
      g.fillStyle(bright);
      g.fillRect(x + 2, y, w - 4, 1);
    }

    // Bottom shadow
    g.fillStyle(0x000000);
    g.fillRect(x + 1, y + h, w, 1);
    g.fillRect(x + w, y + 1, 1, h);
  }

  private createVirtualKey(x: number, y: number, w: number, h: number, label: string, borderColor: number, onClick: () => void): void {
    const g = this.add.graphics();
    this.drawKeyGfx(g, x, y, w, h, borderColor, false);

    const fontSize = label.length > 1 ? '7px' : '12px';
    this.add.text(x + w / 2, y + h / 2, label, {
      fontSize, fontFamily: ARCADE_FONT,
      color: '#' + borderColor.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', onClick);
    zone.on('pointerover', () => this.drawKeyGfx(g, x, y, w, h, borderColor, true));
    zone.on('pointerout', () => this.drawKeyGfx(g, x, y, w, h, borderColor, false));
  }

  private handleKey(event: KeyboardEvent): void {
    if (this.confirmed) return;
    if (event.key === 'Backspace') {
      if (this.initials.length > 0) { this.initials.pop(); this.updateSlots(); }
      return;
    }
    if (event.key === 'Enter') { this.confirmInitials(); return; }
    if (/^[a-zA-Z]$/.test(event.key) && this.initials.length < 3) {
      this.initials.push(event.key.toUpperCase());
      this.updateSlots();
    }
  }

  private confirmInitials(): void {
    if (this.confirmed || this.initials.length !== 3) return;
    this.confirmed = true;
    const initialsStr = this.initials.join('');
    this.leaderboard.addEntry(this.seed, initialsStr, this.score, this.sessionId, this.secret).then(() => {
      this.scene.start('LeaderboardScene', {
        score: this.score, initials: initialsStr,
        seed: this.seed, seedLabel: this.seedLabel,
      });
    });
  }

  private updateSlots(): void {
    for (let i = 0; i < 3; i++) {
      this.slotTexts[i].setText(this.initials[i] ?? '_');
    }
  }

  update(_time: number, delta: number): void {
    this.blinkTimer += delta / 1000;
    if (this.blinkTimer >= 0.4) {
      this.blinkTimer = 0;
      this.blinkVisible = !this.blinkVisible;
    }

    this.cursorGraphics.clear();
    if (!this.confirmed && this.initials.length < 3) {
      const { isMobile } = layout;
      const slotW = isMobile ? 60 : 50;
      const slotGap = 14;
      const totalSlotW = 3 * slotW + 2 * slotGap;
      const slotStartX = layout.canvasWidth / 2 - totalSlotW / 2;
      const slotY = isMobile ? 185 : 215;
      const slotH = isMobile ? 66 : 56;
      const idx = this.initials.length;
      const cx = slotStartX + idx * (slotW + slotGap);

      if (this.blinkVisible) {
        // Magenta cursor highlight
        this.cursorGraphics.fillStyle(0xff00ff);
        this.solidBorder(this.cursorGraphics, cx - 1, slotY - 1, slotW + 2, slotH + 2, 2);
      }
    }
  }
}
