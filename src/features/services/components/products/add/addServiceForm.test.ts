// Tests for the pure side of the +Add Service form: the delivery time as the form holds it, the checks, the create body, the update that
// follows it and the settings a chosen service copies in. (The minutes and units themselves are tested in lib/delivery.test.ts.)
import { describe, expect, it } from 'vitest';
import type { Service } from '../../../types';
import {
  addServiceDefaults,
  copiedSettings,
  createBody,
  creditProblem,
  DEFAULT_VERIFY_WINDOW_H,
  deliveryFields,
  deliveryProblem,
  followUpBody,
  followUpWords,
  ownCostProblem,
  windowProblem,
  type AddServiceValues,
} from './addServiceForm';

/** A form the server would accept: every box filled, both switches as the server starts them. */
function filled(changes: Partial<AddServiceValues> = {}): AddServiceValues {
  return {
    ...addServiceDefaults(),
    name: '  Pixel Check ',
    code: ' IMEI-PX-1 ',
    categoryId: '1',
    deliveryAmount: '2',
    deliveryUnit: 'hours',
    credit: '3.5',
    ...changes,
  };
}

/** A service as the list sends it: switched off, manual, with verification for 48 hours and a delivery of 3 hours. */
const SERVICE: Service = {
  id: 14,
  name: 'Xiaomi Mi Account Clean',
  code: 'IMEI-XIA-MI',
  type: 'imei',
  status: 'disabled',
  executionMode: 'manual',
  categoryId: 5,
  category: { id: 5, name: 'Xiaomi' },
  basePrice: '5.8800',
  cost: '4.2000',
  costChangedFrom: null,
  ownCost: '0.0000',
  stockDelivery: false,
  stockAvailable: 0,
  minProfit: '0.2500',
  floorPrice: '4.4500',
  marginPct: '28.5714',
  belowFloor: false,
  slaMinutes: 180,
  minQty: 1,
  maxQty: 1,
  qtyOptions: [],
  allowCancel: true,
  allowVerify: true,
  verifyWindowH: 48,
  supplier: null,
  fallbackSupplier: null,
};

describe('the delivery time', () => {
  it('is shown in the largest unit that holds it exactly', () => {
    expect(deliveryFields(180)).toEqual({ deliveryAmount: '3', deliveryUnit: 'hours' });
    expect(deliveryFields(2880)).toEqual({ deliveryAmount: '2', deliveryUnit: 'days' });
    expect(deliveryFields(1440)).toEqual({ deliveryAmount: '1', deliveryUnit: 'days' });
    expect(deliveryFields(60)).toEqual({ deliveryAmount: '1', deliveryUnit: 'hours' });
    expect(deliveryFields(90)).toEqual({ deliveryAmount: '90', deliveryUnit: 'minutes' });
    expect(deliveryFields(5)).toEqual({ deliveryAmount: '5', deliveryUnit: 'minutes' });
  });

  it('says what is wrong, or true', () => {
    expect(deliveryProblem({ deliveryAmount: '2', deliveryUnit: 'hours' })).toBe(true);
    expect(deliveryProblem({ deliveryAmount: '', deliveryUnit: 'hours' })).toBe(
      'Enter a whole number, 1 or more.',
    );
  });
});

describe('the credit and the verification window', () => {
  it('asks for an amount above zero', () => {
    expect(creditProblem('3.5')).toBe(true);
    expect(creditProblem('0.0001')).toBe(true);
    for (const text of ['', '0', '0.00', '-1', 'abc', '1.23456']) {
      expect(creditProblem(text)).toBe('Enter a credit greater than zero.');
    }
  });

  it('asks for 1 to 720 hours, and only while verification is on', () => {
    expect(windowProblem({ verify: false, verifyWindowH: 'abc' })).toBe(true);
    expect(windowProblem({ verify: true, verifyWindowH: '24' })).toBe(true);
    expect(windowProblem({ verify: true, verifyWindowH: '720' })).toBe(true);
    for (const text of ['', '0', '721', '1.5', 'x']) {
      expect(windowProblem({ verify: true, verifyWindowH: text })).toBe('Enter the hours, 1 to 720.');
    }
  });
});

describe('the create body', () => {
  it('has the trimmed words, the group, the minutes and the credit as the API writes money', () => {
    expect(createBody(filled(), 'imei')).toEqual({
      name: 'Pixel Check',
      code: 'IMEI-PX-1',
      categoryId: 1,
      type: 'imei',
      slaMinutes: 120,
      basePrice: '3.5000',
    });
  });

  it('sends Your cost and Delivered from code stock only when they are given', () => {
    const plain = createBody(filled(), 'imei');
    expect(plain).not.toHaveProperty('ownCost');
    expect(plain).not.toHaveProperty('stockDelivery');
    expect(createBody(filled({ ownCost: ' 4.7 ' }), 'server')).toMatchObject({ ownCost: '4.7000' });
    expect(createBody(filled({ ownCost: '0' }), 'server')).toMatchObject({ ownCost: '0.0000' });
    expect(createBody(filled({ stockDelivery: true }), 'server')).toMatchObject({ stockDelivery: true });
    expect(createBody(filled({ ownCost: '   ' }), 'server')).not.toHaveProperty('ownCost');
  });

  it('carries the kind of the strip, not a typed one', () => {
    expect(createBody(filled(), 'server').type).toBe('server');
  });

  it('sends the cancel and verification keys only when they are on', () => {
    expect(createBody(filled({ cancel: true }), 'imei')).toMatchObject({ allowCancel: true });
    const verified = createBody(filled({ verify: true, verifyWindowH: ' 48 ' }), 'imei');
    expect(verified).toMatchObject({ allowVerify: true, verifyWindowH: 48 });
    expect(verified).not.toHaveProperty('allowCancel');
    // A window typed and then switched off is not sent.
    expect(createBody(filled({ verify: false, verifyWindowH: '48' }), 'imei')).not.toHaveProperty(
      'verifyWindowH',
    );
  });
});

describe('Your cost', () => {
  it('may be left empty or be an amount of 0 or more, up to four decimals', () => {
    for (const text of ['', '  ', '0', '4.7', '12.3456']) expect(ownCostProblem(text)).toBe(true);
  });

  it('says what is wrong with anything else', () => {
    for (const text of ['abc', '-1', '1.23456', '1,5'])
      expect(ownCostProblem(text)).toBe('Enter an amount, 0 or more.');
  });
});

describe('the update after the create', () => {
  it('is nothing for an Active, Automatic service', () => {
    expect(followUpBody({ active: true, automatic: true })).toBeNull();
  });

  it('sets what the create route cannot: Inactive and Manual', () => {
    expect(followUpBody({ active: false, automatic: true })).toEqual({ status: 'disabled' });
    expect(followUpBody({ active: true, automatic: false })).toEqual({ executionMode: 'manual' });
    expect(followUpBody({ active: false, automatic: false })).toEqual({
      status: 'disabled',
      executionMode: 'manual',
    });
  });

  it('names what it sets, for the message when it is refused', () => {
    expect(followUpWords({ status: 'disabled' })).toBe('status');
    expect(followUpWords({ executionMode: 'manual' })).toBe('order handling');
    expect(followUpWords({ status: 'disabled', executionMode: 'manual' })).toBe('status and order handling');
  });
});

describe('the blank form', () => {
  it('starts a service as the server starts it, with nothing typed', () => {
    expect(addServiceDefaults()).toEqual({
      name: '',
      code: '',
      categoryId: '',
      active: true,
      automatic: true,
      verify: false,
      verifyWindowH: DEFAULT_VERIFY_WINDOW_H,
      cancel: false,
      deliveryAmount: '',
      deliveryUnit: 'minutes',
      credit: '',
      ownCost: '',
      stockDelivery: false,
    });
  });
});

describe('the settings a chosen service copies in', () => {
  it('are its group, switches, delivery time, credit, stock switch and own cost, and never its name or code', () => {
    expect(copiedSettings(SERVICE)).toEqual({
      categoryId: '5',
      active: false,
      automatic: false,
      verify: true,
      verifyWindowH: '48',
      cancel: true,
      deliveryAmount: '3',
      deliveryUnit: 'hours',
      credit: '5.88',
      ownCost: '',
      stockDelivery: false,
    });
  });

  it('copy "Delivered from code stock" and a figure of the own cost, and leave the box empty for an own cost of 0', () => {
    expect(copiedSettings({ ...SERVICE, stockDelivery: true, ownCost: '4.7000' })).toMatchObject({
      stockDelivery: true,
      ownCost: '4.70',
    });
    expect(copiedSettings({ ...SERVICE, ownCost: '0.0000' })).toMatchObject({ ownCost: '' });
    // Merged over a form that already holds both, the copy replaces them.
    const typed = { ...addServiceDefaults(), ownCost: '9', stockDelivery: true };
    expect({ ...typed, ...copiedSettings(SERVICE) }).toMatchObject({ ownCost: '', stockDelivery: false });
  });

  it('leave Status and Order handling out when the role cannot send them', () => {
    const copied = copiedSettings(SERVICE, { switches: false });
    expect(copied).not.toHaveProperty('active');
    expect(copied).not.toHaveProperty('automatic');
    expect(copied).toEqual({
      categoryId: '5',
      verify: true,
      verifyWindowH: '48',
      cancel: true,
      deliveryAmount: '3',
      deliveryUnit: 'hours',
      credit: '5.88',
      ownCost: '',
      stockDelivery: false,
    });
    // Merged over the blank form, the two switches stay as the server starts a service, whatever the copied service was.
    expect({ ...addServiceDefaults(), ...copied }).toMatchObject({ active: true, automatic: true });
  });

  it('keep the default window for a service with no verification', () => {
    const copied = copiedSettings({
      ...SERVICE,
      allowVerify: false,
      verifyWindowH: 0,
      status: 'active',
      executionMode: 'auto',
    });
    expect(copied).toMatchObject({
      verify: false,
      verifyWindowH: DEFAULT_VERIFY_WINDOW_H,
      active: true,
      automatic: true,
    });
  });
});
