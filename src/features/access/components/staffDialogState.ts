// Which dialog the admin tab has open, and for whom. The drawer and the table both set it.
import type { StaffMember } from '../types';

export type StaffDialogState =
  | { kind: 'add' }
  | {
      kind: 'edit' | 'password' | 'suspend' | 'signout' | 'reset2fa' | 'reactivate' | 'block-ip';
      staff: StaffMember;
    }
  /** A temporary password the server made up, shown once. */
  | { kind: 'reveal'; name: string; password: string };
