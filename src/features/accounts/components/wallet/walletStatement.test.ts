// Tests for the statement's date range: how typed days become the range the statement read takes.
import { describe, expect, it } from 'vitest';
import { hasRange, isBackwards, isDay, NO_RANGE, statementRange } from './walletStatement';

describe('statementRange', () => {
  it('sends the first moment of the start day and the last moment of the end day, in UTC', () => {
    expect(statementRange({ from: '2026-11-01', to: '2026-11-10' })).toEqual({
      from: '2026-11-01T00:00:00.000Z',
      to: '2026-11-10T23:59:59.999Z',
    });
  });

  it('leaves an open or unreadable end out', () => {
    expect(statementRange(NO_RANGE)).toEqual({});
    expect(statementRange({ from: '2026-13-45', to: '' })).toEqual({});
    expect(statementRange({ from: '', to: '2026-11-10' })).toEqual({ to: '2026-11-10T23:59:59.999Z' });
  });
});

describe('isDay, isBackwards and hasRange', () => {
  it('knows a day from other text', () => {
    expect(isDay('2026-11-10')).toBe(true);
    expect(isDay('10/11/2026')).toBe(false);
    expect(isDay('')).toBe(false);
  });

  it('spots a range that ends before it starts', () => {
    expect(isBackwards({ from: '2026-11-10', to: '2026-11-01' })).toBe(true);
    expect(isBackwards({ from: '2026-11-01', to: '2026-11-10' })).toBe(false);
    expect(isBackwards({ from: '2026-11-01', to: '' })).toBe(false);
  });

  it('says whether a range is set', () => {
    expect(hasRange(NO_RANGE)).toBe(false);
    expect(hasRange({ from: '2026-11-01', to: '' })).toBe(true);
  });
});
