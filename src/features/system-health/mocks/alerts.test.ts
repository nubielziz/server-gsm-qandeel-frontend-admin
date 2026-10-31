// Tests of the System health mock's alerts, alert rules and incidents: acknowledging, the list filters, rules with 422
// field errors, and incidents with a timeline the mock writes and a root cause needed to close.
import { describe, expect, it } from 'vitest';
import { apiDelete, apiGet, apiList, apiPatch, apiPost } from '@/lib/api';
import { setMockScenario } from '@/mocks/scenario';
import type { AlertEvent, AlertRule, Incident, SystemHealth } from '../types';
import { NEW_RULE, failure, setupHealthMocks } from './testing';

setupHealthMocks();

describe('alerts', () => {
  it('lists open alerts first-class: filter by status, search, newest first, total in the header', async () => {
    setMockScenario('degraded');
    const firing = await apiList<AlertEvent>('/admin/alerts', { filters: { status: 'firing' } });
    expect(firing.total).toBe(2);
    expect(firing.data.map((alert) => alert.rule.key)).toEqual(['queue_oldest_job', 'supplier_timeout_rate']);
    const all = await apiList<AlertEvent>('/admin/alerts', { start: 0, end: 5 });
    expect(all.total).toBe(12);
    expect(all.data).toHaveLength(5);
    const times = all.data.map((alert) => Date.parse(alert.startedAt ?? ''));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    const supplier = await apiList<AlertEvent>('/admin/alerts', { q: 'rapid' });
    expect(supplier.data.map((alert) => alert.subjectLabel)).toEqual(['Rapid IMEI']);
    expect((await failure(apiGet('/admin/alerts/999'))).status).toBe(404);
  });

  it('acknowledges: records who and the note, keeps it open, and a second time is a 409', async () => {
    setMockScenario('degraded');
    const [critical] = (
      await apiList<AlertEvent>('/admin/alerts', { filters: { status: 'firing', severity: 'critical' } })
    ).data;
    expect(critical.incidentId).not.toBeNull();
    const updated = await apiPost<AlertEvent>(`/admin/alerts/${critical.id}/ack`, {
      note: 'On it, calling the supplier.',
    });
    expect(updated).toMatchObject({
      id: critical.id,
      status: 'acknowledged',
      note: 'On it, calling the supplier.',
      acknowledgedBy: { name: 'Rami K.' },
    });
    expect(updated.acknowledgedAt).toBeTruthy();

    expect((await apiList<AlertEvent>('/admin/alerts', { filters: { status: 'firing' } })).total).toBe(1);
    expect((await apiList<AlertEvent>('/admin/alerts', { filters: { status: 'acknowledged' } })).total).toBe(
      1,
    );
    // Still open: the health summary counts it, and it is still critical.
    const health = await apiGet<SystemHealth>('/admin/system/health');
    expect(health.alerts.open).toMatchObject({ value: 2, state: 'crit' });
    expect(health.alerts.items.find((item) => item.id === critical.id)?.status).toBe('acknowledged');

    const again = await failure(apiPost(`/admin/alerts/${critical.id}/ack`, {}));
    expect(again).toMatchObject({ status: 409, code: 'ALERT_ACKNOWLEDGED' });
    const resolved = (await apiList<AlertEvent>('/admin/alerts', { filters: { status: 'resolved' } }))
      .data[0];
    expect(await failure(apiPost(`/admin/alerts/${resolved.id}/ack`, {}))).toMatchObject({
      status: 409,
      code: 'ALERT_RESOLVED',
    });
  });

  it('refuses a note that is too long, with the field named', async () => {
    setMockScenario('degraded');
    const [alert] = (await apiList<AlertEvent>('/admin/alerts', { filters: { status: 'firing' } })).data;
    const error = await failure(apiPost(`/admin/alerts/${alert.id}/ack`, { note: 'x'.repeat(501) }));
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION_FAILED' });
    expect(Object.keys(error.fieldErrors)).toEqual(['note']);
  });
});

describe('alert rules', () => {
  it('lists ten rules by name with the open flag, one muted and one off', async () => {
    setMockScenario('degraded');
    const rules = await apiList<AlertRule>('/admin/alert-rules');
    expect(rules.total).toBe(10);
    const names = rules.data.map((rule) => rule.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(
      rules.data
        .filter((rule) => rule.open)
        .map((rule) => rule.key)
        .sort(),
    ).toEqual(['queue_oldest_job', 'supplier_timeout_rate']);
    expect(rules.data.filter((rule) => rule.mutedUntil).map((rule) => rule.key)).toEqual([
      'supplier_balance_low',
    ]);
    expect(rules.data.filter((rule) => !rule.isActive).map((rule) => rule.key)).toEqual(['redis_memory']);
    expect(await apiGet<AlertRule>('/admin/alert-rules/1')).toMatchObject({
      key: 'supplier_timeout_rate',
      comparator: 'gt',
      unit: 'percent',
    });
  });

  it('creates, edits, mutes, switches off and deletes', async () => {
    setMockScenario('healthy');
    const created = await apiPost<AlertRule>('/admin/alert-rules', NEW_RULE);
    expect(created).toMatchObject({
      ...NEW_RULE,
      id: 11,
      unit: 's',
      isActive: true,
      mutedUntil: null,
      open: false,
    });

    const until = new Date(Date.now() + 2 * 3_600_000).toISOString();
    const muted = await apiPatch<AlertRule>('/admin/alert-rules/11', {
      mutedUntil: until,
      isActive: false,
      threshold: 420,
    });
    expect(muted).toMatchObject({
      mutedUntil: until,
      isActive: false,
      threshold: 420,
      key: 'webhook_backlog',
    });
    expect(muted.updatedAt).toBeTruthy();
    expect(await apiPatch<AlertRule>('/admin/alert-rules/11', { mutedUntil: null })).toMatchObject({
      mutedUntil: null,
    });

    await apiDelete('/admin/alert-rules/11');
    expect((await failure(apiGet('/admin/alert-rules/11'))).status).toBe(404);
    expect((await failure(apiDelete('/admin/alert-rules/11'))).status).toBe(404);
    expect((await apiList<AlertRule>('/admin/alert-rules')).total).toBe(10);
  });

  it('answers 422 with a message per field on create', async () => {
    setMockScenario('healthy');
    const error = await failure(
      apiPost('/admin/alert-rules', {
        key: 'Bad Key',
        name: 'x',
        metric: 'constructor',
        comparator: 'near',
        threshold: 'a lot',
        windowSeconds: 5,
        severity: 'loud',
        channels: [],
      }),
    );
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION_FAILED' });
    expect(Object.keys(error.fieldErrors).sort()).toEqual([
      'channels',
      'comparator',
      'key',
      'metric',
      'name',
      'severity',
      'threshold',
      'windowSeconds',
    ]);
    expect(error.fieldErrors.windowSeconds[0]).toContain('60');
  });

  it('refuses a key that is taken and a mute in the past, naming the field', async () => {
    setMockScenario('healthy');
    const taken = await failure(apiPost('/admin/alert-rules', { ...NEW_RULE, key: 'api_rate5xx' }));
    expect(taken.fieldErrors.key).toEqual(['A rule with this key already exists.']);
    const past = await failure(apiPatch('/admin/alert-rules/1', { mutedUntil: '2020-01-01T00:00:00Z' }));
    expect(Object.keys(past.fieldErrors)).toEqual(['mutedUntil']);
    // A rule may keep its own key when it is edited.
    await expect(
      apiPatch('/admin/alert-rules/3', { key: 'api_rate5xx', name: 'API 5xx rate (all)' }),
    ).resolves.toBeTruthy();
  });
});

describe('incidents', () => {
  it('lists them newest first and filters the open ones', async () => {
    setMockScenario('degraded');
    const all = await apiList<Incident>('/admin/incidents');
    expect(all.total).toBe(5);
    expect(all.data[0].title).toBe('Supplier timeouts');
    const open = await apiList<Incident>('/admin/incidents', { filters: { open: true } });
    expect(open.data.map((incident) => incident.status)).toEqual(['identified']);
    const resolved = await apiList<Incident>('/admin/incidents', { filters: { open: false } });
    expect(resolved.total).toBe(4);
    expect(
      (await apiList<Incident>('/admin/incidents', { filters: { status: 'investigating' } })).total,
    ).toBe(0);
    expect((await apiGet<Incident>('/admin/incidents/5')).timeline).toHaveLength(2);
    expect((await failure(apiGet('/admin/incidents/99'))).status).toBe(404);
  });

  it('declares from an alert, writes the timeline on every update, and closes only with a root cause', async () => {
    setMockScenario('maintenance');
    const [alert] = (await apiList<AlertEvent>('/admin/alerts', { filters: { status: 'acknowledged' } }))
      .data;
    const incident = await apiPost<Incident>('/admin/incidents', {
      title: 'Wallet mismatch',
      severity: 'major',
      components: ['postgres'],
      summary: 'A merchant wallet is 37.50 below its ledger lines.',
      alertEventId: alert.id,
    });
    expect(incident).toMatchObject({
      id: 5,
      status: 'investigating',
      alertEventId: alert.id,
      createdBy: { name: 'Rami K.' },
      rootCause: null,
    });
    expect(incident.timeline).toEqual([
      expect.objectContaining({ status: 'investigating', text: 'Incident declared. We are investigating.' }),
    ]);
    expect((await apiGet<AlertEvent>(`/admin/alerts/${alert.id}`)).incidentId).toBe(incident.id);
    expect((await apiGet<SystemHealth>('/admin/system/health')).incidents.map((item) => item.id)).toEqual([
      incident.id,
    ]);

    const identified = await apiPatch<Incident>(`/admin/incidents/${incident.id}`, {
      status: 'identified',
      update: 'The reversing entry was posted twice.',
    });
    expect(identified.status).toBe('identified');
    expect(identified.timeline).toHaveLength(2);
    expect(identified.timeline[1]).toMatchObject({
      status: 'identified',
      text: 'The reversing entry was posted twice.',
      by: { name: 'Rami K.' },
    });
    // A status change without a text still gets a line.
    const monitoring = await apiPatch<Incident>(`/admin/incidents/${incident.id}`, { status: 'monitoring' });
    expect(monitoring.timeline[2]).toMatchObject({
      status: 'monitoring',
      text: 'A fix is in place; watching it.',
    });

    const noCause = await failure(
      apiPatch(`/admin/incidents/${incident.id}`, { status: 'resolved', update: 'Fixed.' }),
    );
    expect(noCause).toMatchObject({ status: 422 });
    expect(Object.keys(noCause.fieldErrors)).toEqual(['rootCause']);
    expect((await apiGet<Incident>(`/admin/incidents/${incident.id}`)).status).toBe('monitoring');

    const closed = await apiPatch<Incident>(`/admin/incidents/${incident.id}`, {
      status: 'resolved',
      update: 'Wallet matches its lines again.',
      rootCause: 'A retry posted the reversing entry twice; the second one was reversed.',
    });
    expect(closed).toMatchObject({ status: 'resolved', resolvedBy: { name: 'Rami K.' } });
    expect(closed.resolvedAt).toBe(closed.timeline.at(-1)?.at);
    expect(closed.rootCause).toContain('reversing entry');
    expect(
      await failure(apiPatch(`/admin/incidents/${incident.id}`, { title: 'Another title' })),
    ).toMatchObject({ status: 409, code: 'INCIDENT_CLOSED' });
    expect((await apiGet<SystemHealth>('/admin/system/health')).incidents).toEqual([]);
  });

  it('answers 422 with a message per field on declare', async () => {
    setMockScenario('healthy');
    const error = await failure(
      apiPost('/admin/incidents', {
        title: '',
        severity: 'huge',
        components: ['nowhere'],
        summary: 'short',
        alertEventId: 999,
      }),
    );
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION_FAILED' });
    expect(Object.keys(error.fieldErrors).sort()).toEqual([
      'alertEventId',
      'components',
      'severity',
      'summary',
      'title',
    ]);
    expect(error.fieldErrors.components[0]).toBe('Unknown component: nowhere.');
  });
});
