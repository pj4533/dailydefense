import { describe, it, expect } from 'vitest';
import { getDailySeed, getDailySeedLabel } from '../src/logic/dailySeed';

describe('getDailySeed', () => {
  it('returns a number in YYYYMMDD format', () => {
    const seed = getDailySeed();
    expect(typeof seed).toBe('number');
    expect(seed).toBeGreaterThan(20200101);
    expect(seed).toBeLessThan(21000101);
  });

  it('is consistent within the same call', () => {
    const a = getDailySeed();
    const b = getDailySeed();
    expect(a).toBe(b);
  });
});

describe('getDailySeedLabel', () => {
  it('returns a string like "MAR 07"', () => {
    const label = getDailySeedLabel();
    expect(typeof label).toBe('string');
    expect(label).toMatch(/^[A-Z]{3} \d{2}$/);
  });
});
