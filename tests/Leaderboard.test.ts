import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Leaderboard } from '../src/logic/Leaderboard';
import { TowerType } from '../src/types';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
});

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
  });
}

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEntries', () => {
    it('returns entries from API', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([
        { initials: 'AAA', score: 200 },
        { initials: 'BBB', score: 100 },
      ]));
      const lb = new Leaderboard();
      const result = await lb.getEntries(20260307);
      expect(result.error).toBe(false);
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].score).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith('/api/leaderboard?seed=20260307', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    });

    it('returns error on fetch failure after retry', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'));
      mockFetch.mockRejectedValueOnce(new Error('network'));
      const lb = new Leaderboard();
      const result = await lb.getEntries(20260307);
      expect(result.error).toBe(true);
      expect(result.entries).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries once on non-ok response then succeeds', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([], false));
      mockFetch.mockReturnValueOnce(jsonResponse([
        { initials: 'AAA', score: 100 },
      ]));
      const lb = new Leaderboard();
      const result = await lb.getEntries(20260307);
      expect(result.error).toBe(false);
      expect(result.entries).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('returns error after two non-ok responses', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([], false));
      mockFetch.mockReturnValueOnce(jsonResponse([], false));
      const lb = new Leaderboard();
      const result = await lb.getEntries(20260307);
      expect(result.error).toBe(true);
      expect(result.entries).toEqual([]);
    });

    it('filters invalid entries', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([
        { initials: 'AAA', score: 100 },
        { bad: 'entry' },
        { initials: 123, score: 'wrong' },
      ]));
      const lb = new Leaderboard();
      const result = await lb.getEntries(20260307);
      expect(result.entries).toHaveLength(1);
    });

    it('preserves server order (already sorted by score descending)', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([
        { initials: 'HIG', score: 500 },
        { initials: 'MID', score: 200 },
        { initials: 'LOW', score: 50 },
      ]));
      const lb = new Leaderboard();
      const result = await lb.getEntries(20260307);
      expect(result.entries.map(e => e.score)).toEqual([500, 200, 50]);
    });
  });

  describe('startSession', () => {
    it('returns session data on success', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ sessionId: 'abc', activePlayers: { humans: 1, agents: 0 } }));
      const lb = new Leaderboard();
      const session = await lb.startSession(20260307);
      expect(session).toEqual({ sessionId: 'abc', activePlayers: { humans: 1, agents: 0 } });
      expect(mockFetch).toHaveBeenCalledWith('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"seed":20260307'),
      });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.playerId).toEqual(expect.any(String));
    });

    it('returns null on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'));
      const lb = new Leaderboard();
      expect(await lb.startSession(20260307)).toBeNull();
    });

    it('returns null on non-ok response', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({}, false));
      const lb = new Leaderboard();
      expect(await lb.startSession(20260307)).toBeNull();
    });
  });

  describe('placeTower', () => {
    it('sends place tower request', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true }));
      const lb = new Leaderboard();
      const result = await lb.placeTower('session-1', 3, 4, TowerType.LADYBUG);
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/session/place-tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session-1', col: 3, row: 4, type: 'ladybug' }),
      });
    });

    it('returns false on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'));
      const lb = new Leaderboard();
      expect(await lb.placeTower('s', 0, 0, TowerType.LADYBUG)).toBe(false);
    });
  });

  describe('sellTower', () => {
    it('sends sell tower request', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true }));
      const lb = new Leaderboard();
      const result = await lb.sellTower('session-1', 3, 4);
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/session/sell-tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session-1', col: 3, row: 4 }),
      });
    });

    it('returns false on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'));
      const lb = new Leaderboard();
      expect(await lb.sellTower('s', 0, 0)).toBe(false);
    });
  });

  describe('moveTower', () => {
    it('sends move tower request', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true }));
      const lb = new Leaderboard();
      const result = await lb.moveTower('session-1', 1, 2, 3, 4);
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/session/move-tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session-1', fromCol: 1, fromRow: 2, toCol: 3, toRow: 4 }),
      });
    });

    it('returns false on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'));
      const lb = new Leaderboard();
      expect(await lb.moveTower('s', 0, 0, 1, 1)).toBe(false);
    });
  });

  describe('startWave', () => {
    it('sends start wave request', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ success: true }));
      const lb = new Leaderboard();
      const result = await lb.startWave('session-1');
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/session/start-wave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session-1' }),
      });
    });

    it('returns false on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'));
      const lb = new Leaderboard();
      expect(await lb.startWave('s')).toBe(false);
    });
  });

  describe('completeWave', () => {
    it('sends actions and returns result', async () => {
      const serverResult = {
        waveResult: { enemiesKilled: 5 },
        state: { money: 200, lives: 5, score: 100, currentWave: 1, gameOver: false, towers: [] },
      };
      mockFetch.mockReturnValueOnce(jsonResponse(serverResult));
      const lb = new Leaderboard();
      const result = await lb.completeWave('session-1', []);
      expect(result).toEqual(serverResult);
    });

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'));
      const lb = new Leaderboard();
      expect(await lb.completeWave('s', [])).toBeNull();
    });

    it('returns null on non-ok response', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({}, false));
      const lb = new Leaderboard();
      expect(await lb.completeWave('s', [])).toBeNull();
    });
  });

  describe('submitScore', () => {
    it('sends sessionId and initials, returns rank and score', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ valid: true, rank: 2, score: 500 }));
      const lb = new Leaderboard();
      const result = await lb.submitScore('session-1', 'abc');
      expect(result).toEqual({ rank: 2, score: 500 });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.sessionId).toBe('session-1');
      expect(body.initials).toBe('ABC');
      expect(body.score).toBeUndefined();
      expect(body.signature).toBeUndefined();
    });

    it('rejects invalid initials', async () => {
      const lb = new Leaderboard();
      expect(await lb.submitScore('s', 'AB')).toEqual({ rank: -1, score: 0 });
      expect(await lb.submitScore('s', 'A1B')).toEqual({ rank: -1, score: 0 });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns default on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'));
      const lb = new Leaderboard();
      expect(await lb.submitScore('s', 'AAA')).toEqual({ rank: -1, score: 0 });
    });
  });

  describe('isHighScore', () => {
    it('returns true when board is not full', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([
        { initials: 'AAA', score: 100 },
      ]));
      const lb = new Leaderboard();
      expect(await lb.isHighScore(20260307, 1)).toBe(true);
    });

    it('returns true when score beats lowest on full board', async () => {
      const entries = Array.from({ length: 10 }, (_, i) => ({
        initials: 'AAA', score: (10 - i) * 100,
      }));
      mockFetch.mockReturnValueOnce(jsonResponse(entries));
      const lb = new Leaderboard();
      expect(await lb.isHighScore(20260307, 150)).toBe(true);
    });

    it('returns false when score is too low on full board', async () => {
      const entries = Array.from({ length: 10 }, (_, i) => ({
        initials: 'AAA', score: (10 - i) * 100,
      }));
      mockFetch.mockReturnValueOnce(jsonResponse(entries));
      const lb = new Leaderboard();
      expect(await lb.isHighScore(20260307, 50)).toBe(false);
    });
  });
});
