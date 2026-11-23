// Tests for the registry of the parts of the edit view: which parts exist and in what order, how the left menu words them, and which parts a
// role may see.
import { describe, expect, it } from 'vitest';
import { grantsOf } from '../test/grants';
import type { ServiceDetail } from '../types';
import { SERVICE_PARTS } from './productsPath';
import { SERVICE_PART_SPECS, visibleParts } from './serviceParts';

// The rules look at the permissions only, not at the service.
const SERVICE = {} as ServiceDetail;
const idsFor = (...permissions: string[]) =>
  visibleParts(grantsOf(...permissions), SERVICE).map((part) => part.id);

describe('SERVICE_PART_SPECS', () => {
  it('holds one row for each part of the address, in the address’s order', () => {
    expect(SERVICE_PART_SPECS.map((part) => part.id)).toEqual([...SERVICE_PARTS]);
  });

  it('words the menu as the layout the owner asked for has it', () => {
    expect(SERVICE_PART_SPECS.map((part) => part.label)).toEqual([
      'Overview',
      'Set Pricing',
      'Field',
      'API Connection',
      'Retail Purchase',
      'Inventory',
      'Activity',
    ]);
  });

  it('gives every part a component to draw', () => {
    for (const part of SERVICE_PART_SPECS) expect(typeof part.Component).toBe('function');
  });
});

describe('visibleParts', () => {
  it('gives the Owner every part', () => {
    expect(idsFor('*')).toEqual([...SERVICE_PARTS]);
  });

  it('gives a role with catalog:read the parts that only read the service', () => {
    expect(idsFor('catalog:read')).toEqual(['overview', 'pricing', 'fields', 'api', 'activity']);
  });

  it('needs storefront:read for the shop part and inventory:read for the stored codes', () => {
    expect(idsFor('catalog:read', 'storefront:read')).toEqual([
      'overview',
      'pricing',
      'fields',
      'api',
      'shop',
      'activity',
    ]);
    expect(idsFor('catalog:read', 'inventory:read')).toEqual([
      'overview',
      'pricing',
      'fields',
      'api',
      'inventory',
      'activity',
    ]);
  });

  it('gives a role with no permission nothing', () => {
    expect(idsFor()).toEqual([]);
  });
});
