// Tests for the "Adjust the wallet of …" dialog, run through the whole app against the dev mock API: what it checks before sending anything, what it
// sends (four-decimal text, the direction, the tidied reason, one Idempotency-Key per opening), the server's refusals in the dialog, and what follows a
// success (the toast with the new balance, the figures of the part and the newest line of the statement with its journal). Both wallet kinds.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { KEY_REUSED_WORDS } from '../../lib/keyReuse';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { partsMenu, renderAccount } from '../../pages/test-utils';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const ZAIN = /Zain Mobile Hub/;
const DANIEL = /Daniel Whitmore/;
const TITLE = 'Adjust the wallet of Zain Mobile Hub';

type User = ReturnType<typeof userEvent.setup>;
type Seen = { body: unknown; key: string | null };

/** Records the body and Idempotency-Key of every adjustment, then lets the mock answer as usual. */
function record(): Seen[] {
  const seen: Seen[] = [];
  mockServer.use(
    http.post('*/admin/clients/:id/wallet/adjust', async ({ request }) => {
      seen.push({ body: await request.clone().json(), key: request.headers.get('Idempotency-Key') });
      return undefined;
    }),
  );
  return seen;
}

async function openAdjust(user: User, id = 1, name: string | RegExp = ZAIN, title = TITLE) {
  await renderAccount(id, name, { tab: 'wallet' });
  await user.click(await screen.findByRole('button', { name: 'Adjust wallet…' }));
  return within(await screen.findByRole('dialog', { name: title }));
}

const fill = async (user: User, dialog: ReturnType<typeof within>, amount: string, reason: string) => {
  await user.type(dialog.getByLabelText('Amount (USD)'), amount);
  await user.type(dialog.getByLabelText('Reason'), reason);
};

describe('the form', () => {
  it('names the account and its balance, and says above which amount a second approver is needed', async () => {
    const dialog = await openAdjust(userEvent.setup());
    expect(dialog.getByText('Zain Mobile Hub · balance $1,209.75')).toBeInTheDocument();
    expect(await dialog.findByText('Above $10,000.00 needs a second approver.')).toBeInTheDocument();
  });

  it('starts on Add, and the switch moves between Add and Take', async () => {
    const user = userEvent.setup();
    const dialog = await openAdjust(user);
    const direction = dialog.getByRole('switch', { name: 'Direction' });
    expect(direction).toHaveAttribute('aria-checked', 'true');
    expect(direction).toHaveTextContent('AddTake');
    await user.click(direction);
    expect(direction).toHaveAttribute('aria-checked', 'false');
  });

  it('checks the amount and the reason before sending anything', async () => {
    const user = userEvent.setup();
    const seen = record();
    const dialog = await openAdjust(user);
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    expect(await dialog.findByText('Enter an amount greater than zero, like 25.00.')).toBeInTheDocument();
    expect(
      dialog.getByText('Add a reason of at least 5 characters so the entry can be audited later.'),
    ).toBeInTheDocument();
    await user.type(dialog.getByLabelText('Amount (USD)'), '25,50');
    await user.type(dialog.getByLabelText('Reason'), 'abc');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    expect(await dialog.findByText('Enter an amount greater than zero, like 25.00.')).toBeInTheDocument();
    expect(seen).toEqual([]);
  });
});

describe('what it sends', () => {
  it('sends the amount as four-decimal text with the direction and the tidied reason', async () => {
    const user = userEvent.setup();
    const seen: Seen[] = [];
    mockServer.use(
      http.post('*/admin/clients/:id/wallet/adjust', async ({ request }) => {
        seen.push({ body: await request.json(), key: request.headers.get('Idempotency-Key') });
        return problem(409, 'X', 'Stop', 'Stopped here.');
      }),
    );
    const dialog = await openAdjust(user);
    await user.click(dialog.getByRole('switch', { name: 'Direction' }));
    await fill(user, dialog, '$1,000.5', '  Duplicate   top-up ');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    expect(await dialog.findByText('Stopped here.')).toBeInTheDocument();
    expect(seen[0].body).toEqual({ amount: '1000.5000', direction: 'debit', reason: 'Duplicate top-up' });
  });

  it('sends one Idempotency-Key for every retry of one opening, and a new one for the next opening', async () => {
    const user = userEvent.setup();
    const keys: (string | null)[] = [];
    mockServer.use(
      http.post('*/admin/clients/:id/wallet/adjust', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return problem(409, 'X', 'Stop', 'Stopped here.');
      }),
    );
    let dialog = await openAdjust(user);
    await fill(user, dialog, '25', 'Refund for duplicate charge');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    await dialog.findByText('Stopped here.');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    await waitFor(() => expect(keys).toHaveLength(2));
    expect(keys[0]).toMatch(/\S+/);
    expect(keys[1]).toBe(keys[0]);

    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    await user.click(await screen.findByRole('button', { name: 'Adjust wallet…' }));
    dialog = within(await screen.findByRole('dialog', { name: TITLE }));
    await fill(user, dialog, '25', 'Refund for duplicate charge');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    await waitFor(() => expect(keys).toHaveLength(3));
    expect(keys[2]).not.toBe(keys[0]);
  });
});

describe('the server’s refusals', () => {
  it('shows a debit past the credit limit in the dialog, posts nothing and keeps the dialog open', async () => {
    const user = userEvent.setup();
    const dialog = await openAdjust(user);
    await user.click(dialog.getByRole('switch', { name: 'Direction' }));
    await fill(user, dialog, '9000', 'Chargeback reversal');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    expect(
      await dialog.findByText('This would take the wallet below the credit limit (-$2,000.00).'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: TITLE })).toBeInTheDocument();
    expect(dialog.getByText('Zain Mobile Hub · balance $1,209.75')).toBeInTheDocument();
  });

  it('shows the approval rule of a large adjustment, under the amount', async () => {
    const user = userEvent.setup();
    const dialog = await openAdjust(user);
    await fill(user, dialog, '10001', 'Large correction');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    const words = await dialog.findByText(
      'Adjustments over $10,000 need a second approver. Split it or ask Finance.',
    );
    expect(words).toBeInTheDocument();
    expect(dialog.getByLabelText('Amount (USD)')).toBeInvalid();
  });

  it('refuses a debit of a store balance below zero with the server’s words', async () => {
    const user = userEvent.setup();
    const dialog = await openAdjust(user, 101, DANIEL, 'Adjust the wallet of Daniel Whitmore');
    await user.click(dialog.getByRole('switch', { name: 'Direction' }));
    await fill(user, dialog, '80', 'Take back a mistake');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    expect(await dialog.findByText('A debit cannot take the balance below zero.')).toBeInTheDocument();
  });

  it('keeps an answer it has no field for in the error slot of the dialog', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/wallet/adjust', () =>
        problem(409, 'ANONYMIZED', 'Account removed', 'This account was anonymized. Nothing can change.'),
      ),
    );
    const dialog = await openAdjust(user);
    await fill(user, dialog, '5', 'A small credit');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    expect(await dialog.findByText('This account was anonymized. Nothing can change.')).toBeInTheDocument();
  });

  it('words a reused key in plain sentences, refreshes the wallet, and never sends a new key on its own', async () => {
    const user = userEvent.setup();
    const keys: (string | null)[] = [];
    let walletReads = 0;
    mockServer.use(
      http.get('*/admin/clients/:id/wallet', () => {
        walletReads += 1;
        return undefined;
      }),
      http.post('*/admin/clients/:id/wallet/adjust', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return problem(
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'This idempotency key was already used with a different request.',
          'This idempotency key was already used with a different request.',
        );
      }),
    );
    const dialog = await openAdjust(user);
    await fill(user, dialog, '5', 'A small credit');
    await waitFor(() => expect(walletReads).toBeGreaterThan(0));
    const before = walletReads;
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    expect(await dialog.findByText(KEY_REUSED_WORDS)).toBeInTheDocument();
    expect(dialog.queryByText(/idempotency key/i)).not.toBeInTheDocument();
    // The first press of that opening was applied, so what the page shows is read again.
    await waitFor(() => expect(walletReads).toBeGreaterThan(before));
    // The dialog is still open, with the same key: closing it and opening it again is the only way to a new key.
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    await waitFor(() => expect(keys).toHaveLength(2));
    expect(keys[1]).toBe(keys[0]);
  });
});

describe('what follows a success', () => {
  it('posts the entry, closes, says the new balance, and the figures of the part follow', async () => {
    const user = userEvent.setup();
    const seen = record();
    const dialog = await openAdjust(user);
    await fill(user, dialog, '25', 'Refund for duplicate charge');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    expect(await screen.findByText('New balance $1,234.75')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: TITLE })).not.toBeInTheDocument());
    expect(seen).toHaveLength(1);
    expect(seen[0].body).toEqual({
      amount: '25.0000',
      direction: 'credit',
      reason: 'Refund for duplicate charge',
    });
    expect(seen[0].key).toMatch(/\S+/);
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Balance' })).toHaveTextContent('$1,234.75'),
    );
  });

  it('credits a store balance the same way', async () => {
    const user = userEvent.setup();
    const dialog = await openAdjust(user, 101, DANIEL, 'Adjust the wallet of Daniel Whitmore');
    await fill(user, dialog, '10', 'Goodwill credit for a slow unlock');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    expect(await screen.findByText('New balance $60.00')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('group', { name: 'Balance' })).toHaveTextContent('$60.00'));
  });

  it('shows the adjustment as the newest line of the Statement, with its journal', async () => {
    const user = userEvent.setup();
    const dialog = await openAdjust(user);
    await fill(user, dialog, '25', 'Refund for duplicate charge');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    await screen.findByText('New balance $1,234.75');
    await user.click(partsMenu().getByRole('link', { name: 'Statement' }));
    const view = within(await screen.findByRole('table', { name: 'Statement' }));
    await waitFor(() => expect(view.getAllByRole('row')[1]).toHaveTextContent('Refund for duplicate charge'));
    expect(view.getAllByRole('row')[1]).toHaveTextContent('+$25.00');
    expect(view.getAllByRole('row')[1]).toHaveTextContent('$1,234.75');
    await user.click(within(view.getAllByRole('row')[1]).getByRole('button', { name: /^View journal/ }));
    const journal = await screen.findByRole('dialog', { name: /Manual credit: Refund for duplicate charge/ });
    expect(await within(journal).findByText('adjustments')).toBeInTheDocument();
  });
});
