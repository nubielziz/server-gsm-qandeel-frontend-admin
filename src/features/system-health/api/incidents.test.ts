// Tests for the incident functions: the filtered, paged list, one incident, declare, and update (post an update, close).
import { describe, expect, it } from 'vitest';
import { createIncident, getIncident, listIncidents, updateIncident } from './incidents';
import { stubFetch } from '../test/stubFetch';

const http = stubFetch();

describe('listIncidents', () => {
  it('sends the row range, the sort and the open filter as true', async () => {
    http.reply([{ id: 2 }], { headers: { 'x-total-count': '3' } });
    const result = await listIncidents({
      start: 0,
      end: 25,
      sort: ['startedAt'],
      order: ['desc'],
      filters: { open: true },
    });
    expect(result).toEqual({ data: [{ id: 2 }], total: 3 });
    expect(http.last()).toEqual({
      method: 'GET',
      path: '/admin/incidents',
      query: { _start: '0', _end: '25', _sort: 'startedAt', _order: 'desc', open: 'true' },
      body: undefined,
    });
  });

  it('filters by one status', async () => {
    http.reply([]);
    await listIncidents({ filters: { status: 'monitoring' } });
    expect(http.last().query).toEqual({ status: 'monitoring' });
  });
});

describe('getIncident', () => {
  it('reads one incident by id', async () => {
    http.reply({ id: 2, timeline: [] });
    await expect(getIncident(2)).resolves.toEqual({ id: 2, timeline: [] });
    expect(http.last()).toEqual({ method: 'GET', path: '/admin/incidents/2', query: {}, body: undefined });
  });
});

describe('createIncident', () => {
  it('declares an incident, optionally from an alert', async () => {
    const body = {
      title: 'Supplier timeouts',
      severity: 'major' as const,
      components: ['supplier:3'],
      summary: 'Dhru Prime answers slowly.',
      alertEventId: 5,
    };
    http.reply({ id: 7, ...body });
    await expect(createIncident(body)).resolves.toMatchObject({ id: 7 });
    expect(http.last()).toEqual({ method: 'POST', path: '/admin/incidents', query: {}, body });
  });
});

describe('updateIncident', () => {
  it('posts a status with an update text', async () => {
    await updateIncident(7, { status: 'identified', update: 'Cause found.' });
    expect(http.last()).toEqual({
      method: 'PATCH',
      path: '/admin/incidents/7',
      query: {},
      body: { status: 'identified', update: 'Cause found.' },
    });
  });

  it('closes with resolved and the root cause', async () => {
    await updateIncident(7, { status: 'resolved', rootCause: 'The supplier restarted.' });
    expect(http.last().body).toEqual({ status: 'resolved', rootCause: 'The supplier restarted.' });
  });
});
