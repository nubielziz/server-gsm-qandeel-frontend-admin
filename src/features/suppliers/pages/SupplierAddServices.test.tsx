// Tests for "Add services from this supplier" on the Services panel: a link to the Add Service view of the Product / Services page with this supplier chosen,
// shown with the permission of Quick add, in the header and in the empty state, before the two older buttons that stay. They run through
// the whole app against the dev mock API.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { suppliersState } from '../mocks';
import { detailOf, openSuppliers } from '../test/suppliersPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });

const LABEL = 'Add services from this supplier';
const NORDIC_GSM = 1;

/** Whether `first` comes before `second` in the page. */
const before = (first: HTMLElement, second: HTMLElement) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('the link', () => {
  it('goes to the Add Service view for this supplier, before Quick add and Import services', async () => {
    await openSuppliers();
    const detail = await detailOf('Nordic GSM');
    const link = await detail.findByRole('link', { name: LABEL });
    expect(link).toHaveAttribute('href', `/products?view=add&supplier=${NORDIC_GSM}`);
    expect(before(link, detail.getByRole('button', { name: 'Quick add…' }))).toBe(true);
    expect(before(link, detail.getByRole('button', { name: 'Import services…' }))).toBe(true);
  });

  it('names the chosen supplier, not the first one', async () => {
    await openSuppliers('/suppliers?supplier=3');
    const detail = await detailOf('Rapid IMEI');
    expect(await detail.findByRole('link', { name: LABEL })).toHaveAttribute(
      'href',
      '/products?view=add&supplier=3',
    );
  });

  it('keeps Quick add… and Import services… as they were', async () => {
    await openSuppliers();
    const detail = await detailOf('Nordic GSM');
    expect(await detail.findByRole('button', { name: 'Quick add…' })).toBeEnabled();
    expect(detail.getByRole('button', { name: 'Import services…' })).toBeEnabled();
  });

  it('opens the Product / Services page on that address', async () => {
    const user = userEvent.setup();
    const app = await openSuppliers();
    const detail = await detailOf('Nordic GSM');
    await user.click(await detail.findByRole('link', { name: LABEL }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Product / Services' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(app.location()).toBe(`/products?view=add&supplier=${NORDIC_GSM}`);
  });

  it('is in the empty state too, next to Quick add… and Import services…', async () => {
    const state = await suppliersState();
    state.links = state.links.filter(
      (link) => state.catalogue.find(link.supplierServiceId)?.supplierId !== NORDIC_GSM,
    );
    await openSuppliers();
    const detail = await detailOf('Nordic GSM');
    expect(await detail.findByText('No services use this supplier')).toBeInTheDocument();
    expect(detail.getAllByRole('link', { name: LABEL })).toHaveLength(1);
    expect(detail.getAllByRole('button', { name: 'Quick add…' })).toHaveLength(1);
    expect(detail.getAllByRole('button', { name: 'Import services…' })).toHaveLength(1);
  });
});

describe('without the permission to create services', () => {
  it('is a locked button with the permission in its title, as Quick add is', async () => {
    await openSuppliers('/suppliers', { permissions: ['suppliers:read'] });
    const detail = await detailOf('Nordic GSM');
    const button = await detail.findByRole('button', { name: LABEL });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the catalog:create permission');
    expect(detail.queryByRole('link', { name: LABEL })).not.toBeInTheDocument();
  });
});
