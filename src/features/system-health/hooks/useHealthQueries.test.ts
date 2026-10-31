// Tests for the System health reads: the request each hook sends, the polling rate of the hook contract, the previous
// answer kept while another key loads, the reads that stay disabled, and Refresh.
import type { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { stubFetch } from '../test/stubFetch';
import type { TimeRange } from '../types';
import { healthKey, POLL } from './keys';
import { hookKit } from '../test/testKit';
import { useAlert, useAlertRules, useAlerts, useIncident, useIncidents } from './useAlerts';
import { useChecks, useSystemHealth } from './useHealth';
import { useIntegrity } from './useIntegrity';
import { useOrdersHealth, useSuppliersHealth } from './usePipeline';
import { useFailedJobs, useJobs, useQueues, useWebhooksHealth } from './useQueues';
import { useRefreshHealth } from './useRefreshHealth';
import { useCacheHealth, useDatabaseHealth } from './useStores';
import { useApiErrors, useApiMetrics } from './useTraffic';

const http = stubFetch();

// The polling a hook asked React Query for, read back from the query's observer.
function pollOf(queryClient: QueryClient, key: readonly unknown[]) {
  return queryClient.getQueryCache().find({ queryKey: key })?.observers[0]?.options.refetchInterval;
}

// Every read of the hook contract with the key it uses and its poll rate.
const READS: [string, () => unknown, readonly unknown[], number][] = [
  ['useSystemHealth', () => useSystemHealth(), healthKey('health'), POLL.fast],
  ['useChecks', () => useChecks({ range: '24h' }), healthKey('checks', '24h', null), POLL.normal],
  ['useApiMetrics', () => useApiMetrics({ range: '6h' }), healthKey('metrics', '6h', null), POLL.normal],
  ['useApiErrors', () => useApiErrors({ range: '1h' }), healthKey('errors', '1h', null), POLL.normal],
  ['useOrdersHealth', () => useOrdersHealth(), healthKey('orders-health'), POLL.normal],
  ['useSuppliersHealth', () => useSuppliersHealth(), healthKey('suppliers'), POLL.normal],
  ['useQueues', () => useQueues(), healthKey('queues'), POLL.fast],
  ['useFailedJobs', () => useFailedJobs('outbox'), healthKey('failed-jobs', 'outbox', 0, 25), POLL.normal],
  ['useJobs', () => useJobs(), healthKey('jobs', null), POLL.normal],
  ['useWebhooksHealth', () => useWebhooksHealth(), healthKey('webhooks'), POLL.normal],
  ['useDatabaseHealth', () => useDatabaseHealth(), healthKey('database'), POLL.normal],
  ['useCacheHealth', () => useCacheHealth(), healthKey('cache'), POLL.normal],
  ['useAlerts', () => useAlerts({}), healthKey('alerts', null, null, 0, 25), POLL.fast],
  ['useAlert', () => useAlert(5), healthKey('alert', 5), POLL.fast],
  ['useAlertRules', () => useAlertRules(), healthKey('alert-rules', 0, 25), POLL.normal],
  ['useIncidents', () => useIncidents({}), healthKey('incidents', null, null, 0, 25), POLL.normal],
  ['useIncident', () => useIncident(7), healthKey('incident', 7), POLL.normal],
];

describe('the reads of the hook contract', () => {
  it.each(READS)('%s uses its key and polls at the contract rate', async (_name, useRead, key, rate) => {
    const { Wrapper, queryClient } = hookKit();
    http.reply({ data: 1 }, { headers: { 'x-total-count': '1' } });
    renderHook(() => useRead(), { wrapper: Wrapper });
    await waitFor(() =>
      expect(queryClient.getQueryCache().find({ queryKey: key })?.state.status).toBe('success'),
    );
    expect(pollOf(queryClient, key)).toBe(rate);
    expect(key.slice(0, 2)).toEqual(['api', 'system-health']);
  });

  it('reads the health summary with a plain GET and returns it', async () => {
    const { Wrapper } = hookKit();
    http.reply({ status: 'operational' });
    const { result } = renderHook(() => useSystemHealth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ status: 'operational' }));
    expect(http.last()).toEqual({ method: 'GET', path: '/admin/system/health', query: {}, body: undefined });
  });

  it('stays quiet while it is disabled', async () => {
    const { Wrapper } = hookKit();
    const { result } = renderHook(() => useSystemHealth(false), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(http.sent).toHaveLength(0);
  });
});

describe('useIntegrity', () => {
  it('polls every 30 seconds, and every 5 while the server says a run is in progress', async () => {
    const { Wrapper, queryClient } = hookKit();
    http.reply({ running: false, checks: [] });
    const { result } = renderHook(() => useIntegrity(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const interval = pollOf(queryClient, healthKey('integrity'));
    if (typeof interval !== 'function') throw new Error('The integrity poll should depend on the answer.');
    const after = (data: unknown) => interval({ state: { data } } as never);
    expect(after({ running: true })).toBe(POLL.running);
    expect(after({ running: false })).toBe(POLL.normal);
    expect(after(undefined)).toBe(POLL.normal);
  });
});

describe('the lists', () => {
  it('useFailedJobs reads one page of a queue, newest first, with the total', async () => {
    const { Wrapper } = hookKit();
    http.reply([{ id: '17' }], { headers: { 'x-total-count': '41' } });
    const { result } = renderHook(() => useFailedJobs('outbox', { start: 25, end: 50 }), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.data).toEqual({ data: [{ id: '17' }], total: 41 }));
    expect(http.last()).toEqual({
      method: 'GET',
      path: '/admin/system/queues/outbox/failed',
      query: { _start: '25', _end: '50', _sort: 'failedAt', _order: 'desc' },
      body: undefined,
    });
  });

  it('useFailedJobs reads nothing until a queue is picked', () => {
    const { Wrapper } = hookKit();
    const { result } = renderHook(() => useFailedJobs(undefined), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(http.sent).toHaveLength(0);
  });

  it('useAlerts sends the filters, the first page and the newest-first sort', async () => {
    const { Wrapper } = hookKit();
    http.reply([{ id: 5 }], { headers: { 'x-total-count': '1' } });
    const { result } = renderHook(() => useAlerts({ status: 'firing' }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data?.total).toBe(1));
    expect(http.last().path).toBe('/admin/alerts');
    expect(http.last().query).toEqual({
      _start: '0',
      _end: '25',
      _sort: 'startedAt',
      _order: 'desc',
      status: 'firing',
    });
  });

  it('useIncidents sends the open filter', async () => {
    const { Wrapper } = hookKit();
    http.reply([]);
    const { result } = renderHook(() => useIncidents({ open: true }, { start: 0, end: 10 }), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(http.last().path).toBe('/admin/incidents');
    expect(http.last().query).toEqual({
      _start: '0',
      _end: '10',
      _sort: 'startedAt',
      _order: 'desc',
      open: 'true',
    });
  });

  it('useAlertRules reads one page of rules', async () => {
    const { Wrapper } = hookKit();
    http.reply([]);
    const { result } = renderHook(() => useAlertRules({ start: 25, end: 50 }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(http.last()).toEqual({
      method: 'GET',
      path: '/admin/alert-rules',
      query: { _start: '25', _end: '50' },
      body: undefined,
    });
  });

  it('useAlert and useIncident read one record, and wait for an id', async () => {
    const { Wrapper } = hookKit();
    const idle = renderHook(() => [useAlert(undefined), useIncident(undefined)] as const, {
      wrapper: Wrapper,
    });
    expect(idle.result.current.map((read) => read.fetchStatus)).toEqual(['idle', 'idle']);
    expect(http.sent).toHaveLength(0);

    http.reply({ id: 7, timeline: [] });
    const one = renderHook(() => useIncident(7), { wrapper: Wrapper });
    await waitFor(() => expect(one.result.current.data).toEqual({ id: 7, timeline: [] }));
    expect(http.last().path).toBe('/admin/incidents/7');
  });
});

describe('a new key', () => {
  it('keeps the previous answer on screen while another range loads', async () => {
    const { Wrapper } = hookKit();
    http.reply({ range: '24h' });
    const { result, rerender } = renderHook(({ range }) => useChecks({ range }), {
      wrapper: Wrapper,
      initialProps: { range: '24h' as TimeRange },
    });
    await waitFor(() => expect(result.current.data).toEqual({ range: '24h' }));
    expect(result.current.isPlaceholderData).toBe(false);

    http.reply({ range: '7d' });
    rerender({ range: '7d' });
    expect(result.current.data).toEqual({ range: '24h' });
    expect(result.current.isPlaceholderData).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual({ range: '7d' }));
    expect(result.current.isPlaceholderData).toBe(false);
    expect(http.last().query).toEqual({ range: '7d' });
  });

  it('does not show one component under another: a new component starts empty', async () => {
    const { Wrapper } = hookKit();
    http.reply({ component: 'postgres' });
    const { result, rerender } = renderHook(({ component }) => useChecks({ range: '24h', component }), {
      wrapper: Wrapper,
      initialProps: { component: 'postgres' },
    });
    await waitFor(() => expect(result.current.data).toEqual({ component: 'postgres' }));

    http.reply({ component: 'redis' });
    rerender({ component: 'redis' });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPlaceholderData).toBe(false);
    await waitFor(() => expect(result.current.data).toEqual({ component: 'redis' }));
  });

  it('keeps the failed jobs of a queue while its next page loads, but not while another queue loads', async () => {
    const { Wrapper } = hookKit();
    http.reply([{ id: '1' }], { headers: { 'x-total-count': '60' } });
    const { result, rerender } = renderHook(
      ({ queue, start }) => useFailedJobs(queue, { start, end: start + 25 }),
      {
        wrapper: Wrapper,
        initialProps: { queue: 'outbox' as string | undefined, start: 0 },
      },
    );
    await waitFor(() => expect(result.current.data?.data).toEqual([{ id: '1' }]));

    http.reply([{ id: '26' }], { headers: { 'x-total-count': '60' } });
    rerender({ queue: 'outbox', start: 25 });
    expect(result.current.data?.data).toEqual([{ id: '1' }]);
    expect(result.current.isPlaceholderData).toBe(true);
    await waitFor(() => expect(result.current.data?.data).toEqual([{ id: '26' }]));

    http.reply([{ id: 'w1' }], { headers: { 'x-total-count': '1' } });
    rerender({ queue: 'webhooks', start: 0 });
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data?.data).toEqual([{ id: 'w1' }]));

    // Picking no queue at all leaves nothing of the last queue behind.
    rerender({ queue: undefined, start: 0 });
    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('does not show one incident under another: a new id starts empty', async () => {
    const { Wrapper } = hookKit();
    http.reply({ id: 7 });
    const { result, rerender } = renderHook(({ id }) => useIncident(id), {
      wrapper: Wrapper,
      initialProps: { id: 7 },
    });
    await waitFor(() => expect(result.current.data).toEqual({ id: 7 }));

    http.reply({ id: 8 });
    rerender({ id: 8 });
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data).toEqual({ id: 8 }));
  });

  it('keeps the alert list on screen while another filter loads', async () => {
    const { Wrapper } = hookKit();
    http.reply([{ id: 1 }], { headers: { 'x-total-count': '1' } });
    const { result, rerender } = renderHook(({ status }) => useAlerts({ status }), {
      wrapper: Wrapper,
      initialProps: { status: 'firing' as 'firing' | 'resolved' },
    });
    await waitFor(() => expect(result.current.data?.data).toEqual([{ id: 1 }]));

    http.reply([{ id: 2 }], { headers: { 'x-total-count': '1' } });
    rerender({ status: 'resolved' });
    expect(result.current.data?.data).toEqual([{ id: 1 }]);
    expect(result.current.isPlaceholderData).toBe(true);
    await waitFor(() => expect(result.current.data?.data).toEqual([{ id: 2 }]));
  });
});

describe('useRefreshHealth', () => {
  it('reads every health read on screen again at once and resolves when all are done', async () => {
    const { Wrapper } = hookKit();
    http.reply({});
    const { result } = renderHook(
      () => ({
        health: useSystemHealth(),
        queues: useQueues(),
        failed: useFailedJobs(undefined),
        refresh: useRefreshHealth(),
      }),
      { wrapper: Wrapper },
    );
    await waitFor(() =>
      expect(result.current.health.isSuccess && result.current.queues.isSuccess).toBe(true),
    );
    expect(http.sent).toHaveLength(2);

    await act(async () => {
      await result.current.refresh();
    });
    expect(http.sent).toHaveLength(4);
    expect(
      http.sent
        .slice(2)
        .map((request) => request.path)
        .sort(),
    ).toEqual(['/admin/system/health', '/admin/system/queues']);
    expect(result.current.health.isFetching || result.current.queues.isFetching).toBe(false);
  });
});
