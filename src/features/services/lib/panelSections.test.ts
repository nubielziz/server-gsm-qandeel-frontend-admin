// Tests for the panel's section list: its rows are well formed, each shows by its permission, and the panel can be given another list.
import { describe, expect, it } from 'vitest';
import { PANEL_SECTION_IDS } from '../components/panel/types';
import { grantsOf } from '../test/grants';
import { PANEL_SECTIONS, visibleSections, type PanelSectionSpec } from './panelSections';

describe('PANEL_SECTIONS', () => {
  it('holds the six sections in the order of the contract, Activity last', () => {
    expect(PANEL_SECTIONS.map((spec) => spec.id)).toEqual(PANEL_SECTION_IDS);
    expect(PANEL_SECTIONS.map((spec) => spec.title)).toEqual([
      'Details',
      'Order form',
      'Suppliers',
      'Prices',
      'Shop page',
      'Activity',
    ]);
  });

  it('shows the Shop page only with storefront:read, and the rest with catalog:read', () => {
    const shown = (...permissions: string[]) =>
      visibleSections(grantsOf(...permissions)).map((spec) => spec.id);
    expect(shown('catalog:read')).toEqual(['details', 'order-form', 'suppliers', 'prices', 'activity']);
    expect(shown('catalog:read', 'storefront:read')).toEqual(PANEL_SECTION_IDS);
    expect(shown('storefront:read')).toEqual([]);
  });

  it('mounts again after a data change only the sections that keep a snapshot in a form: Details and Prices', () => {
    expect(PANEL_SECTIONS.filter((spec) => spec.remountOnChange).map((spec) => spec.id)).toEqual([
      'details',
      'prices',
    ]);
  });

  it('holds the Activity section', () => {
    const activity = PANEL_SECTIONS.find((spec) => spec.id === 'activity');
    expect(activity?.title).toBe('Activity');
  });

  it('has only known ids, none twice, each with a title and a component', () => {
    const ids = PANEL_SECTIONS.map((spec) => spec.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const spec of PANEL_SECTIONS) {
      expect(PANEL_SECTION_IDS).toContain(spec.id);
      expect(spec.title).not.toBe('');
      expect(typeof spec.Component).toBe('function');
    }
  });

  it('shows the Activity section to a reader of the catalog and to nobody else', () => {
    const activity = PANEL_SECTIONS.find((spec) => spec.id === 'activity');
    expect(activity?.show(grantsOf('catalog:read'))).toBe(true);
    expect(activity?.show(grantsOf('catalog:*'))).toBe(true);
    expect(activity?.show(grantsOf('orders:read'))).toBe(false);
  });
});

describe('visibleSections', () => {
  const stub = (id: PanelSectionSpec['id'], permission: string): PanelSectionSpec => ({
    id,
    title: id,
    show: (grants) => grants.can(permission),
    Component: () => null,
  });
  const list = [
    stub('details', 'catalog:read'),
    stub('prices', 'pricing:read'),
    stub('shop', 'storefront:read'),
  ];

  it('keeps the list order and drops the sections the role may not see', () => {
    const shown = visibleSections(grantsOf('catalog:read', 'storefront:read'), list);
    expect(shown.map((spec) => spec.id)).toEqual(['details', 'shop']);
  });

  it('shows nothing to a role with no permission, and everything to the owner', () => {
    expect(visibleSections(grantsOf(), list)).toEqual([]);
    expect(visibleSections(grantsOf('*'), list)).toHaveLength(3);
  });

  it('draws the page list when it is given none', () => {
    expect(visibleSections(grantsOf('catalog:read')).map((spec) => spec.id)).toEqual(
      PANEL_SECTIONS.filter((spec) => spec.show(grantsOf('catalog:read'))).map((spec) => spec.id),
    );
  });
});
