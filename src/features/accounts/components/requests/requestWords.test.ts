// Tests for the words and deadlines of data requests: the number, the kinds and statuses, and how close the legal deadline is (soon, past)
// in the table's words, then the one line an account's Privacy and risk part prints. Ports the words of the old customers' data request tests.
import { describe, expect, it } from 'vitest';
import { PENDING_REQUEST_STATUSES } from '../../hooks/useDataRequests';
import { dataRequest, NOW } from '../../test/fixtures';
import {
  dueOf,
  dueText,
  isPending,
  REQUEST_KIND_LABEL,
  REQUEST_STATUS_LOOK,
  requestKindLabel,
  requestNumber,
  requestState,
  requestStatusLook,
  spanText,
} from './requestWords';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe('words', () => {
  it('numbers a request the way staff say it', () => {
    expect(requestNumber(31)).toBe('DSR-31');
  });

  it('names the kinds and the statuses; a fulfilled request is "Done"', () => {
    expect(REQUEST_KIND_LABEL).toEqual({ export: 'Export', erasure: 'Erasure' });
    expect(Object.values(REQUEST_STATUS_LOOK).map((look) => look.word)).toEqual([
      'Open',
      'In progress',
      'Done',
      'Rejected',
    ]);
    expect(REQUEST_STATUS_LOOK.completed.tone).toBe('ok');
    expect(REQUEST_STATUS_LOOK.rejected.tone).toBe('off');
    // Both statuses that are still to do are drawn the same way.
    expect(REQUEST_STATUS_LOOK.open.tone).toBe(REQUEST_STATUS_LOOK.in_progress.tone);
  });

  it('shows a kind or status it does not know as it is, with a hollow square, instead of failing', () => {
    expect(requestKindLabel('export')).toBe('Export');
    expect(requestKindLabel('portability')).toBe('portability');
    expect(requestKindLabel('')).toBe('Unknown');
    expect(requestStatusLook('completed')).toEqual(REQUEST_STATUS_LOOK.completed);
    expect(requestStatusLook('on_hold')).toEqual({ word: 'on_hold', tone: 'off' });
    expect(requestStatusLook('')).toEqual({ word: 'Unknown', tone: 'off' });
  });

  it('counts a request as pending until it is done or rejected, the same two statuses the Data requests link counts', () => {
    expect(PENDING_REQUEST_STATUSES).toEqual(['open', 'in_progress']);
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

describe('requestState', () => {
  const at = (offset: number) => new Date(NOW + offset).toISOString();

  it('says how long ago a fulfilled request was done, and when it has no date, only that it is done', () => {
    expect(requestState({ status: 'completed', dueAt: null, completedAt: at(-2 * DAY) }, NOW)).toEqual({
      text: 'done 2d ago',
      urgent: false,
    });
    expect(requestState({ status: 'completed', dueAt: null, completedAt: null }, NOW)).toEqual({
      text: 'done',
      urgent: false,
    });
  });

  it('says a refused request was rejected, in no urgent colour', () => {
    expect(requestState({ status: 'rejected', dueAt: at(-DAY), completedAt: null }, NOW)).toEqual({
      text: 'rejected',
      urgent: false,
    });
  });

  it('counts down to the deadline of a request still to do, and is urgent under three days and past due', () => {
    expect(requestState({ status: 'open', dueAt: at(27 * DAY), completedAt: null }, NOW)).toEqual({
      text: 'due in 27d',
      urgent: false,
    });
    expect(requestState({ status: 'in_progress', dueAt: at(2 * DAY), completedAt: null }, NOW)).toEqual({
      text: 'due in 2d',
      urgent: true,
    });
    expect(requestState({ status: 'open', dueAt: at(-3 * DAY), completedAt: null }, NOW)).toEqual({
      text: '3d overdue',
      urgent: true,
    });
  });

  it('names the status of a request still to do that has no deadline, and shows an unknown status as written', () => {
    expect(requestState({ status: 'open', dueAt: null, completedAt: null }, NOW).text).toBe('open');
    expect(requestState({ status: 'in_progress', dueAt: null, completedAt: null }, NOW).text).toBe(
      'in progress',
    );
    expect(requestState({ status: 'on_hold' as never, dueAt: null, completedAt: null }, NOW).text).toBe(
      'on_hold',
    );
  });
});
