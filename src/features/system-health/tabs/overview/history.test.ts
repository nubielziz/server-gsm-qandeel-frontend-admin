// Tests for historyView: the check history shaped for the rows, in each state of the read.
import { describe, expect, it } from 'vitest';
import type { CheckBucket, ChecksResponse } from '../../types';
import { historyView } from './history';

const BUCKET: CheckBucket = {
  start: '2026-10-31T10:00:00.000Z',
  status: 'ok',
  checks: 30,
  failures: 0,
  latencyMs: 40,
};

const ANSWER: ChecksResponse = {
  range: '24h',
  bucketSeconds: 1800,
  components: [
    {
      key: 'api',
      name: 'API',
      uptime: { value: 100, unit: 'percent', state: 'ok' },
      latency: { value: 40, unit: 'ms', state: 'ok' },
      buckets: [BUCKET],
    },
    {
      key: 'redis',
      name: 'Redis',
      uptime: { value: 100, unit: 'percent', state: 'ok' },
      latency: { value: 2, unit: 'ms', state: 'ok' },
      buckets: [],
    },
  ],
};

describe('historyView', () => {
  it('is loading with nothing to show before the first answer', () => {
    const view = historyView({ data: undefined, isError: false, isPlaceholderData: false });
    expect(view.status).toBe('loading');
    expect(view.buckets.size).toBe(0);
  });

  it('is failed, still with nothing to show, when the read failed and there is no answer', () => {
    const view = historyView({ data: undefined, isError: true, isPlaceholderData: false });
    expect(view.status).toBe('failed');
    expect(view.buckets.size).toBe(0);
  });

  it('finds the buckets by component key and carries the bucket length and the range', () => {
    const view = historyView({ data: ANSWER, isError: false, isPlaceholderData: false });
    expect(view.status).toBe('ready');
    expect(view.buckets.get('api')).toEqual([BUCKET]);
    expect(view.buckets.get('redis')).toEqual([]);
    expect(view.buckets.get('postgres')).toBeUndefined();
    expect(view.bucketSeconds).toBe(1800);
    expect(view.range).toBe('24h');
  });

  it('stays ready when a refresh failed but the last answer is still there, and marks a kept previous range', () => {
    expect(historyView({ data: ANSWER, isError: true, isPlaceholderData: false }).status).toBe('ready');
    expect(historyView({ data: ANSWER, isError: false, isPlaceholderData: true }).placeholder).toBe(true);
  });
});
