import { LEADERBOARD_MAX_ENTRIES } from '../config';

export interface LeaderboardEntry {
  initials: string;
  score: number;
}

export interface SessionData {
  sessionId: string;
  secret: string;
}

async function computeHmac(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, msgData);
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
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
      return { sessionId: data.sessionId, secret: data.secret };
    } catch {
      return null;
    }
  }

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
        .slice(0, LEADERBOARD_MAX_ENTRIES);
    } catch {
      return [];
    }
  }

  async addEntry(
    seed: number,
    initials: string,
    score: number,
    sessionId: string,
    secret: string,
  ): Promise<number> {
    const cleaned = initials.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
    if (cleaned.length !== 3) return -1;

    try {
      const signature = await computeHmac(secret, `${seed}:${score}:${sessionId}`);
      const res = await fetch('/api/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, seed, initials: cleaned, score, signature }),
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
