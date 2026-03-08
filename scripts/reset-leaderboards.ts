import { Redis } from '@upstash/redis';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env.local') });

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  console.error('Missing KV_REST_API_URL or KV_REST_API_TOKEN in .env.local');
  console.error('Run: vercel env pull .env.local');
  process.exit(1);
}

const redis = new Redis({ url, token });

async function resetAll() {
  // Find all leaderboard keys
  let cursor = 0;
  const keys: string[] = [];
  do {
    const [nextCursor, batch] = await redis.scan(cursor, { match: 'leaderboard:*', count: 100 });
    cursor = Number(nextCursor);
    keys.push(...(batch as string[]));
  } while (cursor !== 0);

  // Also find all session keys
  cursor = 0;
  do {
    const [nextCursor, batch] = await redis.scan(cursor, { match: 'session:*', count: 100 });
    cursor = Number(nextCursor);
    keys.push(...(batch as string[]));
  } while (cursor !== 0);

  if (keys.length === 0) {
    console.log('No leaderboard or session keys found. Already clean.');
    return;
  }

  console.log(`Found ${keys.length} key(s) to delete:`);
  keys.forEach((k) => console.log(`  ${k}`));

  const pipeline = redis.pipeline();
  keys.forEach((k) => pipeline.del(k));
  await pipeline.exec();

  console.log(`Deleted ${keys.length} key(s). Leaderboards reset.`);
}

resetAll().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
