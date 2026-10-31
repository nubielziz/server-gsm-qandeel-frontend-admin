// Tests for the order pipeline and supplier health functions: the method and path each one sends.
import { describe, expect, it } from 'vitest';
import { getOrdersHealth, getSuppliersHealth } from './pipeline';
import { stubFetch } from '../test/stubFetch';

const http = stubFetch();

describe('getOrdersHealth', () => {
  it('reads the pipeline with a plain GET', async () => {
    http.reply({ needsAttention: 4 });
    await expect(getOrdersHealth()).resolves.toEqual({ needsAttention: 4 });
    expect(http.last()).toEqual({
      method: 'GET',
      path: '/admin/system/orders-health',
      query: {},
      body: undefined,
    });
  });
});

describe('getSuppliersHealth', () => {
  it('reads the suppliers with a plain GET', async () => {
    http.reply({ suppliers: [] });
    await expect(getSuppliersHealth()).resolves.toEqual({ suppliers: [] });
    expect(http.last()).toEqual({
      method: 'GET',
      path: '/admin/system/suppliers',
      query: {},
      body: undefined,
    });
  });
});
