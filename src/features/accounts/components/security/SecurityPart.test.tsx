// Tests for the Security part of an account's record, run through the whole app against the dev mock API: the sign-in facts (a merchant who
// trades, an invitation not used yet, a verification email on its way, a retail login, no facts at all), the buttons and what makes each one
// off, the address "Last seen from" with its Block IP… button or its rule, and what a role without the permissions sees. The dialogs the buttons
// open have their own files (PasswordDialog, SignOutDialog, Reset2faDialog). Ports the fact, session, resend and permission cases of the old
// merchant Security tab and the Account tab of the old customer page.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { partsMenu, renderAccount, type RenderOptions } from '../../pages/test-utils';
import { SEED } from '../../test/apiSupport';
import { account } from '../../test/fixtures';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and every flow here goes through the mock API, so give them room.
vi.setConfig({ testTimeout: 30_000 });

const ZAIN = /Zain Mobile Hub/; // 1: a VIP merchant with a password, two-step sign-in on, one session
const ALGIERS = /Algiers Service Plus/; // 18: invited by staff, active, no password yet, email not verified
const ACCRA = /Accra Devices/; // 20: the former pending merchant, suspended, a verification email sent 2 hours ago
const BASRA = /Basra Unlock Center/; // 4: verified email, two-step sign-in off, no session
const DANIEL = /Daniel Whitmore/; // 101: a retail login, one session, two-step sign-in off

async function openSecurity(id: number, name: string | RegExp, options: RenderOptions = {}) {
  await renderAccount(id, name, { ...options, tab: 'security' });
  await screen.findByRole('group', { name: 'Password' }, { timeout: 10_000 });
}

// A row of the part: its label names the group the value sits in.
const row = (label: string) => screen.getByRole('group', { name: label });
const button = (name: string) => screen.getByRole('button', { name });

describe('sign-in facts', () => {
  it('shows the password, two-step sign-in, email, last sign-in and open sessions of a merchant who trades', async () => {
    await openSecurity(SEED.ZAIN, ZAIN);
    expect(row('Password')).toHaveTextContent('Set');
    expect(row('Password changed')).toHaveTextContent(/\d+d ago/);
    expect(row('Two-step sign-in')).toHaveTextContent('On');
    expect(row('Email')).toHaveTextContent('ops@zainmobilehub.example');
    expect(row('Email')).toHaveTextContent('Verified');
    expect(row('Email')).toHaveTextContent(/\d{1,2} [A-Z][a-z]{2} \d{4}/);
    expect(row('Last sign-in')).toHaveTextContent(/ago from \d+\.\d+\.\d+\.\d+/);
    expect(row('Active sessions')).toHaveTextContent('1');
  });

  it('says an invited account has no password yet, which link is open and when it went out', async () => {
    await openSecurity(SEED.INVITED, ALGIERS);
    expect(row('Password')).toHaveTextContent('Not set yet (invitation)');
    expect(row('Password')).toHaveTextContent('An invitation link is open.');
    expect(row('Link')).toHaveTextContent('Link sent 20m ago, works for 1 hour');
    expect(row('Last sign-in')).toHaveTextContent('Never');
    expect(row('Password changed')).toHaveTextContent('Never');
    expect(row('Email')).toHaveTextContent('Not verified');
    expect(row('Active sessions')).toHaveTextContent('No active sessions');
  });

  it('says when the verification email went out', async () => {
    await openSecurity(SEED.FORMER_PENDING, ACCRA);
    expect(row('Email')).toHaveTextContent('Not verified');
    expect(row('Email')).toHaveTextContent('Verification sent 2h ago');
    // No link is open: the Link row is left out.
    expect(screen.queryByRole('group', { name: 'Link' })).not.toBeInTheDocument();
  });

  it('shows the facts of a retail login too', async () => {
    await openSecurity(SEED.DANIEL, DANIEL);
    expect(row('Password')).toHaveTextContent('Set');
    expect(row('Two-step sign-in')).toHaveTextContent('Off');
    expect(row('Email')).toHaveTextContent('daniel.whitmore@mail.example');
    expect(row('Last seen from')).toHaveTextContent('203.0.113.177');
    expect(row('Active sessions')).toHaveTextContent('1');
  });

  it('warns that a temporary password must be changed, and that it still works while a link is open', async () => {
    mockServer.use(
      http.get('*/admin/clients/101', () =>
        HttpResponse.json(
          account({
            security: {
              ...account().security!,
              mustChangePassword: true,
              linkSentAt: new Date(Date.now() - 5 * 60_000).toISOString(),
            },
          }),
        ),
      ),
    );
    await openSecurity(SEED.DANIEL, DANIEL);
    expect(row('Password')).toHaveTextContent('Temporary (must change at next sign-in)');
    expect(row('Password')).toHaveTextContent(
      'A reset link is open. A temporary password still works while a link is open.',
    );
    expect(row('Link')).toHaveTextContent('Link sent 5m ago, works for 1 hour');
  });

  it('says so, and shows no wrong values, when the server did not send the sign-in details', async () => {
    mockServer.use(http.get('*/admin/clients/101', () => HttpResponse.json(account({ security: null }))));
    await renderAccount(SEED.DANIEL, DANIEL, { tab: 'security' });
    expect(
      await screen.findByText('The server did not send the sign-in details of this account.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Password' })).not.toBeInTheDocument();
    // The buttons are still there, and the ones that need sessions say there are none.
    expect(button('Password…')).toBeEnabled();
    expect(button('Sign out everywhere')).toBeDisabled();
  });

  it('shows the count of open sessions but no list of them, and asks the server for none', async () => {
    const seen: string[] = [];
    mockServer.use(
      http.get('*/admin/sessions', ({ request }) => {
        seen.push(new URL(request.url).search);
        return new HttpResponse('[]', {
          headers: { 'Content-Type': 'application/json', 'x-total-count': '0' },
        });
      }),
    );
    await openSecurity(SEED.ZAIN, ZAIN);
    expect(row('Active sessions')).toHaveTextContent('1');
    expect(screen.queryByText('Open sessions')).not.toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Open sessions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^End session/ })).not.toBeInTheDocument();
    expect(seen).toEqual([]);
  });
});

describe('who has the part', () => {
  it('is not offered to a guest, who has no login, even when the address names it', async () => {
    await renderAccount(SEED.SOFIA, /Sofia Alvarez/, { tab: 'security' });
    expect(partsMenu().queryByRole('link', { name: 'Security' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Password' })).not.toBeInTheDocument();
    expect(partsMenu().getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  });

  it('is offered to a login account, merchant or retail, in the menu', async () => {
    await renderAccount(SEED.DANIEL, DANIEL);
    expect(partsMenu().getByRole('link', { name: 'Security' })).toHaveAttribute(
      'href',
      '/accounts/101?tab=security',
    );
  });
});

describe('the buttons', () => {
  it('offers the four buttons to an active account with a login', async () => {
    await openSecurity(SEED.ZAIN, ZAIN);
    for (const name of [
      'Password…',
      'Sign out everywhere',
      'Reset two-step sign-in…',
      'Resend verification email',
    ]) {
      expect(button(name), name).toBeInTheDocument();
    }
    expect(button('Password…')).toBeEnabled();
    expect(button('Sign out everywhere')).toBeEnabled();
    expect(button('Reset two-step sign-in…')).toBeEnabled();
    expect(screen.getByText(/Nobody on your team can read a password, only replace it/)).toBeInTheDocument();
  });

  it('opens the dialog of each action with its fixed title', async () => {
    const user = userEvent.setup();
    await openSecurity(SEED.ZAIN, ZAIN);
    for (const [name, title] of [
      ['Password…', 'Password of Zain Mobile Hub'],
      ['Sign out everywhere', 'Sign Zain Mobile Hub out everywhere?'],
      ['Reset two-step sign-in…', 'Reset two-step sign-in of Zain Mobile Hub?'],
    ] as const) {
      await user.click(button(name));
      const dialog = await screen.findByRole('dialog', { name: title });
      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    }
  });

  it('turns the buttons off when there is nothing to do, and says why', async () => {
    await openSecurity(4, BASRA);
    // Merchant 4: verified email, two-step sign-in off, no open sessions.
    expect(button('Resend verification email')).toBeDisabled();
    expect(button('Resend verification email')).toHaveAttribute('title', 'The email is already verified');
    expect(button('Reset two-step sign-in…')).toBeDisabled();
    expect(button('Reset two-step sign-in…')).toHaveAttribute('title', 'Two-step sign-in is already off');
    expect(button('Sign out everywhere')).toBeDisabled();
    expect(button('Sign out everywhere')).toHaveAttribute('title', 'No active sessions');
    expect(button('Password…')).toBeEnabled();
  });

  it('turns the password button off for an account that is not active', async () => {
    await openSecurity(SEED.SUSPENDED_MERCHANT, /Tunis Fix Point/);
    expect(button('Password…')).toBeDisabled();
    expect(button('Password…')).toHaveAttribute('title', 'Reactivate the account first');
  });

  it('resends the verification email at once, and the row then says it went out', async () => {
    const user = userEvent.setup();
    await openSecurity(SEED.INVITED, ALGIERS);
    expect(row('Email')).not.toHaveTextContent('Verification sent');
    await user.click(button('Resend verification email'));
    expect(await screen.findByText('Verification email sent')).toBeInTheDocument();
    await waitFor(() => expect(row('Email')).toHaveTextContent('Verification sent just now'));
  });

  it("shows the server's refusal of a resend in a toast", async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/clients/:id/verify-email/resend', () =>
        problem(429, 'RATE_LIMITED', 'Too many emails', 'Five mails an hour is the limit.'),
      ),
    );
    await openSecurity(SEED.INVITED, ALGIERS);
    await user.click(button('Resend verification email'));
    expect(await screen.findByText('Too many emails')).toBeInTheDocument();
  });

  it('turns every button off for a role without clients:security and names the permission', async () => {
    await openSecurity(SEED.ZAIN, ZAIN, { role: 'reader' });
    for (const name of [
      'Password…',
      'Sign out everywhere',
      'Reset two-step sign-in…',
      'Resend verification email',
    ]) {
      expect(button(name), name).toBeDisabled();
      expect(button(name), name).toHaveAttribute('title', 'You need the clients:security permission');
    }
  });
});

describe('Last seen from', () => {
  it('offers "Block IP…" for an address the server would not refuse, prefilled for the shop', async () => {
    const user = userEvent.setup();
    await openSecurity(SEED.DANIEL, DANIEL);
    await user.click(await screen.findByRole('button', { name: 'Block IP…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Block an IP' });
    expect(within(dialog).getByLabelText('IP address or range')).toHaveValue('203.0.113.177');
    expect(within(dialog).getByLabelText('Who it applies to')).toHaveValue('store');
    expect(within(dialog).getByText(/Last used by Daniel Whitmore/)).toBeInTheDocument();
  });

  it('prefills the shop for an account with a merchant rank too: its sessions here are browser sessions', async () => {
    const user = userEvent.setup();
    await openSecurity(SEED.ZAIN, ZAIN);
    await user.click(await screen.findByRole('button', { name: 'Block IP…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Block an IP' });
    expect(within(dialog).getByLabelText('Who it applies to')).toHaveValue('store');
    // The shop block does not end a merchant's open portal session or stop the API: the dialog says so.
    expect(within(dialog).getByText(/This stops new shop sign-ins only/)).toBeInTheDocument();
    expect(within(dialog).getByText(/choose Everywhere to stop those too/)).toBeInTheDocument();
  });

  it('adds no such sentence for a retail rank', async () => {
    const user = userEvent.setup();
    await openSecurity(SEED.DANIEL, DANIEL);
    await user.click(await screen.findByRole('button', { name: 'Block IP…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Block an IP' });
    expect(within(dialog).queryByText(/new shop sign-ins only/)).not.toBeInTheDocument();
  });

  it('marks an address the server refuses, and links to the rule instead of offering to block it', async () => {
    mockServer.use(
      http.post('*/admin/ip-rules/check', () =>
        HttpResponse.json({
          decision: 'refused',
          rule: {
            id: 7,
            kind: 'block',
            scope: 'store',
            cidr: '203.0.113.177',
            label: '',
            reason: 'Card testing',
            source: 'manual',
            expiresAt: null,
            hitCount: 3,
            lastHitAt: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            createdBy: null,
          },
        }),
      ),
    );
    await openSecurity(SEED.DANIEL, DANIEL);
    const seen = row('Last seen from');
    expect(await within(seen).findByText('Blocked')).toBeInTheDocument();
    expect(within(seen).getByText('203.0.113.177')).toBeInTheDocument();
    expect(within(seen).getByRole('link', { name: 'See the rule' })).toHaveAttribute(
      'href',
      '/access?tab=block',
    );
    expect(within(seen).queryByRole('button', { name: 'Block IP…' })).not.toBeInTheDocument();
  });

  it('says the address is unknown when the account never signed in', async () => {
    await openSecurity(SEED.INVITED, ALGIERS);
    expect(row('Last seen from')).toHaveTextContent('Unknown');
    expect(screen.queryByRole('button', { name: 'Block IP…' })).not.toBeInTheDocument();
  });

  it('turns Block IP… off without access:create and names the permission', async () => {
    await openSecurity(SEED.DANIEL, DANIEL, { role: 'reader' });
    const block = await screen.findByRole('button', { name: 'Block IP…' });
    expect(block).toBeDisabled();
    expect(block).toHaveAttribute('title', 'You need the access:create permission');
  });
});
