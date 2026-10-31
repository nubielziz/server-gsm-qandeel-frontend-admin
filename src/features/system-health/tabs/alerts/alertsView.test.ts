// Tests for the views of the Alerts & incidents tab and the address values they read.
import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/lib/auth/permissions';
import {
  ALERT_VIEWS,
  isAlertsView,
  pageRange,
  parseIncidentId,
  parsePage,
  readableViews,
  resolveView,
} from './alertsView';

const canWith =
  (...granted: string[]) =>
  (permission: string) =>
    hasPermission(granted, permission);
const ids = (views: readonly { id: string }[]) => views.map((view) => view.id);

describe('readableViews', () => {
  it('shows alerts and rules to an alerts reader and incidents to an incidents reader', () => {
    expect(ids(readableViews(canWith('alerts:read')))).toEqual(['alerts', 'rules']);
    expect(ids(readableViews(canWith('incidents:read')))).toEqual(['incidents']);
    expect(ids(readableViews(canWith('alerts:read', 'incidents:read')))).toEqual(
      ALERT_VIEWS.map((v) => v.id),
    );
  });

  it('shows nothing to a role with neither, and everything to the owner', () => {
    expect(readableViews(canWith('system:read'))).toEqual([]);
    expect(ids(readableViews(canWith('*')))).toEqual(['alerts', 'rules', 'incidents']);
  });
});

describe('resolveView', () => {
  const all = ['alerts', 'rules', 'incidents'] as const;

  it('opens the view the address names', () => {
    expect(resolveView('rules', null, all)).toBe('rules');
    expect(resolveView('incidents', '5', all)).toBe('incidents');
  });

  it('defaults to the first readable view', () => {
    expect(resolveView(null, null, all)).toBe('alerts');
    expect(resolveView('nonsense', null, all)).toBe('alerts');
  });

  it('falls back to the first readable view when the named view cannot be read', () => {
    expect(resolveView('alerts', null, ['incidents'])).toBe('incidents');
    expect(resolveView('rules', null, ['incidents'])).toBe('incidents');
    expect(resolveView('incidents', null, ['alerts', 'rules'])).toBe('alerts');
  });

  it('treats an incident link without a view as the incidents view, when it can be read', () => {
    expect(resolveView(null, '5', all)).toBe('incidents');
    expect(resolveView(null, '5', ['alerts', 'rules'])).toBe('alerts');
  });

  it('is undefined when nothing is readable', () => {
    expect(resolveView('alerts', null, [])).toBeUndefined();
  });
});

describe('address values', () => {
  it('knows the three views', () => {
    expect(['alerts', 'rules', 'incidents'].every(isAlertsView)).toBe(true);
    expect(isAlertsView('overview')).toBe(false);
  });

  it('reads an incident id only when it is a positive whole number', () => {
    expect(parseIncidentId('5')).toBe(5);
    expect(['0', '-3', '2.5', 'abc', '', null].map(parseIncidentId)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('reads a page as page 1 unless it is a positive whole number', () => {
    expect(parsePage('3')).toBe(3);
    expect([null, '0', '-2', 'x', '1.5'].map(parsePage)).toEqual([1, 1, 1, 1, 1]);
  });

  it('turns a page into the row range of the list API', () => {
    expect(pageRange(1, 25)).toEqual({ start: 0, end: 25 });
    expect(pageRange(3, 25)).toEqual({ start: 50, end: 75 });
  });
});
