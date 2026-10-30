// Tests for the addresses into and out of the page (ARCHITECTURE §5.2): the below-floor list, a tab with a service selected, the supplier
// and merchant pages.
import { describe, expect, it } from 'vitest';
import { MERCHANT_GROUPS_PATH, servicesListPath, supplierLink } from './paths';

describe('servicesListPath', () => {
  it('is the bare page with nothing set', () => {
    expect(servicesListPath()).toBe('/services');
    expect(servicesListPath({ tab: 'services' })).toBe('/services');
  });

  it('opens the services priced under their floor (the dashboard’s link)', () => {
    expect(servicesListPath({ belowFloor: true })).toBe('/services?belowFloor=true');
  });

  it('opens the resolver on one service, optionally for one merchant', () => {
    expect(servicesListPath({ tab: 'resolver', service: 4 })).toBe('/services?tab=resolver&service=4');
    expect(servicesListPath({ tab: 'resolver', service: 4, merchant: 12 })).toBe(
      '/services?tab=resolver&service=4&merchant=12',
    );
  });

  it('filters the list by text, type and status', () => {
    expect(servicesListPath({ q: 'AT&T', type: 'imei', status: 'disabled' })).toBe(
      '/services?q=AT%26T&type=imei&status=disabled',
    );
  });

  it('opens the code stock of one service by status', () => {
    expect(servicesListPath({ tab: 'inventory', service: 16, status: 'sold' })).toBe(
      '/services?tab=inventory&status=sold&service=16',
    );
  });
});

describe('links out', () => {
  it('names the supplier and merchant group addresses', () => {
    expect(supplierLink(6)).toBe('/suppliers?supplier=6');
    expect(MERCHANT_GROUPS_PATH).toBe('/merchants?tab=groups');
  });
});
