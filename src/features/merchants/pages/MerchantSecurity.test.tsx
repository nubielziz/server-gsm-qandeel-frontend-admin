// Tests for the Security tab of a merchant's page (feature 20), run through the whole app against the dev mock API: the sign-in facts,
// the password dialog (link, invitation, temporary password shown once), sign out everywhere, reset 2FA, resend verification,
// the merchant's own sessions, and what a role without clients:security or sessions:read sees.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { installMerchantMocks } from '../test/installMerchantMocks';
import { openMerchant, rowOf } from '../test/openMerchants';

setupMockApi();
installMerchantMocks();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 30_000 });

const ZAIN = /Zain Mobile Hub/;
const ALGIERS = /Algiers Service Plus/;
const ACCRA = /Accra Devices/;

async function openSecurity(permissions?: string[], id = 1, name: string | RegExp = ZAIN) {
  await openMerchant(id, name, '?tab=security', permissions ? { permissions } : {});
  return within(screen.getByRole('tabpanel', { name: 'Security' }));
}

// The value shown beside a label of the tab's fact list.
const fact = (panel: ReturnType<typeof within>, label: string) => panel.getByText(label).nextElementSibling;

describe('sign-in facts', () => {
  it('shows the password, 2FA, email, last sign-in and the open sessions of a merchant who trades', async () => {
    const panel = await openSecurity();
    expect(fact(panel, 'Password')).toHaveTextContent('Set');
    expect(fact(panel, 'Two-factor (2FA)')).toHaveTextContent('On');
    expect(fact(panel, 'Email')).toHaveTextContent('Verified');
    expect(fact(panel, 'Last sign-in')).toHaveTextContent(/ago from 203\.0\.113\.55/);
    expect(fact(panel, 'Active sessions')).toHaveTextContent('1');
    const row = await rowOf('Open sessions', '203.0.113.55');
    expect(row.getByRole('button', { name: 'End session from 203.0.113.55' })).toBeEnabled();
  });

  it('says an invited merchant has no password yet and when the link went out', async () => {
    const panel = await openSecurity(undefined, 18, ALGIERS);
    expect(fact(panel, 'Password')).toHaveTextContent('Not set yet (invitation)');
    expect(fact(panel, 'Link')).toHaveTextContent('Link sent 20m ago, works for 1 hour');
    expect(fact(panel, 'Last sign-in')).toHaveTextContent('Never');
    expect(fact(panel, 'Email')).toHaveTextContent('Not verified');
  });

  it('says when the verification email went out', async () => {
    const panel = await openSecurity(undefined, 20, ACCRA);
    expect(fact(panel, 'Email')).toHaveTextContent('Not verified');
    expect(fact(panel, 'Email')).toHaveTextContent('Verification sent 2h ago');
  });
});

describe('password', () => {
  it('emails a reset link, signing the merchant out of every device by default', async () => {
    const user = userEvent.setup();
    let body: unknown;
    mockServer.use(
      http.post('*/admin/clients/:id/password', async ({ request }) => {
        body = await request.json();
        return new Response(JSON.stringify({ link: 'reset' }), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
      }),
    );
    await openSecurity();
    await user.click(await screen.findByRole('button', { name: 'Password…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Password for Zain Mobile Hub' });
    expect(within(dialog).getByRole('radio', { name: /Email a link to choose it/ })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: 'Sign them out of every device' })).toBeChecked();
    expect(
      within(dialog).getByText(/The merchant must choose a new password at the next sign-in\./),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Reset link sent')).toBeInTheDocument();
    expect(
      screen.getByText('Sent to ops@zainmobilehub.example. The link works for 1 hour.'),
    ).toBeInTheDocument();
    expect(body).toEqual({ mode: 'reset_link', revokeSessions: true });
  });

  it('offers the invitation again to a merchant with no password, and says an invitation went out', async () => {
    const user = userEvent.setup();
    await openSecurity(undefined, 18, ALGIERS);
    await user.click(await screen.findByRole('button', { name: 'Password…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Password for Algiers Service Plus' });
    expect(within(dialog).getByRole('radio', { name: /Email the invitation again/ })).toBeChecked();
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Invitation sent')).toBeInTheDocument();
  });

  it('shows a temporary password once, after the dialog closes, and keeps it nowhere else', async () => {
    const user = userEvent.setup();
    await openSecurity();
    await user.click(await screen.findByRole('button', { name: 'Password…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Password for Zain Mobile Hub' });
    await user.click(within(dialog).getByRole('radio', { name: /Set a temporary password now/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    const reveal = await screen.findByRole('dialog', { name: 'Temporary password for Zain Mobile Hub' });
    const password = within(reveal).getByText(/^[A-Za-z0-9]{14}$/).textContent ?? '';
    expect(password).toHaveLength(14);
    expect(await screen.findByText('Temporary password set')).toBeInTheDocument();
    // The merchant must now change it: the tab says so.
    await waitFor(() =>
      expect(fact(within(screen.getByRole('tabpanel', { name: 'Security' })), 'Password')).toHaveTextContent(
        'Temporary (must change at next sign-in)',
      ),
    );
    await user.click(within(reveal).getByRole('button', { name: 'Done' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Temporary password for Zain Mobile Hub' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByText(password)).not.toBeInTheDocument();
  });

  it('shows a 409 and a 429 in the dialog and keeps it open', async () => {
    const user = userEvent.setup();
    await openSecurity(undefined, 19, /Tunis Fix Point/);
    await user.click(await screen.findByRole('button', { name: 'Password…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Password for Tunis Fix Point' });
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(
      await within(dialog).findByText('This merchant is suspended. Reactivate the account first.'),
    ).toBeInTheDocument();
    mockServer.use(
      http.post('*/admin/clients/:id/password', () =>
        problem(429, 'RATE_LIMITED', 'Too many emails', 'Five link emails an hour is the limit.'),
      ),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(await within(dialog).findByText('Five link emails an hour is the limit.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Password for Tunis Fix Point' })).toBeInTheDocument();
  });
});

describe('sign out, 2FA and verification', () => {
  it('signs the merchant out everywhere after a review step, then the button is off and the sessions are gone', async () => {
    const user = userEvent.setup();
    await openSecurity();
    await user.click(await screen.findByRole('button', { name: 'Sign out everywhere' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sign Zain Mobile Hub out everywhere?' });
    expect(within(dialog).getByText(/signed out of 1 session/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText('Zain Mobile Hub signed out of every device')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign out everywhere' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Sign out everywhere' })).toHaveAttribute(
      'title',
      'No active sessions',
    );
    expect(await screen.findByText('No open sessions')).toBeInTheDocument();
  });

  it('resets 2FA after a review step, and the button goes off when 2FA is off', async () => {
    const user = userEvent.setup();
    await openSecurity();
    await user.click(await screen.findByRole('button', { name: 'Reset 2FA…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reset 2FA for Zain Mobile Hub?' });
    await user.click(within(dialog).getByRole('button', { name: 'Reset 2FA' }));
    expect(await screen.findByText('2FA reset for Zain Mobile Hub')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reset 2FA…' })).toBeDisabled());
  });

  it('shows the server’s TWOFA_NOT_ENABLED refusal in the dialog', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/reset-2fa', () =>
        problem(409, 'TWOFA_NOT_ENABLED', 'Two-factor is off', 'This merchant has not turned on 2FA.'),
      ),
    );
    await openSecurity();
    await user.click(await screen.findByRole('button', { name: 'Reset 2FA…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reset 2FA for Zain Mobile Hub?' });
    await user.click(within(dialog).getByRole('button', { name: 'Reset 2FA' }));
    expect(await within(dialog).findByText('This merchant has not turned on 2FA.')).toBeInTheDocument();
  });

  it('resends the verification email, and is off for a verified email', async () => {
    const user = userEvent.setup();
    await openSecurity(undefined, 20, ACCRA);
    await user.click(await screen.findByRole('button', { name: 'Resend verification email' }));
    expect(await screen.findByText('Verification email sent')).toBeInTheDocument();
    await waitFor(() =>
      expect(fact(within(screen.getByRole('tabpanel', { name: 'Security' })), 'Email')).toHaveTextContent(
        'Verification sent just now',
      ),
    );
  });

  it('shows the server’s refusal of a resend in a toast', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/verify-email/resend', () =>
        problem(429, 'RATE_LIMITED', 'Too many emails', 'Five mails an hour is the limit.'),
      ),
    );
    await openSecurity(undefined, 20, ACCRA);
    await user.click(await screen.findByRole('button', { name: 'Resend verification email' }));
    expect(await screen.findByText('Too many emails')).toBeInTheDocument();
  });

  it('turns the buttons off when there is nothing to do', async () => {
    await openSecurity(undefined, 4, /Basra Unlock Center/);
    // Merchant 4: verified email, 2FA off, no open sessions.
    const verify = await screen.findByRole('button', { name: 'Resend verification email' });
    expect(verify).toBeDisabled();
    expect(verify).toHaveAttribute('title', 'The email is already verified');
    expect(screen.getByRole('button', { name: 'Reset 2FA…' })).toHaveAttribute('title', '2FA is already off');
  });
});

describe('sessions', () => {
  it('ends one session of the merchant from the list', async () => {
    const user = userEvent.setup();
    const panel = await openSecurity();
    await user.click(await panel.findByRole('button', { name: 'End session from 203.0.113.55' }));
    expect(await screen.findByText('Session ended')).toBeInTheDocument();
    expect(await screen.findByText('No open sessions')).toBeInTheDocument();
    await waitFor(() => expect(fact(panel, 'Active sessions')).toHaveTextContent('No active sessions'));
  });

  it('asks the server for this merchant’s sessions only', async () => {
    const seen: string[] = [];
    mockServer.use(
      http.get('*/admin/sessions', ({ request }) => {
        seen.push(new URL(request.url).search);
        return new Response('[]', { headers: { 'Content-Type': 'application/json', 'x-total-count': '0' } });
      }),
    );
    await openSecurity();
    await screen.findByText('No open sessions');
    expect(seen[0]).toContain('subjectType=client');
    expect(seen[0]).toContain('subjectId=1');
  });
});

describe('permissions', () => {
  it('disables every action for a role without clients:security and names the permission', async () => {
    await openSecurity(['clients:read', 'sessions:read']);
    for (const name of ['Password…', 'Sign out everywhere', 'Reset 2FA…']) {
      const button = await screen.findByRole('button', { name });
      expect(button, name).toBeDisabled();
      expect(button, name).toHaveAttribute('title', 'You need the clients:security permission');
    }
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toHaveAttribute(
      'title',
      'You need the clients:security permission',
    );
  });

  it('hides the sessions list without sessions:read but still shows the count', async () => {
    const panel = await openSecurity(['clients:read', 'clients:security']);
    expect(fact(panel, 'Active sessions')).toHaveTextContent('1');
    expect(screen.queryByRole('table', { name: 'Open sessions' })).not.toBeInTheDocument();
    expect(screen.queryByText('Open sessions')).not.toBeInTheDocument();
  });

  it('disables ending a session without sessions:revoke', async () => {
    await openSecurity(['clients:read', 'sessions:read']);
    const end = await screen.findByRole('button', { name: 'End session from 203.0.113.55' });
    expect(end).toBeDisabled();
    expect(end).toHaveAttribute('title', 'You need the sessions:revoke permission');
  });
});
