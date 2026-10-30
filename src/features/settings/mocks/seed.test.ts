// Tests for the settings mock seed: the demo's fee text becomes numbers, the demo state becomes API rows, and the made-up logs are stable.
import { describe, expect, it } from 'vitest';
import { loadDemoState } from '@/mocks/seed';
import { buildStores } from './seed';
import { parseFee } from './seedPayments';

describe('parseFee', () => {
  it('reads the percent and the fixed part from the demo’s text', () => {
    expect(parseFee('2.9% + $0.30')).toEqual({ percent: 2.9, fixed: 0.3 });
    expect(parseFee('1%')).toEqual({ percent: 1, fixed: 0 });
    expect(parseFee('Free')).toEqual({ percent: 0, fixed: 0 });
  });
});

describe('buildStores', () => {
  it('maps the demo’s gateways, taxes, currencies and emails to rows', async () => {
    const stores = buildStores(await loadDemoState());
    expect(stores.gateways.size).toBe(4);
    expect(stores.gateways.find(3)).toMatchObject({
      name: 'Bank transfer',
      audience: 'b2b',
      isManual: true,
      secretHint: null,
    });
    expect(stores.taxRates.size).toBe(12);
    expect(stores.taxRates.find(9)).toMatchObject({ country: 'US', ratePercent: '0.0000', ossScheme: '' });
    expect(stores.currencies.size).toBe(7);
    expect(stores.currencies.find(4)).toMatchObject({ code: 'SEK', rateToBase: '10.6000' });
    expect(stores.templates.size).toBe(8);
    expect(stores.templates.find(6)).toMatchObject({ event: 'payment.failed', isActive: false });
  });

  it('makes the same logs every time, newest first', async () => {
    const state = await loadDemoState();
    const first = buildStores(state);
    const second = buildStores(state);
    const ids = (stores: typeof first) =>
      stores.notifications.list().map((row) => `${row.id}:${row.status}:${row.event}`);
    expect(ids(first)).toEqual(ids(second));
    expect(first.notifications.size).toBe(48);
    expect(first.deliveries.size).toBe(36);
    expect(first.notifications.list()[0].id).toBe(48);
    expect(first.deliveries.list().every((row) => row.client && row.endpoint)).toBe(true);
  });
});
