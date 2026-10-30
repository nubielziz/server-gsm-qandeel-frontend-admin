// Tests for the dashboard's URL state: defaults left out of the address, bad values falling back, other parameters kept.
import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW, parseView, writeView } from './view';

describe('parseView', () => {
  it('reads the four controls from the address', () => {
    expect(parseView(new URLSearchParams('scope=b2c&days=14&range=12M&view=table'))).toEqual({
      scope: 'b2c',
      days: 14,
      range: '12M',
      chartView: 'table',
    });
  });

  it('uses the demo defaults for an empty address', () => {
    expect(parseView(new URLSearchParams())).toEqual(DEFAULT_VIEW);
    expect(DEFAULT_VIEW).toEqual({ scope: 'all', days: 7, range: '30D', chartView: 'chart' });
  });

  it('falls back to the default for a value that is not one of the choices', () => {
    expect(parseView(new URLSearchParams('scope=everyone&days=30&range=1Y&view=pie'))).toEqual(DEFAULT_VIEW);
    expect(parseView(new URLSearchParams('days=abc')).days).toBe(7);
  });
});

describe('writeView', () => {
  it('leaves a default out of the address', () => {
    expect(writeView(new URLSearchParams('scope=b2b'), { scope: 'all' }).toString()).toBe('');
    expect(writeView(new URLSearchParams(), { days: 7 }).toString()).toBe('');
  });

  it('writes a changed control and keeps the others', () => {
    const next = writeView(new URLSearchParams('scope=b2c&range=7D'), { days: 14, chartView: 'table' });
    expect(Object.fromEntries(next)).toEqual({ scope: 'b2c', range: '7D', days: '14', view: 'table' });
  });

  it('keeps parameters it does not own, and cleans a bad value it does own', () => {
    const next = writeView(new URLSearchParams('foo=bar&scope=nope'), { days: 1 });
    expect(Object.fromEntries(next)).toEqual({ foo: 'bar', days: '1' });
  });
});
