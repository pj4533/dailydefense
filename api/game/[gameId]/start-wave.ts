import { Redis } from '@upstash/redis';
import { simulateWave } from '../../../src/logic/simulateWave';
import { AgentGameState } from '../../../src/logic/AgentGameState';
import { trackActivity } from '../../_trackActivity';

export const config = { runtime: 'edge' };

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

async function submitAgentScore(
  gameState: AgentGameState,
  redis: Redis,
): Promise<number> {
  const leaderboardKey = `leaderboard:${gameState.seed}`;
  const member = `${gameState.initials}:a:${crypto.randomUUID()}`;
  await redis.zadd(leaderboardKey, { score: gameState.score, member });
  await redis.zremrangebyrank(leaderboardKey, 0, -11);
  await redis.expire(leaderboardKey, 604800);
  const rank = await redis.zrevrank(leaderboardKey, member);
  return rank !== null ? rank + 1 : -1;
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

  const url = new URL(req.url);
  const gameId = url.pathname.split('/').at(-2);
  if (!gameId) {
    return Response.json({ error: 'Missing gameId' }, { status: 400 });
  }

  await trackActivity(redis, req, 'agent');

  const data = await redis.get(`game:${gameId}`) as string | null;
  if (!data) {
    return Response.json({ error: 'Game not found or expired' }, { status: 404 });
  }

  const gameState: AgentGameState = typeof data === 'string' ? JSON.parse(data) : data;

  if (gameState.gameOver) {
    return Response.json({ error: 'Game is already over' }, { status: 400 });
  }

  // Run wave simulation
  const { result, state: updatedState } = simulateWave(gameState);

  // Auto-submit score on game over
  let leaderboardRank: number | undefined;
  if (updatedState.gameOver && !updatedState.submitted) {
    updatedState.submitted = true;
    if (updatedState.score > 0) {
      leaderboardRank = await submitAgentScore(updatedState, redis);
    }
  }

  await redis.set(`game:${gameId}`, JSON.stringify(updatedState), { ex: 3600 });

  const response: Record<string, unknown> = {
    waveResult: result,
    state: {
      money: updatedState.money,
      lives: updatedState.lives,
      score: updatedState.score,
      currentWave: updatedState.currentWave,
      gameOver: updatedState.gameOver,
      towers: updatedState.towers,
    },
  };

  if (updatedState.gameOver) {
    response.gameOver = true;
    response.finalScore = updatedState.score;
    if (leaderboardRank !== undefined) {
      response.leaderboardRank = leaderboardRank;
    }
  }

  return Response.json(response, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
