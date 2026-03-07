const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/** Returns YYYYMMDD as an integer, e.g. 20260307. */
export function getDailySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

/** Returns a short label like "MAR 07". */
export function getDailySeedLabel(): string {
  const now = new Date();
  const month = MONTH_NAMES[now.getMonth()];
  const day = String(now.getDate()).padStart(2, '0');
  return `${month} ${day}`;
}
