// The contract between the Accounts page and the views, parts and dialogs it draws. Code that builds a view, a
// part or a dialog keeps the names and props below: the page draws whatever its registries (frame/accountsViews, record/accountParts) and
// the dialog host (record/AccountDialogs) hold, so no view knows about another.
import type { ComponentType } from 'react';
import type { AccountTab } from '../lib/paths';
import type { AccountDetail, AccountRow } from '../types';
import type { AccountGrants } from './frame/useAccountGrants';

/** The views of the list page: the six values of the address's `view` (All has none). */
export type AccountsViewId = 'all' | 'add' | 'ranks' | 'add-rank' | 'requests' | 'edit-rank';

/** What every view receives: what the signed-in staff member may do. */
export type AccountsViewProps = { grants: AccountGrants };

/**
 * One view of the page. `group` says where its link goes: `main` is the first row (All, +Add Account, Ranks, +Add Rank), `extra` is after
 * the divider (Data requests) and `hidden` has no link (Edit rank). `add` draws a "+" before the label. `show` says whether the staff
 * member's permissions open the view at all; a view the role may not use is not listed and falls back to the first one it may.
 */
export type AccountsViewSpec = {
  id: AccountsViewId;
  label: string;
  add?: boolean;
  group: 'main' | 'extra' | 'hidden';
  show: (grants: AccountGrants) => boolean;
  Component: ComponentType<AccountsViewProps>;
};

/** The parts of one account's record: the thirteen ids of the data layer's `AccountTab` (the address names one with `tab=`). */
export type AccountPartId = AccountTab;

/** What an action on one or more accounts is called; the dialog host (record/AccountDialogs) opens the dialog of each. */
export type AccountAction =
  | 'adjust'
  | 'freeze'
  | 'unfreeze'
  | 'credit-limit'
  | 'rank'
  | 'suspend'
  | 'reactivate'
  | 'block'
  | 'unblock'
  | 'password'
  | 'signout'
  | 'reset-2fa'
  | 'make-account'
  | 'export'
  | 'anonymize';

/** How a part or the list asks for a dialog: the action and the accounts it is about (one, or the ticked rows of a bulk action). */
export type OpenAction = (action: AccountAction, accounts: readonly AccountRow[]) => void;

/**
 * What every part of the record receives: the account (read in full), the grants, a way to say the part holds unsaved changes (so the
 * record can ask before another part or view is opened) and a way to open a dialog.
 */
export type AccountPartProps = {
  account: AccountDetail;
  grants: AccountGrants;
  onDirtyChange: (dirty: boolean) => void;
  onAction: OpenAction;
};

/** One part of the record, in the left menu's order: its id, its label, who sees it and the number after its label, if any. */
export type AccountPartSpec = {
  id: AccountPartId;
  label: string;
  show: (grants: AccountGrants, account: AccountDetail) => boolean;
  count?: (account: AccountDetail) => number | undefined;
  Component: ComponentType<AccountPartProps>;
};

/** What a dialog about one account receives. It is mounted only while open, so it starts empty each time. */
export type AccountDialogProps = { account: AccountRow; onClose: () => void };

/** What a dialog that works on one or many accounts receives (suspend, reactivate, sign out). */
export type ManyAccountsDialogProps = { accounts: readonly AccountRow[]; onClose: () => void };
