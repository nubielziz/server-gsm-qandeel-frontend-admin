// Words and figures for admin accounts. Ports adminJoinText and adminPwText of 56-p-access.js and the stat strip and
// status sub-line of tabAdmins.
import { ago } from '@/lib/format';
import type { StaffMember } from '../types';

const HOUR_MS = 3_600_000;

/** When the invitation or reset link went out; undefined when the server does not say (see `StaffMember`). */
function sentAt(staff: StaffMember): number | undefined {
  return staff.resetSentAt ? Date.parse(staff.resetSentAt) : undefined;
}

/** The note in the drawer of an admin who has not signed in yet: how they will get in, and whether the link is still good. */
export function joinText(staff: StaffMember, now: number = Date.now()): string {
  if (staff.status !== 'invited') return '';
  if (staff.passwordChangedAt) {
    return `Temporary password set ${ago(staff.passwordChangedAt, now)}. They must change it and set up 2FA at first sign-in.`;
  }
  const sent = sentAt(staff);
  if (sent === undefined) {
    return 'An invitation was sent. If it did not arrive or has expired, send a new one from Password.';
  }
  return now - sent > HOUR_MS
    ? 'The invitation link expired. Send a new one from Password.'
    : `Invitation link sent ${ago(sent, now)}. It works for 1 hour.`;
}

/** The "Password" line of the drawer. `warn` marks a temporary password that is still waiting to be replaced. */
export function passwordText(staff: StaffMember, now: number = Date.now()): { text: string; warn: boolean } {
  const plain = (text: string) => ({ text, warn: false });
  if (staff.status === 'invited') {
    return plain(staff.passwordChangedAt ? 'Temporary, change required' : 'Not chosen yet');
  }
  const sent = sentAt(staff);
  const changed = staff.passwordChangedAt ? Date.parse(staff.passwordChangedAt) : 0;
  if (sent !== undefined && sent > changed) return plain(`Reset link sent ${ago(sent, now)}`);
  if (staff.mustChangePassword) {
    return { text: 'Temporary, change required at next sign-in', warn: true };
  }
  return plain(staff.passwordChangedAt ? `Changed ${ago(staff.passwordChangedAt, now)}` : 'Not changed yet');
}

/** The small line under the status badge in the table: why they are waiting or why they were suspended. */
export function statusNote(staff: StaffMember, now: number = Date.now()): string {
  if (staff.status === 'suspended') return (staff.suspendedReason ?? '').split(':')[0];
  if (staff.status !== 'invited') return '';
  if (staff.passwordChangedAt) return 'Temporary password';
  const sent = sentAt(staff);
  if (sent === undefined) return 'Link sent';
  return now - sent > HOUR_MS ? 'Link expired' : `Link sent ${ago(sent, now)}`;
}

/** The four numbers of the strip above the admin table. */
export type StaffFigures = {
  active: number;
  /** Admins with at least one open session. */
  signedIn: number;
  /** Invited and never signed in. */
  waiting: number;
  suspended: number;
  /** Active admins that have 2FA on. */
  twofaOn: number;
};

/**
 * Counts the accounts for the figures above the table.
 */
export function staffFigures(staff: readonly StaffMember[]): StaffFigures {
  const active = staff.filter((member) => member.status === 'active');
  return {
    active: active.length,
    signedIn: staff.filter((member) => member.activeSessions > 0).length,
    waiting: staff.filter((member) => member.status === 'invited').length,
    suspended: staff.filter((member) => member.status === 'suspended').length,
    twofaOn: active.filter((member) => member.twofaEnabled).length,
  };
}

/** "1 device" / "3 devices": how many open sessions, in words. */
export function devicesText(count: number): string {
  return `${count} ${count === 1 ? 'device' : 'devices'}`;
}

/** "1 session" / "3 sessions". */
export function sessionsText(count: number): string {
  return `${count} ${count === 1 ? 'session' : 'sessions'}`;
}
