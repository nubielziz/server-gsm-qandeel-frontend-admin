// Tests for the words and deadlines of data requests: the number as the demo shows it, the badge of each status, and how close
// the legal deadline is (soon, past) in the table's words.
import { describe, expect, it } from 'vitest';
import { dataRequest, NOW } from '../test/fixtures';
import {
  dueOf,
  dueText,
  isPending,
  PENDING_STATUSES,
  REQUEST_KIND_LABEL,
  REQUEST_STATUS_BADGE,
  requestKindLabel,
  requestNumber,
  requestStatusBadge,
  spanText,
} from './requests';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe('words', () => {
  it('numbers a request like the demo', () => {
    expect(requestNumber(31)).toBe('DSR-31');
  });

  it('names the kinds and the statuses; a fulfilled request is "Done" as in the demo', () => {
    expect(REQUEST_KIND_LABEL).toEqual({ export: 'Data export', erasure: 'Erasure' });
    expect(Object.values(REQUEST_STATUS_BADGE).map((badge) => badge.label)).toEqual([
      'Open',
      'In progress',
      'Done',
      'Rejected',
    ]);
    expect(REQUEST_STATUS_BADGE.completed.tone).toBe('good');
  });

  it('shows a kind or status it does not know as it is, in a neutral badge, instead of failing', () => {
    expect(requestKindLabel('export')).toBe('Data export');
    expect(requestKindLabel('portability')).toBe('portability');
    expect(requestKindLabel('')).toBe('Unknown');
    expect(requestStatusBadge('completed')).toEqual(REQUEST_STATUS_BADGE.completed);
    expect(requestStatusBadge('on_hold')).toEqual({ label: 'on_hold', tone: 'neutral', icon: 'info' });
    expect(requestStatusBadge('')).toMatchObject({ label: 'Unknown', tone: 'neutral' });
  });

  it('counts a request as pending until it is done or rejected', () => {
    expect(PENDING_STATUSES).toEqual(['open', 'in_progress']);
    expect(isPending(dataRequest({ status: 'open' }))).toBe(true);
    expect(isPending(dataRequest({ status: 'in_progress' }))).toBe(true);
    expect(isPending(dataRequest({ status: 'completed' }))).toBe(false);
    expect(isPending(dataRequest({ status: 'rejected' }))).toBe(false);
  });
});

describe('spanText', () => {
  it('uses the biggest whole unit', () => {
    expect(spanText(12 * DAY)).toBe('12d');
    expect(spanText(5 * HOUR)).toBe('5h');
    expect(spanText(30 * 60_000)).toBe('30m');
    expect(spanText(10_000)).toBe('<1m');
  });

  it('rounds to the minute first, so a deadline set 27 days out still reads 27d a moment later', () => {
    expect(spanText(27 * DAY - 1_000)).toBe('27d');
    expect(spanText(-(3 * DAY + 20_000))).toBe('3d');
  });
});

describe('dueOf and dueText', () => {
  it('reads a deadline far away as plain', () => {
    const due = dueOf('2026-01-31T12:00:00.000Z', NOW);
    expect(due).toEqual({ span: '27d', late: false, soon: false });
    expect(dueText(due!)).toBe('in 27d');
  });

  it('marks a deadline under three days away as soon', () => {
    const due = dueOf(new Date(NOW + 2 * DAY).toISOString(), NOW);
    expect(due).toMatchObject({ late: false, soon: true });
    expect(dueText(due!)).toBe('in 2d');
    expect(dueOf(new Date(NOW + 3 * DAY).toISOString(), NOW)?.soon).toBe(false);
  });

  it('marks a deadline in the past as late', () => {
    const due = dueOf(new Date(NOW - 3 * DAY).toISOString(), NOW);
    expect(due).toMatchObject({ late: true, soon: false });
    expect(dueText(due!)).toBe('3d overdue');
  });

  it('has nothing to say for a request without a deadline', () => {
    expect(dueOf(null, NOW)).toBeNull();
    expect(dueOf('not a date', NOW)).toBeNull();
  });
});
