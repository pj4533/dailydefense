import { Redis } from '@upstash/redis';
import { BrowserSessionState } from '../../src/logic/BrowserSessionState';
import { WaveAction, WaveActionType } from '../../src/logic/WaveAction';
import { simulateWaveWithActions } from '../../src/logic/simulateWave';
import { TowerType } from '../../src/types';
import { trackActivity, getActiveCounts } from '../_trackActivity';

export const config = { runtime: 'edge' };

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const MAX_ACTIONS = 1000;
const VALID_TOWER_TYPES = new Set(Object.values(TowerType));

function validateActions(actions: unknown): WaveAction[] | null {
  if (!Array.isArray(actions)) return null;
  if (actions.length > MAX_ACTIONS) return null;

  const validated: WaveAction[] = [];
  let lastFrame = -1;

  for (const action of actions) {
    if (typeof action !== 'object' || action === null) return null;
    if (typeof action.frame !== 'number' || action.frame < 0 || !Number.isInteger(action.frame)) return null;
    if (action.frame < lastFrame) return null; // must be monotonic
    lastFrame = action.frame;

    switch (action.type) {
      case WaveActionType.PLACE:
        if (typeof action.col !== 'number' || typeof action.row !== 'number') return null;
        if (!VALID_TOWER_TYPES.has(action.towerType)) return null;
        validated.push(action as WaveAction);
        break;
      case WaveActionType.SELL:
        if (typeof action.col !== 'number' || typeof action.row !== 'number') return null;
        validated.push(action as WaveAction);
        break;
      case WaveActionType.MOVE:
        if (typeof action.fromCol !== 'number' || typeof action.fromRow !== 'number' ||
            typeof action.toCol !== 'number' || typeof action.toRow !== 'number') return null;
        validated.push(action as WaveAction);
        break;
      default:
        return null;
    }
  }

  return validated;
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

  let body: { sessionId?: string; actions?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sessionId } = body;
  if (!sessionId) {
    return Response.json({ error: 'sessionId required' }, { status: 400 });
  }

  const validatedActions = validateActions(body.actions);
  if (validatedActions === null) {
    return Response.json({ error: 'Invalid actions array' }, { status: 400 });
  }

  const data = await redis.get(`session:${sessionId}`) as string | null;
  if (!data) {
    return Response.json({ error: 'Invalid or expired session' }, { status: 403 });
  }

  const session: BrowserSessionState = typeof data === 'string' ? JSON.parse(data) : data;

  if (!session.waveInProgress) {
    return Response.json({ error: 'No wave in progress' }, { status: 400 });
  }

  // Run authoritative simulation
  const { result, state: updatedState } = simulateWaveWithActions(session, validatedActions);

  await redis.set(`session:${sessionId}`, JSON.stringify(updatedState), { ex: 3600 });
  await trackActivity(redis, req, 'human', session.playerId);
  const activePlayers = await getActiveCounts(redis);

  return Response.json({
    waveResult: result,
    state: {
      money: updatedState.money,
      lives: updatedState.lives,
      score: updatedState.score,
      currentWave: updatedState.currentWave,
      gameOver: updatedState.gameOver,
      towers: updatedState.towers,
    },
    activePlayers,
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
