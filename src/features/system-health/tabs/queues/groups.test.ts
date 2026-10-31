// Tests for the grouping of the Queues & jobs tab: problems first by the server's state, healthy rows folded away, and
// nothing decided from the counters.
import { describe, expect, it } from 'vitest';
import type {
  MetricState,
  QueueStats,
  ScheduledJob,
  WebhookDirectionHealth,
  WebhooksHealth,
} from '../../types';
import { groupJobs, groupQueues, groupWebhooks, queueNeedsAttention, webhookNeedsAttention } from './groups';
import { webhookRows } from './webhooks';

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
      job('accruals', 'warn'),
    ]);
    expect(names(attention)).toEqual(['balance', 'accruals', 'fx']);
    expect(names(calm)).toEqual(['sync', 'reminders']);
  });
});

function direction(rate: MetricState, age: MetricState): WebhookDirectionHealth {
  return {
    successRate: { value: 99, unit: 'percent', state: rate },
    delivered: 100,
    failed: 1,
    retrying: 0,
    oldestUndeliveredAt: null,
    oldestAge: { value: 0, unit: 's', state: age },
  };
}

const webhookIds = (health: WebhooksHealth) => {
  const { attention, calm } = groupWebhooks(webhookRows(health));
  return { attention: attention.map((row) => row.id), calm: calm.map((row) => row.id) };
};

describe('webhookNeedsAttention', () => {
  it('is false only when both judged numbers are ok', () => {
    expect(webhookNeedsAttention(direction('ok', 'ok'))).toBe(false);
    expect(webhookNeedsAttention(direction('warn', 'ok'))).toBe(true);
    expect(webhookNeedsAttention(direction('ok', 'crit'))).toBe(true);
  });

  it('counts a number nobody could read, or a state it does not know, as a reason to look', () => {
    expect(webhookNeedsAttention(direction('ok', 'unknown'))).toBe(true);
    expect(webhookNeedsAttention(direction('degraded' as MetricState, 'ok'))).toBe(true);
  });
});

describe('groupWebhooks', () => {
  it('folds both directions away when all four judged numbers are ok', () => {
    expect(webhookIds({ outgoing: direction('ok', 'ok'), incoming: direction('ok', 'ok') })).toEqual({
      attention: [],
      calm: ['outgoing', 'incoming'],
    });
  });

  it('keeps the direction in trouble as a row, worst first, and folds the healthy one', () => {
    expect(webhookIds({ outgoing: direction('ok', 'ok'), incoming: direction('crit', 'ok') })).toEqual({
      attention: ['incoming'],
      calm: ['outgoing'],
    });
    expect(webhookIds({ outgoing: direction('warn', 'ok'), incoming: direction('crit', 'ok') })).toEqual({
      attention: ['incoming', 'outgoing'],
      calm: [],
    });
  });

  it('folds nothing for a direction whose age is the one in trouble', () => {
    expect(webhookIds({ outgoing: direction('ok', 'warn'), incoming: direction('ok', 'ok') })).toEqual({
      attention: ['outgoing'],
      calm: ['incoming'],
    });
  });
});
