import { Redis } from '@upstash/redis';

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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = new URL(req.url);
  const seed = Number(url.searchParams.get('seed'));
  if (!seed || isNaN(seed)) {
    return Response.json({ error: 'seed query parameter required' }, { status: 400 });
  }

  const leaderboardKey = `leaderboard:${seed}`;

  // Get top 10, highest scores first (ZREVRANGE returns [member, score, member, score, ...])
  const results = await redis.zrange(leaderboardKey, 0, 9, { rev: true, withScores: true });

  // results is an array of { member, score } or alternating values depending on SDK version
  // @upstash/redis zrange with withScores returns: [value, score, value, score, ...]
  const entries: { initials: string; score: number }[] = [];

  for (let i = 0; i < results.length; i += 2) {
    const member = String(results[i]);
    const score = Number(results[i + 1]);
    // Member format: "ABC:sessionId" — extract initials
    const initials = member.split(':')[0];
    entries.push({ initials, score });
  }

  return Response.json(entries, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
