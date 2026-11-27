// Tests for the API part of an account's record, run through the whole app against the dev mock API: the Dhru address and username, the keys
// with their state and permissions (the addresses and the day they are valid until, an expired key marked), Revoke…, the footer pager, the
// states (empty, a failed read), what each missing permission turns off, and "Generate API key" (one click, no name sent) with "Key with limits…":
// offered to the Owner for an active account only.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { installAccountMocks } from '../../test/installAccountMocks';
import type * as KeyHooks from '../../hooks/useAccountApiKeys';
import { noonOf, openApi, rowOf } from './test-utils';

// The one-click mutation as the part holds it, kept so a test can read what it still keeps in memory (its answer holds the full key).
const oneClick = vi.hoisted(() => ({ latest: undefined as { data?: unknown; isIdle: boolean } | undefined }));
vi.mock('../../hooks/useAccountApiKeys', async (importOriginal) => {
  const original = await importOriginal<typeof KeyHooks>();
  return {
    ...original,
    useCreateAccountApiKey(options?: Parameters<typeof original.useCreateAccountApiKey>[0]) {
      const result = original.useCreateAccountApiKey(options);
      // Only the part's own "Generate API key" asks for `toastErrors`; the form of "Key with limits…" is another component.
      if (options?.toastErrors) oneClick.latest = result;
      return result;
    },
  };
});

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
    expect(staging.getByText('Any address')).toBeInTheDocument();
    expect(staging.getByText('No end')).toBeInTheDocument();
    expect(staging.getByText('Never')).toBeInTheDocument();
    const legacy = await rowOf('API keys', 'Legacy integration');
    expect(legacy.getByText('Revoked')).toBeInTheDocument();
    expect(legacy.queryByRole('button')).not.toBeInTheDocument();
    // The demo's "Rotate key" has no admin route, so there is no such button.
    expect(screen.queryByRole('button', { name: /Rotate/ })).not.toBeInTheDocument();
  });

  it('draws the state as a square and a word, and keeps Edit… and Revoke… for the keys that still work', async () => {
    await openApi();
    const production = await rowOf('API keys', 'Production');
    expect(production.getByRole('img', { name: 'Active' })).toBeInTheDocument();
    expect(production.getByRole('button', { name: 'Edit Production' })).toHaveTextContent('Edit…');
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

describe('the permissions of a key, at a glance', () => {
  const answerWith = (keys: Record<string, unknown>[]) =>
    mockServer.use(http.get('*/admin/clients/:id/api-keys', () => HttpResponse.json(keys)));

  it('prints the addresses and the day the key is valid until, or Any address and No end', async () => {
    answerWith([
      key(7, {
        name: 'Fenced',
        allowedIps: ['203.0.113.55', '198.51.100.0/24'],
        expiresAt: noonOf(2999, 1, 15),
      }),
      key(8, { name: 'Open' }),
    ]);
    await openApi();
    const fenced = await rowOf('API keys', 'Fenced');
    expect(fenced.getByText('203.0.113.55')).toBeInTheDocument();
    expect(fenced.getByText('198.51.100.0/24')).toBeInTheDocument();
    expect(fenced.getByText('Valid until 15 Jan 2999')).toBeInTheDocument();
    expect(fenced.queryByText('Any address')).not.toBeInTheDocument();
    expect(fenced.getByText('Active')).toBeInTheDocument();
    const open = await rowOf('API keys', 'Open');
    expect(open.getByText('Any address')).toBeInTheDocument();
    expect(open.getByText('No end')).toBeInTheDocument();
  });

  it('prints the permissions under the name as well, for the narrow screens that hide the Permissions column', async () => {
    answerWith([
      key(7, {
        name: 'Fenced',
        allowedIps: ['203.0.113.55', '198.51.100.0/24'],
        expiresAt: noonOf(2999, 1, 15),
      }),
      key(8, { name: 'Open' }),
      key(9, { name: 'Lapsed', expiresAt: noonOf(2020, 3, 10) }),
    ]);
    await openApi();
    const fenced = await rowOf('API keys', 'Fenced');
    const line = fenced.getByText('203.0.113.55, 198.51.100.0/24 · Valid until 15 Jan 2999');
    // It is the narrow screens' copy: shown under the name and hidden from the width where the Permissions column shows.
    expect(line).toHaveClass('sm:hidden');
    expect(line.previousElementSibling).toHaveTextContent('Fenced');
    expect((await rowOf('API keys', 'Open')).getByText('Any address · No end')).toHaveClass('sm:hidden');
    expect(
      (await rowOf('API keys', 'Lapsed')).getByText('Any address · Valid until 10 Mar 2020 · Expired'),
    ).toHaveClass('sm:hidden');
    // The Permissions column keeps its own cells, which the narrow screens hide.
    expect(fenced.getByText('Valid until 15 Jan 2999').closest('td')).toHaveClass('hidden', 'sm:table-cell');
  });

  it('marks a key whose end has passed: the day, the word Expired beside it and in its state', async () => {
    answerWith([key(9, { name: 'Lapsed', expiresAt: noonOf(2020, 3, 10) })]);
    await openApi();
    const lapsed = await rowOf('API keys', 'Lapsed');
    expect(lapsed.getByText('Valid until 10 Mar 2020 · Expired')).toBeInTheDocument();
    expect(lapsed.getByRole('img', { name: 'Expired' })).toBeInTheDocument();
    // An expired key can be edited (a later end brings it back) and so it can be revoked too: only a revoke keeps an Owner from reviving it.
    expect(lapsed.getByRole('button', { name: 'Edit Lapsed' })).toBeEnabled();
    expect(lapsed.getByRole('button', { name: 'Revoke Lapsed' })).toBeEnabled();
  });

  it('revokes an expired key through the same dialog, which says the key is past its end and cannot come back', async () => {
    const user = userEvent.setup();
    answerWith([key(9, { name: 'Lapsed', expiresAt: noonOf(2020, 3, 10) })]);
    const revoked: string[] = [];
    mockServer.use(
      http.delete('*/admin/api-keys/:id', ({ params }) => {
        revoked.push(String(params.id));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await openApi();
    await user.click(await screen.findByRole('button', { name: 'Revoke Lapsed' }));
    const dialog = await screen.findByRole('dialog', { name: 'Revoke API key' });
    expect(within(dialog).getByText(/has passed its end/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/stops working at once/)).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Revoke key' }));
    expect(await screen.findByText('API key revoked')).toBeInTheDocument();
    expect(revoked).toEqual(['9']);
  });

  it('does not mark a revoked key as expired: its state says Revoked', async () => {
    answerWith([
      key(10, { name: 'Gone', expiresAt: noonOf(2020, 3, 10), revokedAt: '2020-01-01T00:00:00.000Z' }),
    ]);
    await openApi();
    const gone = await rowOf('API keys', 'Gone');
    expect(gone.getByText('Revoked')).toBeInTheDocument();
    expect(gone.getByText('Valid until 10 Mar 2020')).toBeInTheDocument();
    expect(gone.queryByRole('button')).not.toBeInTheDocument();
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

describe('Generate API key and Key with limits…', () => {
  const generate = () => screen.findByRole('button', { name: 'Generate API key' });
  const withLimits = () => screen.findByRole('button', { name: 'Key with limits…' });

  it('are on for the Owner and an active account, the first as the part’s main button', async () => {
    await openApi();
    expect(await generate()).toBeEnabled();
    expect(await withLimits()).toBeEnabled();
    expect(await generate()).toHaveClass('btn-primary');
    expect(await withLimits()).not.toHaveClass('btn-primary');
  });

  it('are on for a merchant staff invited, who is active at once', async () => {
    await openApi({}, 18, /Algiers Service Plus/);
    expect(await generate()).toBeEnabled();
  });

  it('are off for a suspended account, with the reason as their title', async () => {
    await openApi({}, 19, /Tunis Fix Point/);
    for (const button of [await generate(), await withLimits()]) {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute(
        'title',
        'Reactivate the account first: only an active account can have keys',
      );
    }
  });

  it('are off for the account that was a pending merchant and is suspended now', async () => {
    await openApi({}, 20, /Accra Devices/);
    expect(await generate()).toHaveAttribute(
      'title',
      'Reactivate the account first: only an active account can have keys',
    );
  });

  it('are off for a role that has every permission but is not the Owner, who makes keys from the console', async () => {
    await openApi({ role: 'manager' });
    for (const button of [await generate(), await withLimits()]) {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'Only the Owner creates a key from the console');
    }
  });

  it('are off for a role without api_keys:create, naming the permission', async () => {
    await openApi({ permissions: ['clients:read', 'api_keys:read'] });
    const create = await generate();
    expect(create).toBeDisabled();
    expect(create).toHaveAttribute('title', 'You need the api_keys:create permission');
  });

  it('make a key at once with one click: no dialog, no name sent, and the key shown once', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    mockServer.use(
      http.post('*/admin/clients/:id/api-keys', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(
          {
            key: key(40, { name: 'API key 1', createdByStaff: true }),
            secret: 'gsm_OneClickSecret0123456789',
          },
          { status: 201 },
        );
      }),
    );
    await openApi();
    await user.click(await generate());
    const reveal = await screen.findByRole('dialog', { name: 'API key API key 1' });
    expect(within(reveal).getByText('gsm_OneClickSecret0123456789')).toBeInTheDocument();
    // The form of "Key with limits…" never opened, and the body holds no name (only the scope a Dhru key carries).
    expect(screen.queryByRole('dialog', { name: /^New API key for/ })).not.toBeInTheDocument();
    expect(bodies).toEqual([{ scopes: ['dhru'] }]);
    expect(await screen.findByText('API key created')).toBeInTheDocument();
    await user.click(within(reveal).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByText(/gsm_OneClickSecret/)).not.toBeInTheDocument());
  });

  it('lets go of the new key once the one-time dialog holds it: the part keeps no copy of the answer', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/api-keys', () =>
        HttpResponse.json(
          {
            key: key(41, { name: 'API key 1', createdByStaff: true }),
            secret: 'gsm_HeldNowhereElse0123456789',
          },
          { status: 201 },
        ),
      ),
    );
    await openApi();
    await user.click(await generate());
    const reveal = await screen.findByRole('dialog', { name: 'API key API key 1' });
    expect(within(reveal).getByText('gsm_HeldNowhereElse0123456789')).toBeInTheDocument();
    // The mutation's own state (its `data` held the full key for as long as the part stayed open) is cleared; the dialog keeps the key.
    await waitFor(() => expect(oneClick.latest?.data).toBeUndefined());
    expect(oneClick.latest?.isIdle).toBe(true);
    expect(within(screen.getByRole('dialog')).getByText('gsm_HeldNowhereElse0123456789')).toBeInTheDocument();
  });

  it('are named by the server when the mock makes the key: API key 1, then API key 2', async () => {
    const user = userEvent.setup();
    await openApi();
    for (const name of ['API key 1', 'API key 2']) {
      await user.click(await generate());
      const reveal = await screen.findByRole('dialog', { name: `API key ${name}` });
      await user.click(within(reveal).getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect((await rowOf('API keys', name)).getByText('Made by support')).toBeInTheDocument();
    }
  });

  it('tell the server’s words in a toast when the one click is refused, and show no key', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/api-keys', () =>
        problem(
          422,
          'VALIDATION_FAILED',
          'Check the form',
          'This account already has 10 live keys. Revoke one first.',
        ),
      ),
    );
    await openApi();
    await user.click(await generate());
    expect(await screen.findByText('Check the form')).toBeInTheDocument();
    expect(screen.getByText(/This account already has 10 live keys/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await generate()).toBeEnabled();
  });

  it('open the form from Key with limits…, titled with the account', async () => {
    const user = userEvent.setup();
    await openApi();
    await user.click(await withLimits());
    expect(
      await screen.findByRole('dialog', { name: 'New API key for Zain Mobile Hub' }),
    ).toBeInTheDocument();
  });
});

describe('Edit…', () => {
  it('is off for a role without api_keys:update, naming the permission', async () => {
    await openApi({ permissions: ['clients:read', 'api_keys:read'] });
    const edit = await screen.findByRole('button', { name: 'Edit Production' });
    expect(edit).toBeDisabled();
    expect(edit).toHaveAttribute('title', 'You need the api_keys:update permission');
  });
});
