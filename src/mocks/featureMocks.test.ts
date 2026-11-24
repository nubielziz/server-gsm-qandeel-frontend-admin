// Tests for the list of feature mocks that are no longer registered, and for what the mock layer registers: the accounts routes answer, the
// retired customer routes answer 410, and the old merchants and customers handlers are gone.
import { describe, expect, it } from 'vitest';
import { handlers } from './handlers';
import { isRetiredFeatureMock, RETIRED_FEATURE_MOCKS } from './featureMocks';

describe('isRetiredFeatureMock', () => {
  it('names the merchants and customers mocks, and no other feature', () => {
    expect(RETIRED_FEATURE_MOCKS).toEqual(['merchants', 'customers']);
    expect(isRetiredFeatureMock('../../features/merchants/mocks/index.ts')).toBe(true);
    expect(isRetiredFeatureMock('../../features/customers/mocks/index.ts')).toBe(true);
    expect(isRetiredFeatureMock('../../features/accounts/mocks/index.ts')).toBe(false);
    expect(isRetiredFeatureMock('../../features/finance/mocks/index.ts')).toBe(false);
    // A feature that merely has the word in its name is not retired.
    expect(isRetiredFeatureMock('../../features/customers-extra/mocks/index.ts')).toBe(false);
  });
});

describe('the registered handlers', () => {
  const paths = handlers
    .map((handler) => (handler.info as { path?: unknown }).path)
    .filter((path) => typeof path === 'string');

  it('serve the one accounts table and the retired customer routes', () => {
    expect(paths).toContain('*/admin/clients');
    expect(paths).toContain('*/admin/clients/counts');
    expect(paths).toContain('*/admin/clients/:id/rank');
    expect(paths).toContain('*/admin/legacy-accounts/:type/:id');
    expect(paths).toContain('*/admin/customers/*');
  });

  it('no longer serve the old customer routes with their own answers', () => {
    expect(paths).not.toContain('*/admin/customers/:id');
    expect(paths).not.toContain('*/admin/customers/:id/wallet');
    expect(paths).not.toContain('*/admin/customers/:id/suspend');
  });

  it('serve each route once: a second handler would hide the first', () => {
    const clients = handlers
      .filter((handler) => (handler.info as { path?: unknown }).path === '*/admin/clients')
      .map((handler) => (handler.info as { method?: unknown }).method);
    expect(clients.sort()).toEqual(['GET', 'POST']);
  });
});
