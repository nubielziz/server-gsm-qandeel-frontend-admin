// The fixed titles of the account dialogs. One table, so each dialog and the tests that open it from the list, a part or the dialog
// host agree on the words.
import type { AccountRow } from '../../types';
import type { AccountAction } from '../types';
import { accountLabel } from './accountLabel';

type Who = Pick<AccountRow, 'id' | 'name' | 'email' | 'status'>;

const plural = (count: number) => `${count} accounts`;

/**
 * The title of the dialog of an action about these accounts. Suspend, reactivate and sign out name the account when it is one and
 * count them when they are many ("Suspend 3 accounts?"); every other dialog is about one account (the first).
 */
export function dialogTitle(action: AccountAction, accounts: readonly Who[]): string {
  const name = accountLabel(accounts[0]);
  const many = accounts.length > 1;
  switch (action) {
    case 'adjust':
      return `Adjust the wallet of ${name}`;
    case 'freeze':
      return `Put the wallet of ${name} on hold?`;
    case 'unfreeze':
      return `Lift the hold on the wallet of ${name}?`;
    case 'credit-limit':
      return `Credit limit of ${name}`;
    case 'rank':
      return `Change the rank of ${name}`;
    case 'suspend':
      return many ? `Suspend ${plural(accounts.length)}?` : `Suspend ${name}?`;
    case 'reactivate':
      return many ? `Reactivate ${plural(accounts.length)}?` : `Reactivate ${name}?`;
    case 'block':
      return `Block ${name}?`;
    case 'unblock':
      return `Unblock ${name}?`;
    case 'password':
      return `Password of ${name}`;
    case 'signout':
      return many ? `Sign ${plural(accounts.length)} out everywhere?` : `Sign ${name} out everywhere?`;
    case 'reset-2fa':
      return `Reset two-step sign-in of ${name}?`;
    case 'make-account':
      return `Make an account for ${name}`;
    case 'export':
      return `Export the data of ${name}?`;
    case 'anonymize':
      return `Anonymize ${name}?`;
  }
}
