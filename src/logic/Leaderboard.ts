import { LEADERBOARD_MAX_ENTRIES } from '../config';

export interface LeaderboardEntry {
  initials: string;
  score: number;
}

export class Leaderboard {
  async getEntries(seed: number): Promise<LeaderboardEntry[]> {
    try {
      const res = await fetch(`/api/leaderboard?seed=${seed}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data
        .filter(
          (e: unknown): e is LeaderboardEntry =>
            typeof e === 'object' &&
            e !== null &&
            typeof (e as LeaderboardEntry).initials === 'string' &&
            typeof (e as LeaderboardEntry).score === 'number',
        )
        .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.score - a.score)
        .slice(0, LEADERBOARD_MAX_ENTRIES);
    } catch {
      return [];
    }
  }

  async addEntry(seed: number, initials: string, score: number): Promise<number> {
    const cleaned = initials.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
    if (cleaned.length !== 3) return -1;

    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed, initials: cleaned, score }),
      });
      if (!res.ok) return -1;
      const data = await res.json();
      return typeof data.rank === 'number' ? data.rank : -1;
    } catch {
      return -1;
    }
  }

  async isHighScore(seed: number, score: number): Promise<boolean> {
    const entries = await this.getEntries(seed);
    if (entries.length < LEADERBOARD_MAX_ENTRIES) return true;
    return score > entries[entries.length - 1].score;
  }
}
