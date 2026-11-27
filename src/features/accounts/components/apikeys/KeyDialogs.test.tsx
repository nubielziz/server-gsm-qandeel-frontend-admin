// Tests for the dialogs of the API part, run through the whole app against the dev mock API: "New API key for …" (the form and its checks, no
// scope list, the key shown once and then gone, the server's refusals in the dialog and under their boxes) and "Limits of …" (only what
// changed is sent, "Nothing changed", an emptied box removes the restriction).
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

type User = ReturnType<typeof userEvent.setup>;

async function openCreate(user: User) {
  await user.click(await screen.findByRole('button', { name: 'New key…' }));
  return screen.findByRole('dialog', { name: 'New API key for Zain Mobile Hub' });
}

const createdKey = (extra: Record<string, unknown> = {}) => ({
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
  ...extra,
});

describe('creating a key: fewer inputs (decision 035)', () => {
  it('asks for a name and the allowed addresses; the expiry day and the limit are folded away, closed', async () => {
    const user = userEvent.setup();
    await openApi();
    const dialog = await openCreate(user);
    const within_ = within(dialog);
    expect(within_.getByLabelText('Name')).toBeVisible();
    expect(within_.getByLabelText('Allowed addresses')).toBeVisible();
    const fold = within_.getByRole('button', { name: 'More options' });
    expect(fold).toHaveAttribute('aria-expanded', 'false');
    expect(within_.getByLabelText('Expires on')).not.toBeVisible();
    expect(within_.getByLabelText('Limit a minute')).not.toBeVisible();
    await user.click(fold);
    expect(within_.getByLabelText('Expires on')).toBeVisible();
    expect(within_.getByLabelText('Limit a minute')).toBeVisible();
    expect(within_.getByLabelText('Limit a minute')).toHaveValue('60');
  });

  it('sends what it sent before for a form left at its defaults: the 60 a minute limit, no expiry and no addresses', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    mockServer.use(
      http.post('*/admin/clients/:id/api-keys', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ key: createdKey({ name: 'Plain' }), secret: 'gsm_x' }, { status: 201 });
      }),
    );
    await openApi();
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Name'), 'Plain');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    await screen.findByRole('dialog', { name: 'API key Plain' });
    expect(bodies).toEqual([{ name: 'Plain', scopes: ['dhru'], rateLimitPerMin: 60 }]);
  });

  it('opens the fold and keeps it open while a folded input holds a message of the browser', async () => {
    const user = userEvent.setup();
    await openApi();
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Name'), 'Dated');
    await user.click(within(dialog).getByRole('button', { name: 'More options' }));
    await user.type(within(dialog).getByLabelText('Expires on'), '2000-01-01');
    await user.click(within(dialog).getByRole('button', { name: 'Hide more options' }));
    expect(within(dialog).getByLabelText('Expires on')).not.toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Choose a day that is still ahead.')).toBeVisible();
    const fold = within(dialog).getByRole('button', { name: 'Hide more options' });
    await user.click(fold);
    expect(within(dialog).getByLabelText('Expires on')).toBeVisible();
    expect(within(dialog).getByLabelText('Expires on')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a message of the server about a folded input, with the fold open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/api-keys', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'rateLimitPerMin', message: 'The most this account may have is 300 a minute.' },
        ]),
      ),
    );
    await openApi();
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Name'), 'Fast');
    expect(within(dialog).getByRole('button', { name: 'More options' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('The most this account may have is 300 a minute.')).toBeVisible();
    expect(within(dialog).getByLabelText('Limit a minute')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('creating a key', () => {
  it('checks the form first: a name, a limit in range, and offers no scope to pick', async () => {
    const user = userEvent.setup();
    await openApi();
    const dialog = await openCreate(user);
    await user.click(within(dialog).getByRole('button', { name: 'More options' }));
    expect(within(dialog).getByLabelText('Limit a minute')).toHaveValue('60');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Name the key.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Scopes')).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Name'), 'Server');
    await user.clear(within(dialog).getByLabelText('Limit a minute'));
    await user.type(within(dialog).getByLabelText('Limit a minute'), '9000');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Use a whole number from 1 to 6000.')).toBeInTheDocument();
  });

  it('refuses a name over 60 characters and more than twenty addresses before sending', async () => {
    const user = userEvent.setup();
    let called = false;
    mockServer.use(
      http.post('*/admin/clients/:id/api-keys', () => {
        called = true;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    await openApi();
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Name'), 'x'.repeat(61));
    await user.click(within(dialog).getByLabelText('Allowed addresses'));
    await user.paste(Array.from({ length: 21 }, (_, index) => `10.0.0.${index + 1}`).join('\n'));
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Use at most 60 characters.')).toBeInTheDocument();
    expect(within(dialog).getByText('Use at most 20 addresses.')).toBeInTheDocument();
    expect(called).toBe(false);
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
            { key: createdKey(), secret: 'gsm_Qx4fD0nQ2hX8mV3vT9cKzY6bJ1aW5eRuLs7NpG4HtM0' },
            { status: 201 },
          );
        },
        { once: true },
      ),
    );
    await openApi();
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Name'), '  Production server ');
    await user.type(within(dialog).getByLabelText('Allowed addresses'), '203.0.113.55\n198.51.100.0/24');
    await user.click(within(dialog).getByRole('button', { name: 'More options' }));
    await user.clear(within(dialog).getByLabelText('Limit a minute'));
    await user.type(within(dialog).getByLabelText('Limit a minute'), '120');
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
        'This key acts as the account. Send it over a private channel. It cannot be shown again.',
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

  it('sends the expiry day as the end of that day, and refuses a day that has passed', async () => {
    const user = userEvent.setup();
    const bodies: Record<string, unknown>[] = [];
    mockServer.use(
      http.post('*/admin/clients/:id/api-keys', async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ key: createdKey({ name: 'Dated' }), secret: 'gsm_x' }, { status: 201 });
      }),
    );
    await openApi();
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Name'), 'Dated');
    await user.click(within(dialog).getByRole('button', { name: 'More options' }));
    await user.type(within(dialog).getByLabelText('Expires on'), '2000-01-01');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Choose a day that is still ahead.')).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
    await user.clear(within(dialog).getByLabelText('Expires on'));
    await user.type(within(dialog).getByLabelText('Expires on'), '2999-01-31');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    await screen.findByRole('dialog', { name: 'API key Dated' });
    expect(bodies).toHaveLength(1);
    expect(bodies[0]?.expiresAt).toMatch(/^2999-01-3[01]T/);
  });

  it('adds the new key to the table with Made by support under its name and its limit', async () => {
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
    expect(row.getByText('60 a minute')).toBeInTheDocument();
    expect(row.getByText('Any')).toBeInTheDocument();
    expect(row.getByText('Never')).toBeInTheDocument();
    // The account's own keys carry no note.
    expect((await rowOf('API keys', 'Production')).queryByText('Made by support')).not.toBeInTheDocument();
  });

  it('shows a 409 NOT_ACTIVE in the dialog and keeps it open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/api-keys', () =>
        problem(409, 'NOT_ACTIVE', 'Not active', 'This account is not active.'),
      ),
    );
    await openApi();
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Name'), 'Server');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('This account is not active.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'New API key for Zain Mobile Hub' })).toBeInTheDocument();
  });

  it('puts allowedIps.N errors under the box with the line, and other fields under theirs', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/api-keys', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'allowedIps.1', message: 'Enter an IP address or range.' },
          { field: 'name', message: 'This account already has 10 live keys.' },
        ]),
      ),
    );
    await openApi();
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Name'), 'Server');
    await user.type(within(dialog).getByLabelText('Allowed addresses'), '203.0.113.55\nnot-an-ip');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Line 2: Enter an IP address or range.')).toBeInTheDocument();
    expect(within(dialog).getByText('This account already has 10 live keys.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Allowed addresses')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('is refused by the mock for a bad address, with the line number', async () => {
    const user = userEvent.setup();
    await openApi();
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Name'), 'Server');
    await user.type(within(dialog).getByLabelText('Allowed addresses'), 'nope');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Line 1: Enter an IP address or range.')).toBeInTheDocument();
  });
});

describe('Limits…', () => {
  async function openLimits(user: User, name = 'Production') {
    await user.click(await screen.findByRole('button', { name: `Change limits of ${name}` }));
    return screen.findByRole('dialog', { name: `Limits of ${name}` });
  }

  it('starts with the key’s own limit and addresses', async () => {
    const user = userEvent.setup();
    await openApi();
    expect((await rowOf('API keys', 'Production')).getByText('120 a minute')).toBeInTheDocument();
    const dialog = await openLimits(user);
    expect(within(dialog).getByLabelText('Limit a minute')).toHaveValue('120');
    expect(within(dialog).getByLabelText('Allowed addresses')).toHaveValue('203.0.113.55');
  });

  it('sends only the limit when only it changed', async () => {
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
    await user.clear(within(dialog).getByLabelText('Limit a minute'));
    await user.type(within(dialog).getByLabelText('Limit a minute'), '300');
    await user.click(within(dialog).getByRole('button', { name: 'Save limits' }));
    expect(await screen.findByText('Limits saved')).toBeInTheDocument();
    expect(bodies).toEqual([{ rateLimitPerMin: 300 }]);
  });

  it('shows the new limit in the row after the mock saved it', async () => {
    const user = userEvent.setup();
    await openApi();
    const dialog = await openLimits(user);
    await user.clear(within(dialog).getByLabelText('Limit a minute'));
    await user.type(within(dialog).getByLabelText('Limit a minute'), '300');
    await user.click(within(dialog).getByRole('button', { name: 'Save limits' }));
    expect(await screen.findByText('Limits saved')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await rowOf('API keys', 'Production')).getByText('300 a minute')).toBeInTheDocument(),
    );
    expect(
      (await rowOf('API keys', 'Production')).getByText('203.0.113.55', { selector: '.text-xs' }),
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
    await user.clear(within(dialog).getByLabelText('Allowed addresses'));
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
    await user.clear(within(dialog).getByLabelText('Limit a minute'));
    await user.type(within(dialog).getByLabelText('Limit a minute'), '0');
    await user.click(within(dialog).getByRole('button', { name: 'Save limits' }));
    expect(await within(dialog).findByText('Use a whole number from 1 to 6000.')).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Limit a minute'));
    await user.type(within(dialog).getByLabelText('Limit a minute'), '200');
    await user.clear(within(dialog).getByLabelText('Allowed addresses'));
    await user.type(within(dialog).getByLabelText('Allowed addresses'), 'bad-address');
    await user.click(within(dialog).getByRole('button', { name: 'Save limits' }));
    expect(await within(dialog).findByText('Line 1: Enter an IP address or range.')).toBeInTheDocument();

    mockServer.use(
      http.patch('*/admin/api-keys/:id', () =>
        problem(409, 'ALREADY_REVOKED', 'Already revoked', 'This key was already revoked.'),
      ),
    );
    await user.clear(within(dialog).getByLabelText('Allowed addresses'));
    await user.type(within(dialog).getByLabelText('Allowed addresses'), '203.0.113.9');
    await user.click(within(dialog).getByRole('button', { name: 'Save limits' }));
    expect(await within(dialog).findByText('This key was already revoked.')).toBeInTheDocument();
  });

  it('is offered on keys that still work only', async () => {
    await openApi();
    expect(await screen.findByRole('button', { name: 'Change limits of Production' })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Change limits of Legacy integration' }),
    ).not.toBeInTheDocument();
  });
});
