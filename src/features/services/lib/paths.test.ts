// Tests for the link the services feature's components make outside the Product / Services page.
import { describe, expect, it } from 'vitest';
import { MERCHANT_GROUPS_PATH } from './paths';

describe('MERCHANT_GROUPS_PATH', () => {
  it('is the merchants page on its groups tab', () => {
    expect(MERCHANT_GROUPS_PATH).toBe('/merchants?tab=groups');
  });
});
