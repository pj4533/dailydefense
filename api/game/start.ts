import { Redis } from '@upstash/redis';
import { GRID_COLS, GRID_ROWS, TILE_SIZE, STARTING_MONEY, STARTING_LIVES, TOWER_CONFIGS, ENEMY_CONFIGS } from '../../src/config';
import { TowerType, CellType } from '../../src/types';
import { mulberry32 } from '../../src/logic/seedRng';
import { generateRandomPath } from '../../src/logic/MapGenerator';
import { GameMap } from '../../src/logic/GameMap';
import { AgentGameState } from '../../src/logic/AgentGameState';
import { trackActivity } from '../_trackActivity';

export const config = { runtime: 'edge' };

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function getDailySeed(): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find(p => p.type === 'year')!.value);
  const month = Number(parts.find(p => p.type === 'month')!.value);
  const day = Number(parts.find(p => p.type === 'day')!.value);
  return year * 10000 + month * 100 + day;
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

  let body: { initials?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const initials = String(body.initials ?? '').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
  if (initials.length !== 3) {
    return Response.json({ error: 'Initials must be exactly 3 letters' }, { status: 400 });
  }

  const seed = getDailySeed();
  const rng = mulberry32(seed);
  const waypoints = generateRandomPath(GRID_COLS, GRID_ROWS, rng);

  // Build grid for response
  const map = new GameMap(GRID_COLS, GRID_ROWS, TILE_SIZE, waypoints);
  const grid: CellType[][] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      grid[row][col] = map.getCell(col, row);
    }
  }

  const gameId = crypto.randomUUID();
  const gameState: AgentGameState = {
    seed,
    initials,
    waypoints,
    money: STARTING_MONEY,
    lives: STARTING_LIVES,
    score: 0,
    gameOver: false,
    currentWave: 0,
    towers: [],
    createdAt: Date.now(),
    submitted: false,
  };

  await redis.set(`game:${gameId}`, JSON.stringify(gameState), { ex: 3600 });
  await trackActivity(redis, req, 'agent');

  return Response.json({
    gameId,
    seed,
    grid,
    waypoints,
    state: {
      money: gameState.money,
      lives: gameState.lives,
      score: gameState.score,
      currentWave: gameState.currentWave,
      gameOver: gameState.gameOver,
      towers: gameState.towers,
    },
    config: {
      gridCols: GRID_COLS,
      gridRows: GRID_ROWS,
      tileSize: TILE_SIZE,
      towers: TOWER_CONFIGS,
      enemies: ENEMY_CONFIGS,
    },
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
