// Tests for the access page, run through the whole app against the dev mock API: the tabs and what hides them, adding an
// admin (by link and with a temporary password), suspending (refused for yourself, and the server's refusal), allowing and
// blocking addresses, the restriction switch, the address tester, editing a role and ending a session.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { mockMe, renderApp, setupMockApi, signInAs } from '@/test/renderApp';
import { createIpRule, listRoles, listSessions } from '../api';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 20_000 });

type User = ReturnType<typeof userEvent.setup>;

/**
 * Signs in as Rami (the Owner) and opens the page. `permissions` and `lastLoginIp` change what `me` says, before the
 * page loads it.
 */
async function openAccess(route = '/access', options: { permissions?: string[]; lastLoginIp?: string } = {}) {
  await signInAs();
  if (options.permissions || options.lastLoginIp) {
    mockMe({
      id: 1,
      name: 'Rami K.',
      lastLoginIp: options.lastLoginIp ?? '203.0.113.24',
      permissions: options.permissions ?? ['*'],
    });
  }
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Admins and access' }, { timeout: 10_000 });
  return app;
}

async function openTab(user: User, name: RegExp | string) {
  await user.click(
    within(screen.getByRole('tablist', { name: 'Access sections' })).getByRole('tab', { name }),
  );
}

/** The table with this accessible name, once it has loaded. */
async function tableNamed(name: string) {
  return within(await screen.findByRole('table', { name }));
}

/** The row of a table that holds some text (a name, an address). Drawers, dialogs and toasts are not searched. */
async function rowOf(table: string, text: string) {
  const row = (await (await tableNamed(table)).findByText(text)).closest('tr');
  if (!row) throw new Error(`No row of "${table}" holds "${text}".`);
  return within(row);
}

const adminRow = (text: string) => rowOf('Admin accounts', text);
const allowedRow = (text: string) => rowOf('Allowed IP addresses', text);
const blockedRow = (text: string) => rowOf('Blocked IP addresses', text);
const roleRow = (text: string) => rowOf('Roles', text);
const sessionRow = (text: string) => rowOf('Open sessions', text);

describe('tabs', () => {
  it('shows the five tabs with counts, and keeps the chosen tab in the URL', async () => {
    const user = userEvent.setup();
    const app = await openAccess();
    const tabs = screen.getByRole('tablist', { name: 'Access sections' });
    await waitFor(() =>
      expect(
        within(tabs)
          .getAllByRole('tab')
          .map((tab) => tab.textContent),
      ).toEqual(['Admin accounts6', 'Allowed IPs3', 'Blocked IPs4', 'Roles6', 'Sessions']),
    );
    expect(screen.getByRole('tab', { name: /Admin accounts/ })).toHaveAttribute('aria-selected', 'true');

    await openTab(user, /Blocked IPs/);
    expect(app.location()).toBe('/access?tab=block');
    expect(await screen.findByRole('heading', { name: 'Blocked addresses' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Blocked IPs/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens the tab named in the URL', async () => {
    await openAccess('/access?tab=roles');
    expect(await screen.findByRole('heading', { name: 'Roles' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Roles/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('hides the tabs the staff member cannot read, and falls back from a tab that is hidden', async () => {
    await openAccess('/access?tab=block', { permissions: ['staff:read', 'roles:read'] });
    const tabs = screen.getByRole('tablist', { name: 'Access sections' });
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent?.replace(/\d+$/, '')),
    ).toEqual(['Admin accounts', 'Roles']);
    expect(await screen.findByText('Rami K.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Blocked addresses' })).not.toBeInTheDocument();
  });

  it('disables a button the staff member lacks the permission for, and says which', async () => {
    await openAccess('/access', { permissions: ['staff:read'] });
    const add = await screen.findByRole('button', { name: 'Add admin' });
    expect(add).toBeDisabled();
    expect(add).toHaveAttribute('title', 'You need the staff:create permission');
  });
});

describe('admin accounts', () => {
  it('shows the figures and one row per admin, with "You" on your own', async () => {
    await openAccess();
    expect(await screen.findByText('Active admins')).toBeInTheDocument();
    expect(screen.getByText('3 signed in now')).toBeInTheDocument();
    expect(screen.getByText('Waiting to join')).toBeInTheDocument();
    const rami = await adminRow('Rami K.');
    expect(rami.getByText('You')).toBeInTheDocument();
    expect(rami.getByText('Active')).toBeInTheDocument();
    const nadia = await adminRow('Nadia H.');
    expect(nadia.getByText('Invited')).toBeInTheDocument();
    expect(nadia.getByText(/Link sent/)).toBeInTheDocument();
    expect((await adminRow('Yusuf A.')).getByText('Left the team')).toBeInTheDocument();
  });

  it('shows the server’s error with a Retry button when the list cannot load', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/staff', () => problem(503, 'UNAVAILABLE', 'Service unavailable', 'Try again soon.')),
    );
    await openAccess();
    expect(await screen.findByText('Could not load the admin accounts')).toBeInTheDocument();
    expect(await screen.findByText('mock-req-', { exact: false })).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await adminRow('Rami K.')).toBeTruthy();
  });

  it('adds an admin by invitation and opens their drawer', async () => {
    const user = userEvent.setup();
    await openAccess();
    await user.click(await screen.findByRole('button', { name: 'Add admin' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add an admin' });
    await user.type(within(dialog).getByLabelText('Full name'), 'Hana Q.');
    await user.type(within(dialog).getByLabelText('Work email'), 'hana@gsm-supply.example');
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'Finance');
    await user.click(within(dialog).getByRole('button', { name: 'Add admin' }));

    expect(await screen.findByText('Hana Q. added as Finance')).toBeInTheDocument();
    expect(
      screen.getByText('An invitation was sent to hana@gsm-supply.example. It works for 1 hour.'),
    ).toBeInTheDocument();
    const drawer = await screen.findByRole('dialog', { name: 'Hana Q.' });
    expect(within(drawer).getByText(/Invitation link sent/)).toBeInTheDocument();
    expect(within(drawer).getByText('hana@gsm-supply.example')).toBeInTheDocument();
    expect(await adminRow('Hana Q.')).toBeTruthy();
  });

  it('shows a temporary password once, with a copy button', async () => {
    const user = userEvent.setup();
    await openAccess();
    await user.click(await screen.findByRole('button', { name: 'Add admin' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add an admin' });
    await user.type(within(dialog).getByLabelText('Full name'), 'Tariq B.');
    await user.type(within(dialog).getByLabelText('Work email'), 'tariq@gsm-supply.example');
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'Support');
    await user.click(within(dialog).getByRole('radio', { name: /Set a temporary password now/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Add admin' }));

    const reveal = await screen.findByRole('dialog', { name: 'Temporary password for Tariq B.' });
    expect(within(reveal).getByText(/^[A-Za-z0-9]{14}$/)).toBeInTheDocument();
    expect(within(reveal).getByRole('button', { name: 'Copy temporary password' })).toBeInTheDocument();
    await user.click(within(reveal).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog', { name: 'Temporary password for Tariq B.' })).not.toBeInTheDocument();
  });

  it('checks the form before sending, and puts the server’s "email taken" under the email field', async () => {
    const user = userEvent.setup();
    await openAccess();
    await user.click(await screen.findByRole('button', { name: 'Add admin' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add an admin' });
    await user.click(within(dialog).getByRole('button', { name: 'Add admin' }));
    expect(await within(dialog).findByText('Enter their name.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a valid email address.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Full name'), 'Copy Cat');
    await user.type(within(dialog).getByLabelText('Work email'), 'lina@gsm-supply.example');
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'Support');
    await user.click(within(dialog).getByRole('button', { name: 'Add admin' }));
    expect(await within(dialog).findByText('An admin with this email already exists.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Work email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('edits an admin and lists what changed; says nothing changed when it did not', async () => {
    const user = userEvent.setup();
    await openAccess();
    await user.click((await adminRow('Lina S.')).getByRole('button', { name: 'Manage' }));
    const drawer = await screen.findByRole('dialog', { name: 'Lina S.' });
    await user.click(within(drawer).getByRole('button', { name: 'Edit details' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Lina S.' });

    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit Lina S.' })).not.toBeInTheDocument(),
    );

    await user.click(within(drawer).getByRole('button', { name: 'Edit details' }));
    const again = await screen.findByRole('dialog', { name: 'Edit Lina S.' });
    await user.selectOptions(within(again).getByLabelText('Role'), 'Finance');
    await user.clear(within(again).getByLabelText('Full name'));
    await user.type(within(again).getByLabelText('Full name'), 'Lina Saleh');
    await user.click(within(again).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Admin updated')).toBeInTheDocument();
    expect(screen.getByText('role, name changed.')).toBeInTheDocument();
    expect(await adminRow('Lina Saleh')).toBeTruthy();
  });

  it('locks the role of your own account in the edit dialog, with the reason', async () => {
    const user = userEvent.setup();
    await openAccess();
    await user.click((await adminRow('Rami K.')).getByRole('button', { name: 'Manage' }));
    const drawer = await screen.findByRole('dialog', { name: 'Rami K.' });
    await user.click(within(drawer).getByRole('button', { name: 'Edit details' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Rami K.' });
    expect(within(dialog).getByLabelText('Role')).toBeDisabled();
    expect(
      within(dialog).getByText('You cannot change your own role. Ask another Owner.'),
    ).toBeInTheDocument();
  });

  it('refuses to suspend yourself: the button is disabled and the reason is on screen', async () => {
    const user = userEvent.setup();
    await openAccess();
    await user.click((await adminRow('Rami K.')).getByRole('button', { name: 'Manage' }));
    const drawer = await screen.findByRole('dialog', { name: 'Rami K.' });
    const suspend = within(drawer).getByRole('button', { name: 'Suspend…' });
    expect(suspend).toBeDisabled();
    expect(suspend).toHaveAttribute('title', 'You cannot suspend yourself.');
    expect(within(drawer).getByText('You cannot suspend yourself.', { selector: 'p' })).toBeInTheDocument();
    // "Block IP…" is not offered for your own address.
    expect(within(drawer).queryByRole('button', { name: 'Block IP…' })).not.toBeInTheDocument();
  });

  it('suspends an admin with a reason and a note, then reactivates them', async () => {
    const user = userEvent.setup();
    await openAccess();
    await user.click((await adminRow('Lina S.')).getByRole('button', { name: 'Manage' }));
    const drawer = await screen.findByRole('dialog', { name: 'Lina S.' });
    await user.click(within(drawer).getByRole('button', { name: 'Suspend…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Suspend Lina S.?' });
    expect(within(dialog).getByText('Every session ends now (1 device).')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Suspend admin' }));
    expect(
      await within(dialog).findByText('Choose a reason so the next person knows why.'),
    ).toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText('Reason'), 'On leave');
    await user.type(within(dialog).getByLabelText('Note (optional)'), 'back in March');
    await user.click(within(dialog).getByRole('button', { name: 'Suspend admin' }));

    expect(await screen.findByText('Lina S. suspended')).toBeInTheDocument();
    expect(screen.getByText('1 session ended.')).toBeInTheDocument();
    expect(await within(drawer).findByText('On leave: back in March')).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'Reactivate' }));
    const confirm = await screen.findByRole('dialog', { name: 'Reactivate Lina S.?' });
    await user.click(within(confirm).getByRole('button', { name: 'Reactivate' }));
    expect(await screen.findByText('Lina S. reactivated')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(drawer).queryByText('On leave: back in March')).not.toBeInTheDocument(),
    );
  });

  it('shows the server’s refusal in the dialog and keeps it open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/staff/:id/suspend', () =>
        problem(
          409,
          'LAST_OWNER',
          'Last Owner',
          'There must always be one active Owner. Make someone else an Owner first.',
        ),
      ),
    );
    await openAccess();
    await user.click((await adminRow('Lina S.')).getByRole('button', { name: 'Manage' }));
    const drawer = await screen.findByRole('dialog', { name: 'Lina S.' });
    await user.click(within(drawer).getByRole('button', { name: 'Suspend…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Suspend Lina S.?' });
    await user.selectOptions(within(dialog).getByLabelText('Reason'), 'Other');
    await user.click(within(dialog).getByRole('button', { name: 'Suspend admin' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'There must always be one active Owner. Make someone else an Owner first.',
    );
    expect(screen.getByRole('dialog', { name: 'Suspend Lina S.?' })).toBeInTheDocument();
  });

  it('signs an admin out everywhere and resets their 2FA after a review step', async () => {
    const user = userEvent.setup();
    await openAccess();
    await user.click((await adminRow('Lina S.')).getByRole('button', { name: 'Manage' }));
    const drawer = await screen.findByRole('dialog', { name: 'Lina S.' });

    await user.click(within(drawer).getByRole('button', { name: 'Sign out everywhere' }));
    const signOut = await screen.findByRole('dialog', { name: 'Sign Lina S. out everywhere?' });
    expect(within(signOut).getByText(/signed out of 1 device right away/)).toBeInTheDocument();
    await user.click(within(signOut).getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText('Lina S. signed out')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(drawer).getByRole('button', { name: 'Sign out everywhere' })).toBeDisabled(),
    );

    await user.click(within(drawer).getByRole('button', { name: 'Reset 2FA…' }));
    const reset = await screen.findByRole('dialog', { name: 'Reset 2FA for Lina S.?' });
    await user.click(within(reset).getByRole('button', { name: 'Reset 2FA' }));
    expect(await screen.findByText('2FA reset for Lina S.')).toBeInTheDocument();
    await waitFor(() => expect(within(drawer).getByRole('button', { name: 'Reset 2FA…' })).toBeDisabled());
  });

  it('sends a reset link, or sets a temporary password that is shown once', async () => {
    const user = userEvent.setup();
    await openAccess();
    await user.click((await adminRow('Omar T.')).getByRole('button', { name: 'Manage' }));
    const drawer = await screen.findByRole('dialog', { name: 'Omar T.' });

    await user.click(within(drawer).getByRole('button', { name: 'Password…' }));
    let dialog = await screen.findByRole('dialog', { name: 'Password for Omar T.' });
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Reset link sent')).toBeInTheDocument();
    expect(screen.getByText('Sent to omar@gsm-supply.example. It works for 1 hour.')).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'Password…' }));
    dialog = await screen.findByRole('dialog', { name: 'Password for Omar T.' });
    await user.click(within(dialog).getByRole('radio', { name: /Set a temporary password now/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    const reveal = await screen.findByRole('dialog', { name: 'Temporary password for Omar T.' });
    expect(within(reveal).getByText(/^[A-Za-z0-9]{14}$/)).toBeInTheDocument();
    expect(await screen.findByText('Temporary password set')).toBeInTheDocument();
  });

  it('tells how an invited admin will join, and why a suspended one cannot', async () => {
    const user = userEvent.setup();
    await openAccess();
    await user.click((await adminRow('Nadia H.')).getByRole('button', { name: 'Manage' }));
    const invited = await screen.findByRole('dialog', { name: 'Nadia H.' });
    expect(
      within(invited).getByText('Invitation link sent 20m ago. It works for 1 hour.'),
    ).toBeInTheDocument();
    expect(within(invited).getByText('They set it up at first sign-in')).toBeInTheDocument();
    await user.click(within(invited).getByRole('button', { name: 'Close' }));

    await user.click((await adminRow('Yusuf A.')).getByRole('button', { name: 'Manage' }));
    const suspended = await screen.findByRole('dialog', { name: 'Yusuf A.' });
    expect(within(suspended).getByText(/Suspended 5d ago/)).toBeInTheDocument();
    expect(within(suspended).getByText('Left the team', { selector: 'p' })).toBeInTheDocument();
    expect(within(suspended).getByRole('button', { name: 'Reactivate' })).toBeEnabled();
    expect(within(suspended).queryByRole('button', { name: 'Suspend…' })).not.toBeInTheDocument();
  });

  it('marks an address the server would refuse: not on the allowlist, or blocked', async () => {
    const user = userEvent.setup();
    await openAccess();
    await createIpRule({ kind: 'block', scope: 'admin', cidr: '203.0.113.31', reason: 'Test' });

    await user.click((await adminRow('Yusuf A.')).getByRole('button', { name: 'Manage' }));
    const yusuf = await screen.findByRole('dialog', { name: 'Yusuf A.' });
    expect(await within(yusuf).findByText('Not on the allowlist')).toBeInTheDocument();
    await user.click(within(yusuf).getByRole('button', { name: 'Close' }));

    await user.click((await adminRow('Lina S.')).getByRole('button', { name: 'Manage' }));
    const lina = await screen.findByRole('dialog', { name: 'Lina S.' });
    expect(await within(lina).findByText('Blocked')).toBeInTheDocument();
  });

  it('offers "Block IP…" for another admin’s address, prefilled for the console', async () => {
    const user = userEvent.setup();
    await openAccess();
    await user.click((await adminRow('Omar T.')).getByRole('button', { name: 'Manage' }));
    const drawer = await screen.findByRole('dialog', { name: 'Omar T.' });
    await user.click(await within(drawer).findByRole('button', { name: 'Block IP…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Block an IP' });
    expect(within(dialog).getByLabelText('IP address or range')).toHaveValue('198.51.100.77');
    expect(within(dialog).getByLabelText('Who it applies to')).toHaveValue('admin');
    expect(within(dialog).getByLabelText('Block for')).toHaveValue('168');
    expect(within(dialog).getByText(/Last used by Omar T\./)).toBeInTheDocument();
  });
});

describe('allowed IPs', () => {
  it('lists the allowed addresses and adds one, checking the address first', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=allow');
    expect(await screen.findByText('Rami, Amman office')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add IP' }));
    const dialog = await screen.findByRole('dialog', { name: 'Allow an address' });
    await user.type(within(dialog).getByLabelText('IP address or range'), 'nope');
    await user.click(within(dialog).getByRole('button', { name: 'Allow address' }));
    expect(
      await within(dialog).findByText(
        'Enter an IPv4 address like 203.0.113.24, or a range like 203.0.113.0/24.',
      ),
    ).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('IP address or range'));
    await user.type(within(dialog).getByLabelText('IP address or range'), '198.51.100.10');
    await user.type(within(dialog).getByLabelText('Label'), 'Hana, home');
    await user.selectOptions(within(dialog).getByLabelText('For how long'), '7 days');
    await user.click(within(dialog).getByRole('button', { name: 'Allow address' }));

    expect(await screen.findByText('198.51.100.10 allowed')).toBeInTheDocument();
    expect(screen.getByText('It can open the admin console now.')).toBeInTheDocument();
    const row = await allowedRow('Hana, home');
    expect(row.getByText('198.51.100.10')).toBeInTheDocument();
    expect(row.getByText(/in 7d/)).toBeInTheDocument();
  });

  it('says so when the staff member cannot read the setting behind the switch', async () => {
    await openAccess('/access?tab=allow', { permissions: ['staff:read', 'access:read', 'access:update'] });
    expect(
      await screen.findByText('You need the settings:read permission to see whether this is on.'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('switch', { name: /Turn on/ })).toBeDisabled();
  });

  it('refuses a range that is too wide', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=allow');
    await user.click(await screen.findByRole('button', { name: 'Add IP' }));
    const dialog = await screen.findByRole('dialog', { name: 'Allow an address' });
    await user.type(within(dialog).getByLabelText('IP address or range'), '10.0.0.0/8');
    await user.click(within(dialog).getByRole('button', { name: 'Allow address' }));
    expect(
      await within(dialog).findByText('That range is too wide (16,777,216 addresses). Use /16 or narrower.'),
    ).toBeInTheDocument();
  });

  it('removes an address after a review step', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=allow');
    await user.click(
      (await allowedRow('Lina and Dana, Amman office')).getByRole('button', { name: 'Remove' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Remove 203.0.113.31?' });
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));
    expect(await screen.findByText('Removed')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Lina and Dana, Amman office')).not.toBeInTheDocument());
  });

  it('will not remove the only rule that lets you in, and says why', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=allow');
    await user.click((await allowedRow('Rami, Amman office')).getByRole('button', { name: 'Remove' }));
    const dialog = await screen.findByRole('dialog', { name: 'Remove 203.0.113.24?' });
    const reason =
      'This is the rule that lets you in right now. Add another one that covers your address first, or turn the restriction off.';
    expect(within(dialog).getByText(reason)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(reason);
    expect(screen.getByText('Rami, Amman office')).toBeInTheDocument();
  });

  it('turns the restriction off after asking, and on again', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=allow');
    expect((await screen.findByText(/is allowed by/)).closest('span')).toHaveTextContent(
      'Your address 203.0.113.24 is allowed by “Rami, Amman office”.',
    );

    await user.click(await screen.findByRole('switch', { name: /Turn off/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Open the admin console to any address?' });
    await user.click(within(dialog).getByRole('button', { name: 'Turn off' }));
    expect(await screen.findByText('IP restriction is off')).toBeInTheDocument();
    const toggle = await screen.findByRole('switch', { name: /Turn on/ });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText(/Right now the sign-in page opens from any address/)).toBeInTheDocument();

    await user.click(toggle);
    expect(await screen.findByText('Only allowed IPs can open the console')).toBeInTheDocument();
    expect(await screen.findByRole('switch', { name: /Turn off/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('asks you to add your own address before turning the restriction on without it', async () => {
    const user = userEvent.setup();
    // The caller signed in from an address no rule covers.
    await openAccess('/access?tab=allow', { lastLoginIp: '198.51.100.99' });
    await user.click(await screen.findByRole('switch', { name: /Turn off/ }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Open the admin console to any address?' })).getByRole(
        'button',
        {
          name: 'Turn off',
        },
      ),
    );
    await user.click(await screen.findByRole('switch', { name: /Turn on/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Add your address first' });
    expect(
      within(dialog).getByText(/Your own address \(198\.51\.100\.99\) is not on the list/),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Add my IP and turn on' }));
    expect(await screen.findByText('Only allowed IPs can open the console')).toBeInTheDocument();
    expect(await allowedRow('Me, Rami K.')).toBeTruthy();
  });

  it('shows the server’s refusal when it will not turn the restriction on', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=allow');
    await user.click(await screen.findByRole('switch', { name: /Turn off/ }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Open the admin console to any address?' })).getByRole(
        'button',
        {
          name: 'Turn off',
        },
      ),
    );
    // Now the server refuses to turn it on again, and a toast shows its words.
    mockServer.use(
      http.put('*/admin/access/restriction', () =>
        problem(
          409,
          'IP_NOT_IN_ALLOWLIST',
          'You would lock yourself out',
          'Your address is not on the list.',
        ),
      ),
    );
    await user.click(await screen.findByRole('switch', { name: /Turn on/ }));
    expect(await screen.findByText('You would lock yourself out')).toBeInTheDocument();
    expect(screen.getByText(/Your address is not on the list\./)).toBeInTheDocument();
  });
});

describe('blocked IPs and the address tester', () => {
  it('shows the figures and the blocked addresses, and filters by who is blocked', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=block');
    expect(await screen.findByText('Active blocks')).toBeInTheDocument();
    expect(screen.getByText('Added by the risk engine')).toBeInTheDocument();
    expect(await screen.findByText('192.0.2.0/24')).toBeInTheDocument();
    expect(screen.getByText('4 rules')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Customers' }));
    // A rule for everyone still applies to customers.
    expect(screen.getByText('2 rules')).toBeInTheDocument();
    const table = await tableNamed('Blocked IP addresses');
    expect(table.queryByText('203.0.113.160/28')).not.toBeInTheDocument();
    expect(table.getByText('198.51.100.231')).toBeInTheDocument();
  });

  it('blocks an address, then tests it and sees why it is refused', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=block');
    await user.click(await screen.findByRole('button', { name: 'Block an IP' }));
    const dialog = await screen.findByRole('dialog', { name: 'Block an IP' });
    await user.type(within(dialog).getByLabelText('IP address or range'), '198.51.100.50');
    await user.selectOptions(within(dialog).getByLabelText('Who it applies to'), 'Merchants using the API');
    await user.click(within(dialog).getByRole('button', { name: 'Block IP' }));
    expect(
      await within(dialog).findByText('Add a short reason so the next person knows why.'),
    ).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Reason'), 'Scraping the price list');
    await user.click(within(dialog).getByRole('button', { name: 'Block IP' }));

    expect(await screen.findByText('198.51.100.50 blocked')).toBeInTheDocument();
    expect(screen.getByText('Merchants (API), until you unblock it.')).toBeInTheDocument();
    expect(await screen.findByText('Scraping the price list')).toBeInTheDocument();

    const tester = screen.getByRole('region', { name: 'Test an address' });
    await user.type(within(tester).getByLabelText('IP address'), '198.51.100.50');
    await user.selectOptions(within(tester).getByLabelText('Where'), 'Merchant API');
    await user.click(within(tester).getByRole('button', { name: 'Check' }));
    const result = await within(tester).findByRole('status');
    expect(result).toHaveTextContent('Refused');
    expect(result).toHaveTextContent('198.51.100.50 on merchant api.');
    expect(result).toHaveTextContent(
      'Blocked by the rule for 198.51.100.50 (Merchant API): Scraping the price list.',
    );

    await user.selectOptions(within(tester).getByLabelText('Where'), 'Storefront');
    await user.click(within(tester).getByRole('button', { name: 'Check' }));
    await waitFor(() =>
      expect(within(tester).getByRole('status')).toHaveTextContent(
        'No block rule matches. The address can connect.',
      ),
    );
  });

  it('tells you about a bad address in the tester without asking the server', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=block');
    const tester = await screen.findByRole('region', { name: 'Test an address' });
    await user.type(within(tester).getByLabelText('IP address'), '999.1.1.1');
    await user.click(within(tester).getByRole('button', { name: 'Check' }));
    expect(await within(tester).findByRole('alert')).toHaveTextContent(
      'Each part of an IPv4 address is 0 to 255.',
    );
  });

  it('will not block a range that includes your own address for the console', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=block');
    await user.click(await screen.findByRole('button', { name: 'Block an IP' }));
    const dialog = await screen.findByRole('dialog', { name: 'Block an IP' });
    await user.type(within(dialog).getByLabelText('IP address or range'), '203.0.113.0/24');
    await user.selectOptions(within(dialog).getByLabelText('Who it applies to'), 'Admins on the console');
    await user.type(within(dialog).getByLabelText('Reason'), 'Test');
    await user.click(within(dialog).getByRole('button', { name: 'Block IP' }));
    expect(
      await within(dialog).findByText(
        'This includes your own address (203.0.113.24). You would lock yourself out of the console.',
      ),
    ).toBeInTheDocument();
  });

  it('unblocks an address after a review step', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=block');
    await user.click((await blockedRow('203.0.113.160/28')).getByRole('button', { name: 'Unblock' }));
    const dialog = await screen.findByRole('dialog', { name: 'Unblock 203.0.113.160/28?' });
    expect(within(dialog).getByText(/are accepted again for merchants \(api\)/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Unblock' }));
    expect(await screen.findByText('Unblocked')).toBeInTheDocument();
    await waitFor(async () =>
      expect(
        (await tableNamed('Blocked IP addresses')).queryByText('203.0.113.160/28'),
      ).not.toBeInTheDocument(),
    );
  });
});

describe('roles', () => {
  it('lists the roles with their permission counts and a read-only summary', async () => {
    await openAccess('/access?tab=roles');
    const owner = await roleRow('Owner');
    expect(owner.getByText('All')).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Role permissions' })).toBeInTheDocument();
    const summary = within(screen.getByRole('table', { name: 'Role permissions' }));
    const ownerRow = summary.getByRole('rowheader', { name: /Owner/ }).closest('tr')!;
    expect(within(ownerRow).getAllByText('Full')).toHaveLength(8);
    const readOnly = summary.getByRole('rowheader', { name: /Read only/ }).closest('tr')!;
    expect(within(readOnly).getAllByText('View').length).toBeGreaterThan(0);
  });

  it('edits a role: permissions come grouped by prefix and only the change is saved', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=roles');
    await user.click(await screen.findByRole('button', { name: 'Support' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Support' });

    const audit = await within(dialog).findByRole('group', { name: 'Audit' });
    await user.click(within(audit).getByRole('checkbox', { name: 'Read' }));
    // Support already has `support:*`, which covers the whole Support group: ticked and fixed.
    const support = within(dialog).getByRole('group', { name: 'Support' });
    expect(within(support).getByRole('checkbox', { name: 'Reply' })).toBeChecked();
    expect(within(support).getByRole('checkbox', { name: 'Reply' })).toBeDisabled();
    expect(within(dialog).getByRole('group', { name: 'Other entries' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Support role updated')).toBeInTheDocument();
    const roles = (await listRoles()).data;
    expect(roles.find((role) => role.name === 'Support')?.permissions).toContain('audit:read');
    expect(roles.find((role) => role.name === 'Support')?.permissions).toContain('support:*');
  });

  it('says nothing changed when a role is saved as it was', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=roles');
    await user.click(await screen.findByRole('button', { name: 'Risk reviewer' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Risk reviewer' });
    await within(dialog).findByRole('group', { name: 'Audit' });
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
  });

  it('creates a role from a name and ticked permissions', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=roles');
    await user.click(await screen.findByRole('button', { name: 'New role' }));
    const dialog = await screen.findByRole('dialog', { name: 'New role' });
    await user.click(within(dialog).getByRole('button', { name: 'Create role' }));
    expect(await within(dialog).findByText('Enter a role name.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Role name'), 'Auditor');
    const staff = await within(dialog).findByRole('group', { name: 'Staff' });
    await user.click(within(staff).getByRole('checkbox', { name: 'Select all Staff' }));
    await user.click(within(dialog).getByRole('button', { name: 'Create role' }));
    expect(await screen.findByText('Auditor role created')).toBeInTheDocument();
    expect(screen.getByText('4 permissions.')).toBeInTheDocument();
    const created = (await listRoles()).data.find((role) => role.name === 'Auditor');
    expect(created?.permissions).toEqual(['staff:read', 'staff:create', 'staff:update', 'staff:suspend']);
  });

  it('disables Delete for a role that admins still hold, and deletes one nobody has', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=roles');
    const support = await roleRow('Support');
    expect(support.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(support.getByRole('button', { name: 'Delete' })).toHaveAttribute(
      'title',
      '1 admin still has this role. Give them another role first.',
    );

    await user.click(screen.getByRole('button', { name: 'New role' }));
    const dialog = await screen.findByRole('dialog', { name: 'New role' });
    await user.type(within(dialog).getByLabelText('Role name'), 'Temp');
    await user.click(within(dialog).getByRole('button', { name: 'Create role' }));
    expect(await screen.findByText('Temp role created')).toBeInTheDocument();

    await user.click((await roleRow('Temp')).getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('dialog', { name: 'Delete Temp?' });
    await user.click(within(confirm).getByRole('button', { name: 'Delete role' }));
    expect(await screen.findByText('Temp role deleted')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await tableNamed('Roles')).queryByRole('button', { name: 'Temp' })).not.toBeInTheDocument(),
    );
  });
});

describe('sessions', () => {
  it('lists who is signed in, from where and on what, and marks your own session', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=sessions');
    const zain = await sessionRow('Zain Mobile Hub');
    expect(zain.getByText('Merchant')).toBeInTheDocument();
    expect(zain.getByText('203.0.113.55')).toBeInTheDocument();
    expect(await screen.findAllByText('This session')).toHaveLength(1);
    expect(screen.getAllByText(/^(Chrome|Safari|Firefox|Edge) on /).length).toBeGreaterThan(3);

    await user.click(screen.getByRole('button', { name: 'Merchants' }));
    await waitFor(async () =>
      expect((await tableNamed('Open sessions')).queryByText('Rami K.')).not.toBeInTheDocument(),
    );
    expect((await tableNamed('Open sessions')).getByText('Zain Mobile Hub')).toBeInTheDocument();
  });

  it('ends a session after a review step', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=sessions');
    await user.click((await sessionRow('Zain Mobile Hub')).getByRole('button', { name: 'End session' }));
    const dialog = await screen.findByRole('dialog', { name: "End Zain Mobile Hub's session?" });
    await user.click(within(dialog).getByRole('button', { name: 'End session' }));
    expect(await screen.findByText('Session ended')).toBeInTheDocument();
    expect(screen.getByText('Zain Mobile Hub was signed out of that device.')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await tableNamed('Open sessions')).queryByText('Zain Mobile Hub')).not.toBeInTheDocument(),
    );
    expect((await listSessions()).total).toBe(6);
  });

  it('warns before you end your own session', async () => {
    const user = userEvent.setup();
    await openAccess('/access?tab=sessions');
    const own = (await screen.findByText('This session')).closest('tr');
    await user.click(within(own!).getByRole('button', { name: 'End session' }));
    const dialog = await screen.findByRole('dialog', { name: "End Rami K.'s session?" });
    expect(within(dialog).getByText(/Ending it signs you out of the console/)).toBeInTheDocument();
  });

  it('shows an empty state when nobody is signed in', async () => {
    mockServer.use(
      http.get('*/admin/sessions', () => Response.json([], { headers: { 'x-total-count': '0' } })),
    );
    await openAccess('/access?tab=sessions');
    expect(await screen.findByText('No open sessions')).toBeInTheDocument();
  });
});
