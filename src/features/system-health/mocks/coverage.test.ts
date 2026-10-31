// Checks that the System health mock answers every endpoint of the slice (docs/slices/system-health.json): 30 routes,
// each with a handler of the right method and path, and none extra.
import type { HttpHandler } from 'msw';
import { describe, expect, it } from 'vitest';
import slice from '../../../../docs/slices/system-health.json';
import { mocks } from '.';

// MSW writes the path of a handler as `*/admin/...` (any origin in front); the slice writes `/admin/...`.
const handled = mocks.handlers.map((handler) => (handler as HttpHandler).info.header.replace(' */', ' /'));

describe('mock coverage of the slice', () => {
  it('has a handler for each of the 30 endpoints', () => {
    const wanted = slice.endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}`);
    expect(wanted).toHaveLength(30);
    expect(wanted.filter((key) => !handled.includes(key))).toEqual([]);
  });

  it('has no handler outside the slice and none twice', () => {
    const wanted = new Set(slice.endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}`));
    expect(handled.filter((key) => !wanted.has(key))).toEqual([]);
    expect(new Set(handled).size).toBe(handled.length);
  });
});
