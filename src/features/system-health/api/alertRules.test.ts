// Tests for the alert rule functions: list, show, create, update (also mute and switch) and delete.
import { describe, expect, it } from 'vitest';
import {
  createAlertRule,
  deleteAlertRule,
  getAlertRule,
  listAlertRules,
  updateAlertRule,
} from './alertRules';
import { stubFetch } from '../test/stubFetch';

const http = stubFetch();

describe('listAlertRules', () => {
  it('sends the row range and reads the total', async () => {
    http.reply([{ id: 1 }, { id: 2 }], { headers: { 'x-total-count': '9' } });
    await expect(listAlertRules({ start: 0, end: 25 })).resolves.toEqual({
      data: [{ id: 1 }, { id: 2 }],
      total: 9,
    });
    expect(http.last()).toEqual({
      method: 'GET',
      path: '/admin/alert-rules',
      query: { _start: '0', _end: '25' },
      body: undefined,
    });
  });
});

describe('getAlertRule', () => {
  it('reads one rule by id', async () => {
    http.reply({ id: 3 });
    await getAlertRule(3);
    expect(http.last()).toEqual({ method: 'GET', path: '/admin/alert-rules/3', query: {}, body: undefined });
  });
});

describe('createAlertRule', () => {
  it('posts the rule', async () => {
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
    http.reply({ id: 12, ...body });
    await expect(createAlertRule(body)).resolves.toMatchObject({ id: 12 });
    expect(http.last()).toEqual({ method: 'POST', path: '/admin/alert-rules', query: {}, body });
  });
});

describe('updateAlertRule', () => {
  it('patches only the fields that change', async () => {
    await updateAlertRule(3, { threshold: 1000 });
    expect(http.last()).toEqual({
      method: 'PATCH',
      path: '/admin/alert-rules/3',
      query: {},
      body: { threshold: 1000 },
    });
  });

  it('mutes with a time and unmutes with null', async () => {
    await updateAlertRule(3, { mutedUntil: '2026-10-31T18:00:00.000Z' });
    expect(http.last().body).toEqual({ mutedUntil: '2026-10-31T18:00:00.000Z' });
    await updateAlertRule(3, { mutedUntil: null });
    expect(http.last().body).toEqual({ mutedUntil: null });
  });

  it('switches a rule on or off with isActive', async () => {
    await updateAlertRule(3, { isActive: false });
    expect(http.last().body).toEqual({ isActive: false });
  });
});

describe('deleteAlertRule', () => {
  it('sends a DELETE with no body and expects no answer', async () => {
    http.reply(undefined, { status: 204 });
    await expect(deleteAlertRule(3)).resolves.toBeUndefined();
    expect(http.last()).toEqual({
      method: 'DELETE',
      path: '/admin/alert-rules/3',
      query: {},
      body: undefined,
    });
  });
});
