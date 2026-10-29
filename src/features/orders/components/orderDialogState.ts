// Which dialog the orders page (or a drawer) has open, and for what. The table menu, the bulk bar and the drawer all set it.
import type { Order, VerificationDecision } from '../types';

export type OrderDialogState =
  | { kind: 'complete'; orders: readonly Order[] }
  | { kind: 'reject'; orders: readonly Order[] }
  | { kind: 'refund'; order: Order }
  | { kind: 'reopen'; order: Order }
  | { kind: 'verify'; order: Order; decision: VerificationDecision }
  | { kind: 'trace'; order: Order }
  | { kind: 'ledger'; order: Order }
  | { kind: 'bulk-reply' };
