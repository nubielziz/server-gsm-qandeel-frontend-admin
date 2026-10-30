// Tests for the evidence deadline helpers.
import { describe, expect, it } from 'vitest';
import { isUrgent, msLeft } from './deadline';

const NOW = Date.parse('2026-01-01T12:00:00Z');
const DAY = 86_400_000;
const at = (offset: number) => new Date(NOW + offset).toISOString();

describe('msLeft', () => {
  it('is the time until the deadline, negative once it has passed', () => {
    expect(msLeft(at(DAY), NOW)).toBe(DAY);
    expect(msLeft(at(-1000), NOW)).toBe(-1000);
  });
  it('is null without a readable deadline', () => {
    expect(msLeft(null, NOW)).toBeNull();
    expect(msLeft(undefined, NOW)).toBeNull();
    expect(msLeft('soon', NOW)).toBeNull();
  });
});

describe('isUrgent', () => {
  it('is true inside three days and after the deadline', () => {
    expect(isUrgent(at(2 * DAY), NOW)).toBe(true);
    expect(isUrgent(at(-DAY), NOW)).toBe(true);
  });
  it('is false at three days or more, or with no deadline', () => {
    expect(isUrgent(at(3 * DAY), NOW)).toBe(false);
    expect(isUrgent(at(10 * DAY), NOW)).toBe(false);
    expect(isUrgent(null, NOW)).toBe(false);
  });
});
