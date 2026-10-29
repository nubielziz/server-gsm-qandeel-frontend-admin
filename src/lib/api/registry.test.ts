// Tests for mergeRegistries (resource name clashes are errors).
import { describe, expect, it } from 'vitest';
import { mergeRegistries, type ResourceRegistry } from './registry';

describe('mergeRegistries', () => {
  it('joins the registries of several features', () => {
    const staff = { list: async () => ({ data: [], total: 0 }) };
    const orders = { show: async () => ({}) };
    const merged = mergeRegistries({ staff }, { orders }, {});
    expect(Object.keys(merged)).toEqual(['staff', 'orders']);
    expect(merged.staff).toBe(staff);
  });

  it('throws when two features claim the same resource', () => {
    const a: ResourceRegistry = { staff: {} };
    const b: ResourceRegistry = { staff: {} };
    expect(() => mergeRegistries(a, b)).toThrow('Resource "staff" is registered twice.');
  });

  it('does not mistake an inherited property for a registered resource', () => {
    expect(() => mergeRegistries({ constructor: {} })).not.toThrow();
  });
});
