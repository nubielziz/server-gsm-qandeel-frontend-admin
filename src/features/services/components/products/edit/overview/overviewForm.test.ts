// Tests for the Overview part's values and body: what the inputs start with, the body of a save (only what changed, the shared fields through
// the details mapping, the switches, the verification window) and the checks that run before the server is called.
import { describe, expect, it } from 'vitest';
import type { Service } from '../../../../types';
import {
  OVERVIEW_ALIASES,
  OVERVIEW_FIELDS,
  overviewBody,
  overviewDefaults,
  type OverviewValues,
} from './overviewForm';

const SERVICE: Service = {
  id: 7,
  name: 'Sample Unlock',
  code: 'IMEI-SAMPLE',
  type: 'imei',
  status: 'active',
  executionMode: 'auto',
  categoryId: 3,
  category: { id: 3, name: 'Sample category' },
  basePrice: '10.0000',
  cost: '8.0000',
  costChangedFrom: null,
  ownCost: '0.0000',
  stockDelivery: false,
  stockAvailable: 0,
  minProfit: '1.0000',
  floorPrice: '9.0000',
  marginPct: '20.0000',
  belowFloor: false,
  slaMinutes: 1440,
  minQty: 1,
  maxQty: 1,
  qtyOptions: [],
  allowCancel: false,
  allowVerify: false,
  verifyWindowH: 0,
  supplier: null,
  fallbackSupplier: null,
};

const values = (changes: Partial<OverviewValues> = {}, service: Service = SERVICE): OverviewValues => ({
  ...overviewDefaults(service),
  ...changes,
});

describe('overviewDefaults', () => {
  it('starts with the service as it is, the delivery time in its own unit', () => {
    expect(overviewDefaults(SERVICE)).toEqual({
      active: true,
      name: 'Sample Unlock',
      categoryId: '3',
      delivery: '1',
      unit: 'days',
      auto: true,
      verify: false,
      verifyWindowH: '0',
      cancel: false,
      stockDelivery: false,
    });
  });

  it('reads the switches from the service', () => {
    const defaults = overviewDefaults({
      ...SERVICE,
      status: 'disabled',
      executionMode: 'manual',
      allowVerify: true,
      verifyWindowH: 48,
      allowCancel: true,
      slaMinutes: 90,
    });
    expect(defaults).toMatchObject({
      active: false,
      auto: false,
      verify: true,
      verifyWindowH: '48',
      cancel: true,
      delivery: '90',
      unit: 'minutes',
    });
  });
});

describe('overviewBody', () => {
  it('is empty when nothing changed, even if a word only gained spaces', () => {
    expect(overviewBody(values(), SERVICE)).toEqual({});
    expect(overviewBody(values({ name: ' Sample Unlock ' }), SERVICE)).toEqual({});
  });

  it('is empty when the delivery time is written another way that means the same minutes', () => {
    expect(overviewBody(values({ delivery: '24', unit: 'hours' }), SERVICE)).toEqual({});
    expect(overviewBody(values({ delivery: '1440', unit: 'minutes' }), SERVICE)).toEqual({});
  });

  it('sends the name, group and delivery time through the details mapping, as the old dialog did', () => {
    expect(
      overviewBody(values({ name: ' New name ', categoryId: '5', delivery: '2', unit: 'hours' }), SERVICE),
    ).toEqual({ name: 'New name', categoryId: 5, slaMinutes: 120 });
  });

  it('never sends a code, and the form holds none: the server makes it', () => {
    expect(overviewDefaults(SERVICE)).not.toHaveProperty('code');
    expect(OVERVIEW_FIELDS).not.toContain('code');
    expect(overviewBody(values({ name: 'Other', cancel: true }), SERVICE)).not.toHaveProperty('code');
  });

  it('never sends the type or the quantity rule: the part does not edit them', () => {
    const packs: Service = { ...SERVICE, minQty: 5, maxQty: 25, qtyOptions: [5, 10, 25] };
    expect(overviewBody(values({ name: 'Other' }, packs), packs)).toEqual({ name: 'Other' });
    const range: Service = { ...SERVICE, minQty: 2, maxQty: 9 };
    expect(overviewBody(values({ cancel: true }, range), range)).toEqual({ allowCancel: true });
  });

  it('sends the status and the order handling only when they change', () => {
    expect(overviewBody(values({ active: false }), SERVICE)).toEqual({ status: 'disabled' });
    expect(overviewBody(values({ auto: false }), SERVICE)).toEqual({ executionMode: 'manual' });
    const off: Service = { ...SERVICE, status: 'disabled', executionMode: 'manual' };
    expect(overviewBody(values({ active: true, auto: true }, off), off)).toEqual({
      status: 'active',
      executionMode: 'auto',
    });
  });

  it('sends the verification switch with its window when it goes on', () => {
    expect(overviewBody(values({ verify: true, verifyWindowH: '24' }), SERVICE)).toEqual({
      allowVerify: true,
      verifyWindowH: 24,
    });
  });

  it('sends only the window when verification stays on and the window changes', () => {
    const on: Service = { ...SERVICE, allowVerify: true, verifyWindowH: 24 };
    expect(overviewBody(values({ verifyWindowH: '72' }, on), on)).toEqual({ verifyWindowH: 72 });
    expect(overviewBody(values({}, on), on)).toEqual({});
  });

  it('leaves the window out when verification goes off, whatever was typed in it', () => {
    const on: Service = { ...SERVICE, allowVerify: true, verifyWindowH: 24 };
    expect(overviewBody(values({ verify: false, verifyWindowH: '999' }, on), on)).toEqual({
      allowVerify: false,
    });
    expect(overviewBody(values({ verifyWindowH: '999' }), SERVICE)).toEqual({});
  });

  it('sends the cancel switch when it changes', () => {
    expect(overviewBody(values({ cancel: true }), SERVICE)).toEqual({ allowCancel: true });
  });

  it('sends "Delivered from code stock" only when it changes, in either direction', () => {
    expect(overviewBody(values({ stockDelivery: true }), SERVICE)).toEqual({ stockDelivery: true });
    const stock: Service = { ...SERVICE, stockDelivery: true, stockAvailable: 3 };
    expect(overviewBody(values({}, stock), stock)).toEqual({});
    expect(overviewBody(values({ stockDelivery: false }, stock), stock)).toEqual({ stockDelivery: false });
  });
});

// The verification window's own rule (whole hours, 1 to 720) is tested in lib/verifyWindow.test.ts; here a stored 0 is read as it is.
describe('a stored verification window of 0', () => {
  it('shows as it is, and is not sent again while it does not change', () => {
    const on: Service = { ...SERVICE, allowVerify: true, verifyWindowH: 0 };
    expect(overviewDefaults(on).verifyWindowH).toBe('0');
    expect(overviewBody(values({ cancel: true }, on), on)).toEqual({ allowCancel: true });
  });
});

describe('overviewDefaults for a service delivered from code stock', () => {
  it('starts the switch on', () => {
    expect(overviewDefaults({ ...SERVICE, stockDelivery: true }).stockDelivery).toBe(true);
  });
});

describe('the names the form shares with the API', () => {
  it("has a row for the code stock switch, so the server's refusal shows under it", () => {
    expect(OVERVIEW_FIELDS).toContain('stockDelivery');
  });

  it('gives every API field that has no row of its own name a row', () => {
    for (const row of Object.values(OVERVIEW_ALIASES)) expect(OVERVIEW_FIELDS).toContain(row);
  });
});
