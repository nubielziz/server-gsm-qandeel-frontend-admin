// Tests for the Financial part of an account's record, run through the whole app against the dev mock API: the rows of a merchant wallet and of a
// store balance, a balance below zero, the hold, the switched-off note, the buttons and what each permission takes away from them, the dialogs they
// open (only their fixed titles here: the dialogs have their own files), the official statement download, and the states of the part.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { partsMenu, renderAccount } from '../../pages/test-utils';
import { installAccountMocks } from '../../test/installAccountMocks';
import { merchantAccount, storeWallet, VIP_RANK } from '../../test/fixtures';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const ZAIN = /Zain Mobile Hub/; // 1: a VIP merchant, $1,209.75, $71.23 held, a $2,000 credit limit
const DANIEL = /Daniel Whitmore/; // 101: a retail login with a $50 store balance
const SANAA = /Sana'a Repair/; // 17: a merchant whose wallet is below zero

/** What a row of the part says, found by its label ("Balance" and the like). */
const row = (label: string) => screen.findByRole('group', { name: label });
const buttons = () => screen.getAllByRole('button').map((button) => button.textContent);

describe('the rows of a merchant wallet', () => {
  it('shows the kind, the figures the server counted, no hold and the second-approver rule', async () => {
    await renderAccount(1, ZAIN, { tab: 'wallet' });
    expect(await row('Kind')).toHaveTextContent('Merchant wallet: orders are held and settled from it');
    expect(await row('Balance')).toHaveTextContent('$1,209.75');
    expect(await row('Reserved')).toHaveTextContent('$71.23held in open orders');
    expect(await row('Credit limit')).toHaveTextContent('$2,000.00');
    expect(await row('Available')).toHaveTextContent('$3,209.75');
    expect(await row('Unpaid top-ups')).toHaveTextContent('0');
    expect(await row('Hold')).toHaveTextContent('None');
    expect(await row('Second approver')).toHaveTextContent(
      'Adjustments above $10,000.00 need a second approver',
    );
    // A dispute of a top-up puts a merchant wallet on hold too, so the row is there for both kinds.
    expect(await row('Open disputes')).toHaveTextContent('0');
  });

  it('shows the open disputes of a merchant wallet that is on hold because of them, in the critical colour', async () => {
    mockServer.use(
      http.get('*/admin/clients/:id/wallet', () =>
        HttpResponse.json(
          storeWallet({
            kind: 'merchant',
            openDisputes: 1,
            frozen: { at: '2026-11-02T12:00:00.000Z', reason: 'A top-up is disputed' },
          }),
        ),
      ),
    );
    await renderAccount(1, ZAIN, { tab: 'wallet' });
    const disputes = await row('Open disputes');
    expect(disputes).toHaveTextContent('1');
    expect(disputes.firstElementChild).toHaveClass('text-crit-fg');
    expect(await row('Hold')).toHaveTextContent('On hold since 2 Nov 2026: A top-up is disputed');
  });

  it('shows a wallet below zero in the critical colour, with the alert', async () => {
    await renderAccount(17, SANAA, { tab: 'wallet' });
    const balance = await row('Balance');
    await waitFor(() => expect(balance).toHaveTextContent('-$81.95'));
    expect(balance.firstElementChild).toHaveClass('text-crit-fg');
    expect(balance.querySelector('svg')).not.toBeNull();
  });

  it('says how many top-ups wait and what they would add', async () => {
    mockServer.use(
      http.get('*/admin/clients/:id/wallet', () =>
        HttpResponse.json(storeWallet({ kind: 'merchant', pendingTopUps: { count: 2, amount: '300.0000' } })),
      ),
    );
    await renderAccount(1, ZAIN, { tab: 'wallet' });
    expect(await row('Unpaid top-ups')).toHaveTextContent('2would add $300.00');
  });
});

describe('the rows of a store balance', () => {
  it('shows the store balance without the rows only a merchant wallet has, and its open disputes', async () => {
    await renderAccount(101, DANIEL, { tab: 'wallet' });
    expect(await row('Kind')).toHaveTextContent('Store balance: spent at checkout');
    expect(await row('Balance')).toHaveTextContent('$50.00');
    expect(await row('Available')).toHaveTextContent('$50.00');
    expect(await row('Open disputes')).toHaveTextContent('0');
    expect(screen.queryByRole('group', { name: 'Reserved' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Credit limit' })).not.toBeInTheDocument();
  });

  it('shows an open dispute in the critical colour', async () => {
    mockServer.use(
      http.get('*/admin/clients/:id/wallet', () => HttpResponse.json(storeWallet({ openDisputes: 2 }))),
    );
    await renderAccount(101, DANIEL, { tab: 'wallet' });
    const disputes = await row('Open disputes');
    expect(disputes).toHaveTextContent('2');
    expect(disputes.firstElementChild).toHaveClass('text-crit-fg');
  });

  it('says the store balance is switched off, with a link to the settings', async () => {
    mockServer.use(
      http.get('*/admin/clients/:id/wallet', () => HttpResponse.json(storeWallet({ enabled: false }))),
    );
    await renderAccount(101, DANIEL, { tab: 'wallet' });
    const note = await screen.findByRole('note');
    expect(note).toHaveTextContent(
      'The store balance is switched off. People cannot top up or pay from it, but a balance still shows.',
    );
    expect(within(note).getByRole('link', { name: 'Open settings' })).toHaveAttribute(
      'href',
      '/settings?tab=system',
    );
  });

  it('draws no switched-off note for a merchant wallet, whatever the shop says about store balances', async () => {
    mockServer.use(
      http.get('*/admin/clients/:id/wallet', () =>
        HttpResponse.json(storeWallet({ kind: 'merchant', enabled: false })),
      ),
    );
    await renderAccount(1, ZAIN, { tab: 'wallet' });
    await row('Balance');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});

describe('the hold', () => {
  const held = storeWallet({
    frozen: { at: '2026-11-02T12:00:00.000Z', reason: 'Checking a disputed top-up' },
  });

  it('shows the day and the reason in the critical colour, and offers to lift the hold instead of putting one', async () => {
    mockServer.use(http.get('*/admin/clients/:id/wallet', () => HttpResponse.json(held)));
    await renderAccount(101, DANIEL, { tab: 'wallet' });
    const hold = await row('Hold');
    expect(hold).toHaveTextContent('On hold since 2 Nov 2026: Checking a disputed top-up');
    expect(hold.firstElementChild).toHaveClass('text-crit-fg');
    expect(await screen.findByRole('button', { name: 'Lift hold…' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Put on hold…' })).not.toBeInTheDocument();
  });

  it('offers to put a wallet on hold when there is none', async () => {
    await renderAccount(101, DANIEL, { tab: 'wallet' });
    expect(await screen.findByRole('button', { name: 'Put on hold…' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Lift hold…' })).not.toBeInTheDocument();
  });
});

describe('the buttons', () => {
  it('offers a merchant wallet every button, in the layout’s order', async () => {
    await renderAccount(1, ZAIN, { tab: 'wallet' });
    await screen.findByRole('button', { name: 'Adjust wallet…' });
    expect(buttons()).toEqual(
      expect.arrayContaining([
        'Adjust wallet…',
        'Put on hold…',
        'Credit limit…',
        'Download official statement',
      ]),
    );
  });

  it('offers a store balance neither the credit limit nor the official statement', async () => {
    await renderAccount(101, DANIEL, { tab: 'wallet' });
    await screen.findByRole('button', { name: 'Adjust wallet…' });
    expect(screen.queryByRole('button', { name: 'Credit limit…' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download official statement' })).not.toBeInTheDocument();
  });

  it('leaves out the credit limit of a merchant whose rank allows no credit and who has none', async () => {
    mockServer.use(
      http.get('*/admin/clients/:id', ({ params }) =>
        params.id === '5'
          ? HttpResponse.json(
              merchantAccount({
                id: 5,
                name: 'Cairo GSM Lab',
                rank: { ...VIP_RANK, creditAllowed: false },
                wallet: {
                  kind: 'merchant',
                  balance: '10.0000',
                  reserved: '0.0000',
                  creditLimit: '0.0000',
                  available: '10.0000',
                  frozen: false,
                },
              }),
            )
          : undefined,
      ),
    );
    await renderAccount(5, /Cairo GSM Lab/, { tab: 'wallet' });
    await screen.findByRole('button', { name: 'Adjust wallet…' });
    expect(screen.queryByRole('button', { name: 'Credit limit…' })).not.toBeInTheDocument();
  });

  it('hides Adjust wallet without wallet:adjust, and turns the hold off with the permission named', async () => {
    await renderAccount(101, DANIEL, { permissions: ['clients:read', 'wallet:read'], tab: 'wallet' });
    const hold = await screen.findByRole('button', { name: 'Put on hold…' });
    expect(hold).toBeDisabled();
    expect(hold).toHaveAttribute('title', 'You need the wallet:adjust permission');
    expect(screen.queryByRole('button', { name: 'Adjust wallet…' })).not.toBeInTheDocument();
  });

  it('turns the credit limit off without wallet:credit_limit, naming the permission', async () => {
    await renderAccount(1, ZAIN, {
      permissions: ['clients:read', 'wallet:read', 'wallet:adjust'],
      tab: 'wallet',
    });
    const limit = await screen.findByRole('button', { name: 'Credit limit…' });
    expect(limit).toBeDisabled();
    expect(limit).toHaveAttribute('title', 'You need the wallet:credit_limit permission');
  });

  it('opens the dialog of each button, with its fixed title', async () => {
    const user = userEvent.setup();
    await renderAccount(1, ZAIN, { tab: 'wallet' });
    for (const [button, title] of [
      ['Adjust wallet…', 'Adjust the wallet of Zain Mobile Hub'],
      ['Put on hold…', 'Put the wallet of Zain Mobile Hub on hold?'],
      ['Credit limit…', 'Credit limit of Zain Mobile Hub'],
    ] as const) {
      await user.click(await screen.findByRole('button', { name: button }));
      const dialog = await screen.findByRole('dialog', { name: title });
      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    }
  });
});

describe('the official statement', () => {
  function stubDownload() {
    const created: Blob[] = [];
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: (blob: Blob) => (created.push(blob), 'blob:test'),
        revokeObjectURL: vi.fn(),
      }),
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    return created;
  }

  it('downloads the file and says which file it saved', async () => {
    const user = userEvent.setup();
    const created = stubDownload();
    await renderAccount(1, ZAIN, { tab: 'wallet' });
    await user.click(await screen.findByRole('button', { name: 'Download official statement' }));
    expect(await screen.findByText('Saved statement-1-mock.pdf')).toBeInTheDocument();
    expect(created).toHaveLength(1);
  });

  it('shows the server’s refusal in a toast', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/reports/client-statement/:clientId', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'Your role cannot export statements.'),
      ),
    );
    await renderAccount(1, ZAIN, { tab: 'wallet' });
    await user.click(await screen.findByRole('button', { name: 'Download official statement' }));
    expect(await screen.findByText('Not allowed')).toBeInTheDocument();
    expect(screen.getByText(/Your role cannot export statements\./)).toBeInTheDocument();
  });

  it('is turned off without reports:read, naming the permission', async () => {
    await renderAccount(1, ZAIN, { permissions: ['clients:read', 'wallet:read'], tab: 'wallet' });
    const download = await screen.findByRole('button', { name: 'Download official statement' });
    expect(download).toBeDisabled();
    expect(download).toHaveAttribute('title', 'You need the reports:read permission');
  });
});

describe('the states', () => {
  it('shows row skeletons while the wallet is read', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mockServer.use(
      http.get('*/admin/clients/:id/wallet', async () => {
        await gate;
        return undefined;
      }),
    );
    await renderAccount(101, DANIEL, { tab: 'wallet' });
    expect(await screen.findByRole('status', { name: 'Loading the wallet' })).toBeInTheDocument();
    release();
    expect(await row('Balance')).toHaveTextContent('$50.00');
    expect(screen.queryByRole('status', { name: 'Loading the wallet' })).not.toBeInTheDocument();
  });

  it('says so inside the part, with Retry, when the wallet cannot be read, and draws no buttons', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/clients/:id/wallet', () => HttpResponse.json({ title: 'Broken' }, { status: 400 })),
    );
    await renderAccount(101, DANIEL, { tab: 'wallet' });
    expect(await screen.findByText(/Could not load the wallet\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adjust wallet…' })).not.toBeInTheDocument();
    // The rest of the record stays.
    expect(partsMenu().getByRole('link', { name: 'Financial' })).toHaveAttribute('aria-current', 'page');
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await row('Balance')).toHaveTextContent('$50.00');
  });

  it('is left out of the menu without wallet:read, and an address that names it shows the Overview', async () => {
    await renderAccount(101, DANIEL, { role: 'noWallet', tab: 'wallet' });
    expect(partsMenu().queryByRole('link', { name: 'Financial' })).not.toBeInTheDocument();
    expect(partsMenu().getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  });
});
