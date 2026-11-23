// Tests for the addresses the Activity part links to: the orders of a service (every order, searched by the service's name) and its price check.
import { describe, expect, it } from 'vitest';
import { priceCheckPath, serviceOrdersPath } from './activityLinks';

describe('serviceOrdersPath', () => {
  it('opens the Orders page on every order, searched for the name', () => {
    expect(serviceOrdersPath('EE UK Unlock')).toBe('/orders?tab=all&q=EE+UK+Unlock');
  });

  it('writes a name with special characters safely', () => {
    expect(serviceOrdersPath('AT&T USA Premier Unlock')).toBe('/orders?tab=all&q=AT%26T+USA+Premier+Unlock');
  });
});

describe('priceCheckPath', () => {
  it('opens the price check of the Price Rules view, on the service, in the kind of the service', () => {
    expect(priceCheckPath('server', 17)).toBe('/products?view=rules&type=server&tab=check&service=17');
    expect(priceCheckPath('imei', 9)).toBe('/products?view=rules&type=imei&tab=check&service=9');
  });
});
