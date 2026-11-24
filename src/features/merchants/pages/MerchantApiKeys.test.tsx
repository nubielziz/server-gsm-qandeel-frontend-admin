// Tests for creating a key and changing its limits on the API access tab (feature 20), run through the whole app against the dev mock
// API: the New key… button and when it is off, the form and its checks (no scope list: a key is a Dhru credential), the key shown
// once, the server's refusals in the dialog and under their inputs, the "Made by support" chip and the Limit column, the Limits…
// dialog, and a backend that still sends the retired scopes of a key.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { installMerchantMocks } from '../test/installMerchantMocks';
import { openMerchant, rowOf } from '../test/openMerchants';

setupMockApi();
installMerchantMocks();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 30_000 });

const ZAIN = /Zain Mobile Hub/;
type User = ReturnType<typeof userEvent.setup>;

const openApi = (permissions?: string[], id = 1, name: string | RegExp = ZAIN) =>
  openMerchant(id, name, '?tab=api', permissions ? { permissions } : {});

async function openCreate(user: User) {
  await user.click(await screen.findByRole('button', { name: 'New key…' }));
  return screen.findByRole('dialog', { name: 'New API key for Zain Mobile Hub' });
}

describe('New key…', () => {
  it('is on for an active merchant who may create keys', async () => {
    await openApi();
    expect(await screen.findByRole('button', { name: 'New key…' })).toBeEnabled();
  });

  it('is on for a merchant staff invited, who is active at once', async () => {
    await openApi(undefined, 18, /Algiers Service Plus/);
    expect(await screen.findByRole('button', { name: 'New key…' })).toBeEnabled();
  });

  it('is off for an account that is still pending, with the reason as its title', async () => {
    await openApi(undefined, 20, /Accra Devices/);
    expect(await screen.findByRole('button', { name: 'New key…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'New key…' })).toHaveAttribute(
      'title',
      'Activate the account first: only an active merchant can have keys.',
    );
  });

  it('is off for a suspended merchant', async () => {
    await openApi(undefined, 19, /Tunis Fix Point/);
    expect(await screen.findByRole('button', { name: 'New key…' })).toHaveAttribute(
      'title',
      'Reactivate the account first: only an active merchant can have keys.',
    );
  });

  it('is off for a role without api_keys:create, naming the permission', async () => {
    await openApi(['clients:read', 'api_keys:read']);
    const button = await screen.findByRole('button', { name: 'New key…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the api_keys:create permission');
  });
});

describe('creating a key', () => {
  it('checks the form first: a name, and offers no scope to pick', async () => {
    const user = userEvent.setup();
    await openApi();
    const dialog = await openCreate(user);
    expect(within(dialog).getByLabelText('Calls per minute')).toHaveValue('60');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Name the key.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Scopes')).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Name'), 'Server');
    await user.clear(within(dialog).getByLabelText('Calls per minute'));
    await user.type(within(dialog).getByLabelText('Calls per minute'), '9000');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Use a whole number from 1 to 6000.')).toBeInTheDocument();
  });

  it('sends the form as typed and shows the key once, then it is gone', async () => {
    const user = userEvent.setup();
    let body: unknown;
    mockServer.use(
      http.post(
        '*/admin/clients/:id/api-keys',
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json(
            {
              key: {
                id: 99,
                clientId: 1,
                name: 'Production server',
                prefix: 'gsm_Qx4f',
                allowedIps: ['203.0.113.55', '198.51.100.0/24'],
                rateLimitPerMin: 120,
                lastUsedAt: null,
                lastUsedIp: '',
                expiresAt: null,
                revokedAt: null,
                createdAt: new Date().toISOString(),
                createdByStaff: true,
              },
              secret: 'gsm_Qx4fD0nQ2hX8mV3vT9cKzY6bJ1aW5eRuLs7NpG4HtM0',
            },
            { status: 201 },
          );
        },
        { once: true },
      ),
    );
    await openApi();
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Name'), '  Production server ');
    await user.type(within(dialog).getByLabelText('Allowed IP addresses'), '203.0.113.55\n198.51.100.0/24');
    await user.clear(within(dialog).getByLabelText('Calls per minute'));
    await user.type(within(dialog).getByLabelText('Calls per minute'), '120');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));

    const reveal = await screen.findByRole('dialog', { name: 'API key Production server' });
    // The one scope of a Dhru key goes out with the form, for a backend that still asks for a scope list.
    expect(body).toEqual({
      name: 'Production server',
      scopes: ['dhru'],
      allowedIps: ['203.0.113.55', '198.51.100.0/24'],
      rateLimitPerMin: 120,
    });
    expect(within(reveal).getByText('gsm_Qx4fD0nQ2hX8mV3vT9cKzY6bJ1aW5eRuLs7NpG4HtM0')).toBeInTheDocument();
    expect(
      within(reveal).getByText(
        'This key acts as the merchant. Send it over a private channel. It cannot be shown again.',
      ),
    ).toBeInTheDocument();
    expect(within(reveal).getByRole('button', { name: 'Copy API key' })).toBeInTheDocument();
    expect(await screen.findByText('API key created')).toBeInTheDocument();
    await user.click(within(reveal).getByRole('button', { name: 'Done' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'API key Production server' })).not.toBeInTheDocument(),
    );
    expect(screen.queryByText(/gsm_Qx4fD0nQ/)).not.toBeInTheDocument();
  });

  it('adds the new key to the table with a Made by support chip and its limit', async () => {
    const user = userEvent.setup();
    await openApi();
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Name'), 'Support key');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    const reveal = await screen.findByRole('dialog', { name: 'API key Support key' });
    expect(within(reveal).getByText(/^gsm_[A-Za-z0-9]{44}$/)).toBeInTheDocument();
    await user.click(within(reveal).getByRole('button', { name: 'Done' }));
    const row = await rowOf('API keys', 'Support key');
    expect(row.getByText('Made by support')).toBeInTheDocument();
    expect(row.getByText('60/min')).toBeInTheDocument();
    expect(row.getByText('Any IP')).toBeInTheDocument();
    expect(row.getByText('Never')).toBeInTheDocument();
    // The merchant's own keys carry no chip.
    expect((await rowOf('API keys', 'Production')).queryByText('Made by support')).not.toBeInTheDocument();
  });

  it('shows a 409 NOT_ACTIVE in the dialog and keeps it open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/api-keys', () =>
        problem(409, 'NOT_ACTIVE', 'Not active', 'This merchant is not active.'),
      ),
    );
    await openApi();
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Name'), 'Server');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('This merchant is not active.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'New API key for Zain Mobile Hub' })).toBeInTheDocument();
  });

  it('puts allowedIps.N errors under their input, and other fields under theirs', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/api-keys', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'allowedIps.1', message: 'Enter an IP address or range.' },
          { field: 'name', message: 'This merchant already has 10 live keys.' },
        ]),
      ),
    );
    await openApi();
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Name'), 'Server');
    await user.type(within(dialog).getByLabelText('Allowed IP addresses'), '203.0.113.55\nnot-an-ip');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Line 2: Enter an IP address or range.')).toBeInTheDocument();
    expect(within(dialog).getByText('This merchant already has 10 live keys.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Allowed IP addresses')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('is refused by the mock for a bad address, with the line number', async () => {
    const user = userEvent.setup();
    await openApi();
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Name'), 'Server');
    await user.type(within(dialog).getByLabelText('Allowed IP addresses'), 'nope');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Line 1: Enter an IP address or range.')).toBeInTheDocument();
  });
});

describe('Limits…', () => {
  async function openLimits(user: User, name = 'Production') {
    await user.click(await screen.findByRole('button', { name: `Change limits of ${name}` }));
    return screen.findByRole('dialog', { name: `Limits of ${name}` });
  }

  it('shows the limit column and starts with the key’s own limit and addresses', async () => {
    const user = userEvent.setup();
    await openApi();
    expect((await rowOf('API keys', 'Production')).getByText('120/min')).toBeInTheDocument();
    const dialog = await openLimits(user);
    expect(within(dialog).getByLabelText('Calls per minute')).toHaveValue('120');
    expect(within(dialog).getByLabelText('Allowed IP addresses')).toHaveValue('203.0.113.55');
  });

  it('saves the new limit and the row updates; only the changed value is sent', async () => {
    const user = userEvent.setup();
    await openApi();
    const dialog = await openLimits(user);
    await user.clear(within(dialog).getByLabelText('Calls per minute'));
    await user.type(within(dialog).getByLabelText('Calls per minute'), '300');
    await user.click(within(dialog).getByRole('button', { name: 'Save limits' }));
    expect(await screen.findByText('Limits saved')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await rowOf('API keys', 'Production')).getByText('300/min')).toBeInTheDocument(),
    );
    expect(
      (await rowOf('API keys', 'Production')).getByText('203.0.113.55', { selector: '.chip' }),
    ).toBeInTheDocument();
  });

  it('sends only the address list when only it changed, and an empty box removes the restriction', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    mockServer.use(
      http.patch('*/admin/api-keys/:id', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({});
      }),
    );
    await openApi();
    const dialog = await openLimits(user);
    await user.clear(within(dialog).getByLabelText('Allowed IP addresses'));
    await user.click(within(dialog).getByRole('button', { name: 'Save limits' }));
    expect(await screen.findByText('Limits saved')).toBeInTheDocument();
    expect(bodies).toEqual([{ allowedIps: [] }]);
  });

  it('says nothing changed when nothing did, without calling the server', async () => {
    const user = userEvent.setup();
    let called = false;
    mockServer.use(
      http.patch('*/admin/api-keys/:id', () => {
        called = true;
        return HttpResponse.json({});
      }),
    );
    await openApi();
    const dialog = await openLimits(user);
    await user.click(within(dialog).getByRole('button', { name: 'Save limits' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it('checks the limit before sending, and shows the server’s refusals in the dialog', async () => {
    const user = userEvent.setup();
    await openApi();
    const dialog = await openLimits(user);
    await user.clear(within(dialog).getByLabelText('Calls per minute'));
    await user.type(within(dialog).getByLabelText('Calls per minute'), '0');
    await user.click(within(dialog).getByRole('button', { name: 'Save limits' }));
    expect(await within(dialog).findByText('Use a whole number from 1 to 6000.')).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Calls per minute'));
    await user.type(within(dialog).getByLabelText('Calls per minute'), '200');
    await user.clear(within(dialog).getByLabelText('Allowed IP addresses'));
    await user.type(within(dialog).getByLabelText('Allowed IP addresses'), 'bad-address');
    await user.click(within(dialog).getByRole('button', { name: 'Save limits' }));
    expect(await within(dialog).findByText('Line 1: Enter an IP address or range.')).toBeInTheDocument();

    mockServer.use(
      http.patch('*/admin/api-keys/:id', () =>
        problem(409, 'ALREADY_REVOKED', 'Already revoked', 'This key was already revoked.'),
      ),
    );
    await user.clear(within(dialog).getByLabelText('Allowed IP addresses'));
    await user.type(within(dialog).getByLabelText('Allowed IP addresses'), '203.0.113.9');
    await user.click(within(dialog).getByRole('button', { name: 'Save limits' }));
    expect(await within(dialog).findByText('This key was already revoked.')).toBeInTheDocument();
  });

  it('is offered on live keys only, and off without api_keys:update', async () => {
    await openApi();
    expect(await screen.findByRole('button', { name: 'Change limits of Production' })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Change limits of Legacy integration' }),
    ).not.toBeInTheDocument();
  });

  it('names the missing permission for a role without api_keys:update', async () => {
    await openApi(['clients:read', 'api_keys:read']);
    const button = await screen.findByRole('button', { name: 'Change limits of Production' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the api_keys:update permission');
  });
});

describe('a backend that still sends the retired scopes of a key', () => {
  it('lists the key without showing its scopes, with its limit, addresses and status as before', async () => {
    mockServer.use(
      http.get('*/admin/clients/:id/api-keys', () =>
        HttpResponse.json([
          {
            id: 77,
            clientId: 1,
            name: 'Older integration',
            prefix: 'gsm_Ab12',
            scopes: ['orders:read', 'orders:write', 'account:read', 'services:read'],
            allowedIps: ['203.0.113.77'],
            rateLimitPerMin: 90,
            lastUsedAt: null,
            lastUsedIp: '',
            expiresAt: null,
            revokedAt: null,
            createdAt: new Date().toISOString(),
            createdByStaff: false,
          },
        ]),
      ),
    );
    await openApi();
    const row = await rowOf('API keys', 'Older integration');
    expect(row.getByText('90/min')).toBeInTheDocument();
    expect(row.getByText('203.0.113.77', { selector: '.chip' })).toBeInTheDocument();
    expect(row.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText(/orders:read|orders:write|account:read|services:read/)).not.toBeInTheDocument();
  });
});
