// actionRules: the one table of who is offered which action on which account. The list's row menu, the With selected
// strip and the buttons of the parts all read it, so the same account gets the same offer everywhere. An offer says whether to draw the
// control at all (`show`) and whether it can be pressed (`disabled`, with the reason as `title`). Hiding or disabling is a hint only: the
// server checks every permission and every state on every request.
import type { AccountRow } from '../../types';
import type { AccountAction } from '../types';
import type { AccountGrants, GrantLock } from './useAccountGrants';

/** What a control for an action looks like for one account. A control that is not shown may still carry the reason, for a hint. */
export type ActionOffer = { show: boolean; disabled: boolean; title?: string };

/** The accounts a single-account control can still be about: everything but an anonymized one has a state to act on. */
const anonymized = (account: AccountRow) => account.status === 'anonymized';
const isGuest = (account: AccountRow) => !account.hasAccount;
const isMerchantRank = (account: AccountRow) => account.rank.kind === 'merchant';

const SHOWN: ActionOffer = { show: true, disabled: false };
const HIDDEN: ActionOffer = { show: false, disabled: true };

// An offer that is drawn and pressable unless a permission (or a reason) says otherwise.
const gated = (lock: GrantLock): ActionOffer =>
  lock.disabled ? { show: true, disabled: true, title: lock.title } : SHOWN;
const refused = (title: string): ActionOffer => ({ show: true, disabled: true, title });
const hidden = (title?: string): ActionOffer => (title ? { ...HIDDEN, title } : HIDDEN);

// Whether the wallet is on hold, when the row says (it carries the wallet only for a role that reads wallets).
const onHold = (account: AccountRow) => account.wallet?.frozen === true;

/** Whether the credit limit of the account can matter: a merchant rank that allows credit, or a limit that is still above zero. */
function creditApplies(account: AccountRow): boolean {
  return (
    isMerchantRank(account) && (account.rank.creditAllowed || Number(account.wallet?.creditLimit ?? 0) > 0)
  );
}

/**
 * The offer of one action for one account.
 *
 * @param action what is asked for.
 * @param account the account (a row of the list or the record's detail).
 * @param grants what the staff member may do.
 * @returns whether to draw the control, and whether it is disabled and why.
 */
export function actionOffer(action: AccountAction, account: AccountRow, grants: AccountGrants): ActionOffer {
  // The server refuses every write on an anonymized account (409 ANONYMIZED): the console offers no action at all, not even an export
  // (the record only says what was removed).
  if (anonymized(account)) return HIDDEN;
  switch (action) {
    case 'adjust':
      return isGuest(account) || !grants.can('wallet:adjust') ? HIDDEN : SHOWN;
    case 'freeze':
      return isGuest(account) || onHold(account) ? HIDDEN : gated(grants.needs('wallet:adjust'));
    case 'unfreeze':
      return isGuest(account) || !onHold(account) ? HIDDEN : gated(grants.needs('wallet:adjust'));
    case 'credit-limit':
      return creditApplies(account) ? gated(grants.needs('wallet:credit_limit')) : HIDDEN;
    case 'rank':
      // The Owner changes a rank; everyone else sees the fact read-only (the record says "Only the Owner changes a rank.").
      if (!grants.isOwner) return hidden('Only the Owner changes a rank.');
      return isGuest(account) ? refused('Make an account first: a guest keeps the retail rank') : SHOWN;
    case 'suspend':
      return account.status === 'active'
        ? gated(grants.needsAll('clients:update', 'clients:security'))
        : HIDDEN;
    case 'reactivate':
      return account.status === 'suspended'
        ? gated(grants.needsAll('clients:update', 'clients:security'))
        : HIDDEN;
    case 'block':
      return account.status === 'active' || account.status === 'suspended'
        ? gated(grants.needs('clients:block'))
        : HIDDEN;
    case 'unblock':
      return account.status === 'blocked' ? gated(grants.needs('clients:block')) : HIDDEN;
    case 'password': {
      if (isGuest(account)) return HIDDEN;
      const lock = grants.needs('clients:security');
      if (lock.disabled) return gated(lock);
      return account.status === 'active' ? SHOWN : refused('Reactivate the account first');
    }
    case 'signout': {
      if (isGuest(account)) return HIDDEN;
      const lock = grants.needs('clients:security');
      if (lock.disabled) return gated(lock);
      return (account.security?.activeSessions ?? 0) > 0 ? SHOWN : refused('No active sessions');
    }
    case 'reset-2fa': {
      if (isGuest(account)) return HIDDEN;
      const lock = grants.needs('clients:security');
      if (lock.disabled) return gated(lock);
      return account.security?.twofaEnabled ? SHOWN : refused('Two-step sign-in is already off');
    }
    case 'make-account':
      return isGuest(account) ? gated(grants.needs('clients:update')) : HIDDEN;
    case 'export':
      return gated(grants.needs('customers:privacy'));
    case 'anonymize': {
      const lock = grants.needs('customers:privacy');
      if (lock.disabled) return gated(lock);
      return isMerchantRank(account) ? refused('Move the account to the retail rank first') : SHOWN;
    }
  }
}

/** The actions the With selected strip offers (never money, limits, anything irreversible or that mails people). */
export const BULK_ACTIONS = ['suspend', 'reactivate', 'signout'] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number];

/** The words of a bulk button's lock when none of the ticked accounts is a target, by action. */
const NO_TARGET: Record<BulkAction, (ticked: readonly AccountRow[]) => string> = {
  suspend: (ticked) =>
    ticked.every((account) => account.status === 'suspended')
      ? 'Every ticked account is suspended already'
      : 'None of the ticked accounts can be suspended',
  reactivate: () => 'None of the ticked accounts is suspended',
  signout: () => 'None of the ticked accounts has a session',
};

// The ticked accounts a bulk action applies to.
const TARGETS: Record<BulkAction, (account: AccountRow) => boolean> = {
  suspend: (account) => account.status === 'active',
  reactivate: (account) => account.status === 'suspended',
  signout: (account) =>
    !anonymized(account) && account.hasAccount && (account.security?.activeSessions ?? 0) > 0,
};

/**
 * What one button of the With selected strip does: `targets` are the ticked accounts it applies to (the dialog gets only these) and
 * `lock` is the disabled state with its reason: no target first, then the missing permission.
 */
export function bulkOffer(
  action: BulkAction,
  ticked: readonly AccountRow[],
  grants: AccountGrants,
): { targets: AccountRow[]; lock: GrantLock } {
  const targets = ticked.filter(TARGETS[action]);
  if (targets.length === 0) return { targets, lock: { disabled: true, title: NO_TARGET[action](ticked) } };
  const permissions = action === 'signout' ? ['clients:security'] : ['clients:update', 'clients:security'];
  return { targets, lock: grants.needsAll(...permissions) };
}
