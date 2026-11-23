// Tests for "Put on the shop" in the Catalog selection bar: the ticked services without a shop page go to ONE publish run that opens in the
// Catalog's publish view for a person to confirm, the ticked services whose page is switched off are switched on one by one, and the
// permissions, the services already on the shop and the server's refusals are shown.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateListing } from '@/features/storefront';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { recordRequests } from '../test/requests';
import { openServices, serviceRow } from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

type User = ReturnType<typeof userEvent.setup>;

/** The path and query of an address, apart. */
const partsOf = (location: string | null) => {
  const [path, query = ''] = (location ?? '').split('?');
  return { path, query };
};

// The Credits services are searched for, so the rows are on the first page.
const CREDITS = '/catalog?q=credits';

/** Ticks services by name and answers the selection bar. */
async function tick(user: User, ...names: string[]) {
  for (const name of names) await user.click((await serviceRow(name)).getByRole('checkbox'));
  return within(screen.getByRole('region', { name: 'Selected services' }));
}

describe('Put on the shop', () => {
  it('starts one run of the ticked services that have no shop page and opens it in the publish view', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openServices(CREDITS);
    const bar = await tick(user, 'Z3X Credits x10', 'NCK Dongle Credits x50');
    expect(bar.getByText('2 selected')).toBeInTheDocument();
    await user.click(bar.getByRole('button', { name: 'Put on the shop' }));
    await waitFor(() =>
      expect(partsOf(app.location())).toEqual({ path: '/catalog', query: 'view=publish&run=8' }),
    );
    const created = requests
      .sent()
      .filter((sent) => sent.method === 'POST' && sent.url.pathname === '/admin/publish-runs');
    expect(created).toHaveLength(1);
    // In the table's order (A to Z).
    expect(created[0].body).toEqual({ scope: { kind: 'services', serviceIds: [18, 15] } });
    // Nothing is applied from here: a person confirms the run.
    expect(requests.sent().some((sent) => sent.url.pathname.endsWith('/apply'))).toBe(false);
    // The run is the work: no page is switched on, so no toast says there was nothing to change.
    expect(screen.queryByText('Nothing to change')).not.toBeInTheDocument();
  });

  it('switches a switched-off shop page back on and sends the others to the run', async () => {
    const user = userEvent.setup();
    await signInAs();
    await updateListing(9, { isListed: false });
    const requests = recordRequests();
    const app = await openServices('/catalog?q=unlock');
    const bar = await tick(user, 'EE UK Unlock', 'UnlockTool 1-Day License');
    await user.click(bar.getByRole('button', { name: 'Put on the shop' }));
    await waitFor(() => expect(partsOf(app.location()).query).toBe('view=publish&run=8'));
    const patched = requests
      .sent()
      .filter((sent) => sent.method === 'PATCH' && sent.url.pathname === '/admin/service-listings/9');
    expect(patched.map((sent) => sent.body)).toEqual([{ isListed: true }]);
    const created = requests
      .sent()
      .find((sent) => sent.method === 'POST' && sent.url.pathname === '/admin/publish-runs');
    expect(created?.body).toEqual({ scope: { kind: 'services', serviceIds: [16] } });
    expect(screen.getByText('1 service put back on the shop')).toBeInTheDocument();
  });

  it('shows what the server refused, then opens the run', async () => {
    const user = userEvent.setup();
    await signInAs();
    await updateListing(9, { isListed: false });
    mockServer.use(
      http.patch('*/admin/service-listings/:id', () =>
        problem(409, 'SERVICE_DISABLED', 'Service is off', 'Switch the service on first.'),
      ),
    );
    const app = await openServices('/catalog?q=unlock');
    const bar = await tick(user, 'EE UK Unlock', 'UnlockTool 1-Day License');
    await user.click(bar.getByRole('button', { name: 'Put on the shop' }));
    const summary = within(
      await screen.findByRole('dialog', { name: '0 of 1 service put back on the shop' }),
    );
    expect(summary.getByText('EE UK Unlock')).toBeInTheDocument();
    expect(summary.getByText(/Switch the service on first\./)).toBeInTheDocument();
    expect(partsOf(app.location()).query).toBe('q=unlock');
    // The footer's Close (the header has a Close mark of its own).
    const closers = summary.getAllByRole('button', { name: 'Close' });
    await user.click(closers[closers.length - 1]);
    await waitFor(() => expect(partsOf(app.location()).query).toBe('view=publish&run=8'));
  });

  it('is offered only for services that are not on the shop', async () => {
    const user = userEvent.setup();
    await openServices('/catalog?q=premier');
    const bar = await tick(user, 'AT&T USA Premier Unlock');
    const button = bar.getByRole('button', { name: 'Put on the shop' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Every ticked service is on the shop already');
  });

  it('needs storefront:create for a run, and says so', async () => {
    const user = userEvent.setup();
    await openServices(CREDITS, { permissions: ['catalog:read', 'storefront:read', 'pricing:update'] });
    const bar = await tick(user, 'Z3X Credits x10');
    const button = bar.getByRole('button', { name: 'Put on the shop' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the storefront:create permission');
    expect(bar.getByRole('button', { name: 'Change their prices…' })).toBeEnabled();
  });

  it('shows the server’s refusal of the run as a toast and stays on the table', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          {
            field: 'scope',
            message: 'Nothing to publish: every service of this choice is already on the shop.',
          },
        ]),
      ),
    );
    const app = await openServices(CREDITS);
    const bar = await tick(user, 'Z3X Credits x10', 'NCK Dongle Credits x50');
    await user.click(bar.getByRole('button', { name: 'Put on the shop' }));
    expect(await screen.findByText('Could not prepare the preview')).toBeInTheDocument();
    expect(
      screen.getByText('Nothing to publish: every service of this choice is already on the shop.'),
    ).toBeInTheDocument();
    expect(partsOf(app.location()).query).toBe('q=credits');
  });
});
