// Tests for the demo seed loader: Set/Map decoding, timestamp rebasing and id helpers.
import { afterEach, describe, expect, it, vi } from 'vitest';
import raw from './demo-state.json?raw';
import { decodeDemoValue, demoNumericId, demoRows, loadDemoState, toIso, toMoney } from '.';

const { capturedAt } = JSON.parse(raw) as { capturedAt: number };

afterEach(() => vi.useRealTimers());

describe('loadDemoState', () => {
  it('returns the demo tables', async () => {
    const state = await loadDemoState();
    for (const key of ['admins', 'merchants', 'orders', 'customers', 'services', 'ipRules', 'settings']) {
      expect(state).toHaveProperty(key);
    }
    expect(demoRows(state, 'admins')).toHaveLength(6);
    expect(demoRows(state, 'doesNotExist')).toEqual([]);
  });

  it('moves every timestamp by the time passed since the capture, and leaves other numbers alone', async () => {
    const tenDays = 10 * 86_400_000;
    vi.useFakeTimers();
    vi.setSystemTime(capturedAt + tenDays);
    const original = JSON.parse(raw) as {
      state: { admins: { lastLogin: number }[]; seq: { order: number } };
    };
    const state = (await loadDemoState()) as typeof original.state;
    expect(state.admins[0].lastLogin).toBe(original.state.admins[0].lastLogin + tenDays);
    expect(state.seq.order).toBe(original.state.seq.order);
  });

  it('returns an independent copy on every call', async () => {
    const a = (await loadDemoState()) as { admins: { name: string }[] };
    a.admins[0].name = 'changed';
    const b = (await loadDemoState()) as { admins: { name: string }[] };
    expect(b.admins[0].name).not.toBe('changed');
  });
});

describe('decodeDemoValue', () => {
  it('rebuilds Sets and Maps and rebases the timestamps inside them', () => {
    const shift = 1000;
    const decoded = decodeDemoValue(
      {
        seen: { __set: [capturedAt, 5] },
        byId: { __map: [['a', { at: capturedAt }]] },
        plain: [capturedAt, 12.5],
      },
      shift,
      capturedAt,
    ) as { seen: Set<number>; byId: Map<string, { at: number }>; plain: number[] };
    expect(decoded.seen).toEqual(new Set([capturedAt + shift, 5]));
    expect(decoded.byId.get('a')).toEqual({ at: capturedAt + shift });
    expect(decoded.plain).toEqual([capturedAt + shift, 12.5]);
  });

  it('only treats numbers within three years of the capture as timestamps', () => {
    const fourYears = 4 * 365.25 * 86_400_000;
    expect(decodeDemoValue(capturedAt - fourYears, 1000, capturedAt)).toBe(capturedAt - fourYears);
    expect(decodeDemoValue(capturedAt - 86_400_000, 1000, capturedAt)).toBe(capturedAt - 86_400_000 + 1000);
  });
});

describe('helpers', () => {
  it('demoNumericId reads the trailing number', () => {
    expect(demoNumericId('ORD-48100')).toBe(48100);
    expect(demoNumericId('m6')).toBe(6);
    expect(demoNumericId('ad12')).toBe(12);
    expect(() => demoNumericId('IMEI-ICL-CHK')).toThrow(/does not end in a number/);
  });

  it('toMoney gives a 4-decimal string', () => {
    expect(toMoney(12.49)).toBe('12.4900');
    expect(toMoney(0)).toBe('0.0000');
    expect(toMoney(-3.5)).toBe('-3.5000');
    expect(toMoney(-0.00001)).toBe('0.0000');
  });

  it('toIso gives an ISO date-time', () => {
    expect(toIso(Date.UTC(2026, 0, 1, 12))).toBe('2026-01-01T12:00:00.000Z');
  });
});
