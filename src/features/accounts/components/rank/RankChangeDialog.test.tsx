// Tests for the rank change dialog, drawn on its own inside the app's providers against the dev mock API: it is the Owner's only, it lists the
// ranks it can move to, says what the change will do before it is confirmed, sends one Idempotency-Key for every retry of one opening and a
// new one for the next, shows the toast of what the answer names, and lists every blocker in words with nothing moved.
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { mockMe, setupMockApi, signInAs } from '@/test/renderApp';
import { getAccount } from '../../api';
import { KEY_REUSED_WORDS } from '../../lib/keyReuse';
import { SEED, spy } from '../../test/apiSupport';
import { AppWrapper } from '../../test/AppWrapper';
import { account, merchantAccount, storeWallet } from '../../test/fixtures';
import { installAccountMocks } from '../../test/installAccountMocks';
import type { AccountRow } from '../../types';
import { RankChangeDialog } from './RankChangeDialog';

setupMockApi();
installAccountMocks();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(async () => {
  await signInAs();
});

const ZAIN = merchantAccount({
  id: SEED.ZAIN,
  wallet: {
    kind: 'merchant',
    balance: '1209.7500',
    reserved: '71.2300',
    creditLimit: '2000.0000',
    available: '3209.7500',
    frozen: false,
  },
});
const DANIEL = account({ id: SEED.DANIEL });

function open(row: AccountRow) {
  const onClose = vi.fn();
  const view = render(
    <AppWrapper>
      <RankChangeDialog account={row} onClose={onClose} />
    </AppWrapper>,
  );
  return { onClose, ...view };
}

const choose = (user: ReturnType<typeof userEvent.setup>, label: string) =>
  user.selectOptions(screen.getByRole('combobox', { name: 'New rank' }), label);
const confirm = () => screen.getByRole('button', { name: 'Change rank' });
// Waits for the ranks the menu offers: the first choice after the prompt.
const ranksLoaded = () => waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(1));

describe('the dialog', () => {
  it('opens with its fixed title, the current rank and the ranks it can move to, retail first', async () => {
    open(ZAIN);
    expect(
      await screen.findByRole('dialog', { name: 'Change the rank of Zain Mobile Hub' }),
    ).toBeInTheDocument();
    expect(screen.getByText('VIP, merchant')).toBeInTheDocument();
    await ranksLoaded();
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Choose a rank',
      'Storefront retail',
      'Standard · new merchants start here',
      'Wholesale (-4%)',
    ]);
  });

  it('says "Retail" for the current rank of a shop account', async () => {
    open(DANIEL);
    await ranksLoaded();
    expect(screen.getByText('Retail')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Storefront retail' })).not.toBeInTheDocument();
  });

  it('needs a rank before anything is sent', async () => {
    const user = userEvent.setup();
    const seen = spy('post', '/admin/clients/1/rank', () => HttpResponse.json({}));
    open(ZAIN);
    await ranksLoaded();
    await user.click(confirm());
    expect(await screen.findByText('Choose the new rank.')).toBeInTheDocument();
    expect(seen).toEqual([]);
  });
});

describe('what the change will do', () => {
  it('says new orders use the new prices when the kind stays the same, with the primary button', async () => {
    const user = userEvent.setup();
    open(ZAIN);
    await ranksLoaded();
    await choose(user, 'Wholesale (-4%)');
    expect(screen.getByText('New orders use Wholesale prices.')).toBeInTheDocument();
    expect(confirm()).toHaveClass('btn-primary');
  });

  it('warns to set the credit limit to 0 first when the target allows no credit', async () => {
    const user = userEvent.setup();
    open(ZAIN);
    await ranksLoaded();
    await choose(user, 'Standard · new merchants start here');
    expect(await screen.findByText('Set the credit limit to 0 first in Financial.')).toBeInTheDocument();
  });

  it('says the wallet balance moves to the store balance when a merchant becomes retail, with the danger button', async () => {
    const user = userEvent.setup();
    open(ZAIN);
    await ranksLoaded();
    await choose(user, 'Storefront retail');
    expect(
      await screen.findByText('The wallet balance of $1,209.75 moves to the store balance.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Every session ends, every API key is revoked and the credit limit becomes 0.'),
    ).toBeInTheDocument();
    expect(confirm()).toHaveClass('btn-danger-solid');
  });

  it('says what a shop account becomes as a merchant: the store balance moves, a username is made, an invitation may go out', async () => {
    const user = userEvent.setup();
    open(DANIEL);
    await ranksLoaded();
    await choose(user, 'VIP (-8%)');
    expect(
      await screen.findByText('The store balance of $50.00 moves to the merchant wallet.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Every session of the account ends.')).toBeInTheDocument();
    expect(screen.getByText('A username for the API is made.')).toBeInTheDocument();
    expect(
      screen.getByText('Set a credit limit afterwards in Financial if the rank allows credit.'),
    ).toBeInTheDocument();
    // Daniel has a password: no invitation goes out.
    expect(screen.queryByText('An invitation to set a password goes out.')).not.toBeInTheDocument();
  });
});

describe('the change', () => {
  it('moves the account to the rank chosen, tells it in the toast, and closes', async () => {
    const user = userEvent.setup();
    const seen: { key: string | null; body: unknown }[] = [];
    mockServer.use(
      http.post('*/admin/clients/:id/rank', async ({ request }) => {
        seen.push({ key: request.headers.get('Idempotency-Key'), body: await request.clone().json() });
        return undefined;
      }),
    );
    const { onClose } = open(ZAIN);
    await ranksLoaded();
    await choose(user, 'Wholesale (-4%)');
    await user.click(confirm());
    expect(await screen.findByText('Zain Mobile Hub is now Wholesale.')).toBeInTheDocument();
    expect(screen.getByText('New orders use the new prices.')).toBeInTheDocument();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.body).toEqual({ groupId: 2 });
    expect(seen[0]?.key).toMatch(/\S+/);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect((await getAccount(SEED.ZAIN)).rank.name).toBe('Wholesale');
  });

  it('tells what the answer names: the amount moved, the sessions ended, the keys revoked', async () => {
    const user = userEvent.setup();
    spy('post', `/admin/clients/${SEED.DANIEL}/rank`, () =>
      HttpResponse.json({
        rank: { id: 3, name: 'VIP', kind: 'merchant' },
        wallet: storeWallet({ kind: 'merchant', balance: '50.0000' }),
        movedAmount: '50.0000',
        transactionId: 9,
        sessionsEnded: 1,
        apiKeysRevoked: 0,
      }),
    );
    open(DANIEL);
    await ranksLoaded();
    await choose(user, 'VIP (-8%)');
    await user.click(confirm());
    expect(await screen.findByText('Daniel Whitmore is now VIP.')).toBeInTheDocument();
    expect(screen.getByText('$50.00 moved to the merchant wallet. 1 session ended.')).toBeInTheDocument();
  });

  it('lists every blocker in words, moves nothing, and keeps the dialog open', async () => {
    const user = userEvent.setup();
    const { onClose } = open(ZAIN);
    await ranksLoaded();
    await choose(user, 'Storefront retail');
    await user.click(confirm());
    const alert = (await screen.findByText('The rank cannot change yet. Nothing was changed.')).closest(
      '[role="alert"]',
    );
    expect(alert).toBeInTheDocument();
    const list = within(alert as HTMLElement);
    expect(
      list.getByText('Orders still hold part of the wallet. Wait for them to finish.'),
    ).toBeInTheDocument();
    // Across kinds the credit limit is no blocker: the merchant wallet that is left gets a limit of zero.
    expect(list.queryByText(/allows no credit/)).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Change the rank of Zain Mobile Hub' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText(/is now/)).not.toBeInTheDocument();
    expect((await getAccount(SEED.ZAIN)).rank.name).toBe('VIP');
  });

  it('lists the credit limit as the blocker when another merchant rank allows no credit, and moves nothing', async () => {
    const user = userEvent.setup();
    const { onClose } = open(ZAIN);
    await ranksLoaded();
    await choose(user, 'Standard · new merchants start here');
    await user.click(confirm());
    const alert = (await screen.findByText('The rank cannot change yet. Nothing was changed.')).closest(
      '[role="alert"]',
    );
    expect(
      within(alert as HTMLElement).getByText(
        'The new rank allows no credit while the credit limit is above zero. Set the credit limit to 0 first.',
      ),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect((await getAccount(SEED.ZAIN)).rank.name).toBe('VIP');
  });

  it('words a reused key in plain sentences, keeps the dialog and the key, and offers no retry with a new key', async () => {
    const user = userEvent.setup();
    const keys: (string | null)[] = [];
    mockServer.use(
      http.post('*/admin/clients/:id/rank', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return problem(
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'This idempotency key was already used with a different request.',
          'This idempotency key was already used with a different request.',
        );
      }),
    );
    const { onClose } = open(ZAIN);
    await ranksLoaded();
    await choose(user, 'Wholesale (-4%)');
    await user.click(confirm());
    expect(await screen.findByText(KEY_REUSED_WORDS)).toBeInTheDocument();
    expect(screen.queryByText(/idempotency key/i)).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Change the rank of Zain Mobile Hub' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    // A second press sends the same key again (the person is told to close the window instead); it never makes a new key by itself.
    await user.click(confirm());
    await waitFor(() => expect(keys).toHaveLength(2));
    expect(keys[1]).toBe(keys[0]);
  });

  it('forgets the list of blockers when another rank is chosen', async () => {
    const user = userEvent.setup();
    open(ZAIN);
    await ranksLoaded();
    await choose(user, 'Storefront retail');
    await user.click(confirm());
    await screen.findByText('The rank cannot change yet. Nothing was changed.');
    await choose(user, 'Wholesale (-4%)');
    expect(screen.queryByText('The rank cannot change yet. Nothing was changed.')).not.toBeInTheDocument();
  });

  it('sends one Idempotency-Key for every retry of one opening, and a new one for the next opening', async () => {
    const user = userEvent.setup();
    const keys: (string | null)[] = [];
    mockServer.use(
      http.post('*/admin/clients/:id/rank', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return undefined;
      }),
    );
    const first = open(ZAIN);
    await ranksLoaded();
    await choose(user, 'Storefront retail');
    await user.click(confirm());
    await screen.findByText('The rank cannot change yet. Nothing was changed.');
    await user.click(confirm());
    await waitFor(() => expect(keys).toHaveLength(2));
    expect(keys[0]).toMatch(/\S+/);
    expect(keys[1]).toBe(keys[0]);

    first.unmount();
    open(ZAIN);
    await ranksLoaded();
    await choose(user, 'Storefront retail');
    await user.click(confirm());
    await waitFor(() => expect(keys).toHaveLength(3));
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('shows another refusal of the server in the dialog', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/rank', () =>
        HttpResponse.json(
          {
            type: 'urn:gsm:problem:anonymized',
            title: 'Account removed',
            status: 409,
            code: 'ANONYMIZED',
            detail: 'This account was anonymized. Nothing can change.',
          },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const { onClose } = open(ZAIN);
    await ranksLoaded();
    await choose(user, 'Wholesale (-4%)');
    await user.click(confirm());
    expect(await screen.findByText('This account was anonymized. Nothing can change.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('who may use it', () => {
  it('is for the Owner only: another role is told so and cannot confirm', async () => {
    const user = userEvent.setup();
    mockMe({ permissions: ['clients:read', 'clients:update', 'groups:read', 'wallet:read'] });
    const seen = spy('post', '/admin/clients/1/rank', () => HttpResponse.json({}));
    open(ZAIN);
    await ranksLoaded();
    expect(screen.getByText('Only the Owner changes a rank.')).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
    await user.click(confirm());
    expect(seen).toEqual([]);
  });

  it('locks the menu with its reason for a role that cannot list the ranks', async () => {
    mockMe({ permissions: ['clients:read', 'clients:update', 'wallet:read'] });
    open(ZAIN);
    expect(
      await screen.findByRole('dialog', { name: 'Change the rank of Zain Mobile Hub' }),
    ).toBeInTheDocument();
    const menu = screen.getByRole('combobox', { name: 'New rank' });
    expect(menu).toBeDisabled();
    expect(screen.getByText('You need the groups:read permission')).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
  });
});
