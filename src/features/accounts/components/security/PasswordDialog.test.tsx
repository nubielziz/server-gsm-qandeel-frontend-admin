// Tests for the Password dialog, run through the whole app against the dev mock API: what the dialog starts with, a link and an
// invitation sent again, a temporary password shown once after the form has closed and kept nowhere else, the server's refusals staying in
// the dialog, and cancelling without a request. Ports the password cases of the old merchant and customer dialogs, with the words of
// the layout ("How", "Send a link").
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

const DANIEL = /Daniel Whitmore/; // 101: a retail login with a password and one session
const ALGIERS = /Algiers Service Plus/; // 18: invited, no password yet
const ZAIN = /Zain Mobile Hub/; // 1: a merchant

// The JSON body of every call a route gets; the mock then answers as usual.
function recordBodies(path: string): unknown[] {
  const bodies: unknown[] = [];
  mockServer.use(
    http.post(path, async ({ request }) => {
      bodies.push(await request.clone().json());
      return undefined;
    }),
  );
  return bodies;
}

const row = (label: string) => screen.getByRole('group', { name: label });

async function openDialog(user: ReturnType<typeof userEvent.setup>, id: number, name: RegExp, title: string) {
  await renderAccount(id, name, { tab: 'security' });
  await user.click(await screen.findByRole('button', { name: 'Password…' }, { timeout: 10_000 }));
  return screen.findByRole('dialog', { name: title });
}

describe('what it starts with', () => {
  it('offers a link and signing out of every device, and says what a link does', async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user, SEED.DANIEL, DANIEL, 'Password of Daniel Whitmore');
    const how = within(dialog).getByRole('switch', { name: 'How' });
    expect(how).toHaveAttribute('aria-checked', 'true');
    expect(within(how).getByText('Send a link')).toBeInTheDocument();
    expect(within(how).getByText('Temporary password')).toBeInTheDocument();
    expect(within(dialog).getByText(/They pick the password and you never see it/)).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: 'Sign out of every device' })).toBeChecked();
    expect(within(dialog).getByText('You can replace it but never read it.')).toBeInTheDocument();
  });

  it('offers the invitation again to an account that has no password yet', async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user, SEED.INVITED, ALGIERS, 'Password of Algiers Service Plus');
    expect(
      within(within(dialog).getByRole('switch', { name: 'How' })).getByText('Send the invitation again'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/The new invitation replaces the old one/)).toBeInTheDocument();
  });

  it('says what a temporary password means once it is chosen', async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user, SEED.DANIEL, DANIEL, 'Password of Daniel Whitmore');
    await user.click(within(dialog).getByRole('switch', { name: 'How' }));
    expect(within(dialog).getByRole('switch', { name: 'How' })).toHaveAttribute('aria-checked', 'false');
    expect(within(dialog).getByText(/show it to you once/)).toBeInTheDocument();
    expect(within(dialog).getByText(/must change it at the next sign-in/)).toBeInTheDocument();
  });
});

describe('a link', () => {
  it('sends a link and signs the account out of every device, as the dialog starts', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies('*/admin/clients/:id/password');
    const dialog = await openDialog(user, SEED.DANIEL, DANIEL, 'Password of Daniel Whitmore');
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Reset link sent')).toBeInTheDocument();
    expect(
      screen.getByText('Sent to daniel.whitmore@mail.example. The link works for 1 hour.'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([{ mode: 'reset_link', revokeSessions: true }]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // The record is read again: the sessions are gone and a reset link is open.
    await waitFor(() => expect(row('Active sessions')).toHaveTextContent('No active sessions'));
    expect(row('Password')).toHaveTextContent('A reset link is open.');
  });

  it('keeps the sessions when the box is unticked', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies('*/admin/clients/:id/password');
    const dialog = await openDialog(user, SEED.DANIEL, DANIEL, 'Password of Daniel Whitmore');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Sign out of every device' }));
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    await screen.findByText('Reset link sent');
    expect(bodies).toEqual([{ mode: 'reset_link', revokeSessions: false }]);
    await waitFor(() => expect(row('Password')).toHaveTextContent('A reset link is open.'));
    expect(row('Active sessions')).toHaveTextContent('1');
  });

  it('sends the invitation again to an account with no password, and says an invitation went out', async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user, SEED.INVITED, ALGIERS, 'Password of Algiers Service Plus');
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Invitation sent')).toBeInTheDocument();
  });
});

describe('a temporary password', () => {
  it('is shown once, after the form has closed, and is kept nowhere else', async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user, SEED.ZAIN, ZAIN, 'Password of Zain Mobile Hub');
    await user.click(within(dialog).getByRole('switch', { name: 'How' }));
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));

    const reveal = await screen.findByRole('dialog', { name: 'Temporary password for Zain Mobile Hub' });
    const password = within(reveal).getByText(/^[A-Za-z0-9]{14}$/).textContent ?? '';
    expect(password).toHaveLength(14);
    expect(within(reveal).getByRole('button', { name: 'Copy temporary password' })).toBeInTheDocument();
    // The form has gone: only the one-time dialog is open.
    expect(screen.queryByRole('dialog', { name: 'Password of Zain Mobile Hub' })).not.toBeInTheDocument();
    expect(await screen.findByText('Temporary password set')).toBeInTheDocument();
    // The part says the account must change it.
    await waitFor(() => expect(row('Password')).toHaveTextContent('Temporary (must change at next sign-in)'));

    await user.click(within(reveal).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText(password)).not.toBeInTheDocument();
  });

  it('keeps the sessions when the box was unticked', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies('*/admin/clients/:id/password');
    const dialog = await openDialog(user, SEED.DANIEL, DANIEL, 'Password of Daniel Whitmore');
    await user.click(within(dialog).getByRole('switch', { name: 'How' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Sign out of every device' }));
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    const reveal = await screen.findByRole('dialog', { name: 'Temporary password for Daniel Whitmore' });
    await user.click(within(reveal).getByRole('button', { name: 'Done' }));
    expect(bodies).toEqual([{ mode: 'temporary_password', revokeSessions: false }]);
    await waitFor(() => expect(row('Password')).toHaveTextContent('Temporary (must change at next sign-in)'));
    expect(row('Active sessions')).toHaveTextContent('1');
  });
});

describe("the server's refusals and cancelling", () => {
  it('shows a 409 in the dialog and keeps it open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/password', () =>
        problem(409, 'NOT_ACTIVE', 'Not active', 'This account is not active. Reactivate the account first.'),
      ),
    );
    const dialog = await openDialog(user, SEED.DANIEL, DANIEL, 'Password of Daniel Whitmore');
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(
      await within(dialog).findByText('This account is not active. Reactivate the account first.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Password of Daniel Whitmore' })).toBeInTheDocument();
  });

  it('shows a 429 in the dialog and keeps it open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/password', () =>
        problem(429, 'RATE_LIMITED', 'Too many emails', 'Five link emails an hour is the limit.'),
      ),
    );
    const dialog = await openDialog(user, SEED.DANIEL, DANIEL, 'Password of Daniel Whitmore');
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(await within(dialog).findByText('Five link emails an hour is the limit.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Password of Daniel Whitmore' })).toBeInTheDocument();
  });

  it('sends nothing when it is cancelled', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies('*/admin/clients/:id/password');
    const dialog = await openDialog(user, SEED.DANIEL, DANIEL, 'Password of Daniel Whitmore');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(bodies).toEqual([]);
  });

  it('starts empty again at the next opening', async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user, SEED.DANIEL, DANIEL, 'Password of Daniel Whitmore');
    await user.click(within(dialog).getByRole('switch', { name: 'How' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Sign out of every device' }));
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Password…' }));
    const again = await screen.findByRole('dialog', { name: 'Password of Daniel Whitmore' });
    expect(within(again).getByRole('switch', { name: 'How' })).toHaveAttribute('aria-checked', 'true');
    expect(within(again).getByRole('checkbox', { name: 'Sign out of every device' })).toBeChecked();
  });
});
