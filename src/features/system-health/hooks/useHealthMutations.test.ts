// Tests for the System health actions: the request each one sends, the toast that says what changed, the health reads
// and Refine resources it makes stale, and that a refusal shows the server's error and refreshes nothing.
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { stubFetch } from '../test/stubFetch';
import { DASHBOARD_KEY } from '@/lib/query';
import { healthKey, type HealthRead } from './keys';
import { hookKit } from '../test/testKit';
import {
  useAckAlert,
  useCreateAlertRule,
  useCreateIncident,
  useDeleteAlertRule,
  useUpdateAlertRule,
  useUpdateIncident,
} from './useAlertMutations';
import {
  usePauseQueue,
  useRetryFailedJobs,
  useRunIntegrity,
  useRunJob,
  useSetMaintenance,
} from './useOpsMutations';
import { useSetSupplierStatus } from './useSetSupplierStatus';

const http = stubFetch();

// The controls without a dialog keep the error toast; the dialogs turn it off (see `a refusal`).
const LOUD = { toastErrors: true };

type Mutation<TVars> = { mutateAsync: (variables: TVars) => Promise<unknown> };

// Runs a mutation hook once inside a Refine and returns what the kit recorded.
async function run<TVars>(useHook: () => Mutation<TVars>, variables: TVars) {
  const kit = hookKit();
  const { result } = renderHook(() => useHook(), { wrapper: kit.Wrapper });
  await act(async () => {
    await result.current.mutateAsync(variables);
  });
  return kit;
}

// The first toast the kit recorded (minus its type), and the health reads made stale, by name.
const toastOf = (kit: Awaited<ReturnType<typeof run>>) =>
  kit.open.mock.calls[0]?.[0] as Record<string, unknown>;
const staleReads = (kit: Awaited<ReturnType<typeof run>>) =>
  kit
    .refreshed()
    .filter((key) => key.startsWith('["api","system-health"'))
    .map((key) => (JSON.parse(key) as string[])[2])
    .sort();
// The Refine resources made stale (Refine's keys look like ["data","default","alerts","list"]).
const staleResources = (kit: Awaited<ReturnType<typeof run>>) =>
  [
    ...new Set(
      kit
        .refreshed()
        .filter((key) => key.startsWith('["data"'))
        .map((key) => (JSON.parse(key) as string[])[2]),
    ),
  ].sort();
const names = (...list: HealthRead[]) => [...list].sort();

describe('maintenance', () => {
  it('switches it on for a scope, says so, and reads the health summary again', async () => {
    const body = {
      enabled: true as const,
      scope: 'checkout' as const,
      message: 'Back soon.',
      expectedEndAt: null,
    };
    const kit = await run(() => useSetMaintenance(LOUD), body);
    expect(http.last()).toEqual({ method: 'PUT', path: '/admin/system/maintenance', query: {}, body });
    expect(toastOf(kit)).toMatchObject({ type: 'success', message: 'Maintenance is on for checkout' });
    expect(staleReads(kit)).toEqual(names('health'));
  });

  it('switches it off and says customers can use the platform again', async () => {
    const kit = await run(() => useSetMaintenance(LOUD), { enabled: false as const });
    expect(toastOf(kit)).toMatchObject({ message: 'Maintenance is off' });
  });
});

describe('queues and jobs', () => {
  it('retry names the number of jobs the server retried and refreshes the queues and the failed list', async () => {
    http.reply({ retried: 12 });
    const kit = await run(() => useRetryFailedJobs(LOUD), { queue: 'outbox', body: { all: true as const } });
    expect(http.last()).toEqual({
      method: 'POST',
      path: '/admin/system/queues/outbox/retry',
      query: {},
      body: { all: true },
    });
    expect(toastOf(kit)).toMatchObject({ message: 'Retried 12 failed jobs' });
    expect(staleReads(kit)).toEqual(names('failed-jobs', 'queues'));
  });

  it('retry of one job says "job", not "jobs"', async () => {
    http.reply({ retried: 1 });
    const kit = await run(() => useRetryFailedJobs(LOUD), { queue: 'outbox', body: { jobId: '17' } });
    expect(toastOf(kit)).toMatchObject({ message: 'Retried 1 failed job' });
  });

  it('pause sends the reason, says the queue is paused, and refreshes the queues', async () => {
    const kit = await run(() => usePauseQueue(LOUD), {
      queue: 'outbox',
      body: { paused: true, reason: 'Supplier timeouts' },
    });
    expect(http.last()).toEqual({
      method: 'POST',
      path: '/admin/system/queues/outbox/pause',
      query: {},
      body: { paused: true, reason: 'Supplier timeouts' },
    });
    expect(toastOf(kit)).toMatchObject({ message: 'outbox paused' });
    expect(staleReads(kit)).toEqual(names('queues'));
  });

  it('resume says the queue is resumed', async () => {
    const kit = await run(() => usePauseQueue(LOUD), { queue: 'outbox', body: { paused: false } });
    expect(toastOf(kit)).toMatchObject({ message: 'outbox resumed' });
  });

  it('run now uses the job label for the toast when it is given, else the name, and refreshes the jobs', async () => {
    const kit = await run(() => useRunJob(LOUD), { job: 'price-sync', label: 'Price sync' });
    expect(http.last()).toEqual({
      method: 'POST',
      path: '/admin/system/jobs/price-sync/run',
      query: {},
      body: undefined,
    });
    expect(toastOf(kit)).toMatchObject({ message: 'Price sync started' });
    expect(staleReads(kit)).toEqual(names('jobs'));
    const plain = await run(() => useRunJob(LOUD), { job: 'price-sync' });
    expect(toastOf(plain)).toMatchObject({ message: 'price-sync started' });
  });

  it('the integrity run starts the check and refreshes the report and the jobs', async () => {
    const kit = await run(() => useRunIntegrity(LOUD), undefined);
    expect(http.last()).toEqual({
      method: 'POST',
      path: '/admin/system/integrity/run',
      query: {},
      body: undefined,
    });
    expect(toastOf(kit)).toMatchObject({ message: 'Integrity check started' });
    expect(staleReads(kit)).toEqual(names('integrity', 'jobs'));
  });
});

describe('useSetSupplierStatus', () => {
  it('pauses through the supplier PATCH and refreshes the health reads, the Refine suppliers and the dashboard', async () => {
    const kit = await run(() => useSetSupplierStatus(LOUD), {
      id: 3,
      name: 'Dhru Prime',
      status: 'paused' as const,
    });
    expect(http.last()).toEqual({
      method: 'PATCH',
      path: '/admin/suppliers/3',
      query: {},
      body: { status: 'paused' },
    });
    expect(toastOf(kit)).toMatchObject({ type: 'success', message: 'Dhru Prime paused' });
    expect(staleReads(kit)).toEqual(names('health', 'suppliers'));
    expect(staleResources(kit)).toEqual(['suppliers']);
    expect(kit.refreshed()).toContain(JSON.stringify(DASHBOARD_KEY));
    expect(kit.refreshed()).toContain(JSON.stringify(healthKey('suppliers')));
  });

  it('resumes by setting the status back to active', async () => {
    const kit = await run(() => useSetSupplierStatus(LOUD), {
      id: 3,
      name: 'Dhru Prime',
      status: 'active' as const,
    });
    expect(http.last().body).toEqual({ status: 'active' });
    expect(toastOf(kit)).toMatchObject({ message: 'Dhru Prime resumed' });
  });
});

describe('alerts', () => {
  it('acknowledge sends the note, says what happens, and refreshes the alerts and the health summary', async () => {
    const kit = await run(() => useAckAlert(LOUD), { id: 5, body: { note: 'Looking into it.' } });
    expect(http.last()).toEqual({
      method: 'POST',
      path: '/admin/alerts/5/ack',
      query: {},
      body: { note: 'Looking into it.' },
    });
    expect(toastOf(kit)).toMatchObject({ type: 'success', message: 'Alert acknowledged' });
    expect(staleReads(kit)).toEqual(names('alert', 'alerts', 'health'));
    expect(staleResources(kit)).toEqual(['alerts']);
  });
});

describe('alert rules', () => {
  it('create posts the rule and refreshes the rules', async () => {
    const body = {
      key: 'api_p95_high',
      name: 'API p95 high',
      metric: 'api.p95_ms',
      comparator: 'gt' as const,
      threshold: 800,
      windowSeconds: 300,
      severity: 'warning' as const,
      channels: ['telegram' as const],
    };
    const kit = await run(() => useCreateAlertRule(LOUD), body);
    expect(http.last()).toEqual({ method: 'POST', path: '/admin/alert-rules', query: {}, body });
    expect(toastOf(kit)).toMatchObject({ message: 'Alert rule created', description: 'API p95 high' });
    expect(staleReads(kit)).toEqual(names('alert-rules'));
    expect(staleResources(kit)).toEqual(['alert-rules']);
  });

  it('a mute says the rule is muted until the time, and also refreshes the alerts that carry the rule', async () => {
    http.reply({ id: 3, name: 'API p95 high' });
    const kit = await run(() => useUpdateAlertRule(LOUD), {
      id: 3,
      body: { mutedUntil: '2026-10-31T18:00:00.000Z' },
    });
    expect(http.last()).toEqual({
      method: 'PATCH',
      path: '/admin/alert-rules/3',
      query: {},
      body: { mutedUntil: '2026-10-31T18:00:00.000Z' },
    });
    expect(toastOf(kit)).toMatchObject({ message: 'Rule muted' });
    expect(String(toastOf(kit).description)).toContain('API p95 high stays quiet until');
    expect(staleReads(kit)).toEqual(names('alert', 'alert-rules', 'alerts', 'health'));
    expect(staleResources(kit)).toEqual(['alert-rules', 'alerts']);
  });

  it('switching a rule off says so even when the server answers with an empty body', async () => {
    http.reply(undefined, { status: 204 });
    const kit = await run(() => useUpdateAlertRule(LOUD), { id: 3, body: { isActive: false } });
    expect(toastOf(kit)).toMatchObject({ message: 'Rule switched off' });
  });

  it('delete sends a DELETE and refreshes the lists but not the deleted rule', async () => {
    http.reply(undefined, { status: 204 });
    const kit = await run(() => useDeleteAlertRule(LOUD), 3);
    expect(http.last()).toEqual({
      method: 'DELETE',
      path: '/admin/alert-rules/3',
      query: {},
      body: undefined,
    });
    expect(toastOf(kit)).toMatchObject({ message: 'Alert rule deleted' });
    expect(staleReads(kit)).toEqual(names('alert', 'alert-rules', 'alerts', 'health'));
    expect(kit.refreshed().some((key) => key.includes('"alert-rules","one"'))).toBe(false);
  });
});

describe('incidents', () => {
  it('declare posts the incident and refreshes the incidents, the alerts and the health summary', async () => {
    const body = {
      title: 'Supplier timeouts',
      severity: 'major' as const,
      components: ['supplier:3'],
      summary: 'Dhru Prime answers slowly.',
      alertEventId: 5,
    };
    const kit = await run(() => useCreateIncident(LOUD), body);
    expect(http.last()).toEqual({ method: 'POST', path: '/admin/incidents', query: {}, body });
    expect(toastOf(kit)).toMatchObject({ message: 'Incident declared', description: 'Supplier timeouts' });
    expect(staleReads(kit)).toEqual(names('alert', 'alerts', 'health', 'incident', 'incidents'));
    expect(staleResources(kit)).toEqual(['alerts', 'incidents']);
  });

  it('closing sends resolved with the root cause and says the incident is closed', async () => {
    http.reply({ id: 7, title: 'Supplier timeouts' });
    const kit = await run(() => useUpdateIncident(LOUD), {
      id: 7,
      body: { status: 'resolved' as const, rootCause: 'The supplier restarted.' },
    });
    expect(http.last()).toEqual({
      method: 'PATCH',
      path: '/admin/incidents/7',
      query: {},
      body: { status: 'resolved', rootCause: 'The supplier restarted.' },
    });
    expect(toastOf(kit)).toMatchObject({ message: 'Incident closed', description: 'Supplier timeouts' });
    expect(staleReads(kit)).toEqual(names('health', 'incident', 'incidents'));
    expect(staleResources(kit)).toEqual(['incidents']);
  });

  it('posting an update says it is on the timeline', async () => {
    const kit = await run(() => useUpdateIncident(LOUD), {
      id: 7,
      body: { status: 'identified' as const, update: 'Cause found.' },
    });
    expect(toastOf(kit)).toMatchObject({ message: 'Update posted' });
  });
});

describe('a refusal', () => {
  const forbidden = () =>
    http.reply(
      {
        title: 'Forbidden',
        status: 403,
        code: 'FORBIDDEN',
        detail: 'You need the system:manage permission.',
      },
      { status: 403 },
    );

  it("shows the server's error as a toast and refreshes nothing", async () => {
    forbidden();
    const kit = hookKit();
    const { result } = renderHook(() => useSetMaintenance(LOUD), { wrapper: kit.Wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ enabled: false })).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
      });
    });
    expect(kit.open).toHaveBeenCalledWith({
      type: 'error',
      message: 'Forbidden',
      description: 'You need the system:manage permission.',
    });
    expect(kit.refreshed()).toEqual([]);
  });

  it('leaves the error to the dialog when toastErrors is false, so it is not shown twice', async () => {
    forbidden();
    const kit = hookKit();
    const { result } = renderHook(() => useSetMaintenance({ toastErrors: false }), { wrapper: kit.Wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ enabled: false })).rejects.toMatchObject({ status: 403 });
    });
    expect(kit.open).not.toHaveBeenCalled();
    expect(kit.refreshed()).toEqual([]);
  });
});
