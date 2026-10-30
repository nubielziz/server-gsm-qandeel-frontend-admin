// Tests for the reply timers as the inbox and the thread print them.
import { describe, expect, it } from 'vitest';
import { overdueMs, targetMs, waitingMs } from './sla';

const HOUR = 3_600_000;
const NOW = Date.parse('2026-03-01T12:00:00.000Z');
const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

const late = { late: true, lastPublicAt: iso(-3 * HOUR), slaDueAt: iso(-1 * HOUR) };

describe('reply timers', () => {
  it('says how long ago the reply became due and how long the customer has waited', () => {
    expect(overdueMs(late, NOW)).toBe(HOUR);
    expect(waitingMs(late, NOW)).toBe(3 * HOUR);
  });

  it('works out the target as the time between the last message and the deadline', () => {
    expect(targetMs(late)).toBe(2 * HOUR);
  });

  it('says nothing for a ticket that is not late, whatever the dates', () => {
    const fine = { ...late, late: false };
    expect(overdueMs(fine, NOW)).toBeNull();
    expect(waitingMs(fine, NOW)).toBeNull();
  });

  it('says nothing when the server sent no dates', () => {
    const bare = { late: true, lastPublicAt: null, slaDueAt: null };
    expect(overdueMs(bare, NOW)).toBeNull();
    expect(waitingMs(bare, NOW)).toBeNull();
    expect(targetMs(bare)).toBeNull();
  });

  it('never goes below zero when the clocks differ a little', () => {
    expect(overdueMs({ ...late, slaDueAt: iso(HOUR) }, NOW)).toBe(0);
    expect(waitingMs({ ...late, lastPublicAt: iso(HOUR) }, NOW)).toBe(0);
  });
});
