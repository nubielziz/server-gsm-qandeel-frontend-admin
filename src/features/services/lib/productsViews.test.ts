// Tests for the registry of the views of the Product / Services page: which views exist and in what order, where each one's link goes, and
// which views a role may use.
import { describe, expect, it } from 'vitest';
import { grantsOf } from '../test/grants';
import { PRODUCTS_VIEWS } from './productsPath';
import { PRODUCTS_VIEW_SPECS, usableViews } from './productsViews';

const idsFor = (...permissions: string[]) => usableViews(grantsOf(...permissions)).map((spec) => spec.id);

describe('PRODUCTS_VIEW_SPECS', () => {
  it('holds one row for each view of the address, in the address’s order', () => {
    expect(PRODUCTS_VIEW_SPECS.map((spec) => spec.id)).toEqual([...PRODUCTS_VIEWS]);
  });

  it('puts five views in the first row, three after the divider and two without a link', () => {
    const idsOf = (group: string) =>
      PRODUCTS_VIEW_SPECS.filter((spec) => spec.group === group).map((spec) => spec.id);
    expect(idsOf('main')).toEqual(['all', 'pricing', 'add', 'groups', 'add-group']);
    expect(idsOf('extra')).toEqual(['rules', 'publish', 'inventory']);
    expect(idsOf('hidden')).toEqual(['edit', 'edit-group']);
  });

  it('words the links as the layout the owner asked for, with a plus on the two that add', () => {
    expect(
      PRODUCTS_VIEW_SPECS.filter((spec) => spec.group !== 'hidden').map((spec) => [
        spec.label,
        spec.add === true,
      ]),
    ).toEqual([
      ['All', false],
      ['Pricing', false],
      ['Add Service', true],
      ['Group', false],
      ['Add Group', true],
      ['Price Rules', false],
      ['Shop Publish', false],
      ['Inventory', false],
    ]);
  });

  it('gives every view a component to draw', () => {
    for (const spec of PRODUCTS_VIEW_SPECS) expect(typeof spec.Component).toBe('function');
  });
});

describe('usableViews', () => {
  it('gives the Owner every view', () => {
    expect(idsFor('*')).toEqual([...PRODUCTS_VIEWS]);
  });

  it('gives a role with catalog:read the list, the groups and the two edit views', () => {
    expect(idsFor('catalog:read')).toEqual(['all', 'groups', 'edit', 'edit-group']);
  });

  it('needs catalog:create to add a service or a group', () => {
    expect(idsFor('catalog:read', 'catalog:create')).toEqual([
      'all',
      'add',
      'groups',
      'add-group',
      'edit',
      'edit-group',
    ]);
    expect(idsFor('catalog:create')).toEqual([]);
  });

  it('needs pricing:read as well as catalog:read for the price grid, and pricing:read alone for the price rules', () => {
    expect(idsFor('catalog:read', 'pricing:read')).toEqual([
      'all',
      'pricing',
      'groups',
      'rules',
      'edit',
      'edit-group',
    ]);
    expect(idsFor('pricing:read')).toEqual(['rules']);
  });

  it('gives the publish runs to storefront:read and the code stock to inventory:read', () => {
    expect(idsFor('storefront:read')).toEqual(['publish']);
    expect(idsFor('inventory:read')).toEqual(['inventory']);
  });

  it('gives a role with none of the four read permissions nothing', () => {
    expect(idsFor('orders:read', 'suppliers:read')).toEqual([]);
  });

  it('draws another list when it is given one', () => {
    expect(usableViews(grantsOf('*'), PRODUCTS_VIEW_SPECS.slice(0, 2)).map((spec) => spec.id)).toEqual([
      'all',
      'pricing',
    ]);
  });
});
