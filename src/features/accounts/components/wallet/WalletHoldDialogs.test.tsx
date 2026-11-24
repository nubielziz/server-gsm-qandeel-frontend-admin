// Tests for the two hold dialogs, run through the whole app against the dev mock API: put the wallet on hold with a reason, see the hold, lift it; what
// each says; the reason's length; one Idempotency-Key per opening; and the server's refusal of a lift while the balance is below zero.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { KEY_REUSED_WORDS } from '../../lib/keyReuse';
import { setupMockApi } from '@/test/renderApp';
import { renderAccount } from '../../pages/test-utils';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const DANIEL = /Daniel Whitmore/;
const HOLD = 'Put the wallet of Daniel Whitmore on hold?';
const LIFT = 'Lift the hold on the wallet of Daniel Whitmore?';

type Seen = { body: unknown; key: string | null };

/** Records the body and Idempotency-Key of every call to a hold route, then lets the mock answer as usual. */
function record(action: 'freeze' | 'unfreeze'): Seen[] {
  const seen: Seen[] = [];
  mockServer.use(
    http.post(`*/admin/clients/:id/wallet/${action}`, async ({ request }) => {
      seen.push({ body: await request.clone().json(), key: request.headers.get('Idempotency-Key') });
      return undefined;
    }),
  );
  return seen;
}

const open = async (user: ReturnType<typeof userEvent.setup>, button: string, title: string) => {
  await user.click(await screen.findByRole('button', { name: button }));
  return within(await screen.findByRole('dialog', { name: title }));
};

describe('put on hold', () => {
  it('says what a hold does, and asks for a reason of at least five characters', async () => {
    const user = userEvent.setup();
    const seen = record('freeze');
    await renderAccount(101, DANIEL, { tab: 'wallet' });
    const dialog = await open(user, 'Put on hold…', HOLD);
    expect(
      dialog.getByText(
        'Spending from the wallet stops until the hold is lifted. Credits, refunds and staff adjustments still work. The person is emailed.',
      ),
    ).toBeInTheDocument();
    await user.type(dialog.getByLabelText('Reason'), 'abc');
    await user.click(dialog.getByRole('button', { name: 'Put on hold' }));
    expect(
      await dialog.findByText('Add a reason of at least 5 characters so the action can be audited later.'),
    ).toBeInTheDocument();
    expect(seen).toEqual([]);
  });

  it('puts the wallet on hold with the reason and a key, shows the hold, then lifts it with another key', async () => {
    const user = userEvent.setup();
    const freezes = record('freeze');
    const lifts = record('unfreeze');
    await renderAccount(101, DANIEL, { tab: 'wallet' });
    let dialog = await open(user, 'Put on hold…', HOLD);
    await user.type(dialog.getByLabelText('Reason'), '  Checking a  disputed top-up ');
    await user.click(dialog.getByRole('button', { name: 'Put on hold' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: HOLD })).not.toBeInTheDocument());
    expect(await screen.findByText('Wallet put on hold')).toBeInTheDocument();
    const hold = await screen.findByRole('group', { name: 'Hold' });
    await waitFor(() => expect(hold).toHaveTextContent(/On hold since .*: Checking a disputed top-up/));
    expect(freezes[0].body).toEqual({ reason: 'Checking a disputed top-up' });
    expect(freezes[0].key).toMatch(/\S+/);
    // The button changes with the hold.
    expect(screen.queryByRole('button', { name: 'Put on hold…' })).not.toBeInTheDocument();

    dialog = await open(user, 'Lift hold…', LIFT);
    expect(dialog.getByText('The wallet can be spent again.')).toBeInTheDocument();
    await user.type(dialog.getByLabelText('Reason'), 'The dispute was won');
    await user.click(dialog.getByRole('button', { name: 'Lift hold' }));
    expect(await screen.findByText('Hold lifted')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('group', { name: 'Hold' })).toHaveTextContent('None'));
    expect(lifts[0].body).toEqual({ reason: 'The dispute was won' });
    expect(lifts[0].key).not.toBe(freezes[0].key);
  });

  it('sends one key for every retry of one opening, and a new one for the next opening', async () => {
    const user = userEvent.setup();
    const keys: (string | null)[] = [];
    mockServer.use(
      http.post('*/admin/clients/:id/wallet/freeze', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return problem(409, 'X', 'Stop', 'Stopped here.');
      }),
    );
    await renderAccount(101, DANIEL, { tab: 'wallet' });
    let dialog = await open(user, 'Put on hold…', HOLD);
    await user.type(dialog.getByLabelText('Reason'), 'Checking a top-up');
    await user.click(dialog.getByRole('button', { name: 'Put on hold' }));
    await dialog.findByText('Stopped here.');
    await user.click(dialog.getByRole('button', { name: 'Put on hold' }));
    await waitFor(() => expect(keys).toHaveLength(2));
    expect(keys[1]).toBe(keys[0]);

    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    dialog = await open(user, 'Put on hold…', HOLD);
    await user.type(dialog.getByLabelText('Reason'), 'Checking a top-up');
    await user.click(dialog.getByRole('button', { name: 'Put on hold' }));
    await waitFor(() => expect(keys).toHaveLength(3));
    expect(keys[2]).not.toBe(keys[0]);
  });
});

describe('lift the hold', () => {
  it('shows the server’s refusal in the dialog and keeps the hold', async () => {
    const user = userEvent.setup();
    await renderAccount(101, DANIEL, { tab: 'wallet' });
    let dialog = await open(user, 'Put on hold…', HOLD);
    await user.type(dialog.getByLabelText('Reason'), 'Checking a top-up');
    await user.click(dialog.getByRole('button', { name: 'Put on hold' }));
    await screen.findByText('Wallet put on hold');
    mockServer.use(
      http.post('*/admin/clients/:id/wallet/unfreeze', () =>
        problem(409, 'OPEN_DISPUTE', 'Dispute open', 'A dispute of one of their top-ups is still open.'),
      ),
    );
    dialog = await open(user, 'Lift hold…', LIFT);
    expect(
      dialog.getByText(
        'Refused while the balance is below zero or a dispute of one of their top-ups is open.',
      ),
    ).toBeInTheDocument();
    await user.type(dialog.getByLabelText('Reason'), 'The dispute was won');
    await user.click(dialog.getByRole('button', { name: 'Lift hold' }));
    expect(await dialog.findByText('A dispute of one of their top-ups is still open.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: LIFT })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Hold' })).not.toHaveTextContent('None');
  });
});

describe('a reused key', () => {
  it('is worded in plain sentences in the hold dialog, which stays open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/wallet/freeze', () =>
        problem(
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'This idempotency key was already used with a different request.',
          'This idempotency key was already used with a different request.',
        ),
      ),
    );
    await renderAccount(101, DANIEL, { tab: 'wallet' });
    const dialog = await open(user, 'Put on hold…', HOLD);
    await user.type(dialog.getByLabelText('Reason'), 'Checking a top-up');
    await user.click(dialog.getByRole('button', { name: 'Put on hold' }));
    expect(await dialog.findByText(KEY_REUSED_WORDS)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: HOLD })).toBeInTheDocument();
  });
});

describe('a merchant wallet', () => {
  const ZAIN_HOLD = 'Put the wallet of Zain Mobile Hub on hold?';
  const ZAIN_LIFT = 'Lift the hold on the wallet of Zain Mobile Hub?';

  it('says a merchant is not emailed about a hold, where a customer is', async () => {
    const user = userEvent.setup();
    await renderAccount(1, /Zain Mobile Hub/, { tab: 'wallet' });
    const dialog = await open(user, 'Put on hold…', ZAIN_HOLD);
    expect(
      dialog.getByText(
        'Spending from the wallet stops until the hold is lifted. Credits, refunds and staff adjustments still work. The merchant is not emailed.',
      ),
    ).toBeInTheDocument();
    expect(dialog.queryByText(/The person is emailed/)).not.toBeInTheDocument();
  });

  it('words the lift note without the balance rule, which holds for a store balance only, and shows the open disputes of its hold', async () => {
    const user = userEvent.setup();
    await renderAccount(1, /Zain Mobile Hub/, { tab: 'wallet' });
    let dialog = await open(user, 'Put on hold…', ZAIN_HOLD);
    await user.type(dialog.getByLabelText('Reason'), 'A top-up is disputed');
    await user.click(dialog.getByRole('button', { name: 'Put on hold' }));
    await screen.findByText('Wallet put on hold');
    dialog = await open(user, 'Lift hold…', ZAIN_LIFT);
    expect(dialog.getByText('Refused while a dispute of one of their top-ups is open.')).toBeInTheDocument();
    expect(dialog.queryByText(/balance is below zero/)).not.toBeInTheDocument();
  });
});
