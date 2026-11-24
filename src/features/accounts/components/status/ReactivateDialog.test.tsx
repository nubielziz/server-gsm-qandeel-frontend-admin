// Tests for the reactivate dialog, drawn on its own inside the app's providers against the dev mock API: the question, what is sent, where a
// refusal shows, and the run over many accounts. Ports the reactivate cases of the old merchant and customer pages.
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
import { ReactivateDialog } from './ReactivateDialog';

setupMockApi();
installAccountMocks();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(async () => {
  await signInAs();
});

const HANNAH = account({
  id: SEED.HANNAH,
  name: 'Hannah Weber',
  email: 'hannah@mail.example',
  status: 'suspended',
});
const TUNIS = merchantAccount({ id: SEED.SUSPENDED_MERCHANT, name: 'Tunis Fix Point', status: 'suspended' });
const ACCRA = merchantAccount({ id: SEED.FORMER_PENDING, name: 'Accra Devices', status: 'suspended' });

function open(accounts: AccountRow[]) {
  const onClose = vi.fn();
  render(
    <AppWrapper>
      <ReactivateDialog accounts={accounts} onClose={onClose} />
    </AppWrapper>,
  );
  return onClose;
}

const confirm = () => screen.getByRole('button', { name: 'Reactivate' });

// Records the body of each PATCH, answering by the id: a refused id answers the problem, every other falls through to the mock store.
function watchPatches(refused: Record<number, string> = {}) {
  const seen: { id: number; body: unknown }[] = [];
  mockServer.use(
    http.patch('*/admin/clients/:id', async ({ request, params }) => {
      const id = Number(params.id);
      seen.push({ id, body: await request.clone().json() });
      return refused[id] ? problem(409, 'INVALID_TRANSITION', 'Not allowed', refused[id]) : undefined;
    }),
  );
  return seen;
}

describe('one account', () => {
  it('asks with its fixed title and says they can sign in and order again', async () => {
    open([HANNAH]);
    expect(await screen.findByRole('dialog', { name: 'Reactivate Hannah Weber?' })).toBeInTheDocument();
    expect(screen.getByText('They can sign in and order again.')).toBeInTheDocument();
  });

  it('sends the status alone, tells it in a toast, and closes', async () => {
    const user = userEvent.setup();
    const seen = watchPatches();
    const onClose = open([HANNAH]);
    await user.click(await screen.findByRole('button', { name: 'Reactivate' }));
    expect(await screen.findByText('Hannah Weber reactivated')).toBeInTheDocument();
    expect(seen).toEqual([{ id: 118, body: { status: 'active' } }]);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("keeps the dialog open and shows the server's refusal in it", async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/clients/:id', () =>
        problem(
          409,
          'INVALID_TRANSITION',
          'Not allowed',
          'This account was already reactivated by someone else.',
        ),
      ),
    );
    const onClose = open([HANNAH]);
    await user.click(await screen.findByRole('button', { name: 'Reactivate' }));
    expect(
      await screen.findByText('This account was already reactivated by someone else.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Reactivate Hannah Weber?' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes without a request when it is cancelled', async () => {
    const user = userEvent.setup();
    const seen = watchPatches();
    const onClose = open([HANNAH]);
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([]);
  });
});

describe("the server's Owner-only refusal for a merchant that was never approved", () => {
  const OWNER_ONLY = 'Only the Owner can reactivate a merchant account that was never approved.';
  const refuseAccra = () =>
    http.patch('*/admin/clients/:id', ({ params }) =>
      Number(params.id) === SEED.FORMER_PENDING
        ? problem(403, 'FORBIDDEN', 'Not allowed', OWNER_ONLY)
        : undefined,
    );

  it('shows the server’s words in the dialog for one account, keeps it open, and sends no second request on its own', async () => {
    const user = userEvent.setup();
    const calls: number[] = [];
    mockServer.use(
      http.patch('*/admin/clients/:id', ({ params }) => {
        calls.push(Number(params.id));
        return problem(403, 'FORBIDDEN', 'Not allowed', OWNER_ONLY);
      }),
    );
    const onClose = open([ACCRA]);
    await user.click(await screen.findByRole('button', { name: 'Reactivate' }));
    expect(await screen.findByText(OWNER_ONLY)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Reactivate Accra Devices?' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText('Accra Devices reactivated')).not.toBeInTheDocument();
    // The console never works the rule out itself and never retries: one press, one request.
    expect(calls).toEqual([SEED.FORMER_PENDING]);
    // A refusal is not an end of the session: the dialog can still be cancelled.
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lists the refused account with the server’s words in the summary of many, and reactivates the others', async () => {
    const user = userEvent.setup();
    mockServer.use(refuseAccra());
    const onClose = open([HANNAH, TUNIS, ACCRA]);
    await user.click(confirm());
    const summary = await screen.findByRole('dialog', { name: '2 of 3 accounts reactivated' });
    expect(within(summary).getByText('Accra Devices')).toBeInTheDocument();
    expect(within(summary).getByText(new RegExp(OWNER_ONLY.replace('.', '\\.')))).toBeInTheDocument();
    expect(within(summary).queryByText('Hannah Weber')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('many accounts', () => {
  it('counts them in the title and runs one request each, in order', async () => {
    const user = userEvent.setup();
    const seen = watchPatches();
    const onClose = open([HANNAH, TUNIS, ACCRA]);
    expect(await screen.findByRole('dialog', { name: 'Reactivate 3 accounts?' })).toBeInTheDocument();
    await user.click(confirm());
    expect(await screen.findByText('3 accounts reactivated')).toBeInTheDocument();
    expect(seen).toEqual([118, 19, 20].map((id) => ({ id, body: { status: 'active' } })));
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
    open([HANNAH, TUNIS, ACCRA]);
    await user.click(confirm());
    expect(await screen.findByText('Reactivating 1 of 3…')).toBeInTheDocument();
    release();
    expect(await screen.findByText('3 accounts reactivated')).toBeInTheDocument();
  });

  it("lists each refused account with the server's reason once the run is over", async () => {
    const user = userEvent.setup();
    const seen = watchPatches({ 19: 'Tunis Fix Point cannot be reactivated yet.' });
    const onClose = open([HANNAH, TUNIS, ACCRA]);
    await user.click(confirm());
    const summary = await screen.findByRole('dialog', { name: '2 of 3 accounts reactivated' });
    expect(seen.map((call) => call.id)).toEqual([118, 19, 20]);
    expect(within(summary).getByText('Tunis Fix Point')).toBeInTheDocument();
    expect(within(summary).getByText(/Tunis Fix Point cannot be reactivated yet\./)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    // The corner's button and the footer's are both named Close.
    await user.click(within(summary).getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
