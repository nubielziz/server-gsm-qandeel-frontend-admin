// AdminStats: the four figures above the admin table (active, waiting to join, suspended, 2FA on). Ports the statGrid of
// tabAdmins in 56-p-access.js.
import { StatGrid } from '@/components/ui';
import { staffFigures } from '../lib/staffText';
import type { StaffMember } from '../types';

const TWOFA_TIP =
  'Every admin signs in with a password and a code from an authenticator app. A new admin sets it up the first time.';

/**
 * The four figures above the table, worked out from the loaded accounts.
 */
export function AdminStats({ staff }: { staff: readonly StaffMember[] }) {
  const figures = staffFigures(staff);
  return (
    <StatGrid
      label="Admin figures"
      cells={[
        { label: 'Active admins', value: figures.active, sub: `${figures.signedIn} signed in now` },
        {
          label: 'Waiting to join',
          value: figures.waiting,
          className: figures.waiting > 0 ? 'text-warn-fg' : undefined,
          sub: 'Invited, never signed in',
        },
        { label: 'Suspended', value: figures.suspended, sub: 'Cannot sign in, history kept' },
        {
          label: '2FA on',
          value: `${figures.twofaOn} of ${figures.active}`,
          className: figures.twofaOn < figures.active ? 'text-warn-fg' : undefined,
          sub: 'Required for every admin',
          tip: TWOFA_TIP,
        },
      ]}
    />
  );
}
