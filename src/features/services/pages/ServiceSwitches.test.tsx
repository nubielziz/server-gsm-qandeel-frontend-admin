// Tests for the Enabled and Auto switches of the Services tab and the row menu: each switch saves through the API with the demo's
// toast, a refusal shows as the server's words, and the menu opens the dialogs and links the demo had.
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

describe('the Auto switch', () => {
  it('turns automation off and tells orders now wait for an operator', async () => {
    const user = userEvent.setup();
    await openServices();
    const row = await serviceRow('T-Mobile USA Unlock');
    await user.click(row.getByRole('switch', { name: 'Automation for T-Mobile USA Unlock' }));
    expect(await screen.findByText('Automation off for T-Mobile USA Unlock')).toBeInTheDocument();
    expect(screen.getByText('New orders wait for an operator to dispatch them.')).toBeInTheDocument();
    expect((await getService(6)).executionMode).toBe('manual');
  });

  it('turns automation on for a manual service', async () => {
    const user = userEvent.setup();
    await openServices();
    const row = await serviceRow('MDM Removal, iPhone Premium');
    const toggle = row.getByRole('switch', { name: 'Automation for MDM Removal, iPhone Premium' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await user.click(toggle);
    expect(await screen.findByText('Automation on for MDM Removal, iPhone Premium')).toBeInTheDocument();
    expect(screen.getByText('Orders go to the supplier automatically.')).toBeInTheDocument();
    expect((await getService(11)).executionMode).toBe('auto');
  });
});

describe('the row menu', () => {
  it('lists the actions of a service', async () => {
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
      'Trace a merchant price',
      'See orders',
      'Delete…',
    ]);
  });

  it('opens the price resolver on that service', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    await pickFromRowMenu(user, 'EE UK Unlock', 'Trace a merchant price');
    expect(app.location()).toBe('/services?tab=resolver&service=9');
    expect(await screen.findByRole('combobox', { name: 'Service' })).toHaveValue('9');
  });

  it('opens the orders of that service on the Orders page', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    await pickFromRowMenu(user, 'EE UK Unlock', 'See orders');
    await waitFor(() => expect(app.location()).toBe('/orders?tab=all&q=EE+UK+Unlock'));
  });
});
