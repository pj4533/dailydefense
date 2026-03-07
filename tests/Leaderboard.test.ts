import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Leaderboard } from '../src/logic/Leaderboard';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

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
      const entries = await lb.getEntries(20260307);
      expect(entries).toHaveLength(2);
      expect(entries[0].score).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith('/api/leaderboard?seed=20260307');
    });

    it('returns empty array on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'));
      const lb = new Leaderboard();
      expect(await lb.getEntries(20260307)).toEqual([]);
    });

    it('returns empty array on non-ok response', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([], false));
      const lb = new Leaderboard();
      expect(await lb.getEntries(20260307)).toEqual([]);
    });

    it('filters invalid entries', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([
        { initials: 'AAA', score: 100 },
        { bad: 'entry' },
        { initials: 123, score: 'wrong' },
      ]));
      const lb = new Leaderboard();
      const entries = await lb.getEntries(20260307);
      expect(entries).toHaveLength(1);
    });

    it('sorts by score descending', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([
        { initials: 'LOW', score: 50 },
        { initials: 'HIG', score: 500 },
        { initials: 'MID', score: 200 },
      ]));
      const lb = new Leaderboard();
      const entries = await lb.getEntries(20260307);
      expect(entries.map(e => e.score)).toEqual([500, 200, 50]);
    });
  });

  describe('addEntry', () => {
    it('posts entry and returns rank', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ rank: 2 }));
      const lb = new Leaderboard();
      const rank = await lb.addEntry(20260307, 'abc', 400);
      expect(rank).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: 20260307, initials: 'ABC', score: 400 }),
      });
    });

    it('uppercases initials', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ rank: 1 }));
      const lb = new Leaderboard();
      await lb.addEntry(20260307, 'xyz', 100);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.initials).toBe('XYZ');
    });

    it('rejects invalid initials', async () => {
      const lb = new Leaderboard();
      expect(await lb.addEntry(20260307, 'AB', 100)).toBe(-1);
      expect(await lb.addEntry(20260307, 'A1B', 100)).toBe(-1);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns -1 on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'));
      const lb = new Leaderboard();
      expect(await lb.addEntry(20260307, 'AAA', 100)).toBe(-1);
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
        initials: 'AAA', score: (i + 1) * 100,
      }));
      mockFetch.mockReturnValueOnce(jsonResponse(entries));
      const lb = new Leaderboard();
      expect(await lb.isHighScore(20260307, 150)).toBe(true);
    });

    it('returns false when score is too low on full board', async () => {
      const entries = Array.from({ length: 10 }, (_, i) => ({
        initials: 'AAA', score: (i + 1) * 100,
      }));
      mockFetch.mockReturnValueOnce(jsonResponse(entries));
      const lb = new Leaderboard();
      expect(await lb.isHighScore(20260307, 50)).toBe(false);
    });
  });
});
