import { put, list, get } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface LeaderboardEntry {
  initials: string;
  score: number;
}

const MAX_ENTRIES = 10;

function blobKey(seed: number): string {
  return `leaderboard_${seed}.json`;
}

async function readEntries(seed: number): Promise<LeaderboardEntry[]> {
  try {
    const { blobs } = await list({ prefix: blobKey(seed) });
    if (blobs.length === 0) return [];
    const resp = await get(blobs[0].url, { access: 'private' });
    if (!resp) return [];
    const text = await new Response(resp.stream).text();
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeEntries(seed: number, entries: LeaderboardEntry[]): Promise<void> {
  await put(blobKey(seed), JSON.stringify(entries), {
    access: 'private',
    addRandomSuffix: false,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const seed = Number(req.query.seed);
    if (!seed || isNaN(seed)) {
      return res.status(400).json({ error: 'seed query parameter required' });
    }
    const entries = await readEntries(seed);
    return res.status(200).json(entries);
  }

  if (req.method === 'POST') {
    try {
      const { seed, initials, score } = req.body ?? {};
      if (!seed || typeof initials !== 'string' || typeof score !== 'number') {
        return res.status(400).json({ error: 'seed, initials, and score required' });
      }

      const cleaned = initials.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
      if (cleaned.length !== 3) {
        return res.status(400).json({ error: 'initials must be 3 letters' });
      }

      const entries = await readEntries(seed);
      entries.push({ initials: cleaned, score });
      entries.sort((a, b) => b.score - a.score);
      const trimmed = entries.slice(0, MAX_ENTRIES);
      await writeEntries(seed, trimmed);

      const rank = trimmed.findIndex(e => e.initials === cleaned && e.score === score) + 1;
      return res.status(200).json({ rank });
    } catch (err) {
      console.error('POST error:', err);
      return res.status(500).json({ error: String(err) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
