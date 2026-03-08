const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/** Returns YYYYMMDD as an integer in UTC, e.g. 20260307. */
export function getDailySeed(): number {
  const now = new Date();
  return now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
}

/** Returns a short label like "MAR 07" in UTC. */
export function getDailySeedLabel(): string {
  const now = new Date();
  const month = MONTH_NAMES[now.getUTCMonth()];
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${month} ${day}`;
}
