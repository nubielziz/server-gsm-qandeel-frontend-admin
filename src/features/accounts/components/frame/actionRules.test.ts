// Tests for the action rules: who is offered which action on which account. Each row of the table is a test: the
// permission, the state of the account (a guest, a status, a rank, the wallet), what is left out and what is disabled with its reason. The
// With selected strip counts only the ticked accounts an action applies to. The old pages' "turns off each action the staff member lacks the
// permission for, and names the permission" is the first block.
import { describe, expect, it } from 'vitest';
import { account, guest, merchantAccount, RETAIL_RANK } from '../../test/fixtures';
import type { AccountRow } from '../../types';
import { actionOffer, bulkOffer, BULK_ACTIONS } from './actionRules';
import { buildGrants } from './useAccountGrants';
import type { AccountAction } from '../types';

const OWNER = buildGrants(['*']);
const READER = buildGrants(['clients:read']);
const wallet = (
  over: Partial<NonNullable<AccountRow['wallet']>> = {},
): NonNullable<AccountRow['wallet']> => ({
  kind: 'merchant',
  balance: '10.0000',
  reserved: '0.0000',
  creditLimit: '0.0000',
  available: '10.0000',
  frozen: false,
  ...over,
});

const ALL_ACTIONS: AccountAction[] = [
  'adjust',
  'freeze',
  'unfreeze',
  'credit-limit',
  'rank',
  'suspend',
  'reactivate',
  'block',
  'unblock',
  'password',
  'signout',
  'reset-2fa',
  'make-account',
  'export',
  'anonymize',
];

describe('a role without the permissions', () => {
  it('turns off each action and names the permission it needs', () => {
    const daniel = account({
      wallet: wallet({ kind: 'store' }),
      security: { ...account().security!, twofaEnabled: true },
    });
    const lock = (action: AccountAction, title: string) =>
      expect(actionOffer(action, daniel, READER), action).toEqual({ show: true, disabled: true, title });
    lock('suspend', 'You need the clients:update and clients:security permission');
    lock('block', 'You need the clients:block permission');
    lock('password', 'You need the clients:security permission');
    lock('signout', 'You need the clients:security permission');
    lock('reset-2fa', 'You need the clients:security permission');
    lock('export', 'You need the customers:privacy permission');
    lock('anonymize', 'You need the customers:privacy permission');
    lock('freeze', 'You need the wallet:adjust permission');
  });

  it('names the permission of Make an account on a guest', () => {
    expect(actionOffer('make-account', guest(), READER)).toEqual({
      show: true,
      disabled: true,
      title: 'You need the clients:update permission',
    });
  });

  it('names only the permission that is missing', () => {
    const partly = buildGrants(['clients:read', 'clients:update']);
    expect(actionOffer('suspend', account(), partly).title).toBe('You need the clients:security permission');
  });

  it('leaves the adjust action out without wallet:adjust, and the credit limit disabled without wallet:credit_limit', () => {
    expect(actionOffer('adjust', account(), READER)).toMatchObject({ show: false });
    expect(actionOffer('adjust', account(), buildGrants(['wallet:adjust']))).toEqual({
      show: true,
      disabled: false,
    });
    expect(
      actionOffer(
        'credit-limit',
        merchantAccount({ rank: { ...merchantAccount().rank, creditAllowed: true } }),
        READER,
      ),
    ).toEqual({
      show: true,
      disabled: true,
      title: 'You need the wallet:credit_limit permission',
    });
  });

  it('keeps every action on for the Owner, where the account allows it', () => {
    const ready = merchantAccount({ wallet: wallet({ creditLimit: '500.0000' }) });
    for (const action of [
      'adjust',
      'credit-limit',
      'rank',
      'suspend',
      'block',
      'password',
      'make-account',
      'export',
      'anonymize',
    ] as const) {
      const subject = action === 'make-account' ? guest() : action === 'anonymize' ? account() : ready;
      expect(actionOffer(action, subject, OWNER), action).toEqual({ show: true, disabled: false });
    }
  });
});

describe('the Owner rule', () => {
  it('offers the rank change to the Owner only, and says why to everyone else', () => {
    expect(actionOffer('rank', account(), OWNER)).toEqual({ show: true, disabled: false });
    const manager = buildGrants(['clients:read', 'clients:update', 'groups:read', 'groups:update']);
    expect(actionOffer('rank', account(), manager)).toEqual({
      show: false,
      disabled: true,
      title: 'Only the Owner changes a rank.',
    });
  });

  it('disables the rank change of a guest with the reason, and leaves it out for an anonymized account', () => {
    expect(actionOffer('rank', guest(), OWNER)).toEqual({
      show: true,
      disabled: true,
      title: 'Make an account first: a guest keeps the retail rank',
    });
    expect(actionOffer('rank', account({ status: 'anonymized' }), OWNER).show).toBe(false);
  });
});

describe('what the state of the account allows', () => {
  it('offers Suspend to an active account and Reactivate to a suspended one, and neither to a blocked or anonymized one', () => {
    expect(actionOffer('suspend', account(), OWNER).show).toBe(true);
    expect(actionOffer('reactivate', account(), OWNER).show).toBe(false);
    expect(actionOffer('suspend', account({ status: 'suspended' }), OWNER).show).toBe(false);
    expect(actionOffer('reactivate', account({ status: 'suspended' }), OWNER).show).toBe(true);
    for (const status of ['blocked', 'anonymized'] as const) {
      expect(actionOffer('suspend', account({ status }), OWNER).show).toBe(false);
      expect(actionOffer('reactivate', account({ status }), OWNER).show).toBe(false);
    }
  });

  it('offers Block to an active or suspended account and Unblock to a blocked one', () => {
    expect(actionOffer('block', account(), OWNER).show).toBe(true);
    expect(actionOffer('block', account({ status: 'suspended' }), OWNER).show).toBe(true);
    expect(actionOffer('block', account({ status: 'blocked' }), OWNER).show).toBe(false);
    expect(actionOffer('unblock', account({ status: 'blocked' }), OWNER).show).toBe(true);
    expect(actionOffer('unblock', account(), OWNER).show).toBe(false);
  });

  it('offers the hold the other way round: Put on hold unless the wallet is on hold, Lift the hold when it is', () => {
    expect(actionOffer('freeze', account({ wallet: wallet({ frozen: false }) }), OWNER).show).toBe(true);
    expect(actionOffer('unfreeze', account({ wallet: wallet({ frozen: false }) }), OWNER).show).toBe(false);
    expect(actionOffer('freeze', account({ wallet: wallet({ frozen: true }) }), OWNER).show).toBe(false);
    expect(actionOffer('unfreeze', account({ wallet: wallet({ frozen: true }) }), OWNER).show).toBe(true);
    // A guest has no wallet.
    expect(actionOffer('freeze', guest(), OWNER).show).toBe(false);
    expect(actionOffer('adjust', guest(), OWNER).show).toBe(false);
  });

  it('offers the credit limit only to a merchant rank that allows credit or still has a limit', () => {
    const allows = { ...merchantAccount().rank, creditAllowed: true };
    const refuses = { ...merchantAccount().rank, creditAllowed: false };
    expect(actionOffer('credit-limit', merchantAccount({ rank: allows }), OWNER).show).toBe(true);
    expect(actionOffer('credit-limit', merchantAccount({ rank: refuses }), OWNER).show).toBe(false);
    expect(
      actionOffer(
        'credit-limit',
        merchantAccount({ rank: refuses, wallet: wallet({ creditLimit: '300.0000' }) }),
        OWNER,
      ).show,
    ).toBe(true);
    expect(actionOffer('credit-limit', account({ rank: RETAIL_RANK }), OWNER).show).toBe(false);
  });

  it('disables the password link of an account that is not active, and leaves it out for a guest', () => {
    expect(actionOffer('password', account({ status: 'suspended' }), OWNER)).toEqual({
      show: true,
      disabled: true,
      title: 'Reactivate the account first',
    });
    expect(actionOffer('password', guest(), OWNER).show).toBe(false);
    expect(actionOffer('password', account(), OWNER)).toEqual({ show: true, disabled: false });
  });

  it('disables Sign out everywhere with no session, and Reset two-step sign-in when it is off', () => {
    const quiet = account({ security: { ...account().security!, activeSessions: 0, twofaEnabled: false } });
    expect(actionOffer('signout', quiet, OWNER)).toEqual({
      show: true,
      disabled: true,
      title: 'No active sessions',
    });
    expect(actionOffer('signout', account(), OWNER).disabled).toBe(false);
    expect(actionOffer('reset-2fa', quiet, OWNER)).toEqual({
      show: true,
      disabled: true,
      title: 'Two-step sign-in is already off',
    });
    const on = account({ security: { ...account().security!, twofaEnabled: true } });
    expect(actionOffer('reset-2fa', on, OWNER).disabled).toBe(false);
    expect(actionOffer('reset-2fa', guest(), OWNER).show).toBe(false);
  });

  it('offers Make an account to guests only', () => {
    expect(actionOffer('make-account', guest(), OWNER)).toEqual({ show: true, disabled: false });
    expect(actionOffer('make-account', account(), OWNER).show).toBe(false);
  });

  it('refuses to anonymize a merchant rank until it moves to the retail rank', () => {
    expect(actionOffer('anonymize', merchantAccount(), OWNER)).toEqual({
      show: true,
      disabled: true,
      title: 'Move the account to the retail rank first',
    });
    expect(actionOffer('anonymize', account(), OWNER)).toEqual({ show: true, disabled: false });
  });

  it('offers nothing on an anonymized account, not even an export', () => {
    const gone = account({ status: 'anonymized', name: '', email: '' });
    const offered = ALL_ACTIONS.filter((action) => actionOffer(action, gone, OWNER).show);
    expect(offered).toEqual([]);
  });
});

describe('the With selected strip', () => {
  const active = account({ id: 1 });
  const suspended = account({ id: 2, status: 'suspended' });
  const noSession = account({ id: 3, security: { ...account().security!, activeSessions: 0 } });
  const someGuest = guest({ id: 4 });
  const blocked = account({ id: 5, status: 'blocked' });
  const ids = (rows: AccountRow[]) => rows.map((row) => row.id);

  it('offers only Suspend, Reactivate and Sign out everywhere: nothing that moves money, limits or mails', () => {
    expect([...BULK_ACTIONS]).toEqual(['suspend', 'reactivate', 'signout']);
  });

  it('counts only the ticked accounts each button applies to', () => {
    const ticked = [active, suspended, noSession, someGuest, blocked];
    // A guest is active too: the server decides what suspending one means.
    expect(ids(bulkOffer('suspend', ticked, OWNER).targets)).toEqual([1, 3, 4]);
    expect(ids(bulkOffer('reactivate', ticked, OWNER).targets)).toEqual([2]);
    // Any account with a session can be signed out, whatever its status.
    expect(ids(bulkOffer('signout', ticked, OWNER).targets)).toEqual([1, 2, 5]);
    expect(bulkOffer('suspend', ticked, OWNER).lock).toEqual({ disabled: false });
  });

  it('disables a button with the reason when none of the ticked accounts is a target', () => {
    expect(bulkOffer('suspend', [suspended], OWNER).lock.title).toBe(
      'Every ticked account is suspended already',
    );
    expect(bulkOffer('suspend', [suspended, blocked], OWNER).lock.title).toBe(
      'None of the ticked accounts can be suspended',
    );
    expect(bulkOffer('reactivate', [active], OWNER).lock.title).toBe(
      'None of the ticked accounts is suspended',
    );
    expect(bulkOffer('signout', [noSession, someGuest], OWNER).lock.title).toBe(
      'None of the ticked accounts has a session',
    );
    expect(bulkOffer('signout', [], OWNER).lock.disabled).toBe(true);
  });

  it('names the missing permission when there are targets but the role lacks it', () => {
    expect(bulkOffer('suspend', [active], READER).lock.title).toBe(
      'You need the clients:update and clients:security permission',
    );
    expect(bulkOffer('signout', [active], buildGrants(['clients:read', 'clients:update'])).lock.title).toBe(
      'You need the clients:security permission',
    );
    expect(
      bulkOffer('reactivate', [suspended], buildGrants(['clients:update', 'clients:security'])).lock.disabled,
    ).toBe(false);
  });
});
