// Tests for the pure helpers of the Order pipeline card.
import { describe, expect, it } from 'vitest';
import type { ServiceTypeHealth } from '../../types';
import { measure } from './ordersFixture';
import { ordersCount, serviceTypeLabel, sortServiceTypes, worseState } from './pipelineModel';

function row(
  type: ServiceTypeHealth['type'],
  success: 'ok' | 'warn' | 'crit' | 'unknown',
  failure: 'ok' | 'warn' | 'crit' | 'unknown' = 'ok',
): ServiceTypeHealth {
  return {
    type,
    total: 10,
    success: measure(95, 'percent', success),
    failure: measure(5, 'percent', failure),
  };
}

describe('serviceTypeLabel', () => {
  it('uses the words of the orders feature', () => {
    expect(serviceTypeLabel('imei')).toBe('IMEI');
    expect(serviceTypeLabel('server')).toBe('Server');
    expect(serviceTypeLabel('remote')).toBe('Remote');
    expect(serviceTypeLabel('file')).toBe('File');
  });

  it('prints a type it does not know as the server sent it', () => {
    expect(serviceTypeLabel('sim_unlock')).toBe('sim_unlock');
    expect(serviceTypeLabel('toString')).toBe('toString');
  });
});

describe('worseState', () => {
  it('picks critical over warn over unknown over ok', () => {
    expect(worseState('ok', 'warn')).toBe('warn');
    expect(worseState('crit', 'warn')).toBe('crit');
    expect(worseState('ok', 'unknown')).toBe('unknown');
    expect(worseState('unknown', 'warn')).toBe('warn');
    expect(worseState('ok', 'ok')).toBe('ok');
  });
});

describe('sortServiceTypes', () => {
  it('puts the type with the worst success or failure state first and keeps the server order otherwise', () => {
    const sorted = sortServiceTypes([
      row('imei', 'ok'),
      row('server', 'ok', 'warn'),
      row('remote', 'ok'),
      row('file', 'crit', 'crit'),
    ]);
    expect(sorted.map((entry) => entry.type)).toEqual(['file', 'server', 'imei', 'remote']);
  });

  it('does not change the list it was given', () => {
    const rows = [row('imei', 'ok'), row('file', 'crit')];
    sortServiceTypes(rows);
    expect(rows.map((entry) => entry.type)).toEqual(['imei', 'file']);
  });
});

describe('ordersCount', () => {
  it('writes a count with its noun and thousands separators', () => {
    expect(ordersCount(0)).toBe('0 orders');
    expect(ordersCount(1)).toBe('1 order');
    expect(ordersCount(1240)).toBe('1,240 orders');
  });
});
