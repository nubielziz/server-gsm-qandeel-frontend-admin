// Tests for the Sign out everywhere dialog, run through the whole app against the dev mock API: for one account from its Security part (the
// review step with the number of devices, the toast, the part following, the refusal staying in the dialog, cancelling) and for the ticked
// accounts of the list (one request per account in order, a toast when every one went through, a summary of the ones the server refused).
// Ports the sign-out cases of the old merchant and customer pages.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { accountsTable, renderAccount, renderAccounts } from '../../pages/test-utils';
import { SEED } from '../../test/apiSupport';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
vi.setConfig({ testTimeout: 30_000 });

const DANIEL = /Daniel Whitmore/; // 101: one session

type User = ReturnType<typeof userEvent.setup>;

// The numbers of the accounts a route was called for, in order; the mock then answers as usual.
function recordCalls(): number[] {
  const calls: number[] = [];
  mockServer.use(
    http.post('*/admin/clients/:id/sessions/revoke', ({ params }) => {
      calls.push(Number(params.id));
      return undefined;
    }),
  );
  return calls;
}

async function openOne(user: User) {
  await renderAccount(SEED.DANIEL, DANIEL, { tab: 'security' });
  await user.click(await screen.findByRole('button', { name: 'Sign out everywhere' }, { timeout: 10_000 }));
  return screen.findByRole('dialog', { name: 'Sign Daniel Whitmore out everywhere?' });
}

describe('for one account', () => {
  it('asks first, says how many devices are signed in, then ends the sessions', async () => {
    const user = userEvent.setup();
    const calls = recordCalls();
    const dialog = await openOne(user);
    expect(within(dialog).getByText('1 device is signed in. They must sign in again.')).toBeInTheDocument();
    expect(within(dialog).getByText(/They are not emailed/)).toBeInTheDocument();
    // Nothing has gone yet: the request is made when the review step is confirmed.
    expect(calls).toEqual([]);
    await user.click(within(dialog).getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByText('Daniel Whitmore signed out of every device')).toBeInTheDocument();
    expect(calls).toEqual([SEED.DANIEL]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign out everywhere' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Sign out everywhere' })).toHaveAttribute(
      'title',
      'No active sessions',
    );
    expect(screen.getByRole('group', { name: 'Active sessions' })).toHaveTextContent('No active sessions');
  });

  it("shows the server's refusal in the dialog and keeps it open", async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/sessions/revoke', () =>
        problem(409, 'NO_ACCOUNT', 'No login', 'A guest has no login. Make an account first.'),
      ),
    );
    const dialog = await openOne(user);
    await user.click(within(dialog).getByRole('button', { name: 'Sign out' }));
    expect(
      await within(dialog).findByText('A guest has no login. Make an account first.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Sign Daniel Whitmore out everywhere?' })).toBeInTheDocument();
  });

  it('sends nothing when it is cancelled', async () => {
    const user = userEvent.setup();
    const calls = recordCalls();
    const dialog = await openOne(user);
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calls).toEqual([]);
  });
});

describe('for the ticked accounts of the list', () => {
  const tick = async (user: User, ...ids: number[]) => {
    await accountsTable();
    for (const id of ids) await user.click(await screen.findByRole('checkbox', { name: `Select row ${id}` }));
  };
  const openMany = async (user: User) => {
    // One page holds every account (Zain Mobile Hub sorts last).
    await renderAccounts('/accounts?size=100');
    await tick(user, SEED.ZAIN, SEED.DANIEL);
    await user.click(
      within(screen.getByRole('group', { name: /With selected/ })).getByRole('button', {
        name: 'Sign out everywhere',
      }),
    );
    return screen.findByRole('dialog', { name: 'Sign 2 accounts out everywhere?' });
  };

  it('signs each one out in turn and says so in one toast', async () => {
    const user = userEvent.setup();
    const calls = recordCalls();
    const dialog = await openMany(user);
    expect(
      within(dialog).getByText('2 devices are signed in under these 2 accounts. They must sign in again.'),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByText('2 accounts signed out of every device')).toBeInTheDocument();
    // One request per account, in the order of the table (Account A to Z).
    expect(calls).toEqual([SEED.DANIEL, SEED.ZAIN]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // The ticks go with the dialog.
    expect(screen.getByText('With selected:')).toBeInTheDocument();
  });

  it('shows how far the run is while it goes', async () => {
    const user = userEvent.setup();
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    // The first account (Daniel, by name) is held until the test has looked at the line.
    mockServer.use(
      http.post('*/admin/clients/101/sessions/revoke', async () => {
        await gate;
        return undefined;
      }),
    );
    const dialog = await openMany(user);
    await user.click(within(dialog).getByRole('button', { name: 'Sign out' }));
    expect(await within(dialog).findByText('Signing out 1 of 2…')).toBeInTheDocument();
    release();
    expect(await screen.findByText('2 accounts signed out of every device')).toBeInTheDocument();
  });

  it('lists the accounts the server refused, with its reason, once the others went through', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/1/sessions/revoke', () =>
        problem(409, 'NOT_ACTIVE', 'Not active', 'This account is not active.'),
      ),
    );
    const dialog = await openMany(user);
    await user.click(within(dialog).getByRole('button', { name: 'Sign out' }));

    const summary = await screen.findByRole('dialog', { name: '1 of 2 accounts signed out' });
    expect(within(summary).getByText('Zain Mobile Hub')).toBeInTheDocument();
    expect(within(summary).getByText(/This account is not active\./)).toBeInTheDocument();
    await user.click(within(summary).getAllByRole('button', { name: 'Close' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
