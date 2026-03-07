import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function isValidSeed(seed: number): boolean {
  // Accept today or yesterday (timezone edge cases)
  const now = new Date();
  const today = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdaySeed = yesterday.getFullYear() * 10000 + (yesterday.getMonth() + 1) * 100 + yesterday.getDate();
  return seed === today || seed === yesterdaySeed;
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
  const secret = crypto.randomBytes(32).toString('hex');

  await redis.set(`session:${sessionId}`, JSON.stringify({
    secret,
    seed,
    createdAt: Date.now(),
  }), { ex: 3600 });

  return Response.json({ sessionId, secret }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
