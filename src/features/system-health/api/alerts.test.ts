// Tests for the alert functions: the filtered, paged list, one alert, and the acknowledge action.
import { describe, expect, it } from 'vitest';
import { ackAlert, getAlert, listAlerts } from './alerts';
import { stubFetch } from '../test/stubFetch';

const http = stubFetch();

describe('listAlerts', () => {
  it('sends the row range, the sort and the field filters, and reads the total', async () => {
    http.reply([{ id: 5 }], { headers: { 'x-total-count': '60' } });
    const result = await listAlerts({
      start: 25,
      end: 50,
      sort: ['startedAt'],
      order: ['desc'],
      filters: { status: 'firing', severity: 'critical' },
    });
    expect(result).toEqual({ data: [{ id: 5 }], total: 60 });
    expect(http.last()).toEqual({
      method: 'GET',
      path: '/admin/alerts',
      query: {
        _start: '25',
        _end: '50',
        _sort: 'startedAt',
        _order: 'desc',
        status: 'firing',
        severity: 'critical',
      },
      body: undefined,
    });
  });

  it('sends nothing for a filter that is not set', async () => {
    http.reply([]);
    await listAlerts({ filters: { status: undefined } });
    expect(http.last().query).toEqual({});
  });
});

describe('getAlert', () => {
  it('reads one alert by id', async () => {
    http.reply({ id: 5, status: 'firing' });
    await expect(getAlert(5)).resolves.toEqual({ id: 5, status: 'firing' });
    expect(http.last()).toEqual({ method: 'GET', path: '/admin/alerts/5', query: {}, body: undefined });
  });
});

describe('ackAlert', () => {
  it('acknowledges with a note', async () => {
    await ackAlert(5, { note: 'Looking into it.' });
    expect(http.last()).toEqual({
      method: 'POST',
      path: '/admin/alerts/5/ack',
      query: {},
      body: { note: 'Looking into it.' },
    });
  });

  it('acknowledges without a note', async () => {
    await ackAlert(5, {});
    expect(http.last().body).toEqual({});
  });
});
