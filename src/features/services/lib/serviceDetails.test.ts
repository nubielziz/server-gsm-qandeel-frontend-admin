// Tests for the body of an edit of the service details, which holds only what changed.
import { describe, expect, it } from 'vitest';
import { updateServiceBody, type ServiceDetailsValues } from './serviceDetails';
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
  allowCancel: false,
  allowVerify: false,
  verifyWindowH: 0,
  supplier: null,
  fallbackSupplier: null,
};

// The service as the form shows it.
const values = (changes: Partial<ServiceDetailsValues> = {}): ServiceDetailsValues => ({
  name: 'Sample Unlock',
  code: 'IMEI-SAMPLE',
  categoryId: '3',
  type: 'imei',
  slaMinutes: '60',
  basePrice: '',
  quantityMode: 'single',
  minQty: '1',
  maxQty: '',
  qtyOptions: '',
  ...changes,
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
