import { Redis } from '@upstash/redis';

export const config = { runtime: 'edge' };

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function isValidSeed(seed: number): boolean {
  const now = new Date();
  const today = now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdaySeed = yesterday.getUTCFullYear() * 10000 + (yesterday.getUTCMonth() + 1) * 100 + yesterday.getUTCDate();
  return seed === today || seed === yesterdaySeed;
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
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
  const { seed } = body;

  if (typeof seed !== 'number' || !isValidSeed(seed)) {
    return Response.json({ error: 'Invalid seed' }, { status: 400 });
  }

  const sessionId = crypto.randomUUID();
  const secret = randomHex(32);

  await redis.set(`session:${sessionId}`, JSON.stringify({
    secret,
    seed,
    createdAt: Date.now(),
  }), { ex: 3600 });

  return Response.json({ sessionId, secret }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
