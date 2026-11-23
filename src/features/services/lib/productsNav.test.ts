// Tests for the two rows of links of the Product / Services page: the strip of kinds and the row of views, as data (their words, their
// addresses, the plus before the two that add, the divider before the three extra views, and what a role is not shown).
import { describe, expect, it } from 'vitest';
import { grantsOf } from '../test/grants';
import { currentLink, firstListedView, kindItems, kindLabel, viewItems } from './productsNav';
import { PRODUCTS_VIEW_SPECS, usableViews } from './productsViews';

const usableFor = (...permissions: string[]) => usableViews(grantsOf(...permissions), PRODUCTS_VIEW_SPECS);

describe('kindLabel', () => {
  it('words the four kinds as the strip does', () => {
    expect(kindLabel('imei')).toBe('IMEI Service');
    expect(kindLabel('server')).toBe('Server Service');
    expect(kindLabel('remote')).toBe('Remote Service');
    expect(kindLabel('file')).toBe('File Service');
  });
});

describe('kindItems', () => {
  it('lists the four kinds, each linking to the same view of that kind', () => {
    expect(kindItems('groups')).toEqual([
      { id: 'imei', label: 'IMEI Service', to: '/products?view=groups&type=imei' },
      { id: 'server', label: 'Server Service', to: '/products?view=groups&type=server' },
      { id: 'remote', label: 'Remote Service', to: '/products?view=groups&type=remote' },
      { id: 'file', label: 'File Service', to: '/products?view=groups&type=file' },
    ]);
  });

  it('sends a view about one record to the list of the new kind', () => {
    expect(kindItems('edit').map((item) => item.to)).toEqual([
      '/products?view=all&type=imei',
      '/products?view=all&type=server',
      '/products?view=all&type=remote',
      '/products?view=all&type=file',
    ]);
    expect(kindItems('edit-group')[1].to).toBe('/products?view=groups&type=server');
  });

  it('starts the publish view and the price rules clean on the new kind', () => {
    expect(kindItems('publish')[2].to).toBe('/products?view=publish&type=remote');
    expect(kindItems('rules')[3].to).toBe('/products?view=rules&type=file');
  });
});

describe('viewItems', () => {
  it('lists the eight views of the Owner for the kind on the strip, with the plus and the divider', () => {
    expect(viewItems(usableFor('*'), 'server')).toEqual([
      { id: 'all', label: 'All', to: '/products?view=all&type=server' },
      { id: 'pricing', label: 'Pricing', to: '/products?view=pricing&type=server' },
      { id: 'add', label: 'Add Service', to: '/products?view=add&type=server', add: true },
      { id: 'groups', label: 'Group', to: '/products?view=groups&type=server' },
      {
        id: 'add-group',
        label: 'Add Group',
        to: '/products?view=add-group&type=server',
        add: true,
        after: 'divider',
      },
      { id: 'rules', label: 'Price Rules', to: '/products?view=rules&type=server' },
      { id: 'publish', label: 'Shop Publish', to: '/products?view=publish&type=server' },
      { id: 'inventory', label: 'Inventory', to: '/products?view=inventory&type=server' },
    ]);
  });

  it('leaves out the edit views, which have no link', () => {
    const ids = viewItems(usableFor('*'), 'imei').map((item) => item.id);
    expect(ids).not.toContain('edit');
    expect(ids).not.toContain('edit-group');
  });

  it('draws the divider after the last link of the first row, wherever that is for the role', () => {
    const dividerAfter = (...permissions: string[]) =>
      viewItems(usableFor(...permissions), 'imei')
        .filter((item) => item.after === 'divider')
        .map((item) => item.id);
    expect(dividerAfter('catalog:read', 'pricing:read')).toEqual(['groups']);
    expect(dividerAfter('catalog:read', 'catalog:create', 'inventory:read')).toEqual(['add-group']);
  });

  it('draws no divider when the role has only one of the two groups of links', () => {
    expect(viewItems(usableFor('catalog:read', 'catalog:create'), 'imei').some((item) => item.after)).toBe(
      false,
    );
    expect(viewItems(usableFor('pricing:read', 'storefront:read'), 'imei').map((item) => item.id)).toEqual([
      'rules',
      'publish',
    ]);
    expect(viewItems(usableFor('pricing:read', 'storefront:read'), 'imei').some((item) => item.after)).toBe(
      false,
    );
  });

  it('lists nothing for a role that may use no view', () => {
    expect(viewItems(usableFor('orders:read'), 'imei')).toEqual([]);
  });
});

describe('firstListedView', () => {
  it('is the first view with a link that the role may use', () => {
    expect(firstListedView(usableFor('*'))?.id).toBe('all');
    expect(firstListedView(usableFor('pricing:read'))?.id).toBe('rules');
    expect(firstListedView(usableFor('inventory:read', 'storefront:read'))?.id).toBe('publish');
  });

  it('is never a view without a link, and is null when there is no other', () => {
    expect(firstListedView(PRODUCTS_VIEW_SPECS.filter((spec) => spec.group === 'hidden'))).toBeNull();
    expect(firstListedView([])).toBeNull();
  });
});

describe('currentLink', () => {
  it('lights the link of the view, and the list an edit view belongs to', () => {
    expect(currentLink('pricing')).toBe('pricing');
    expect(currentLink('publish')).toBe('publish');
    expect(currentLink('edit')).toBe('all');
    expect(currentLink('edit-group')).toBe('groups');
  });
});
