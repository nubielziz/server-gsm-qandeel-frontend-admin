// Tests for "Publish to the shop…" in the strip above the Services table: the ticked services start a preview on the Storefront page's
// Publish tab (backend feature 31), with the permission it needs and the server's refusal shown as a toast.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { recordRequests } from '../../storefront/test/requests';
import { openServices, serviceRow } from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

type User = ReturnType<typeof userEvent.setup>;

// The Credits services are searched for, so both rows are on the first page.
const CREDITS = '/services?q=credits';

/** Ticks two services of the demo that have no listing yet: Z3X Credits x10 (15) and NCK Dongle Credits x50 (18). */
async function tickTwo(user: User) {
  for (const name of ['Z3X Credits x10', 'NCK Dongle Credits x50']) {
    await user.click((await serviceRow(name)).getByRole('checkbox'));
  }
  return screen.getByRole('region', { name: 'Selected services' });
}

describe('Publish to the shop', () => {
  it('starts a preview of the ticked services and opens it on the Publish tab', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openServices(CREDITS);
    const strip = await tickTwo(user);
    expect(strip).toHaveTextContent('2 selected');
    await user.click(screen.getByRole('button', { name: 'Publish to the shop…' }));
    await waitFor(() => expect(app.location()).toBe('/storefront?tab=publish&run=8'));
    const created = requests
      .sent()
      .find((sent) => sent.method === 'POST' && sent.url.pathname === '/admin/publish-runs')!;
    expect(created.body).toEqual({ scope: { kind: 'services', serviceIds: [15, 18] } });
    expect(await screen.findByText('Preparing the preview of 2 services…')).toBeInTheDocument();
  });

  it('sits beside Change their prices and is shown only while services are ticked', async () => {
    const user = userEvent.setup();
    await openServices(CREDITS);
    await serviceRow('Z3X Credits x10');
    expect(screen.queryByRole('button', { name: 'Publish to the shop…' })).not.toBeInTheDocument();
    await tickTwo(user);
    expect(screen.getByRole('button', { name: 'Change their prices…' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Publish to the shop…' })).toBeEnabled();
  });

  it('needs storefront:create, and says so', async () => {
    const user = userEvent.setup();
    await openServices(CREDITS, { permissions: ['catalog:read', 'pricing:update'] });
    await tickTwo(user);
    const publish = screen.getByRole('button', { name: 'Publish to the shop…' });
    expect(publish).toBeDisabled();
    expect(publish).toHaveAttribute('title', 'You need the storefront:create permission');
  });

  it('says there is nothing to publish when every ticked service is on the shop already, and makes no run', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openServices('/services?q=premier');
    // AT&T USA Premier Unlock has a listing (service 5): the mock answers as the server does, 422 on the scope.
    await user.click((await serviceRow('AT&T USA Premier Unlock')).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Publish to the shop…' }));
    expect(await screen.findByText('Could not prepare the preview')).toBeInTheDocument();
    expect(
      screen.getByText('Nothing to publish: every service of this choice is already on the shop.'),
    ).toBeInTheDocument();
    const created = requests
      .sent()
      .find((sent) => sent.method === 'POST' && sent.url.pathname === '/admin/publish-runs')!;
    expect(created.body).toEqual({ scope: { kind: 'services', serviceIds: [5] } });
    expect(app.location()).toBe('/services?q=premier');
  });

  it('shows the server’s refusal as a toast and stays on the Services page', async () => {
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
    await tickTwo(user);
    await user.click(screen.getByRole('button', { name: 'Publish to the shop…' }));
    expect(await screen.findByText('Could not prepare the preview')).toBeInTheDocument();
    expect(
      screen.getByText('Nothing to publish: every service of this choice is already on the shop.'),
    ).toBeInTheDocument();
    expect(app.location()).toBe(CREDITS);
  });
});
