// Tests for the other bulk actions of the Catalog selection bar: Set category, Take off the shop and Switch off are one call per ticked
// service, one after the other, with one toast and a summary of what the server refused; the ticks they covered are cleared; each button
// counts only the services it would change and carries its permission; the shop buttons need the shop keys.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { roleStore } from '@/mocks/roles';
import { setupMockApi } from '@/test/renderApp';
import { getService } from '../api';
import { recordRequests } from '../test/requests';
import { openServices, serviceRow } from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

type User = ReturnType<typeof userEvent.setup>;

/** Ticks services by name and answers the selection bar. */
async function tick(user: User, ...names: string[]) {
  for (const name of names) await user.click((await serviceRow(name)).getByRole('checkbox'));
  return within(screen.getByRole('region', { name: 'Selected services' }));
}

const CREDITS = '/catalog?q=credits';

describe('Set category', () => {
  it('moves every ticked service to the category picked, one call each', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openServices(CREDITS);
    const bar = await tick(user, 'Z3X Credits x10', 'NCK Dongle Credits x50');
    await user.click(bar.getByRole('button', { name: 'Set category' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Licenses' }));
    expect(await screen.findByText('2 services moved to Licenses')).toBeInTheDocument();
    const patched = requests.sent().filter((sent) => sent.method === 'PATCH');
    // One after the other, in the table's order (A to Z).
    expect(patched.map((sent) => [sent.url.pathname, sent.body])).toEqual([
      ['/admin/services/18', { categoryId: 7 }],
      ['/admin/services/15', { categoryId: 7 }],
    ]);
    expect((await getService(18)).categoryId).toBe(7);
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Selected services' })).not.toBeInTheDocument(),
    );
  });
});

describe('Switch off', () => {
  it('switches off the ticked active services and lists the ones the server refused', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/services/18', () =>
        problem(409, 'SERVICE_IN_USE', 'Service in use', 'It has open orders being sent.'),
      ),
    );
    await openServices(CREDITS);
    const bar = await tick(user, 'Z3X Credits x10', 'NCK Dongle Credits x50');
    await user.click(bar.getByRole('button', { name: 'Switch off' }));
    const summary = within(await screen.findByRole('dialog', { name: '1 of 2 services switched off' }));
    expect(summary.getByText('NCK Dongle Credits x50')).toBeInTheDocument();
    expect(summary.getByText(/It has open orders being sent\./)).toBeInTheDocument();
    expect(screen.getByText('1 service switched off')).toBeInTheDocument();
    expect((await getService(15)).status).toBe('disabled');
    expect((await getService(18)).status).toBe('active');
  });

  it('is locked when every ticked service is off already, and without catalog:update', async () => {
    const user = userEvent.setup();
    await openServices('/catalog?chip=off');
    let bar = await tick(user, 'Xiaomi Mi Account Clean');
    expect(bar.getByRole('button', { name: 'Switch off' })).toHaveAttribute(
      'title',
      'Every ticked service is switched off already',
    );
    await user.click(bar.getByRole('button', { name: 'Clear' }));

    await user.click(screen.getByRole('tab', { name: /^All/ }));
    bar = await tick(user, 'EE UK Unlock');
    expect(bar.getByRole('button', { name: 'Switch off' })).toBeEnabled();
  });

  it('names the permission it needs', async () => {
    const user = userEvent.setup();
    await openServices(CREDITS, { permissions: ['catalog:read', 'storefront:read'] });
    const bar = await tick(user, 'Z3X Credits x10');
    const off = bar.getByRole('button', { name: 'Switch off' });
    expect(off).toBeDisabled();
    expect(off).toHaveAttribute('title', 'You need the catalog:update permission');
    expect(bar.getByRole('button', { name: /^Set category/ })).toBeDisabled();
  });
});

describe('Take off the shop', () => {
  it('switches off the shop pages of the ticked services that are on the shop', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openServices('/catalog?q=uk');
    const bar = await tick(user, 'EE UK Unlock', 'Vodafone UK iPhone Unlock');
    await user.click(bar.getByRole('button', { name: 'Take off the shop' }));
    expect(await screen.findByText('2 services taken off the shop')).toBeInTheDocument();
    const patched = requests.sent().filter((sent) => sent.method === 'PATCH');
    expect(patched.map((sent) => [sent.url.pathname, sent.body])).toEqual([
      ['/admin/service-listings/9', { isListed: false }],
      ['/admin/service-listings/8', { isListed: false }],
    ]);
    await waitFor(async () =>
      expect((await serviceRow('EE UK Unlock')).getByText('Off the shop')).toBeInTheDocument(),
    );
  });

  it('is locked when none of the ticked services is on the shop', async () => {
    const user = userEvent.setup();
    await openServices(CREDITS);
    const bar = await tick(user, 'Z3X Credits x10');
    expect(bar.getByRole('button', { name: 'Take off the shop' })).toHaveAttribute(
      'title',
      'None of the ticked services is on the shop',
    );
  });
});

describe('a role that may not read the shop', () => {
  it('gets no shop buttons', async () => {
    const user = userEvent.setup();
    const only = ['catalog:read', 'catalog:update', 'pricing:update'];
    roleStore().patch(1, { permissions: only });
    await openServices(CREDITS, { permissions: only });
    const bar = await tick(user, 'Z3X Credits x10');
    expect(bar.queryByRole('button', { name: 'Put on the shop' })).not.toBeInTheDocument();
    expect(bar.queryByRole('button', { name: 'Take off the shop' })).not.toBeInTheDocument();
    expect(bar.getByRole('button', { name: 'Switch off' })).toBeEnabled();
  });
});
