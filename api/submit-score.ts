import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const MAX_SCORE = 100000;
const MIN_DURATION_MS = 30000;

function computeHmac(secret: string, seed: number, score: number, sessionId: string): string {
  return crypto.createHmac('sha256', secret)
    .update(`${seed}:${score}:${sessionId}`)
    .digest('hex');
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
  const { sessionId, seed, initials, score, signature } = body;

  // Basic validation
  if (!sessionId || typeof seed !== 'number' || typeof score !== 'number' || !signature || !initials) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Initials validation
  const cleaned = String(initials).replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
  if (cleaned.length !== 3) {
    return Response.json({ error: 'Initials must be 3 letters' }, { status: 400 });
  }

  // Score sanity checks
  if (!Number.isInteger(score) || score <= 0 || score > MAX_SCORE) {
    return Response.json({ error: 'Invalid score' }, { status: 400 });
  }

  // Look up session
  const sessionData = await redis.get(`session:${sessionId}`) as string | null;
  if (!sessionData) {
    return Response.json({ error: 'Invalid or expired session' }, { status: 403 });
  }

  const session = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;

  // Verify seed matches
  if (session.seed !== seed) {
    return Response.json({ error: 'Seed mismatch' }, { status: 403 });
  }

  // Verify minimum duration
  const elapsed = Date.now() - session.createdAt;
  if (elapsed < MIN_DURATION_MS) {
    return Response.json({ error: 'Game too short' }, { status: 403 });
  }

  // Verify HMAC
  const expected = computeHmac(session.secret, seed, score, sessionId);
  if (signature !== expected) {
    return Response.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // Delete session (one-time use)
  await redis.del(`session:${sessionId}`);

  // Store score in sorted set
  const leaderboardKey = `leaderboard:${seed}`;
  const member = `${cleaned}:${sessionId}`;
  await redis.zadd(leaderboardKey, { score, member });

  // Trim to top 10 (keep highest scores)
  await redis.zremrangebyrank(leaderboardKey, 0, -11);

  // Set TTL (7 days)
  await redis.expire(leaderboardKey, 604800);

  // Get rank (0-based, highest first)
  const rank = await redis.zrevrank(leaderboardKey, member);

  return Response.json({
    valid: true,
    rank: rank !== null ? rank + 1 : -1,
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
