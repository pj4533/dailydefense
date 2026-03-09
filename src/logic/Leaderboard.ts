import { LEADERBOARD_MAX_ENTRIES } from '../config';
import { TowerType } from '../types';
import { WaveAction } from './WaveAction';

export interface LeaderboardEntry {
  initials: string;
  score: number;
  isAgent?: boolean;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  error: boolean;
}

export interface ActivePlayers {
  humans: number;
  agents: number;
}

export interface SessionData {
  sessionId: string;
  activePlayers?: ActivePlayers;
}

export class Leaderboard {
  async startSession(seed: number): Promise<SessionData | null> {
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        sessionId: data.sessionId,
        activePlayers: data.activePlayers,
      };
    } catch {
      return null;
    }
  }

  async getEntries(seed: number): Promise<LeaderboardResult> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`/api/leaderboard?seed=${seed}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (!Array.isArray(data)) continue;
        const entries = data
          .filter(
            (e: unknown): e is LeaderboardEntry =>
              typeof e === 'object' &&
              e !== null &&
              typeof (e as LeaderboardEntry).initials === 'string' &&
              typeof (e as LeaderboardEntry).score === 'number',
          )
          .map(e => ({
            initials: e.initials,
            score: e.score,
            isAgent: (e as { isAgent?: boolean }).isAgent === true,
          }))
          .slice(0, LEADERBOARD_MAX_ENTRIES);
        return { entries, error: false };
      } catch {
        // Retry on first attempt, give up on second
      }
    }
    return { entries: [], error: true };
  }

  async placeTower(sessionId: string, col: number, row: number, type: TowerType): Promise<boolean> {
    try {
      const res = await fetch('/api/session/place-tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, col, row, type }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async sellTower(sessionId: string, col: number, row: number): Promise<boolean> {
    try {
      const res = await fetch('/api/session/sell-tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, col, row }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async moveTower(sessionId: string, fromCol: number, fromRow: number, toCol: number, toRow: number): Promise<boolean> {
    try {
      const res = await fetch('/api/session/move-tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, fromCol, fromRow, toCol, toRow }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async startWave(sessionId: string): Promise<boolean> {
    try {
      const res = await fetch('/api/session/start-wave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async completeWave(sessionId: string, actions: WaveAction[]): Promise<{ waveResult: unknown; state: { money: number; lives: number; score: number; currentWave: number; gameOver: boolean; towers: { col: number; row: number; type: TowerType }[] }; activePlayers?: ActivePlayers } | null> {
    try {
      const res = await fetch('/api/session/wave-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, actions }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async submitScore(sessionId: string, initials: string): Promise<{ rank: number; score: number }> {
    const cleaned = initials.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
    if (cleaned.length !== 3) return { rank: -1, score: 0 };

    try {
      const res = await fetch('/api/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, initials: cleaned }),
      });
      if (!res.ok) return { rank: -1, score: 0 };
      const data = await res.json();
      return {
        rank: typeof data.rank === 'number' ? data.rank : -1,
        score: typeof data.score === 'number' ? data.score : 0,
      };
    } catch {
      return { rank: -1, score: 0 };
    }
  }

  async isHighScore(seed: number, score: number): Promise<boolean> {
    const result = await this.getEntries(seed);
    if (result.error) return true; // Assume high score on error so user can enter initials
    if (result.entries.length < LEADERBOARD_MAX_ENTRIES) return true;
    return score > result.entries[result.entries.length - 1].score;
  }
}
