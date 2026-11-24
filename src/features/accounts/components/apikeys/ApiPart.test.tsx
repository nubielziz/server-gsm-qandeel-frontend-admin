// Tests for the API part of an account's record, run through the whole app against the dev mock API: the Dhru address and username, the keys
// with their state, Revoke…, the footer pager, the states (empty, a failed read), what each missing permission turns off, and "New key…":
// offered to the Owner for an active account only.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { installAccountMocks } from '../../test/installAccountMocks';
import { openApi, rowOf } from './test-utils';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const key = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  clientId: 1,
  name: `Key ${id}`,
  prefix: `gsm_k${String(id).padStart(3, '0')}`,
  allowedIps: [],
  rateLimitPerMin: 60,
  lastUsedAt: null,
  lastUsedIp: '',
  expiresAt: null,
  revokedAt: null,
  createdAt: new Date().toISOString(),
  createdByStaff: false,
  ...extra,
});

describe('the Dhru address and the keys', () => {
  it('shows the address with a copy button, the username, and the keys with their state', async () => {
    await openApi();
    const address = within(await screen.findByRole('group', { name: 'Dhru address' }));
    expect(address.getByText('http://api.test/api/index.php')).toBeInTheDocument();
    expect(address.getByRole('button', { name: 'Copy the address' })).toBeInTheDocument();
    expect(
      address.getByText('Merchants keep their own client program; only the address and the key change.'),
    ).toBeInTheDocument();
    const username = within(screen.getByRole('group', { name: 'Username' }));
    expect(username.getByText('zain-mobile-hub')).toBeInTheDocument();
    expect(username.getByRole('button', { name: 'Copy the username' })).toBeInTheDocument();

    const production = await rowOf('API keys', 'Production');
    expect(production.getByText('gsm_live_69xx…')).toBeInTheDocument();
    expect(production.getByText('120 a minute')).toBeInTheDocument();
    // The address list, not the address the key was last used from (the same one here).
    expect(production.getByText('203.0.113.55', { selector: '.text-xs' })).toBeInTheDocument();
    expect(production.getByText('Active')).toBeInTheDocument();
    const staging = await rowOf('API keys', 'Staging');
    expect(staging.getByText('Any')).toBeInTheDocument();
    expect(staging.getByText('Never')).toBeInTheDocument();
    const legacy = await rowOf('API keys', 'Legacy integration');
    expect(legacy.getByText('Revoked')).toBeInTheDocument();
    expect(legacy.queryByRole('button')).not.toBeInTheDocument();
    // The demo's "Rotate key" has no admin route, so there is no such button.
    expect(screen.queryByRole('button', { name: /Rotate/ })).not.toBeInTheDocument();
  });

  it('draws the state as a square and a word, and keeps Limits… and Revoke… for the keys that still work', async () => {
    await openApi();
    const production = await rowOf('API keys', 'Production');
    expect(production.getByRole('img', { name: 'Active' })).toBeInTheDocument();
    expect(production.getByRole('button', { name: 'Change limits of Production' })).toHaveTextContent(
      'Limits…',
    );
    expect(production.getByRole('button', { name: 'Revoke Production' })).toHaveTextContent('Revoke…');
    const legacy = await rowOf('API keys', 'Legacy integration');
    expect(legacy.getByRole('img', { name: 'Revoked' })).toBeInTheDocument();
  });

  it('lists the keys as the server sends them, newest first, under the footer pager', async () => {
    await openApi();
    const table = within(await screen.findByRole('table', { name: 'API keys' }));
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(4));
    const names = table
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.textContent ?? '');
    expect(names[0]).toContain('Legacy integration');
    expect(names[1]).toContain('Staging');
    expect(names[2]).toContain('Production');
    expect(screen.getByText('Results: 1 - 3 of 3')).toBeInTheDocument();
  });

  it('pages the keys in the browser, 50 to a page', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/clients/:id/api-keys', () =>
        HttpResponse.json(Array.from({ length: 60 }, (_, index) => key(60 - index))),
      ),
    );
    await openApi();
    const table = within(await screen.findByRole('table', { name: 'API keys' }));
    expect(screen.getByText('Results: 1 - 50 of 60')).toBeInTheDocument();
    expect(table.getAllByRole('row')).toHaveLength(51);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('Results: 51 - 60 of 60')).toBeInTheDocument();
    expect(table.getAllByRole('row')).toHaveLength(11);
  });

  it('says an account that has made no key yet has none, and where its keys come from', async () => {
    await openApi({}, 20, /Accra Devices/);
    expect(await screen.findByText('No API keys yet')).toBeInTheDocument();
    expect(
      screen.getByText('The merchant creates keys in their portal; they show here.'),
    ).toBeInTheDocument();
  });

  it('shows an error with Retry when the keys cannot be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/clients/:id/api-keys', () => HttpResponse.json({ title: 'Broken' }, { status: 400 })),
    );
    await openApi();
    expect(await screen.findByText('Could not load the API keys')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Could not load the API keys')).toBeInTheDocument();
  });
});

describe('a backend that still sends the retired scopes of a key', () => {
  it('lists the key without showing its scopes, with its limit, addresses and state as before', async () => {
    mockServer.use(
      http.get('*/admin/clients/:id/api-keys', () =>
        HttpResponse.json([
          {
            ...key(77, { name: 'Older integration', prefix: 'gsm_Ab12', allowedIps: ['203.0.113.77'] }),
            rateLimitPerMin: 90,
            scopes: ['orders:read', 'orders:write', 'account:read', 'services:read'],
          },
        ]),
      ),
    );
    await openApi();
    const row = await rowOf('API keys', 'Older integration');
    expect(row.getByText('90 a minute')).toBeInTheDocument();
    expect(row.getByText('203.0.113.77')).toBeInTheDocument();
    expect(row.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText(/orders:read|orders:write|account:read|services:read/)).not.toBeInTheDocument();
  });
});

describe('Revoke…', () => {
  it('asks first, says what stops working, and shows the key as revoked afterwards', async () => {
    const user = userEvent.setup();
    await openApi();
    await user.click(await screen.findByRole('button', { name: 'Revoke Production' }));
    const dialog = await screen.findByRole('dialog', { name: 'Revoke API key' });
    expect(within(dialog).getByText(/stops working at once/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Programs using it stop\./)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Revoke key' }));
    expect(await screen.findByText('API key revoked')).toBeInTheDocument();
    expect(screen.getByText('Production (gsm_live_69xx…) no longer works.')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await rowOf('API keys', 'Production')).getByText('Revoked')).toBeInTheDocument(),
    );
    expect((await rowOf('API keys', 'Production')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the server’s refusal in the dialog and keeps the key', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.delete('*/admin/api-keys/:id', () =>
        problem(409, 'KEY_IN_USE', 'Key in use', 'The key is in use by 3 open orders.'),
      ),
    );
    await openApi();
    await user.click(await screen.findByRole('button', { name: 'Revoke Staging' }));
    const dialog = await screen.findByRole('dialog', { name: 'Revoke API key' });
    await user.click(within(dialog).getByRole('button', { name: 'Revoke key' }));
    expect(await within(dialog).findByText('The key is in use by 3 open orders.')).toBeInTheDocument();
    expect((await rowOf('API keys', 'Staging')).getByText('Active')).toBeInTheDocument();
  });

  it('is off for a role without api_keys:revoke, naming the permission', async () => {
    await openApi({ permissions: ['clients:read', 'api_keys:read'] });
    const revoke = await screen.findByRole('button', { name: 'Revoke Production' });
    expect(revoke).toBeDisabled();
    expect(revoke).toHaveAttribute('title', 'You need the api_keys:revoke permission');
  });
});

describe('New key…', () => {
  const button = () => screen.findByRole('button', { name: 'New key…' });

  it('is on for the Owner and an active account', async () => {
    await openApi();
    expect(await button()).toBeEnabled();
  });

  it('is on for a merchant staff invited, who is active at once', async () => {
    await openApi({}, 18, /Algiers Service Plus/);
    expect(await button()).toBeEnabled();
  });

  it('is off for a suspended account, with the reason as its title', async () => {
    await openApi({}, 19, /Tunis Fix Point/);
    expect(await button()).toBeDisabled();
    expect(await button()).toHaveAttribute(
      'title',
      'Reactivate the account first: only an active account can have keys',
    );
  });

  it('is off for the account that was a pending merchant and is suspended now', async () => {
    await openApi({}, 20, /Accra Devices/);
    expect(await button()).toHaveAttribute(
      'title',
      'Reactivate the account first: only an active account can have keys',
    );
  });

  it('is off for a role that has every permission but is not the Owner, who makes keys from the console', async () => {
    await openApi({ role: 'manager' });
    const create = await button();
    expect(create).toBeDisabled();
    expect(create).toHaveAttribute('title', 'Only the Owner creates a key from the console');
  });

  it('is off for a role without api_keys:create, naming the permission', async () => {
    await openApi({ permissions: ['clients:read', 'api_keys:read'] });
    const create = await button();
    expect(create).toBeDisabled();
    expect(create).toHaveAttribute('title', 'You need the api_keys:create permission');
  });

  it('opens the form for the Owner, titled with the account', async () => {
    const user = userEvent.setup();
    await openApi();
    await user.click(await button());
    expect(
      await screen.findByRole('dialog', { name: 'New API key for Zain Mobile Hub' }),
    ).toBeInTheDocument();
  });
});

describe('Limits…', () => {
  it('is off for a role without api_keys:update, naming the permission', async () => {
    await openApi({ permissions: ['clients:read', 'api_keys:read'] });
    const limits = await screen.findByRole('button', { name: 'Change limits of Production' });
    expect(limits).toBeDisabled();
    expect(limits).toHaveAttribute('title', 'You need the api_keys:update permission');
  });
});
