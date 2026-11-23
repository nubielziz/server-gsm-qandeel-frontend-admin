// Tests for the service details form's values and bodies: what the inputs start with, which names have an error line, the body of
// a new service and the body of an edit, which holds only what changed.
import { describe, expect, it } from 'vitest';
import {
  createServiceBody,
  serviceDetailsDefaults,
  serviceDetailsFields,
  updateServiceBody,
  type ServiceDetailsValues,
} from './serviceDetails';
import type { Service } from '../types';

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
  minProfit: '1.0000',
  floorPrice: '9.0000',
  marginPct: '20.0000',
  belowFloor: false,
  slaMinutes: 60,
  minQty: 1,
  maxQty: 1,
  qtyOptions: [],
  supplier: null,
  fallbackSupplier: null,
};

const values = (changes: Partial<ServiceDetailsValues> = {}): ServiceDetailsValues => ({
  ...serviceDetailsDefaults(SERVICE),
  ...changes,
});

describe('serviceDetailsDefaults', () => {
  it('starts a new service blank, at one per order and 60 minutes', () => {
    expect(serviceDetailsDefaults()).toEqual({
      name: '',
      code: '',
      categoryId: '',
      type: 'imei',
      slaMinutes: '60',
      basePrice: '',
      quantityMode: 'single',
      minQty: '1',
      maxQty: '',
      qtyOptions: '',
    });
  });

  it('starts an edit with the service as it is, and no price box', () => {
    expect(serviceDetailsDefaults({ ...SERVICE, slaMinutes: 15, minQty: 2, maxQty: 9 })).toEqual({
      name: 'Sample Unlock',
      code: 'IMEI-SAMPLE',
      categoryId: '3',
      type: 'imei',
      slaMinutes: '15',
      basePrice: '',
      quantityMode: 'range',
      minQty: '2',
      maxQty: '9',
      qtyOptions: '',
    });
  });
});

describe('serviceDetailsFields', () => {
  it('names the price only while a service is created', () => {
    expect(serviceDetailsFields(true)).toContain('basePrice');
    expect(serviceDetailsFields(false)).not.toContain('basePrice');
    expect(serviceDetailsFields(false)).toEqual(
      expect.arrayContaining([
        'name',
        'code',
        'categoryId',
        'type',
        'slaMinutes',
        'minQty',
        'maxQty',
        'qtyOptions',
      ]),
    );
  });
});

describe('createServiceBody', () => {
  it('sends every field, trimmed, with numbers and the price as money text', () => {
    const body = createServiceBody(
      values({
        name: '  New one ',
        code: ' NEW-1 ',
        categoryId: '4',
        type: 'file',
        slaMinutes: '30',
        basePrice: '2.5',
      }),
    );
    expect(body).toEqual({
      name: 'New one',
      code: 'NEW-1',
      categoryId: 4,
      type: 'file',
      slaMinutes: 30,
      basePrice: '2.5000',
    });
  });

  it('adds the quantity keys of a range and of packs, and none for one per order', () => {
    expect(createServiceBody(values({ basePrice: '1', quantityMode: 'range', maxQty: '50' }))).toMatchObject({
      minQty: 1,
      maxQty: 50,
    });
    expect(
      createServiceBody(values({ basePrice: '1', quantityMode: 'packs', qtyOptions: '25, 5' })),
    ).toMatchObject({
      qtyOptions: [5, 25],
    });
    const single = createServiceBody(values({ basePrice: '1' }));
    expect(single).not.toHaveProperty('minQty');
    expect(single).not.toHaveProperty('qtyOptions');
  });
});

describe('updateServiceBody', () => {
  it('is empty when nothing changed, even if a word only gained spaces', () => {
    expect(updateServiceBody(values(), SERVICE)).toEqual({});
    expect(updateServiceBody(values({ name: ' Sample Unlock  ' }), SERVICE)).toEqual({});
  });

  it('sends only the fields that changed', () => {
    expect(updateServiceBody(values({ slaMinutes: '90' }), SERVICE)).toEqual({ slaMinutes: 90 });
    expect(
      updateServiceBody(values({ categoryId: '5', type: 'server', code: 'IMEI-OTHER' }), SERVICE),
    ).toEqual({
      categoryId: 5,
      type: 'server',
      code: 'IMEI-OTHER',
    });
  });

  it('sends the quantity rule only when it differs: a range sends all three keys, packs send the packs', () => {
    expect(updateServiceBody(values({ quantityMode: 'range', minQty: '2', maxQty: '8' }), SERVICE)).toEqual({
      minQty: 2,
      maxQty: 8,
      qtyOptions: [],
    });
    expect(updateServiceBody(values({ quantityMode: 'packs', qtyOptions: '10, 5' }), SERVICE)).toEqual({
      qtyOptions: [5, 10],
    });
  });
});
