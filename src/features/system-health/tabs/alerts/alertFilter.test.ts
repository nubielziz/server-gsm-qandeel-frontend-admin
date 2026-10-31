// Tests for the alerts status filter: its choices, the server filter of each, and "Open" as two reads joined, most severe first.
import { describe, expect, it } from 'vitest';
import type { AlertEvent } from '../../types';
import {
  ALERT_CHOICES,
  DEFAULT_ALERT_CHOICE,
  emptyText,
  emptyTitle,
  mergeOpenAlerts,
  parseAlertChoice,
  singleFilter,
} from './alertFilter';

const alert = (id: number, status: AlertEvent['status'], severity = 'warning') =>
  ({ id, status, severity }) as AlertEvent;

describe('the choices', () => {
  it('lists Open (the default), Firing, Acknowledged, Resolved and All', () => {
    expect(ALERT_CHOICES.map((choice) => choice.label)).toEqual([
      'Open',
      'Firing',
      'Acknowledged',
      'Resolved',
      'All',
    ]);
    expect(DEFAULT_ALERT_CHOICE).toBe('open');
  });

  it('reads ?status= and falls back to Open for anything else', () => {
    expect(parseAlertChoice('resolved')).toBe('resolved');
    expect(parseAlertChoice('all')).toBe('all');
    expect([null, '', 'open', 'bogus'].map(parseAlertChoice)).toEqual(['open', 'open', 'open', 'open']);
  });

  it('asks the server for one status, or for none (All, and each half of Open is asked separately)', () => {
    expect(singleFilter('firing')).toEqual({ status: 'firing' });
    expect(singleFilter('acknowledged')).toEqual({ status: 'acknowledged' });
    expect(singleFilter('resolved')).toEqual({ status: 'resolved' });
    expect(singleFilter('all')).toEqual({});
    expect(singleFilter('open')).toEqual({});
  });

  it('refuses to call an empty list of what is open an all clear while the rules cannot be checked', () => {
    expect(emptyTitle('open', true)).toBe('No alerts listed');
    expect(emptyTitle('firing', true)).toBe('No alerts listed');
    expect(emptyText('open', true)).toContain('not a sign that all is well');
    // History does not depend on monitoring.
    expect(emptyTitle('resolved', true)).toBe('No resolved alerts');
    expect(emptyTitle('all', true)).toBe('No alerts yet');
  });

  it('has words for every empty list', () => {
    expect(emptyTitle('open')).toBe('No open alerts');
    expect(emptyTitle('resolved')).toBe('No resolved alerts');
    expect(emptyTitle('all')).toBe('No alerts yet');
    for (const choice of ALERT_CHOICES) expect(emptyText(choice.value).length).toBeGreaterThan(10);
  });
});

describe('mergeOpenAlerts', () => {
  it('puts the firing alerts first, then the acknowledged ones, each in the order the server sent', () => {
    const page = mergeOpenAlerts(
      { data: [alert(5, 'firing'), alert(3, 'firing')], total: 2 },
      { data: [alert(4, 'acknowledged')], total: 1 },
    );
    expect(page.data.map((row) => row.id)).toEqual([5, 3, 4]);
    expect(page.total).toBe(3);
    expect(page.capped).toBe(false);
  });

  it('puts the most severe first inside each group, and keeps the server order within a severity', () => {
    // The server sends newest first: 9 is the newest. The critical ones are older than the warning one.
    const page = mergeOpenAlerts(
      {
        data: [
          alert(9, 'firing', 'warning'),
          alert(8, 'firing', 'info'),
          alert(7, 'firing', 'critical'),
          alert(6, 'firing', 'warning'),
          alert(5, 'firing', 'critical'),
        ],
        total: 5,
      },
      {
        data: [alert(4, 'acknowledged', 'info'), alert(3, 'acknowledged', 'critical')],
        total: 2,
      },
    );
    // Firing still comes before acknowledged: a critical acknowledged alert does not jump above a firing warning.
    expect(page.data.map((row) => row.id)).toEqual([7, 5, 9, 6, 8, 3, 4]);
  });

  it('ranks a severity it does not know between warning and info, not below the quiet ones', () => {
    const page = mergeOpenAlerts(
      {
        data: [alert(4, 'firing', 'info'), alert(3, 'firing', 'fatal'), alert(2, 'firing', 'warning')],
        total: 3,
      },
      { data: [], total: 0 },
    );
    expect(page.data.map((row) => row.id)).toEqual([2, 3, 4]);
  });

  it('does not change the lists it was given', () => {
    const firing = { data: [alert(2, 'firing', 'info'), alert(1, 'firing', 'critical')], total: 2 };
    mergeOpenAlerts(firing, { data: [], total: 0 });
    expect(firing.data.map((row) => row.id)).toEqual([2, 1]);
  });

  it('says it is capped when either read holds more rows than it returned', () => {
    const rows = [alert(1, 'firing')];
    expect(mergeOpenAlerts({ data: rows, total: 40 }, { data: [], total: 0 }).capped).toBe(true);
    expect(mergeOpenAlerts({ data: [], total: 0 }, { data: rows, total: 26 }).capped).toBe(true);
    expect(mergeOpenAlerts({ data: [], total: 0 }, { data: [], total: 0 })).toEqual({
      data: [],
      total: 0,
      capped: false,
    });
  });
});
