// Tests for the words and numbers of the Integrity tab: differences in dollars, who started a run, durations, how long ago,
// the account kind of a finding, and the findings count.
import { describe, expect, it } from 'vitest';
import {
  agoText,
  durationText,
  formatDifference,
  ledgerAccountKind,
  listedText,
  NONE,
  startedByText,
  whenParts,
} from './format';

describe('formatDifference', () => {
  it('prints dollars with two decimals and the sign the server sent', () => {
    expect(formatDifference('-37.5000')).toBe('-$37.50');
    expect(formatDifference('1240.0000')).toBe('$1,240.00');
    expect(formatDifference('0.0000')).toBe('$0.00');
  });

  it('prints four decimals when two would show a real difference as zero', () => {
    expect(formatDifference('0.0040')).toBe('$0.0040');
    expect(formatDifference('-0.0001')).toBe('-$0.0001');
    expect(formatDifference('0.0050')).toBe('$0.01');
  });

  it('prints a dash for a check that does not count money, and the raw text for a value that is not a number', () => {
    expect(formatDifference(null)).toBe(NONE);
    expect(formatDifference(undefined)).toBe(NONE);
    expect(formatDifference('n/a')).toBe('n/a');
  });
});

describe('startedByText', () => {
  it('says Scheduled for the schedule and the staff name for a manual run', () => {
    expect(startedByText({ trigger: 'schedule', triggeredBy: null })).toBe('Scheduled');
    expect(startedByText({ trigger: 'manual', triggeredBy: { id: 4, name: 'Dana M.' } })).toBe('Dana M.');
  });

  it('falls back to the kind of trigger when the server names nobody', () => {
    expect(startedByText({ trigger: 'manual', triggeredBy: null })).toBe('Manual');
    expect(startedByText({ trigger: 'event', triggeredBy: null })).toBe('Event');
    expect(startedByText({ trigger: 'other' as 'event', triggeredBy: null })).toBe(NONE);
  });

  it('keeps Scheduled even when the server also names a staff member', () => {
    expect(startedByText({ trigger: 'schedule', triggeredBy: { id: 4, name: 'Dana M.' } })).toBe('Scheduled');
  });
});

describe('durationText', () => {
  it('prints the run time as a short duration', () => {
    expect(durationText({ status: 'succeeded', durationMs: 14_200 })).toBe('14s');
    expect(durationText({ status: 'succeeded', durationMs: 192_000 })).toBe('3m 12s');
    expect(durationText({ status: 'succeeded', durationMs: 300 })).toBe('<1s');
  });

  it('prints a dash for a skipped run or a time that is not a number', () => {
    expect(durationText({ status: 'skipped', durationMs: 0 })).toBe(NONE);
    expect(durationText({ status: 'failed', durationMs: Number.NaN })).toBe(NONE);
  });
});

describe('agoText and whenParts', () => {
  const now = Date.parse('2026-03-05T12:00:00.000Z');

  it('counts from the clock it is given', () => {
    expect(agoText('2026-03-05T11:59:52.000Z', now)).toBe('8s ago');
    expect(agoText('2026-03-05T11:16:00.000Z', now)).toBe('44m ago');
    expect(agoText('2026-03-03T12:00:00.000Z', now)).toBe('2d ago');
  });

  it('is empty for a time that is missing or unreadable', () => {
    expect(agoText(null, now)).toBe('');
    expect(agoText('', now)).toBe('');
    expect(agoText('not a time', now)).toBe('');
  });

  it('splits a time into the date and how long ago', () => {
    const parts = whenParts('2026-03-05T11:16:00.000Z', now);
    expect(parts?.date).toMatch(/^\d{2} \w{3}, \d{2}:\d{2}$/);
    expect(parts?.ago).toBe('44m ago');
  });

  it('is null for a time that is missing or unreadable', () => {
    expect(whenParts(null, now)).toBeNull();
    expect(whenParts(undefined, now)).toBeNull();
    expect(whenParts('not a time', now)).toBeNull();
  });
});

describe('ledgerAccountKind', () => {
  it('reads the kind before the colon of the reference', () => {
    expect(ledgerAccountKind('client_wallet:4')).toBe('client_wallet');
    expect(ledgerAccountKind('bank')).toBe('bank');
  });

  it('gives null for a reference that does not start with a kind', () => {
    expect(ledgerAccountKind('1010')).toBeNull();
    expect(ledgerAccountKind('Client Wallet:4')).toBeNull();
    expect(ledgerAccountKind(':4')).toBeNull();
    expect(ledgerAccountKind('')).toBeNull();
  });
});

describe('listedText', () => {
  it('counts the findings', () => {
    expect(listedText(1, 1)).toBe('1 finding');
    expect(listedText(3, 3)).toBe('3 findings');
  });

  it('says how many of the findings came with the answer', () => {
    expect(listedText(1240, 5)).toBe('Showing the first 5 of 1,240');
  });

  it('says so when the server counted findings but sent none', () => {
    expect(listedText(23, 0)).toBe('23 found, none listed');
  });
});
