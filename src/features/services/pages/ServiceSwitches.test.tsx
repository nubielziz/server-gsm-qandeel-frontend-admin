// Tests for the Enabled switch of the Catalog table and the row menu: the switch saves through the API with the demo's toast, a refusal
// shows as the server's words, and the menu opens the dialogs and links the demo had, plus the shop page and shop price dialogs of a
// service that has a shop page. (The Auto switch left the table for the service's panel.)
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getService } from '../api';
import { openServices, pickFromRowMenu, serviceRow } from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

describe('the Enabled switch', () => {
  it('disables a service, says what that means and saves it', async () => {
    const user = userEvent.setup();
    await openServices();
    const row = await serviceRow('EE UK Unlock');
    const toggle = row.getByRole('switch', { name: 'Enable EE UK Unlock' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(toggle);
    expect(await screen.findByText('EE UK Unlock disabled')).toBeInTheDocument();
    expect(screen.getByText('Merchants no longer see it. Open orders continue.')).toBeInTheDocument();
    expect((await getService(9)).status).toBe('disabled');
    await waitFor(async () =>
      expect(
        (await serviceRow('EE UK Unlock')).getByRole('switch', { name: 'Enable EE UK Unlock' }),
      ).toHaveAttribute('aria-checked', 'false'),
    );
  });

  it('enables a disabled service again', async () => {
    const user = userEvent.setup();
    await openServices();
    const row = await serviceRow('Xiaomi Mi Account Clean');
    await user.click(row.getByRole('switch', { name: 'Enable Xiaomi Mi Account Clean' }));
    expect(await screen.findByText('Xiaomi Mi Account Clean enabled')).toBeInTheDocument();
    expect(screen.getByText('Merchants can order it again.')).toBeInTheDocument();
    expect((await getService(14)).status).toBe('active');
  });

  it('shows the server’s refusal and leaves the switch where it was', async () => {
    const user = userEvent.setup();
    await openServices();
    mockServer.use(
      http.patch('*/admin/services/:id', () =>
        problem(409, 'CATALOG_LOCKED', 'Catalog is locked', 'The catalog is locked during the stock count.'),
      ),
    );
    const row = await serviceRow('EE UK Unlock');
    await user.click(row.getByRole('switch', { name: 'Enable EE UK Unlock' }));
    expect(await screen.findByText('Catalog is locked')).toBeInTheDocument();
    expect(screen.getByText(/The catalog is locked during the stock count\./)).toBeInTheDocument();
    expect((await getService(9)).status).toBe('active');
    expect(
      (await serviceRow('EE UK Unlock')).getByRole('switch', { name: 'Enable EE UK Unlock' }),
    ).toHaveAttribute('aria-checked', 'true');
  });
});

describe('the row menu', () => {
  it('lists the actions of a service that has a shop page', async () => {
    const user = userEvent.setup();
    await openServices();
    await user.click(await screen.findByRole('button', { name: 'Actions for EE UK Unlock' }));
    const menu = within(await screen.findByRole('menu', { name: 'Actions for EE UK Unlock' }));
    expect(menu.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Edit price…',
      'Edit service…',
      'Group prices…',
      'Fields…',
      'Options…',
      'Edit shop page…',
      'Shop price…',
      'Trace a merchant price',
      'See orders',
      'Delete…',
    ]);
  });

  it('leaves the shop items out for a service without a shop page', async () => {
    const user = userEvent.setup();
    await openServices('/catalog?q=Z3X');
    await user.click(await screen.findByRole('button', { name: 'Actions for Z3X Credits x10' }));
    const menu = within(await screen.findByRole('menu', { name: 'Actions for Z3X Credits x10' }));
    const items = menu.getAllByRole('menuitem').map((item) => item.textContent);
    expect(items).not.toContain('Edit shop page…');
    expect(items).not.toContain('Shop price…');
  });

  it('opens the shop page editor and the shop price dialog on the service’s listing', async () => {
    const user = userEvent.setup();
    await openServices();
    await pickFromRowMenu(user, 'EE UK Unlock', 'Edit shop page…');
    const editor = await screen.findByRole('dialog', { name: 'Edit listing' });
    expect(await within(editor).findByDisplayValue('EE UK Unlock')).toBeInTheDocument();
    await user.click(within(editor).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit listing' })).not.toBeInTheDocument(),
    );

    await pickFromRowMenu(user, 'EE UK Unlock', 'Shop price…');
    expect(await screen.findByRole('dialog', { name: 'Storefront price' })).toBeInTheDocument();
  });

  it('locks the shop items with the permission they need', async () => {
    const user = userEvent.setup();
    await openServices('/catalog', {
      permissions: ['catalog:read', 'storefront:read', 'storefront:update'],
    });
    await user.click(await screen.findByRole('button', { name: 'Actions for EE UK Unlock' }));
    const menu = within(await screen.findByRole('menu', { name: 'Actions for EE UK Unlock' }));
    expect(menu.getByRole('menuitem', { name: 'Edit shop page…' })).toBeEnabled();
    // A locked shop item names the missing permission (read after its label).
    const price = menu.getByRole('menuitem', { name: /^Shop price…/ });
    expect(price).toBeDisabled();
    expect(price).toHaveAttribute('title', 'You need the pricing:update permission');
  });

  it('opens the price resolver on that service', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    await pickFromRowMenu(user, 'EE UK Unlock', 'Trace a merchant price');
    expect(app.location()).toContain('tab=resolver');
    expect(app.location()).toContain('service=9');
    expect(await screen.findByRole('combobox', { name: 'Service' })).toHaveValue('9');
  });

  it('opens the orders of that service on the Orders page', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    await pickFromRowMenu(user, 'EE UK Unlock', 'See orders');
    await waitFor(() => expect(app.location()).toBe('/orders?tab=all&q=EE+UK+Unlock'));
  });
});
