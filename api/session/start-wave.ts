import { Redis } from '@upstash/redis';
import { BrowserSessionState } from '../../src/logic/BrowserSessionState';
import { trackActivity } from '../_trackActivity';

export const config = { runtime: 'edge' };

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

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

  let body: { sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sessionId } = body;
  if (!sessionId) {
    return Response.json({ error: 'sessionId required' }, { status: 400 });
  }

  const data = await redis.get(`session:${sessionId}`) as string | null;
  if (!data) {
    return Response.json({ error: 'Invalid or expired session' }, { status: 403 });
  }

  const session: BrowserSessionState = typeof data === 'string' ? JSON.parse(data) : data;

  if (session.gameOver) {
    return Response.json({ error: 'Game is over' }, { status: 400 });
  }

  if (session.waveInProgress) {
    return Response.json({ error: 'Wave already in progress' }, { status: 400 });
  }

  session.waveInProgress = true;

  await redis.set(`session:${sessionId}`, JSON.stringify(session), { ex: 3600 });
  await trackActivity(redis, sessionId, 'human');

  return Response.json({
    success: true,
    waveNumber: session.currentWave,
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
