// Tests for the payment gateway, tax rate, currency and storefront settings API functions, run against the dev mock API: the routes they
// call, the bodies they send and what comes back.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import {
  createCurrency,
  createGateway,
  createTaxRate,
  deleteGateway,
  getCurrency,
  getGateway,
  getTaxRate,
  listCurrencies,
  listGateways,
  listTaxRates,
  refreshFx,
  updateCurrency,
  updateGateway,
  updateStorefrontSettings,
  updateTaxRate,
} from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

describe('payment gateways', () => {
  it('lists the gateways with their fees and a total', async () => {
    const result = await listGateways({ start: 0, end: 10 });
    expect(result.total).toBe(4);
    expect(result.data[0]).toMatchObject({
      name: 'Card gateway',
      audience: 'b2c',
      feePercent: '2.9000',
      feeFixed: '0.3000',
      isActive: true,
    });
  });

  it('reads one gateway and never gets a secret, only its hint', async () => {
    const gateway = await getGateway(1);
    expect(gateway.secretHint).toMatch(/^••••/);
    expect(JSON.stringify(gateway)).not.toMatch(/"secret"/);
  });

  it('creates a gateway and keeps the secret write-only', async () => {
    const created = await createGateway({
      code: 'paypal',
      driver: 'paypal',
      name: 'PayPal',
      audience: 'b2c',
      feePercent: '3.4',
      feeFixed: '0.35',
      minAmount: '1',
      maxAmount: '0',
      allowedGroupIds: [],
      supportsRefunds: true,
      supports3ds: false,
      isManual: false,
      instructions: '',
      holdHours: 0,
      isActive: false,
      secret: 'sk_live_abcd1234',
    });
    expect(created).toMatchObject({ name: 'PayPal', feePercent: '3.4000', secretHint: '••••1234' });
    expect('secret' in created).toBe(false);
  });

  it('changes only the fields it is given and deletes a gateway', async () => {
    const recorder = recordRequests();
    const updated = await updateGateway(3, { isActive: false });
    expect(recorder.last()).toMatchObject({ method: 'PATCH', body: { isActive: false } });
    expect(recorder.last().url.pathname).toBe('/admin/payment-gateways/3');
    expect(updated).toMatchObject({ name: 'Bank transfer', isActive: false });
    await deleteGateway(4);
    expect((await listGateways()).data.some((gateway) => gateway.id === 4)).toBe(false);
  });
});

describe('tax rates', () => {
  it('lists the rates by country with their dates', async () => {
    const result = await listTaxRates({ filters: { country: 'GB' } });
    expect(result.total).toBe(1);
    expect(result.data[0]).toMatchObject({ country: 'GB', ratePercent: '20.0000', ossScheme: 'UK VAT' });
    expect(result.data[0].validFrom).toMatch(/^\d{4}-/);
  });

  it('reads, adds and changes a rate', async () => {
    expect((await getTaxRate(2)).country).toBe('DE');
    const created = await createTaxRate({
      country: 'JP',
      region: '',
      ratePercent: '10',
      taxType: 'vat',
      appliesTo: 'digital_services',
      validFrom: '2026-04-01T00:00:00.000Z',
      validTo: null,
      label: 'Japan consumption tax',
      ossScheme: '',
    });
    expect(created).toMatchObject({ country: 'JP', ratePercent: '10.0000' });
    expect(await updateTaxRate(created.id, { ratePercent: '10.5' })).toMatchObject({
      ratePercent: '10.5000',
    });
  });
});

describe('currencies', () => {
  it('lists the currencies, the base one first', async () => {
    const result = await listCurrencies({ sort: ['code'], order: ['asc'] });
    expect(result.data.map((currency) => currency.code)).toContain('GBP');
    expect(result.total).toBe(7);
  });

  it('adds a currency, changes its rate and the offered switch', async () => {
    const created = await createCurrency({
      code: 'CHF',
      name: 'Swiss franc',
      rateToBase: '0.88',
      markupPercent: '1.5',
      charmRounding: true,
      isStorefront: false,
      decimals: 2,
    });
    expect(created).toMatchObject({ code: 'CHF', rateToBase: '0.8800', isStorefront: false });
    expect((await updateCurrency(created.id, { isStorefront: true })).isStorefront).toBe(true);
    expect((await getCurrency(created.id)).isStorefront).toBe(true);
  });

  it('refreshes the rates and returns what the server did', async () => {
    const before = (await listCurrencies()).data.find((currency) => currency.code === 'SEK');
    const result = await refreshFx();
    expect(result.refreshed?.map((rate) => rate.code)).toContain('SEK');
    expect(result.failed).toEqual([]);
    const after = (await listCurrencies()).data.find((currency) => currency.code === 'SEK');
    expect(after?.rateToBase).not.toBe(before?.rateToBase);
  });
});

describe('storefront settings', () => {
  it('sends only the changed policies and answers the policies after the change', async () => {
    const recorder = recordRequests();
    const result = await updateStorefrontSettings({ guestCheckout: false });
    expect(recorder.last()).toMatchObject({ method: 'PATCH', body: { guestCheckout: false } });
    expect(recorder.last().url.pathname).toBe('/admin/storefront/settings');
    expect(result).toMatchObject({ guestCheckout: false, require3ds: true });
  });
});
