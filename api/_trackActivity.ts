import { Redis } from '@upstash/redis';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export async function trackActivity(
  redis: Redis,
  req: Request,
  type: 'human' | 'agent',
  clientId?: string,
): Promise<void> {
  const ip = req.headers.get('x-real-ip') || 'unknown';
  const member = clientId ? `${ip}:${clientId}` : ip;
  const key = type === 'human' ? 'active_humans' : 'active_agents';
  await redis.zadd(key, { score: Date.now(), member });
}

export async function getActiveCounts(
  redis: Redis,
): Promise<{ humans: number; agents: number }> {
  const cutoff = Date.now() - FIFTEEN_MINUTES;
  await Promise.all([
    redis.zremrangebyscore('active_humans', '-inf', cutoff),
    redis.zremrangebyscore('active_agents', '-inf', cutoff),
  ]);
  const [humans, agents] = await Promise.all([
    redis.zcard('active_humans'),
    redis.zcard('active_agents'),
  ]);
  return { humans, agents };
}
