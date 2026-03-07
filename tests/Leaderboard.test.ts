import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Leaderboard } from '../src/logic/Leaderboard';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock crypto.subtle for HMAC signing
const mockSign = vi.fn().mockResolvedValue(new Uint8Array([0xab, 0xcd, 0xef]).buffer);
vi.stubGlobal('crypto', {
  subtle: {
    importKey: vi.fn().mockResolvedValue('mock-key'),
    sign: mockSign,
  },
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
    mockSign.mockResolvedValue(new Uint8Array([0xab, 0xcd, 0xef]).buffer);
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

    it('preserves server order (already sorted by score descending)', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([
        { initials: 'HIG', score: 500 },
        { initials: 'MID', score: 200 },
        { initials: 'LOW', score: 50 },
      ]));
      const lb = new Leaderboard();
      const entries = await lb.getEntries(20260307);
      expect(entries.map(e => e.score)).toEqual([500, 200, 50]);
    });
  });

  describe('addEntry', () => {
    it('posts entry with HMAC and returns rank', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ rank: 2, valid: true }));
      const lb = new Leaderboard();
      const rank = await lb.addEntry(20260307, 'abc', 400, 'session-123', 'secret-456');
      expect(rank).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith('/api/submit-score', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.sessionId).toBe('session-123');
      expect(body.seed).toBe(20260307);
      expect(body.initials).toBe('ABC');
      expect(body.score).toBe(400);
      expect(body.signature).toBeDefined();
    });

    it('uppercases initials', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ rank: 1 }));
      const lb = new Leaderboard();
      await lb.addEntry(20260307, 'xyz', 100, 'sess', 'sec');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.initials).toBe('XYZ');
    });

    it('rejects invalid initials', async () => {
      const lb = new Leaderboard();
      expect(await lb.addEntry(20260307, 'AB', 100, 's', 'k')).toBe(-1);
      expect(await lb.addEntry(20260307, 'A1B', 100, 's', 'k')).toBe(-1);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns -1 on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network'));
      const lb = new Leaderboard();
      expect(await lb.addEntry(20260307, 'AAA', 100, 's', 'k')).toBe(-1);
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
      // Server returns sorted descending
      const entries = Array.from({ length: 10 }, (_, i) => ({
        initials: 'AAA', score: (10 - i) * 100,
      }));
      mockFetch.mockReturnValueOnce(jsonResponse(entries));
      const lb = new Leaderboard();
      expect(await lb.isHighScore(20260307, 150)).toBe(true);
    });

    it('returns false when score is too low on full board', async () => {
      // Server returns sorted descending: 1000, 900, ..., 100
      const entries = Array.from({ length: 10 }, (_, i) => ({
        initials: 'AAA', score: (10 - i) * 100,
      }));
      mockFetch.mockReturnValueOnce(jsonResponse(entries));
      const lb = new Leaderboard();
      expect(await lb.isHighScore(20260307, 50)).toBe(false);
    });
  });

  describe('startSession', () => {
    it('returns session data on success', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ sessionId: 'abc', secret: 'def' }));
      const lb = new Leaderboard();
      const session = await lb.startSession(20260307);
      expect(session).toEqual({ sessionId: 'abc', secret: 'def' });
      expect(mockFetch).toHaveBeenCalledWith('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: 20260307 }),
      });
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
});
