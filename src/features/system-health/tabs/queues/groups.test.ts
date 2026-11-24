// Tests for the grouping of the Queues & jobs tab: problems first by the server's state, healthy rows folded away, and
// nothing decided from the counters.
import { describe, expect, it } from 'vitest';
import type { MetricState, QueueStats, ScheduledJob } from '../../types';
import { groupJobs, groupQueues, queueNeedsAttention } from './groups';

function queue(name: string, state: MetricState, over: Partial<QueueStats> = {}): QueueStats {
  return {
    name,
    state,
    paused: false,
    waiting: 0,
    active: 0,
    delayed: 0,
    failed: 0,
    oldestAge: { value: 4, unit: 's', state: 'ok' },
    ratePerMin: { value: 10, unit: 'per_min', state: 'ok' },
    workers: 2,
    ...over,
  };
}

function job(name: string, state: MetricState): ScheduledJob {
  return {
    name,
    label: name,
    schedule: '*/15 * * * *',
    scheduleText: 'Every 15 minutes',
    state,
    running: false,
    lastRun: null,
    nextRunAt: null,
  };
}

const names = (items: readonly { name: string }[]) => items.map((item) => item.name);

describe('groupQueues', () => {
  it('puts the worst server state first and keeps the healthy queues, in the server order, apart', () => {
    const { attention, calm } = groupQueues([
      queue('a', 'ok'),
      queue('b', 'warn'),
      queue('c', 'ok'),
      queue('d', 'crit'),
      queue('e', 'unknown'),
      queue('f', 'warn'),
    ]);
    expect(names(attention)).toEqual(['d', 'b', 'f', 'e']);
    expect(names(calm)).toEqual(['a', 'c']);
  });

  it('keeps a paused queue with the problems even when the server calls it ok, after the worse ones', () => {
    const { attention, calm } = groupQueues([
      queue('quiet', 'ok'),
      queue('held', 'ok', { paused: true }),
      queue('unread', 'unknown'),
      queue('slow', 'warn'),
    ]);
    expect(names(attention)).toEqual(['slow', 'unread', 'held']);
    expect(names(calm)).toEqual(['quiet']);
  });

  it('does not judge the counters: failed jobs under an ok state stay in the quiet group', () => {
    const { attention, calm } = groupQueues([queue('busy', 'ok', { failed: 40, waiting: 900 })]);
    expect(attention).toEqual([]);
    expect(names(calm)).toEqual(['busy']);
  });

  it('answers two empty groups for no queues, and does not change the list it was given', () => {
    expect(groupQueues([])).toEqual({ attention: [], calm: [] });
    const list = [queue('b', 'ok'), queue('a', 'crit')];
    groupQueues(list);
    expect(names(list)).toEqual(['b', 'a']);
  });
});

describe('queueNeedsAttention', () => {
  it('is true for any state but ok, and for a paused queue', () => {
    expect(queueNeedsAttention({ state: 'ok', paused: false })).toBe(false);
    expect(queueNeedsAttention({ state: 'ok', paused: true })).toBe(true);
    expect(queueNeedsAttention({ state: 'warn', paused: false })).toBe(true);
    expect(queueNeedsAttention({ state: 'unknown', paused: false })).toBe(true);
  });

  it('treats a state it does not know as a reason to look, not as healthy', () => {
    expect(queueNeedsAttention({ state: 'degraded' as MetricState, paused: false })).toBe(true);
  });
});

describe('groupJobs', () => {
  it('shows jobs in a state other than ok first, worst first, and folds the rest away', () => {
    const { attention, calm } = groupJobs([
      job('sync', 'ok'),
      job('balance', 'crit'),
      job('fx', 'unknown'),
      job('reminders', 'ok'),
      job('cleanup', 'warn'),
    ]);
    expect(names(attention)).toEqual(['balance', 'cleanup', 'fx']);
    expect(names(calm)).toEqual(['sync', 'reminders']);
  });
});
