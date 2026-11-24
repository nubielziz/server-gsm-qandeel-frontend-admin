// Tests for the retired-risk step of the demo seed: the customer risk word, the two signals that never fired, the blacklisted-IMEI
// rule, the two IMEI policies and the IMEI check log are taken out of the captured state, and the committed file has none of them.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { dropRetiredRisk } from './retired-seed-risk.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('dropRetiredRisk', () => {
  it('removes only the retired words and touches nothing else', () => {
    const state = {
      customers: [
        { id: 'c1', name: 'Pat', risk: 'med', status: 'active' },
        { id: 'c2', name: 'Lee', risk: 'low', status: 'blocked' },
      ],
      orders: [
        {
          id: 'SF-1',
          risk: {
            score: 67,
            signals: [
              'IMEI was checked blacklisted before',
              'New customer, first order above $40',
              'VPN or proxy IP',
            ],
          },
        },
        { id: 'ORD-2' },
      ],
      risk: {
        block: [{ id: 'b1', kind: 'imei' }],
        rules: [
          { id: 'rr1', label: 'Block blacklisted IMEIs before payment', on: true, value: null },
          { id: 'rr2', label: 'Hold orders scoring at least', on: true, value: 50 },
        ],
      },
      settings: {
        policies: { guestCheckout: true, imeiPrecheck: true, imeiRetentionDays: 180, abandonedMinutes: 60 },
      },
      imeiChecks: [{ id: 'IC-1', ts: 1 }],
    };
    expect(dropRetiredRisk(state)).toEqual({
      customers: [
        { id: 'c1', name: 'Pat', status: 'active' },
        { id: 'c2', name: 'Lee', status: 'blocked' },
      ],
      orders: [
        { id: 'SF-1', risk: { score: 67, signals: ['New customer, first order above $40'] } },
        { id: 'ORD-2' },
      ],
      risk: {
        block: [{ id: 'b1', kind: 'imei' }],
        rules: [{ id: 'rr2', label: 'Hold orders scoring at least', on: true, value: 50 }],
      },
      settings: { policies: { guestCheckout: true, abandonedMinutes: 60 } },
    });
  });

  it('accepts a state without these tables', () => {
    expect(dropRetiredRisk({ seq: { order: 1 } })).toEqual({ seq: { order: 1 } });
    expect(dropRetiredRisk({ risk: {}, settings: {} })).toEqual({ risk: {}, settings: {} });
  });
});

describe('the committed demo state', () => {
  const { state } = JSON.parse(readFileSync(resolve(root, 'src/mocks/seed/demo-state.json'), 'utf8'));

  it('has no risk word on any customer', () => {
    expect(state.customers.length).toBeGreaterThan(0);
    expect(state.customers.some((row) => 'risk' in row)).toBe(false);
  });

  it('has none of the two signals on any order', () => {
    const signals = state.orders.flatMap((order) => order.risk?.signals ?? []);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals).not.toContain('IMEI was checked blacklisted before');
    expect(signals).not.toContain('VPN or proxy IP');
  });

  it('has no rule for blacklisted IMEIs and no IMEI policy', () => {
    expect(state.risk.rules.map((rule) => rule.id)).not.toContain('rr1');
    expect(Object.keys(state.settings.policies)).not.toContain('imeiPrecheck');
    expect(Object.keys(state.settings.policies)).not.toContain('imeiRetentionDays');
  });

  it('has no IMEI check log', () => {
    expect(state).not.toHaveProperty('imeiChecks');
  });
});
