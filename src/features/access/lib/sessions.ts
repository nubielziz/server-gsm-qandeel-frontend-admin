// Words and rules of the sessions tab: who a session belongs to, the choices of the "Who" filter, and what ending a session needs.
import type { Session, SessionSubjectType } from '../types';

/** The word shown for a session's subject: the wire's `account` reads "Account" (a merchant and a retail account alike). */
export const SUBJECT_LABEL: Record<SessionSubjectType, string> = {
  staff: 'Staff',
  account: 'Account',
};

/** What the tab's filter offers: both kinds (no filter on the wire), or one. */
export type SessionWho = 'all' | SessionSubjectType;

/** The segments of the "Who" filter, in order. */
export const SESSION_WHO_ITEMS: readonly { value: SessionWho; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'staff', label: SUBJECT_LABEL.staff },
  { value: 'account', label: SUBJECT_LABEL.account },
];

/** The `subjectType` filter of the list call for a choice of the filter; `all` sends none. */
export function subjectFilterOf(who: SessionWho): { subjectType: SessionSubjectType } | undefined {
  return who === 'all' ? undefined : { subjectType: who };
}

/**
 * The permission that ends this session besides `sessions:revoke`: an account's session needs `clients:security` (the server
 * answers 403 without it); a staff session needs nothing more. A hint for the button only.
 */
export function endPermissionOf(session: Pick<Session, 'subjectType'>): string | undefined {
  return session.subjectType === 'account' ? 'clients:security' : undefined;
}
