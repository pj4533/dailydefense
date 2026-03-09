import { Redis } from '@upstash/redis';
import { GRID_COLS, GRID_ROWS, STARTING_MONEY, STARTING_LIVES } from '../src/config';
import { mulberry32 } from '../src/logic/seedRng';
import { generateRandomPath } from '../src/logic/MapGenerator';
import { BrowserSessionState } from '../src/logic/BrowserSessionState';
import { trackActivity, getActiveCounts } from './_trackActivity';

export const config = { runtime: 'edge' };

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function easternSeed(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = Number(parts.find(p => p.type === 'year')!.value);
  const month = Number(parts.find(p => p.type === 'month')!.value);
  const day = Number(parts.find(p => p.type === 'day')!.value);
  return year * 10000 + month * 100 + day;
}

function isValidSeed(seed: number): boolean {
  const now = new Date();
  const today = easternSeed(now);
  const yesterday = easternSeed(new Date(now.getTime() - 86400000));
  return seed === today || seed === yesterday;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body = await req.json();
  const { seed, playerId } = body;

  if (typeof seed !== 'number' || !isValidSeed(seed)) {
    return Response.json({ error: 'Invalid seed' }, { status: 400 });
  }

  const rng = mulberry32(seed);
  const waypoints = generateRandomPath(GRID_COLS, GRID_ROWS, rng);

  const sessionId = crypto.randomUUID();

  const sessionState: BrowserSessionState = {
    seed,
    waypoints,
    money: STARTING_MONEY,
    lives: STARTING_LIVES,
    score: 0,
    gameOver: false,
    currentWave: 0,
    towers: [],
    createdAt: Date.now(),
    submitted: false,
    waveInProgress: false,
    playerId: typeof playerId === 'string' ? playerId : undefined,
  };

  await redis.set(`session:${sessionId}`, JSON.stringify(sessionState), { ex: 3600 });
  await trackActivity(redis, sessionState.playerId || sessionId, 'human');
  const activePlayers = await getActiveCounts(redis);

  return Response.json({ sessionId, activePlayers }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
