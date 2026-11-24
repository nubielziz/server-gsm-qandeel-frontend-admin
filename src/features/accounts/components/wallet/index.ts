// The wallet area of the Accounts page: the Financial and Statement parts, and the dialogs that adjust the wallet, put it on hold, lift the hold and
// set the credit limit. The part registry and the dialog host import these names; the journal dialog is opened by the Statement part itself.
export { AdjustWalletDialog } from './AdjustWalletDialog';
export { CreditLimitDialog } from './CreditLimitDialog';
export { FinancialPart } from './FinancialPart';
export { StatementPart } from './StatementPart';
export { FreezeWalletDialog, UnfreezeWalletDialog } from './WalletHoldDialogs';
