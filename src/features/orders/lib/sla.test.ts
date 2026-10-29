// Tests for the SLA numbers the table and the drawer draw: target, age, "Late by" and the readable age text.
import { describe, expect, it } from 'vitest';
import { NOW, order } from '@/test/fixtures/orderRows';
import { ageMs, ageText, isLate, slaMs, slaView } from './sla';

const minutes = (n: number) => n * 60_000;
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('slaMs and ageMs', () => {
  it('turns the service target into milliseconds', () => {
    expect(slaMs(order())).toBe(minutes(120));
  });

  it('measures an open order up to now, and a closed one up to its end', () => {
    expect(ageMs(order({ createdAt: ago(minutes(30)) }), NOW)).toBe(minutes(30));
    const closed = order({ status: 'completed', createdAt: ago(minutes(90)), completedAt: ago(minutes(60)) });
    expect(ageMs(closed, NOW)).toBe(minutes(30));
    expect(ageMs(order({ status: 'rejected', completedAt: null }), NOW)).toBeNull();
  });

  it('never goes negative when the clocks disagree', () => {
    expect(ageMs(order({ createdAt: ago(-minutes(5)) }), NOW)).toBe(0);
  });
});

describe('ageText', () => {
  it.each([
    [0, '<1m'],
    [minutes(5), '5m'],
    [minutes(59), '59m'],
    [minutes(60), '1h'],
    [minutes(125), '2h 5m'],
    [minutes(60 * 24), '1d'],
    [minutes(60 * 24 * 3 + 60 * 4), '3d 4h'],
  ])('writes %i ms as %s', (ms, text) => {
    expect(ageText(ms)).toBe(text);
  });
});

describe('slaView', () => {
  it('shows how long a closed order took', () => {
    const closed = order({ status: 'completed', createdAt: ago(minutes(30)), completedAt: ago(minutes(10)) });
    expect(slaView(closed, NOW)).toEqual({ kind: 'done', took: minutes(20) });
  });

  it('shows only the age of an order that waits for review', () => {
    const waiting = order({ queue: 'needs_attention', createdAt: ago(minutes(500)) });
    expect(slaView(waiting, NOW)).toEqual({ kind: 'review', age: minutes(500) });
  });

  it('fills a bar toward the target while the order is on time', () => {
    expect(slaView(order({ createdAt: ago(minutes(60)) }), NOW)).toEqual({
      kind: 'running',
      age: minutes(60),
      sla: minutes(120),
      ratio: 0.5,
    });
  });

  it('says by how much an order is late, and draws no bar', () => {
    expect(slaView(order({ createdAt: ago(minutes(128)) }), NOW)).toEqual({
      kind: 'late',
      age: minutes(128),
      over: minutes(8),
    });
  });

  it('counts an order exactly at its target as late', () => {
    expect(isLate(order({ createdAt: ago(minutes(120)) }), NOW)).toBe(true);
    expect(isLate(order({ createdAt: ago(minutes(119)) }), NOW)).toBe(false);
  });

  it('never calls a review or a closed order late', () => {
    expect(isLate(order({ queue: 'manual', createdAt: ago(minutes(900)) }), NOW)).toBe(false);
    expect(
      isLate(order({ status: 'completed', createdAt: ago(minutes(900)), completedAt: ago(0) }), NOW),
    ).toBe(false);
  });
});
