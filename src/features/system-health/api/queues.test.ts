// Tests for the queue functions: the counters, the paged failed-job list (with its total), retry and pause.
import { describe, expect, it } from 'vitest';
import { getQueues, listFailedJobs, pauseQueue, retryQueue } from './queues';
import { stubFetch } from '../test/stubFetch';

const http = stubFetch();

describe('getQueues', () => {
  it('reads the counters with a plain GET', async () => {
    http.reply({ queues: [] });
    await expect(getQueues()).resolves.toEqual({ queues: [] });
    expect(http.last()).toEqual({ method: 'GET', path: '/admin/system/queues', query: {}, body: undefined });
  });
});

describe('listFailedJobs', () => {
  it('asks for a row range, newest failure first, and reads the total from the header', async () => {
    http.reply([{ id: '17' }, { id: '18' }], { headers: { 'x-total-count': '41' } });
    const result = await listFailedJobs('outbox', {
      start: 25,
      end: 50,
      sort: ['failedAt'],
      order: ['desc'],
    });
    expect(result).toEqual({ data: [{ id: '17' }, { id: '18' }], total: 41 });
    expect(http.last()).toEqual({
      method: 'GET',
      path: '/admin/system/queues/outbox/failed',
      query: { _start: '25', _end: '50', _sort: 'failedAt', _order: 'desc' },
      body: undefined,
    });
  });

  it('encodes a queue name that needs it', async () => {
    http.reply([]);
    await listFailedJobs('dead letter');
    expect(http.last().path).toBe('/admin/system/queues/dead%20letter/failed');
  });
});

describe('retryQueue', () => {
  it('retries every failed job of a queue', async () => {
    http.reply({ retried: 12 });
    await expect(retryQueue('outbox', { all: true })).resolves.toEqual({ retried: 12 });
    expect(http.last()).toEqual({
      method: 'POST',
      path: '/admin/system/queues/outbox/retry',
      query: {},
      body: { all: true },
    });
  });

  it('retries one job by id', async () => {
    await retryQueue('outbox', { jobId: '17' });
    expect(http.last().body).toEqual({ jobId: '17' });
  });
});

describe('pauseQueue', () => {
  it('pauses with a reason', async () => {
    await pauseQueue('outbox', { paused: true, reason: 'Supplier timeouts' });
    expect(http.last()).toEqual({
      method: 'POST',
      path: '/admin/system/queues/outbox/pause',
      query: {},
      body: { paused: true, reason: 'Supplier timeouts' },
    });
  });

  it('resumes without one', async () => {
    await pauseQueue('outbox', { paused: false });
    expect(http.last().body).toEqual({ paused: false });
  });
});
