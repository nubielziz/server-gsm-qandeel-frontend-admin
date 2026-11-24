// Tests for the Reset two-step sign-in dialog, run through the whole app against the dev mock API: the review step, the notice it gives, the
// toast and the part following (the button goes off once two-step sign-in is off), the server's refusal staying in the dialog, and
// cancelling without a request. Ports the reset cases of the old merchant Security tab.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { renderAccount } from '../../pages/test-utils';
import { SEED } from '../../test/apiSupport';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
vi.setConfig({ testTimeout: 30_000 });

const ZAIN = /Zain Mobile Hub/; // 1: two-step sign-in on, one session

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await renderAccount(SEED.ZAIN, ZAIN, { tab: 'security' });
  await user.click(
    await screen.findByRole('button', { name: 'Reset two-step sign-in…' }, { timeout: 10_000 }),
  );
  return screen.findByRole('dialog', { name: 'Reset two-step sign-in of Zain Mobile Hub?' });
}

describe('Reset two-step sign-in…', () => {
  it('asks first and says what happens, then turns two-step sign-in off', async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    expect(
      within(dialog).getByText(/Two-step sign-in is turned off and every session of theirs ends/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/emailed a security notice/)).toBeInTheDocument();
    expect(within(dialog).getByText('They set it up again at the next sign-in.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Reset two-step sign-in' }));

    expect(await screen.findByText('Two-step sign-in reset for Zain Mobile Hub')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const part = within(screen.getByRole('group', { name: 'Two-step sign-in' }));
    await waitFor(() => expect(part.getByText('Off')).toBeInTheDocument());
    // Every session ended with it, and there is nothing left to reset.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Reset two-step sign-in…' })).toBeDisabled(),
    );
    expect(screen.getByRole('button', { name: 'Reset two-step sign-in…' })).toHaveAttribute(
      'title',
      'Two-step sign-in is already off',
    );
    expect(screen.getByRole('group', { name: 'Active sessions' })).toHaveTextContent('No active sessions');
  });

  it("shows the server's refusal in the dialog and keeps it open", async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/reset-2fa', () =>
        problem(
          409,
          'TWOFA_NOT_ENABLED',
          'Two-step sign-in is off',
          'This account has not turned on two-step sign-in.',
        ),
      ),
    );
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Reset two-step sign-in' }));
    expect(
      await within(dialog).findByText('This account has not turned on two-step sign-in.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: 'Reset two-step sign-in of Zain Mobile Hub?' }),
    ).toBeInTheDocument();
  });

  it('sends nothing when it is cancelled', async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockServer.use(
      http.post('*/admin/clients/:id/reset-2fa', () => {
        calls += 1;
        return undefined;
      }),
    );
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calls).toBe(0);
  });
});
