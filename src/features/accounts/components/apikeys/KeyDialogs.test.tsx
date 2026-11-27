// Tests for the dialogs of the API part, run through the whole app against the dev mock API: "New API key for …" ("Key with limits…": an optional name,
// the Permissions section in view, the limit folded away, the key shown once and then gone, the server's refusals in the dialog and under their
// boxes) and "Edit key" (name, Permissions, limit; only what changed is sent, "Nothing changed", an emptied address box removes the restriction,
// an emptied day removes the end, a change of reach is refused for anyone but the Owner in the server's words).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { installAccountMocks } from '../../test/installAccountMocks';
import { noonOf, openApi, rowOf } from './test-utils';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

type User = ReturnType<typeof userEvent.setup>;

async function openCreate(user: User) {
  await user.click(await screen.findByRole('button', { name: 'Key with limits…' }));
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

describe('creating a key: the Permissions section (decision 039)', () => {
  it('shows the name (optional), the Permissions section with both boxes, and the limit folded away, closed', async () => {
    const user = userEvent.setup();
    await openApi();
    const dialog = await openCreate(user);
    const within_ = within(dialog);
    expect(within_.getByLabelText('Name')).toBeVisible();
    expect(within_.getByText('Empty: the system names it.')).toBeVisible();
    const permissions = within(within_.getByRole('group', { name: 'Permissions' }));
    expect(permissions.getByLabelText('Allowed IP addresses')).toBeVisible();
    expect(permissions.getByLabelText('Valid until')).toBeVisible();
    expect(permissions.getByText(/Empty: any address may use the key/)).toBeVisible();
    expect(permissions.getByText(/Empty: the key has no end/)).toBeVisible();
    const fold = within_.getByRole('button', { name: 'More options' });
    expect(fold).toHaveAttribute('aria-expanded', 'false');
    expect(within_.getByLabelText('Limit a minute')).not.toBeVisible();
    // The old "Expires on" box under the fold is gone: the day is the permission "Valid until", always in view.
    expect(within_.queryByLabelText('Expires on')).not.toBeInTheDocument();
    await user.click(fold);
    expect(within_.getByLabelText('Limit a minute')).toBeVisible();
    expect(within_.getByLabelText('Limit a minute')).toHaveValue('60');
  });

  it('sends the limit of 60 and no name, no addresses and no end for a form left empty: the server names the key', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    mockServer.use(
      http.post('*/admin/clients/:id/api-keys', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(
          { key: createdKey({ name: 'API key 1' }), secret: 'gsm_x' },
          { status: 201 },
        );
      }),
    );
    await openApi();
    const dialog = await openCreate(user);
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    await screen.findByRole('dialog', { name: 'API key API key 1' });
    expect(bodies).toEqual([{ scopes: ['dhru'], rateLimitPerMin: 60 }]);
  });

  it('sends the name that was typed, trimmed', async () => {
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
    await user.type(within(dialog).getByLabelText('Name'), '  Plain ');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    await screen.findByRole('dialog', { name: 'API key Plain' });
    expect(bodies).toEqual([{ name: 'Plain', scopes: ['dhru'], rateLimitPerMin: 60 }]);
  });

  it('opens the fold and keeps it open while the limit inside it holds a message', async () => {
    const user = userEvent.setup();
    await openApi();
    const dialog = await openCreate(user);
    await user.click(within(dialog).getByRole('button', { name: 'More options' }));
    await user.clear(within(dialog).getByLabelText('Limit a minute'));
    await user.type(within(dialog).getByLabelText('Limit a minute'), '0');
    await user.click(within(dialog).getByRole('button', { name: 'Hide more options' }));
    expect(within(dialog).getByLabelText('Limit a minute')).not.toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Use a whole number from 1 to 6000.')).toBeVisible();
    expect(within(dialog).getByLabelText('Limit a minute')).toBeVisible();
    expect(within(dialog).getByLabelText('Limit a minute')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a message of the server about the folded limit, with the fold open', async () => {
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
  it('checks the form first: a limit in range, and offers no scope to pick', async () => {
    const user = userEvent.setup();
    await openApi();
    const dialog = await openCreate(user);
    await user.click(within(dialog).getByRole('button', { name: 'More options' }));
    expect(within(dialog).getByLabelText('Limit a minute')).toHaveValue('60');
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Scopes')).not.toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText('Limit a minute'));
    await user.type(within(dialog).getByLabelText('Limit a minute'), '9000');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Use a whole number from 1 to 6000.')).toBeInTheDocument();
    // An empty name is no error: the server names the key.
    expect(within(dialog).queryByText('Name the key.')).not.toBeInTheDocument();
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
    await user.click(within(dialog).getByLabelText('Allowed IP addresses'));
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
    await user.type(within(dialog).getByLabelText('Allowed IP addresses'), '203.0.113.55\n198.51.100.0/24');
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

  it('sends the day it is valid until as the end of that day, and refuses a day that has passed', async () => {
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
    await user.type(within(dialog).getByLabelText('Valid until'), '2000-01-01');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Choose a day that is still ahead.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Valid until')).toHaveAttribute('aria-invalid', 'true');
    expect(bodies).toHaveLength(0);
    await user.clear(within(dialog).getByLabelText('Valid until'));
    await user.type(within(dialog).getByLabelText('Valid until'), '2999-01-31');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    await screen.findByRole('dialog', { name: 'API key Dated' });
    expect(bodies).toHaveLength(1);
    expect(bodies[0]?.expiresAt).toBe(new Date('2999-01-31T23:59:59').toISOString());
  });

  it('adds the new key to the table with Made by support, its limit, any address and no end', async () => {
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
    expect(row.getByText('Any address')).toBeInTheDocument();
    expect(row.getByText('No end')).toBeInTheDocument();
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

  it('puts allowedIps.N errors under the box with the line, and other fields under theirs, the day too', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/api-keys', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'allowedIps.1', message: 'Enter an IP address or range.' },
          { field: 'name', message: 'This account already has 10 live keys.' },
          { field: 'expiresAt', message: 'Choose a time in the future.' },
        ]),
      ),
    );
    await openApi();
    const dialog = await openCreate(user);
    await user.type(within(dialog).getByLabelText('Name'), 'Server');
    await user.type(within(dialog).getByLabelText('Allowed IP addresses'), '203.0.113.55\nnot-an-ip');
    await user.click(within(dialog).getByRole('button', { name: 'Create key' }));
    expect(await within(dialog).findByText('Line 2: Enter an IP address or range.')).toBeInTheDocument();
    expect(within(dialog).getByText('This account already has 10 live keys.')).toBeInTheDocument();
    expect(within(dialog).getByText('Choose a time in the future.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Allowed IP addresses')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByLabelText('Valid until')).toHaveAttribute('aria-invalid', 'true');
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

describe('Edit…', () => {
  async function openEdit(user: User, name = 'Production') {
    await user.click(await screen.findByRole('button', { name: `Edit ${name}` }));
    return screen.findByRole('dialog', { name: 'Edit key' });
  }

  /** The list answers with one key that ends on a day, and PATCH calls are recorded and answered with that key. */
  function oneKeyWithEnd(expiresAt: string | null, extra: Record<string, unknown> = {}) {
    const bodies: Record<string, unknown>[] = [];
    const key = createdKey({
      id: 5,
      name: 'Dated key',
      allowedIps: [],
      rateLimitPerMin: 60,
      expiresAt,
      ...extra,
    });
    mockServer.use(
      http.get('*/admin/clients/:id/api-keys', () => HttpResponse.json([key])),
      http.patch('*/admin/api-keys/:id', async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(key);
      }),
    );
    return bodies;
  }

  it('starts with the key’s own name, addresses and day, and its limit under More options', async () => {
    const user = userEvent.setup();
    await openApi();
    expect((await rowOf('API keys', 'Production')).getByText('120 a minute')).toBeInTheDocument();
    const dialog = await openEdit(user);
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Production');
    const permissions = within(within(dialog).getByRole('group', { name: 'Permissions' }));
    expect(permissions.getByLabelText('Allowed IP addresses')).toHaveValue('203.0.113.55');
    expect(permissions.getByLabelText('Valid until')).toHaveValue('');
    expect(within(dialog).getByLabelText('Limit a minute')).not.toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'More options' }));
    expect(within(dialog).getByLabelText('Limit a minute')).toHaveValue('120');
  });

  it('sends only the name when only it changed, and says the key was saved', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    mockServer.use(
      http.patch('*/admin/api-keys/:id', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({});
      }),
    );
    await openApi();
    const dialog = await openEdit(user);
    await user.clear(within(dialog).getByLabelText('Name'));
    await user.type(within(dialog).getByLabelText('Name'), '  Main server ');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('API key saved')).toBeInTheDocument();
    expect(bodies).toEqual([{ name: 'Main server' }]);
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
    const dialog = await openEdit(user);
    await user.click(within(dialog).getByRole('button', { name: 'More options' }));
    await user.clear(within(dialog).getByLabelText('Limit a minute'));
    await user.type(within(dialog).getByLabelText('Limit a minute'), '60');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('API key saved')).toBeInTheDocument();
    expect(bodies).toEqual([{ rateLimitPerMin: 60 }]);
  });

  it('shows the new name and the narrower list in the row after the mock saved them', async () => {
    const user = userEvent.setup();
    await openApi();
    const dialog = await openEdit(user);
    await user.clear(within(dialog).getByLabelText('Name'));
    await user.type(within(dialog).getByLabelText('Name'), 'Main server');
    await user.type(within(dialog).getByLabelText('Valid until'), '2999-01-31');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('API key saved')).toBeInTheDocument();
    const row = await rowOf('API keys', 'Main server');
    await waitFor(() => expect(row.getByText(/^Valid until 3[01] Jan 2999$/)).toBeInTheDocument());
    expect(row.getByText('203.0.113.55', { selector: '.text-xs' })).toBeInTheDocument();
  });

  it('sends only the address list when only it changed, and an empty box removes the restriction (the Owner)', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    mockServer.use(
      http.patch('*/admin/api-keys/:id', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({});
      }),
    );
    await openApi();
    const dialog = await openEdit(user);
    await user.clear(within(dialog).getByLabelText('Allowed IP addresses'));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('API key saved')).toBeInTheDocument();
    expect(bodies).toEqual([{ allowedIps: [] }]);
  });

  it('sends the end of the chosen day as expiresAt, and nothing else', async () => {
    const user = userEvent.setup();
    const bodies = oneKeyWithEnd(null);
    await openApi();
    const dialog = await openEdit(user, 'Dated key');
    await user.type(within(dialog).getByLabelText('Valid until'), '2999-01-31');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('API key saved')).toBeInTheDocument();
    expect(bodies).toHaveLength(1);
    expect(Object.keys(bodies[0])).toEqual(['expiresAt']);
    // The end of the chosen day in the staff member's own zone, whatever that zone is.
    expect(bodies[0].expiresAt).toBe(new Date('2999-01-31T23:59:59').toISOString());
  });

  it('sends expiresAt null when the day is cleared', async () => {
    const user = userEvent.setup();
    const bodies = oneKeyWithEnd(noonOf(2999, 6, 15));
    await openApi();
    const dialog = await openEdit(user, 'Dated key');
    expect(within(dialog).getByLabelText('Valid until')).toHaveValue('2999-06-15');
    await user.clear(within(dialog).getByLabelText('Valid until'));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('API key saved')).toBeInTheDocument();
    expect(bodies).toEqual([{ expiresAt: null }]);
  });

  it('sends nothing when the day is left as it was', async () => {
    const user = userEvent.setup();
    const bodies = oneKeyWithEnd(noonOf(2999, 6, 15));
    await openApi();
    const dialog = await openEdit(user, 'Dated key');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('lets an expired key be renamed with the day that has passed left as it was', async () => {
    const user = userEvent.setup();
    const bodies = oneKeyWithEnd(noonOf(2020, 3, 10));
    await openApi();
    const dialog = await openEdit(user, 'Dated key');
    await user.clear(within(dialog).getByLabelText('Name'));
    await user.type(within(dialog).getByLabelText('Name'), 'Renamed');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('API key saved')).toBeInTheDocument();
    expect(bodies).toEqual([{ name: 'Renamed' }]);
  });

  it('says a day in the past is no good when it was typed in', async () => {
    const user = userEvent.setup();
    const bodies = oneKeyWithEnd(noonOf(2999, 6, 15));
    await openApi();
    const dialog = await openEdit(user, 'Dated key');
    await user.clear(within(dialog).getByLabelText('Valid until'));
    await user.type(within(dialog).getByLabelText('Valid until'), '2000-01-01');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByText('Choose a day that is still ahead.')).toBeInTheDocument();
    expect(bodies).toEqual([]);
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
    const dialog = await openEdit(user);
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it('checks the name and the limit before sending, and shows the server’s refusals under their fields or in the dialog', async () => {
    const user = userEvent.setup();
    await openApi();
    const dialog = await openEdit(user);
    await user.clear(within(dialog).getByLabelText('Name'));
    await user.click(within(dialog).getByRole('button', { name: 'More options' }));
    await user.clear(within(dialog).getByLabelText('Limit a minute'));
    await user.type(within(dialog).getByLabelText('Limit a minute'), '0');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByText('Name the key.')).toBeInTheDocument();
    expect(within(dialog).getByText('Use a whole number from 1 to 6000.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Name'), 'Production');
    await user.clear(within(dialog).getByLabelText('Limit a minute'));
    await user.type(within(dialog).getByLabelText('Limit a minute'), '100');
    await user.clear(within(dialog).getByLabelText('Allowed IP addresses'));
    await user.type(within(dialog).getByLabelText('Allowed IP addresses'), 'bad-address');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByText('Line 1: Enter an IP address or range.')).toBeInTheDocument();

    mockServer.use(
      http.patch('*/admin/api-keys/:id', () =>
        problem(409, 'ALREADY_REVOKED', 'Already revoked', 'This key was already revoked.'),
      ),
    );
    await user.clear(within(dialog).getByLabelText('Allowed IP addresses'));
    await user.type(within(dialog).getByLabelText('Allowed IP addresses'), '203.0.113.9');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByText('This key was already revoked.')).toBeInTheDocument();
  });

  it('puts a refusal of the day under the day', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/api-keys/:id', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'expiresAt', message: 'This merchant already has 10 active keys; revoke one first.' },
        ]),
      ),
    );
    await openApi();
    const dialog = await openEdit(user);
    await user.type(within(dialog).getByLabelText('Valid until'), '2999-01-31');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(
      await within(dialog).findByText('This merchant already has 10 active keys; revoke one first.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Valid until')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the Owner-only refusal in the dialog in the server’s words, and keeps the dialog open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/api-keys/:id', () =>
        problem(
          403,
          'FORBIDDEN',
          'Forbidden',
          'Only an owner can widen an API key: more addresses, a higher limit, or a later or no end date.',
        ),
      ),
    );
    await openApi({ role: 'manager' });
    const dialog = await openEdit(user);
    await user.clear(within(dialog).getByLabelText('Allowed IP addresses'));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(
      await within(dialog).findByText(
        'Only an owner can widen an API key: more addresses, a higher limit, or a later or no end date.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Edit key' })).toBeInTheDocument();
    expect(
      (await rowOf('API keys', 'Production')).getByText('203.0.113.55', { selector: '.text-xs' }),
    ).toBeInTheDocument();
  });

  it('is offered on keys that are not revoked only, and on an expired key (its end may be moved later), beside Revoke…', async () => {
    oneKeyWithEnd(noonOf(2020, 3, 10));
    await openApi();
    expect(await screen.findByRole('button', { name: 'Edit Dated key' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Revoke Dated key' })).toBeEnabled();
  });

  it('is not offered on a revoked key', async () => {
    await openApi();
    expect(await screen.findByRole('button', { name: 'Edit Production' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Edit Legacy integration' })).not.toBeInTheDocument();
  });
});
