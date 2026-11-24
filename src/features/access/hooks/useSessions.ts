// The open sessions of staff and accounts, one page at a time, and ending one.
import { useApiMutation, useApiQuery } from '@/lib/query';
import { listSessions, revokeSession } from '../api';
import { subjectFilterOf, type SessionWho } from '../lib/sessions';
import type { Session } from '../types';
import { SESSIONS_KEY } from './keys';

/** Sessions per page of the sessions tab. */
export const SESSIONS_PAGE_SIZE = 25;

/** One page of sessions (1-based), of both kinds or of one (`who`). */
export function useSessions(params: { page: number; who?: SessionWho }, enabled = true) {
  const { page, who = 'all' } = params;
  return useApiQuery({
    queryKey: [...SESSIONS_KEY, who, page],
    queryFn: ({ signal }) =>
      listSessions(
        {
          start: (page - 1) * SESSIONS_PAGE_SIZE,
          end: page * SESSIONS_PAGE_SIZE,
          filters: subjectFilterOf(who),
        },
        { signal },
      ),
    enabled,
  });
}

/** Ends one session. The staff lists count open sessions, and an account's record shows its last sign-in, so both refresh. */
export function useRevokeSession() {
  return useApiMutation({
    mutationFn: (session: Session) => revokeSession(session.id),
    invalidates: (_result, session) =>
      session.subjectType === 'account'
        ? [{ resource: 'clients', id: session.subject.id }]
        : [{ resource: 'staff' }],
    invalidateKeys: [SESSIONS_KEY],
    successNotification: (_result, session) => ({
      message: 'Session ended',
      description: `${session.subject.name} was signed out of that device.`,
    }),
    errorNotification: () => false,
  });
}
