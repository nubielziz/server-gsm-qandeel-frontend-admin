// Tests for the Make an account dialog, run through the whole app against the dev mock API (it opens from the list's "…" menu of a guest): the
// words and what it sends, a link and a temporary password shown once after the form has closed, the guest turning into an account, the
// refusal for an email another account with a login uses (with the way to find that account), and what a role without clients:security
// sees. Ports the create-account cases of the old customer dialogs.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem, type ProblemError } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { accountRow, renderAccounts, type RenderOptions } from '../../pages/test-utils';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
vi.setConfig({ testTimeout: 30_000 });

type User = ReturnType<typeof userEvent.setup>;

// The JSON body of every call the route gets; the mock then answers as usual.
function recordBodies(): unknown[] {
  const bodies: unknown[] = [];
  mockServer.use(
    http.post('*/admin/clients/:id/account', async ({ request }) => {
      bodies.push(await request.clone().json());
      return undefined;
    }),
  );
  return bodies;
}

// Sofia Alvarez (102) is a guest who has not ordered: open her row's menu and choose "Make an account…".
async function openDialog(user: User, options: RenderOptions = {}) {
  await renderAccounts('/accounts?q=alvarez', options);
  await accountRow('Sofia Alvarez');
  await user.click(await screen.findByRole('button', { name: 'More actions for Sofia Alvarez' }));
  const menu = within(await screen.findByRole('menu', { name: 'Actions for Sofia Alvarez' }));
  await user.click(await menu.findByRole('menuitem', { name: 'Make an account…' }));
  return screen.findByRole('dialog', { name: 'Make an account for Sofia Alvarez' });
}

describe('the dialog', () => {
  it('says what it does and starts on a link', async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    expect(
      within(dialog).getByText(
        'Turns this guest into an account with a login, on the retail rank. Their orders stay on it.',
      ),
    ).toBeInTheDocument();
    const how = within(dialog).getByRole('switch', { name: 'How' });
    expect(how).toHaveAttribute('aria-checked', 'true');
    expect(within(how).getByText('Send a link')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Make account' })).toBeInTheDocument();
  });

  it('gives a guest an account with a link, and the guest becomes an account', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies();
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Make account' }));

    expect(await screen.findByText('Account created')).toBeInTheDocument();
    expect(
      screen.getByText('A link to set the password went to sofia.alvarez@inbox.example.'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([{ mode: 'reset_link' }]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // The list reads again: the guest is an account with an invitation waiting.
    await waitFor(async () => {
      const row = await accountRow('Sofia Alvarez');
      expect(row.getByText('Invitation pending')).toBeInTheDocument();
      expect(row.queryByText('Guest')).not.toBeInTheDocument();
    });
  });

  it('shows a temporary password once, after the form has closed', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies();
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('switch', { name: 'How' }));
    await user.click(within(dialog).getByRole('button', { name: 'Make account' }));

    const reveal = await screen.findByRole('dialog', { name: 'Temporary password for Sofia Alvarez' });
    const password = within(reveal).getByText(/^[A-Za-z0-9]{14}$/).textContent ?? '';
    expect(password).toHaveLength(14);
    expect(
      screen.queryByRole('dialog', { name: 'Make an account for Sofia Alvarez' }),
    ).not.toBeInTheDocument();
    expect(bodies).toEqual([{ mode: 'temporary_password' }]);
    await user.click(within(reveal).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText(password)).not.toBeInTheDocument();
  });

  it('turns the temporary password off for a role without clients:security, and names the permission', async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user, {
      permissions: ['clients:read', 'clients:update'],
    });
    const how = within(dialog).getByRole('switch', { name: 'How' });
    expect(how).toBeDisabled();
    expect(how).toHaveAttribute('title', 'You need the clients:security permission');
    expect(
      within(dialog).getByText(/You need the clients:security permission for a temporary password/),
    ).toBeInTheDocument();
    expect(how).toHaveAttribute('aria-checked', 'true');
  });
});

describe("the server's refusals", () => {
  it('says another account with a login uses the email, with the way to find it, and stays open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/account', () =>
        problem(409, 'EMAIL_TAKEN', 'Email already in use', 'Another account with a login uses this email.', [
          {
            field: 'email',
            code: 'login_exists',
            message: 'Another account with a login uses this email.',
          } as ProblemError,
        ]),
      ),
    );
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Make account' }));
    expect(
      await within(dialog).findByText(/Another account with a login uses this email\./),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Find it' })).toHaveAttribute(
      'href',
      '/accounts?q=sofia.alvarez%40inbox.example',
    );
    expect(screen.getByRole('dialog', { name: 'Make an account for Sofia Alvarez' })).toBeInTheDocument();
  });

  it('shows any other refusal in the dialog', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/account', () =>
        problem(409, 'ACCOUNT_EXISTS', 'Already has an account', 'This account already has a login.'),
      ),
    );
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Make account' }));
    expect(await within(dialog).findByText('This account already has a login.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: 'Find it' })).not.toBeInTheDocument();
  });

  it('sends nothing when it is cancelled', async () => {
    const user = userEvent.setup();
    const bodies = recordBodies();
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(bodies).toEqual([]);
  });
});
