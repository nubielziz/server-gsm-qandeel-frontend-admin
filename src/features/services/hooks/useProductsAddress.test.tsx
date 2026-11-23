// Tests for the address hook of the Product / Services page: the kind and the view it reads, the fallback for an unknown or forbidden view
// (the address is replaced), and the states while the permissions load or when the role may use no view.
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PRODUCTS_VIEW_SPECS, usableViews } from '../lib/productsViews';
import { grantsOf } from '../test/grants';
import { useProductsAddress } from './useProductsAddress';

const usableFor = (...permissions: string[]) => usableViews(grantsOf(...permissions), PRODUCTS_VIEW_SPECS);

// Mounts the hook at an address; `where()` reads the address the router is at now.
function mount(route: string, usable: ReturnType<typeof usableFor> | undefined) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  );
  const view = renderHook(
    () => {
      const { pathname, search } = useLocation();
      return { address: useProductsAddress(usable), where: `${pathname}${search}` };
    },
    { wrapper },
  );
  return { ...view, where: () => view.result.current.where };
}

describe('useProductsAddress', () => {
  it('reads the kind and the view the address names', () => {
    const { result } = mount('/products?view=groups&type=server', usableFor('*'));
    expect(result.current.address.type).toBe('server');
    expect(result.current.address.view).toBe('groups');
  });

  it('opens the first view and the IMEI kind for the bare address, and leaves the address alone', () => {
    const { result, where } = mount('/products', usableFor('*'));
    expect(result.current.address.type).toBe('imei');
    expect(result.current.address.view).toBe('all');
    expect(where()).toBe('/products');
  });

  it('reads an unknown kind as IMEI and leaves the address alone', () => {
    const { result, where } = mount('/products?view=all&type=banana', usableFor('*'));
    expect(result.current.address.type).toBe('imei');
    expect(where()).toBe('/products?view=all&type=banana');
  });

  it('is undefined while the permissions are not known, and does not move the address', () => {
    const { result, where } = mount('/products?view=pricing', undefined);
    expect(result.current.address.view).toBeUndefined();
    expect(where()).toBe('/products?view=pricing');
  });

  it('replaces an unknown view with the first one the role may use', async () => {
    const { result, where } = mount('/products?view=nothing&q=x', usableFor('catalog:read'));
    await waitFor(() => expect(where()).toBe('/products?view=all'));
    expect(result.current.address.view).toBe('all');
  });

  it('replaces a view the role may not use, and keeps a kind the address named', async () => {
    const { result, where } = mount('/products?view=pricing&type=server', usableFor('catalog:read'));
    await waitFor(() => expect(where()).toBe('/products?view=all&type=server'));
    expect(result.current.address.view).toBe('all');
    expect(result.current.address.type).toBe('server');
  });

  it('lands a role that holds only one of the extra views on it', async () => {
    const { result, where } = mount('/products?view=all', usableFor('inventory:read'));
    await waitFor(() => expect(where()).toBe('/products?view=inventory'));
    expect(result.current.address.view).toBe('inventory');
  });

  it('is null when the role may use no view', () => {
    const { result } = mount('/products', usableFor('orders:read'));
    expect(result.current.address.view).toBeNull();
  });

  it('does not use a view with no link as the fallback', () => {
    const edit = PRODUCTS_VIEW_SPECS.filter((spec) => spec.group === 'hidden');
    const { result } = mount('/products', edit);
    expect(result.current.address.view).toBeNull();
  });
});
