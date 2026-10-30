// Which dialog the customer page has open, and for whom. The header, the Account tab and the banner all set it.
import type { CustomerDetail } from '../types';

export type CustomerDialogState =
  | {
      kind:
        | 'edit'
        | 'password'
        | 'account'
        | 'signout'
        | 'suspend'
        | 'reactivate'
        | 'block'
        | 'unblock'
        | 'export'
        | 'anonymize'
        | 'block-ip';
      customer: CustomerDetail;
    }
  /** A temporary password the server made up, shown once. */
  | { kind: 'reveal'; name: string; password: string };

/** The dialogs that act on a customer (everything but the one-time password). */
export type CustomerDialogKind = Exclude<CustomerDialogState['kind'], 'reveal'>;
