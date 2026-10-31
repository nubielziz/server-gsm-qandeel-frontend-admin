// Tests for the Overview tab's component helpers: the grouping by the server's status, the default and the picked
// component, the kind words and the chart series.
import { describe, expect, it } from 'vitest';
import type { CheckBucket, CheckStatus, HealthComponent } from '../../types';
import {
  defaultComponent,
  groupComponents,
  kindWord,
  latencyPoints,
  listComponents,
  operationalLine,
  resolveComponent,
} from './componentRows';

/** A component with the fields these helpers read; a test sets the ones it cares about. */
function component(key: string, status: CheckStatus, over: Partial<HealthComponent> = {}): HealthComponent {
  const measure = { value: 40, unit: 'ms' as const, state: 'ok' as const };
  return {
    key,
    name: key,
    kind: 'core',
    status,
    since: null,
    latency: measure,
    uptime: { h24: measure, d7: measure, d30: measure },
    lastCheckedAt: null,
    detail: null,
    supplierId: null,
    gatewayId: null,
    ...over,
  };
}

const keys = (list: readonly HealthComponent[]) => list.map((item) => item.key);

describe('groupComponents', () => {
  it('puts down, degraded and unknown first, in that order, and keeps the server order inside a status', () => {
    const list = [
      component('a', 'ok'),
      component('b', 'unknown'),
      component('c', 'degraded'),
      component('d', 'down'),
      component('e', 'ok'),
      component('f', 'down'),
      component('g', 'degraded'),
    ];
    const { attention, healthy } = groupComponents(list);
    expect(keys(attention)).toEqual(['d', 'f', 'c', 'g', 'b']);
    expect(keys(healthy)).toEqual(['a', 'e']);
  });

  it('keeps a status it does not know in view, because hiding it would be a guess that it is healthy', () => {
    const odd = component('x', 'maintenance' as CheckStatus);
    const { attention, healthy } = groupComponents([component('a', 'ok'), odd]);
    expect(keys(attention)).toEqual(['x']);
    expect(keys(healthy)).toEqual(['a']);
  });

  it('gives two empty groups for no components, and does not change the list it was given', () => {
    expect(groupComponents([])).toEqual({ attention: [], healthy: [] });
    const list = [component('a', 'ok'), component('b', 'down')];
    groupComponents(list);
    expect(keys(list)).toEqual(['a', 'b']);
  });
});

describe('operationalLine', () => {
  it('counts the components and agrees with the number', () => {
    expect(operationalLine(14)).toBe('14 components operational');
    expect(operationalLine(1)).toBe('1 component operational');
    expect(operationalLine(0)).toBe('0 components operational');
  });

  it('counts "other" components when a healthy row already stands above the line', () => {
    expect(operationalLine(13, true)).toBe('13 other components operational');
    expect(operationalLine(1, true)).toBe('1 other component operational');
  });
});

describe('listComponents', () => {
  const groups = groupComponents([
    component('api', 'ok'),
    component('db', 'down'),
    component('queue', 'ok'),
    component('cache', 'ok'),
    component('worker', 'degraded'),
  ]);

  it('lists only the problems while the line is closed, and counts every healthy component in it', () => {
    const { rows, line } = listComponents(groups, false, null);
    expect(keys(rows)).toEqual(['db', 'worker']);
    expect(line).toEqual({ count: 3, others: false });
  });

  it('lists the problems and then every healthy component once the line is open, and offers Hide', () => {
    const { rows, line } = listComponents(groups, true, null);
    expect(keys(rows)).toEqual(['db', 'worker', 'api', 'queue', 'cache']);
    expect(line).toEqual({ count: 3, others: false });
  });

  it('keeps the healthy component the address named in the list while the line is closed, and counts the others', () => {
    const { rows, line } = listComponents(groups, false, 'queue');
    expect(keys(rows)).toEqual(['db', 'worker', 'queue']);
    expect(line).toEqual({ count: 2, others: true });
  });

  it('does not repeat the pinned component once the line is open', () => {
    const { rows, line } = listComponents(groups, true, 'queue');
    expect(keys(rows)).toEqual(['db', 'worker', 'api', 'queue', 'cache']);
    expect(line).toEqual({ count: 3, others: false });
  });

  it('has nothing extra to keep when the pinned component is already a problem row', () => {
    const { rows, line } = listComponents(groups, false, 'db');
    expect(keys(rows)).toEqual(['db', 'worker']);
    expect(line).toEqual({ count: 3, others: false });
  });

  it('has no line when the only healthy component is the pinned one, and when nothing is healthy', () => {
    const one = groupComponents([component('db', 'down'), component('api', 'ok')]);
    const kept = listComponents(one, false, 'api');
    expect(keys(kept.rows)).toEqual(['db', 'api']);
    expect(kept.line).toBeNull();
    const none = groupComponents([component('db', 'down')]);
    expect(listComponents(none, false, null).line).toBeNull();
    expect(listComponents(none, true, null).line).toBeNull();
  });

  it('shows no row at all for a healthy platform whose address names nothing', () => {
    const fine = groupComponents([component('api', 'ok'), component('db', 'ok')]);
    expect(listComponents(fine, false, null)).toEqual({ rows: [], line: { count: 2, others: false } });
  });
});

describe('defaultComponent', () => {
  it('is the first one that is down, else the first degraded, else the first that is fine', () => {
    const list = [
      component('a', 'ok'),
      component('b', 'degraded'),
      component('c', 'down'),
      component('d', 'down'),
    ];
    expect(defaultComponent(list)?.key).toBe('c');
    expect(defaultComponent(list.filter((item) => item.status !== 'down'))?.key).toBe('b');
    expect(defaultComponent([component('x', 'unknown'), component('y', 'ok')])?.key).toBe('y');
  });

  it('puts a component with no check data last, because it has no response time to draw', () => {
    expect(defaultComponent([component('x', 'unknown'), component('y', 'unknown')])?.key).toBe('x');
    expect(defaultComponent([])).toBeUndefined();
  });
});

describe('resolveComponent', () => {
  const list = [component('api', 'ok'), component('supplier:3', 'down')];

  it('takes the key of the address when the summary lists it', () => {
    expect(resolveComponent('api', list)).toEqual({ key: 'api', unknownAsked: null, fromAddress: true });
  });

  it('falls back to the default and reports a key the summary does not know', () => {
    expect(resolveComponent('nope', list)).toEqual({
      key: 'supplier:3',
      unknownAsked: 'nope',
      fromAddress: false,
    });
  });

  it('uses the default when the address names nothing, or only spaces', () => {
    expect(resolveComponent(null, list)).toEqual({
      key: 'supplier:3',
      unknownAsked: null,
      fromAddress: false,
    });
    expect(resolveComponent('  ', list)).toEqual({
      key: 'supplier:3',
      unknownAsked: null,
      fromAddress: false,
    });
  });

  it('trusts the address before the summary has answered, and has nothing to chart without either', () => {
    expect(resolveComponent('postgres', undefined)).toEqual({
      key: 'postgres',
      unknownAsked: null,
      fromAddress: true,
    });
    expect(resolveComponent(null, undefined)).toEqual({ key: null, unknownAsked: null, fromAddress: false });
  });

  it('has no key when the summary lists no component at all', () => {
    expect(resolveComponent('api', [])).toEqual({ key: null, unknownAsked: 'api', fromAddress: false });
  });
});

describe('kindWord', () => {
  it('names the three kinds and prints a kind it does not know as it came', () => {
    expect(kindWord('core')).toBe('Core');
    expect(kindWord('supplier')).toBe('Supplier');
    expect(kindWord('gateway')).toBe('Gateway');
    expect(kindWord('mystery')).toBe('mystery');
  });
});

describe('latencyPoints', () => {
  const bucket = (start: string, latencyMs: number | null, status: CheckStatus = 'ok'): CheckBucket => ({
    start,
    status,
    checks: latencyMs === null ? 0 : 30,
    failures: 0,
    latencyMs,
  });

  it('turns each bucket into a point at its start, oldest first, and keeps a missing latency as a gap', () => {
    const points = latencyPoints([
      bucket('2026-10-31T10:00:00.000Z', 120),
      bucket('2026-10-31T10:30:00.000Z', null, 'unknown'),
      bucket('2026-10-31T11:00:00.000Z', 0),
    ]);
    expect(points).toEqual([
      { at: '2026-10-31T10:00:00.000Z', value: 120 },
      { at: '2026-10-31T10:30:00.000Z', value: null },
      // A real zero is a value, not a gap.
      { at: '2026-10-31T11:00:00.000Z', value: 0 },
    ]);
  });

  it('reads a latency the server left out as a gap too, never as zero', () => {
    const odd = { start: '2026-10-31T10:00:00.000Z', status: 'ok', checks: 1, failures: 0 } as CheckBucket;
    expect(latencyPoints([odd])).toEqual([{ at: '2026-10-31T10:00:00.000Z', value: null }]);
  });

  it('gives no points for no buckets', () => {
    expect(latencyPoints([])).toEqual([]);
  });
});
