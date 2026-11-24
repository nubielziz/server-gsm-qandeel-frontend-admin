// Tests for the suspend dialog, drawn on its own inside the app's providers against the dev mock API: the reason and the note, what is sent,
// where a refusal shows, and the run over many accounts (one request each, in order, a progress line, a summary of the refused ones).
// Ports the suspend cases of the old merchant and customer pages.
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { SEED } from '../../test/apiSupport';
import { AppWrapper } from '../../test/AppWrapper';
import { account, merchantAccount } from '../../test/fixtures';
import { installAccountMocks } from '../../test/installAccountMocks';
import type { AccountRow } from '../../types';
import { SuspendDialog } from './SuspendDialog';

setupMockApi();
installAccountMocks();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(async () => {
  await signInAs();
});

const DANIEL = account({ id: SEED.DANIEL });
const ZAIN = merchantAccount({ id: SEED.ZAIN });
const CAIRO = merchantAccount({ id: SEED.CAIRO, name: 'Cairo GSM Lab', email: 'lab@cairo.example' });

function open(accounts: AccountRow[]) {
  const onClose = vi.fn();
  render(
    <AppWrapper>
      <SuspendDialog accounts={accounts} onClose={onClose} />
    </AppWrapper>,
  );
  return onClose;
}

const reason = () => screen.getByRole('combobox', { name: 'Reason' });
const note = () => screen.getByRole('textbox', { name: /^Note/ });
const confirm = () => screen.getByRole('button', { name: 'Suspend' });

// Records the body of each PATCH, answering by the id: a refused id answers the problem, every other falls through to the mock store.
function watchPatches(refused: Record<number, string> = {}) {
  const seen: { id: number; body: unknown }[] = [];
  mockServer.use(
    http.patch('*/admin/clients/:id', async ({ request, params }) => {
      const id = Number(params.id);
      seen.push({ id, body: await request.clone().json() });
      return refused[id] ? problem(409, 'LAST_ACTIVE', 'Cannot suspend', refused[id]) : undefined;
    }),
  );
  return seen;
}

describe('one account', () => {
  it('opens with its fixed title, what suspending does, the six reasons and an optional note', async () => {
    open([DANIEL]);
    expect(await screen.findByRole('dialog', { name: 'Suspend Daniel Whitmore?' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'They cannot sign in, call the API or place new orders. Open orders finish and the wallet stays as it is. Nothing is added to the blocklist.',
      ),
    ).toBeInTheDocument();
    expect(
      within(reason())
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'Choose a reason',
      'Asked to pause the account',
      'Account may be compromised',
      'Unusual activity under review',
      'Waiting for proof of identity or payment',
      'Chargeback or payment dispute',
      'Other',
    ]);
    expect(screen.getByRole('textbox', { name: 'Note (optional)' })).toBeInTheDocument();
  });

  it('needs a reason, and a note when the reason is "Other", before anything is sent', async () => {
    const user = userEvent.setup();
    const seen = watchPatches();
    open([DANIEL]);
    await user.click(confirm());
    expect(await screen.findByText('Choose a reason for the audit log.')).toBeInTheDocument();
    await user.selectOptions(reason(), 'Other');
    expect(screen.getByRole('textbox', { name: 'Note' })).toBeInTheDocument();
    await user.click(confirm());
    expect(await screen.findByText('Say what the reason is.')).toBeInTheDocument();
    expect(seen).toEqual([]);
  });

  it('sends the reason alone, tells it in a toast, and closes', async () => {
    const user = userEvent.setup();
    const seen = watchPatches();
    const onClose = open([DANIEL]);
    await user.selectOptions(reason(), 'Account may be compromised');
    await user.click(confirm());
    expect(await screen.findByText('Daniel Whitmore suspended')).toBeInTheDocument();
    expect(seen).toEqual([{ id: 101, body: { status: 'suspended', reason: 'Account may be compromised' } }]);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('sends "<reason>: <note>" with the note tidied', async () => {
    const user = userEvent.setup();
    const seen = watchPatches();
    const onClose = open([DANIEL]);
    await user.selectOptions(reason(), 'Other');
    await user.type(note(), '  asked   by phone ');
    await user.click(confirm());
    // Wait for the whole outcome, not only for the request: a test that ends with the call still in flight leaves its success toast
    // to land after the setup cleared the toasts, in the next test (which then finds it on screen).
    expect(await screen.findByText('Daniel Whitmore suspended')).toBeInTheDocument();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.body).toEqual({ status: 'suspended', reason: 'Other: asked by phone' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("keeps the dialog open and shows the server's refusal in it, with no toast", async () => {
    const user = userEvent.setup();
    watchPatches({ 101: 'Daniel Whitmore has open orders worth $71.23.' });
    const onClose = open([DANIEL]);
    await user.selectOptions(reason(), 'Chargeback or payment dispute');
    await user.click(confirm());
    expect(await screen.findByText('Daniel Whitmore has open orders worth $71.23.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Suspend Daniel Whitmore?' })).toBeInTheDocument();
    expect(screen.queryByText('Daniel Whitmore suspended')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes without a request when it is cancelled', async () => {
    const user = userEvent.setup();
    const seen = watchPatches();
    const onClose = open([DANIEL]);
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([]);
  });
});

describe('many accounts', () => {
  it('counts them in the title and runs one request each, in order, with the same reason', async () => {
    const user = userEvent.setup();
    const seen = watchPatches();
    const onClose = open([DANIEL, ZAIN, CAIRO]);
    expect(await screen.findByRole('dialog', { name: 'Suspend 3 accounts?' })).toBeInTheDocument();
    await user.selectOptions(reason(), 'Unusual activity under review');
    await user.click(confirm());
    expect(await screen.findByText('3 accounts suspended')).toBeInTheDocument();
    expect(seen).toEqual(
      [101, 1, 5].map((id) => ({
        id,
        body: { status: 'suspended', reason: 'Unusual activity under review' },
      })),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('shows how far the run is while it goes', async () => {
    const user = userEvent.setup();
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    mockServer.use(
      http.patch('*/admin/clients/:id', async () => {
        calls += 1;
        if (calls === 2) await gate;
        return undefined;
      }),
    );
    open([DANIEL, ZAIN, CAIRO]);
    await user.selectOptions(reason(), 'Account may be compromised');
    await user.click(confirm());
    expect(await screen.findByText('Suspending 1 of 3…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    release();
    expect(await screen.findByText('3 accounts suspended')).toBeInTheDocument();
  });

  it("goes on after a refusal, then lists each refused account with the server's reason", async () => {
    const user = userEvent.setup();
    const seen = watchPatches({ 1: 'Zain Mobile Hub has open orders worth $71.23.' });
    const onClose = open([DANIEL, ZAIN, CAIRO]);
    await user.selectOptions(reason(), 'Account may be compromised');
    await user.click(confirm());
    const summary = await screen.findByRole('dialog', { name: '2 of 3 accounts suspended' });
    expect(seen.map((call) => call.id)).toEqual([101, 1, 5]);
    expect(within(summary).getByText('Zain Mobile Hub')).toBeInTheDocument();
    expect(within(summary).getByText(/Zain Mobile Hub has open orders worth \$71\.23\./)).toBeInTheDocument();
    // The question gave way to the summary, and nothing was said to have worked as a whole.
    expect(screen.queryByRole('dialog', { name: 'Suspend 3 accounts?' })).not.toBeInTheDocument();
    expect(screen.queryByText('3 accounts suspended')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    // The corner's button and the footer's are both named Close.
    await user.click(within(summary).getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
