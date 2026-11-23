// Tests for the API Connection part as the edit view mounts it: the thin adapter that gives the suppliers feature's part the service and the
// permission to change it. The part's own behaviour is tested in the suppliers feature; this checks the wiring through the real page.
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { openProducts } from '../../../../test/productsPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });

// Service 1 of the mock seed: Rapid IMEI is its primary supplier and Nordic GSM its fallback.
const ROUTE = '/products?view=edit&id=1&part=api';

describe('the API Connection part of the edit view', () => {
  it('shows the chain of the service the address names: the primary connection, then the secondary ones', async () => {
    await openProducts(ROUTE);
    expect(await screen.findByRole('heading', { level: 3, name: 'API Connection' })).toBeInTheDocument();
    const menu = await screen.findByRole('combobox', { name: 'API' });
    expect(menu).toHaveDisplayValue('Rapid IMEI');
    const table = await screen.findByRole('table', { name: 'Secondary API connections' });
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('FallbackNordic GSM');
    const current = within(screen.getByRole('navigation', { name: 'Parts' }))
      .getAllByRole('link')
      .find((link) => link.getAttribute('aria-current') === 'page');
    expect(current).toHaveTextContent('API Connection');
  });

  it('can be changed with catalog:update, and the Save waits for a change', async () => {
    await openProducts(ROUTE);
    const save = await screen.findByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Change' })).toBeEnabled());
  });

  it('shows the chain read only, with the missing permission named, for a role that may only read the catalog', async () => {
    await openProducts(ROUTE, { permissions: ['catalog:read'] });
    const change = await screen.findByRole('button', { name: 'Change' });
    expect(change).toBeDisabled();
    expect(change).toHaveAttribute('title', 'You need the catalog:update permission');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'API' })).toBeDisabled();
    expect(screen.getByText('You need the catalog:update permission')).toBeInTheDocument();
  });
});
