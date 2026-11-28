// Tests for the Overview part, drawn on its own with the account it is given: the account rows, the status and its one button, how the
// account signs in, the figures (and what a role without wallet:read sees), the notes, and what an anonymized account hides. Ports the cases
// of the old merchant header, figures and banners and the old customer header, figures and suspended banner in this layout's words.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountDetail } from '../../types';
import { account, guest, merchantAccount, NOW } from '../../test/fixtures';
import { ACCOUNT_TEST_ROLES } from '../../test/roles';
import { buildGrants } from '../frame/useAccountGrants';
import { OverviewPart } from './OverviewPart';

const WALLET = {
  kind: 'merchant' as const,
  balance: '1209.7500',
  reserved: '71.2300',
  creditLimit: '2000.0000',
  available: '3209.7500',
  frozen: false,
};
const STATS = {
  orders: 12,
  spend: '4200.0000',
  profit: '310.0000',
  margin: '7.4000',
  successRate: 96,
  lastOrderAt: '2026-01-03T12:00:00.000Z',
};

beforeEach(() => {
  // Only the clock: the part words every age against it.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

function show(row: AccountDetail, permissions: readonly string[] = ACCOUNT_TEST_ROLES.owner) {
  const onAction = vi.fn();
  render(
    <MemoryRouter>
      <OverviewPart
        account={row}
        grants={buildGrants(permissions)}
        onAction={onAction}
        onDirtyChange={vi.fn()}
      />
    </MemoryRouter>,
  );
  return onAction;
}

const labelOf = (label: string) => screen.queryByText(label, { selector: '.form-row-label span' });
const hasRow = (label: string) => labelOf(label) !== null;
function row(label: string) {
  const found = labelOf(label)?.closest('.form-row');
  if (!(found instanceof HTMLElement)) throw new Error(`No row "${label}".`);
  return within(found);
}
const heading = (name: string) => screen.queryByRole('heading', { level: 3, name });

describe('the account rows', () => {
  it('shows a retail login: number, name, email with its proof, rank, country, currency, since and who made it', () => {
    show(account());
    expect(row('Number').getByText('#101')).toBeInTheDocument();
    expect(row('Name').getByText('Daniel Whitmore')).toBeInTheDocument();
    expect(row('Email').getByText('daniel.whitmore@mail.example')).toBeInTheDocument();
    expect(row('Email').getByText('Verified 1 Dec 2025')).toBeInTheDocument();
    expect(row('Rank').getByText('Storefront retail')).toBeInTheDocument();
    expect(row('Rank').getByText("the shop's rank")).toBeInTheDocument();
    expect(row('Country').getByText('GB · United Kingdom')).toBeInTheDocument();
    expect(row('Currency').getByText('GBP')).toBeInTheDocument();
    expect(row('Account since').getByText('1 Dec 2025')).toBeInTheDocument();
    expect(row('Account since').getByText('Joined 34 days ago')).toBeInTheDocument();
    expect(row('Created by').getByText('Signed up in the shop')).toBeInTheDocument();
    expect(row('Last sign-in').getByText('7d ago')).toBeInTheDocument();
    expect(hasRow('Username')).toBe(false);
  });

  it('shows a merchant with its username, its discount, no currency and the staff member who added it', () => {
    show(merchantAccount({ createdBy: { id: 1, name: 'Rami K.' }, emailVerifiedAt: null }));
    expect(row('Username').getByText('zain-mobile-hub')).toHaveClass('mono');
    expect(row('Rank').getByText('VIP')).toBeInTheDocument();
    expect(row('Rank').getByText('merchant rank · 8% off base prices')).toBeInTheDocument();
    expect(row('Email').getByText('Not verified')).toBeInTheDocument();
    expect(row('Country').getByText('JO · Jordan')).toBeInTheDocument();
    expect(row('Created by').getByText('Added by your team')).toBeInTheDocument();
    expect(row('Created by').getByText('Rami K.')).toBeInTheDocument();
    expect(hasRow('Currency')).toBe(false);
  });

  it('says "No name" for a guest without one, prints the email once, and shows no sign-in rows of a login', () => {
    show(guest({ name: '' }));
    expect(row('Name').getByText('No name')).toBeInTheDocument();
    expect(screen.getAllByText('sofia.alvarez@inbox.example')).toHaveLength(1);
    expect(row('Created by').getByText('Bought as a guest')).toBeInTheDocument();
    expect(row('Email').queryByText(/Verified|Not verified/)).not.toBeInTheDocument();
    expect(hasRow('Last sign-in')).toBe(false);
  });

  it('shows "Never" for a login that has not signed in', () => {
    show(account({ lastLoginAt: null }));
    expect(row('Last sign-in').getByText('Never')).toBeInTheDocument();
  });

  it('shows a referral code, a language or a verification row of an older server nowhere', () => {
    show({ ...account(), referralCode: 'GSM0008', language: 'fr', kycStatus: 'rejected' } as AccountDetail);
    for (const word of ['GSM0008', 'Referral code', 'Referred by', 'Language', 'Verification', 'KYC']) {
      expect(screen.queryByText(word)).not.toBeInTheDocument();
    }
  });
});

describe('the rank', () => {
  it('offers the Owner "Change rank…", which asks for the dialog of that account', async () => {
    const user = userEvent.setup();
    const row101 = account();
    const onAction = show(row101);
    await user.click(row('Rank').getByRole('button', { name: 'Change rank…' }));
    expect(onAction).toHaveBeenCalledWith('rank', [row101]);
  });

  it('says only the Owner changes a rank to everyone else, and offers no button', () => {
    show(account(), ACCOUNT_TEST_ROLES.manager);
    expect(row('Rank').getByText('Only the Owner changes a rank.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change rank…' })).not.toBeInTheDocument();
  });

  it("says a guest keeps the retail rank, and the Owner's button is off with the reason", () => {
    show(guest());
    expect(
      row('Rank').getByText('A guest keeps the retail rank. Make an account first.'),
    ).toBeInTheDocument();
    const button = row('Rank').getByRole('button', { name: 'Change rank…' });
    expect(button).toBeDisabled();
    expect(button.closest('span[title]')).toHaveAttribute(
      'title',
      'Make an account first: a guest keeps the retail rank',
    );
  });
});

describe('the status', () => {
  it('shows an active account with a square and its word and the one button that fits: Suspend…', async () => {
    const user = userEvent.setup();
    const row101 = account();
    const onAction = show(row101);
    expect(
      within(row('Status').getByText('Active').parentElement as HTMLElement).getByRole('img', {
        name: 'Active',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reactivate…' })).not.toBeInTheDocument();
    await user.click(row('Status').getByRole('button', { name: 'Suspend…' }));
    expect(onAction).toHaveBeenCalledWith('suspend', [row101]);
  });

  it('shows why a suspended account is suspended, by whom and when, and offers Reactivate…', async () => {
    const user = userEvent.setup();
    const suspended = account({
      status: 'suspended',
      suspension: {
        at: '2025-12-29T12:00:00.000Z',
        reason: 'Chargeback dispute',
        by: { id: 1, name: 'Rami K.' },
      },
    });
    const onAction = show(suspended);
    expect(row('Status').getByText('Suspended')).toBeInTheDocument();
    expect(row('Status').getByText('Reason: Chargeback dispute · by Rami K. · 6d ago')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suspend…' })).not.toBeInTheDocument();
    await user.click(row('Status').getByRole('button', { name: 'Reactivate…' }));
    expect(onAction).toHaveBeenCalledWith('reactivate', [suspended]);
  });

  it('shows the fixed reason the migration gave a former pending account, with no banner of its own', () => {
    show(
      merchantAccount({
        status: 'suspended',
        suspension: {
          at: '2025-12-01T12:00:00.000Z',
          reason: 'Waiting for approval before the accounts were merged',
          by: null,
        },
      }),
    );
    expect(
      row('Status').getByText(/Reason: Waiting for approval before the accounts were merged · 34d ago/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.queryByText(/Not active yet|activate the account/i)).not.toBeInTheDocument();
  });

  it('shows a retired word of the old model as it is, with no banner and no action', () => {
    show(account({ status: 'pending' as never }));
    expect(row('Status').getByText('pending')).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    for (const name of ['Suspend…', 'Reactivate…', 'Activate account', 'Approve account']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('sends a blocked account to Privacy and risk and offers no status button', () => {
    show(account({ status: 'blocked' }));
    expect(row('Status').getByText(/Blocked for fraud:/)).toBeInTheDocument();
    expect(row('Status').getByRole('link', { name: 'see Privacy and risk' })).toHaveAttribute(
      'href',
      '/accounts/101?tab=privacy',
    );
    expect(screen.queryByRole('button', { name: /Suspend|Reactivate/ })).not.toBeInTheDocument();
  });

  it('turns Reactivate… off with the missing permissions as its reason', () => {
    show(account({ status: 'suspended' }), ACCOUNT_TEST_ROLES.reader);
    const button = row('Status').getByRole('button', { name: 'Reactivate…' });
    expect(button).toBeDisabled();
    expect(button.closest('span[title]')).toHaveAttribute(
      'title',
      'You need the clients:update and clients:security permission',
    );
  });

  it('turns the button off with the missing permissions as its reason', () => {
    show(account(), ACCOUNT_TEST_ROLES.reader);
    const button = row('Status').getByRole('button', { name: 'Suspend…' });
    expect(button).toBeDisabled();
    expect(button.closest('span[title]')).toHaveAttribute(
      'title',
      'You need the clients:update and clients:security permission',
    );
  });
});

describe('the sign-in', () => {
  it('says a working login is a login account', () => {
    show(account());
    expect(row('Login').getByText('Login account')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make an account…' })).not.toBeInTheDocument();
  });

  it('says an invitation is pending, with when the link was sent', () => {
    const base = account();
    show(
      account({
        invitationPending: true,
        security: { ...base.security!, hasPassword: false, linkSentAt: '2026-01-04T10:00:00.000Z' },
      }),
    );
    expect(row('Login').getByText('Invitation pending: no password yet')).toBeInTheDocument();
    expect(row('Login').getByText('link sent 2h ago')).toBeInTheDocument();
  });

  it('says a guest has no login and offers "Make an account…"', async () => {
    const user = userEvent.setup();
    const sofia = guest();
    const onAction = show(sofia);
    expect(
      row('Login').getByText('Guest: no login. A guest follows their orders from the link in their email.'),
    ).toBeInTheDocument();
    await user.click(row('Login').getByRole('button', { name: 'Make an account…' }));
    expect(onAction).toHaveBeenCalledWith('make-account', [sofia]);
  });

  it('turns "Make an account…" off for a role that cannot update accounts', () => {
    show(guest(), ACCOUNT_TEST_ROLES.reader);
    expect(row('Login').getByRole('button', { name: 'Make an account…' })).toBeDisabled();
  });
});

describe('the figures', () => {
  it('shows a merchant wallet with what is held, what can be spent and the 30-day figures', () => {
    show(
      merchantAccount({
        ordersCount: 12,
        lastOrderAt: '2026-01-03T12:00:00.000Z',
        wallet: WALLET,
        stats: STATS,
      }),
    );
    expect(row('Wallet').getByText('$1,209.75')).toBeInTheDocument();
    expect(row('Wallet').getByText('$71.23 held in open orders')).toBeInTheDocument();
    expect(row('Available').getByText('$3,209.75')).toBeInTheDocument();
    expect(row('Available').getByText('wallet plus $2,000 credit limit')).toBeInTheDocument();
    expect(row('Spent, 30 days').getByText('$4,200')).toBeInTheDocument();
    expect(row('Spent, 30 days').getByText('12 orders')).toBeInTheDocument();
    expect(row('Profit, 30 days').getByText('$310')).toBeInTheDocument();
    expect(row('Profit, 30 days').getByText('7.4% margin')).toBeInTheDocument();
    expect(row('Success rate').getByText('96%')).toBeInTheDocument();
    expect(row('Success rate').getByText('completed ÷ (completed + rejected)')).toBeInTheDocument();
    expect(row('Orders').getByText('12')).toBeInTheDocument();
    expect(row('Orders').getByText('last 1d ago')).toBeInTheDocument();
  });

  it('says there are no open holds, and gives a store balance no credit note', () => {
    show(
      account({
        wallet: {
          ...WALLET,
          kind: 'store',
          balance: '50.0000',
          reserved: '0.0000',
          creditLimit: '0.0000',
          available: '50.0000',
        },
        stats: STATS,
      }),
    );
    expect(row('Wallet').getByText('No open holds')).toBeInTheDocument();
    expect(row('Available').getByText('$50.00')).toBeInTheDocument();
    expect(row('Available').queryByText(/credit limit/)).not.toBeInTheDocument();
  });

  it('shows a balance below zero in the critical colour with the alert icon', () => {
    show(
      merchantAccount({ wallet: { ...WALLET, balance: '-81.9500', available: '1918.0500' }, stats: STATS }),
    );
    const figure = row('Wallet').getByText('-$81.95');
    expect(figure).toHaveClass('text-crit-fg');
    expect(figure.previousElementSibling?.tagName.toLowerCase()).toBe('svg');
  });

  it('says nothing sold yet, and shows a dash for a success rate no order finished', () => {
    show(
      account({
        ordersCount: 0,
        lastOrderAt: null,
        wallet: { ...WALLET, balance: '0.0000', reserved: '0.0000' },
        stats: {
          orders: 0,
          spend: '0.0000',
          profit: '0.0000',
          margin: null,
          successRate: null,
          lastOrderAt: null,
        },
      }),
    );
    expect(row('Profit, 30 days').getByText('No sales yet')).toBeInTheDocument();
    expect(row('Success rate').getByText('–')).toBeInTheDocument();
    expect(row('Orders').getByText('No orders yet')).toBeInTheDocument();
  });

  it('shows a dash for a figure the answer did not carry', () => {
    show(account({ wallet: undefined, stats: undefined }));
    expect(row('Wallet').getByText('–')).toBeInTheDocument();
    expect(row('Spent, 30 days').getByText('–')).toBeInTheDocument();
  });

  it('says what a role without wallet:read is missing, and still shows the order count', () => {
    show(account(), ACCOUNT_TEST_ROLES.noWallet);
    expect(
      screen.getByText('You need the wallet:read permission to see the wallet and the 30-day figures'),
    ).toBeInTheDocument();
    expect(hasRow('Wallet')).toBe(false);
    expect(hasRow('Spent, 30 days')).toBe(false);
    expect(row('Orders').getByText('4')).toBeInTheDocument();
  });

  it('shows a guest the order count only', () => {
    show(guest({ ordersCount: 2 }));
    expect(row('Orders').getByText('2')).toBeInTheDocument();
    for (const label of ['Wallet', 'Available', 'Spent, 30 days', 'Profit, 30 days', 'Success rate']) {
      expect(hasRow(label)).toBe(false);
    }
    expect(screen.queryByText(/wallet:read/)).not.toBeInTheDocument();
  });

  it('leaves out the lifetime figures the server does not send', () => {
    show(account({ wallet: WALLET, stats: STATS }));
    for (const label of ['Lifetime spend', 'Refunds', 'Support tickets', 'Disputes']) {
      expect(hasRow(label)).toBe(false);
    }
  });
});

describe('the notes', () => {
  it('shows the internal notes as text and a link to edit them in Profile', () => {
    show(account({ internalNotes: 'Pays by bank transfer on Sundays.' }));
    expect(row('Internal notes').getByText('Pays by bank transfer on Sundays.')).toBeInTheDocument();
    expect(row('Internal notes').getByRole('link', { name: 'Edit in Profile' })).toHaveAttribute(
      'href',
      '/accounts/101?tab=profile',
    );
  });

  it('says "None" when there are no notes', () => {
    show(account({ internalNotes: '  ' }));
    expect(row('Internal notes').getByText('None')).toBeInTheDocument();
  });
});

describe('an anonymized account', () => {
  const removed = () =>
    account({
      status: 'anonymized',
      name: '',
      email: 'deleted-account-101@redacted.invalid',
      anonymizedAt: '2026-01-02T12:00:00.000Z',
    });

  it('says what was removed and what stays, and offers no action', () => {
    show(removed());
    expect(row('Name').getByText('Deleted account')).toBeInTheDocument();
    expect(row('Status').getByText('Anonymized')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Anonymized on 2 Jan 2026. Name, email and IMEIs are removed; orders and payments stay for accounting.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('hides the email, the sign-in and the notes', () => {
    show(removed());
    expect(hasRow('Email')).toBe(false);
    expect(heading('Sign-in')).not.toBeInTheDocument();
    expect(heading('Notes')).not.toBeInTheDocument();
    expect(screen.queryByText('deleted-account-101@redacted.invalid')).not.toBeInTheDocument();
  });
});
