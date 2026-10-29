// The open sessions of staff and merchants, one page at a time, and ending one.
import { useApiMutation, useApiQuery } from '@/lib/query';
import { listSessions, revokeSession } from '../api';
import type { Session, SessionSubjectType } from '../types';
import { SESSIONS_KEY } from './keys';

/** Sessions per page of the sessions tab. */
export const SESSIONS_PAGE_SIZE = 25;

/** One page of sessions (1-based), optionally only staff or only merchants. */
export function useSessions(params: { subjectType?: SessionSubjectType; page: number }, enabled = true) {
  const { subjectType, page } = params;
  return useApiQuery({
    queryKey: [...SESSIONS_KEY, subjectType ?? 'all', page],
    queryFn: ({ signal }) =>
      listSessions(
        {
          start: (page - 1) * SESSIONS_PAGE_SIZE,
          end: page * SESSIONS_PAGE_SIZE,
          filters: subjectType ? { subjectType } : undefined,
        },
        { signal },
      ),
    enabled,
  });
}

/** Ends one session. The staff lists count open sessions, so they refresh too. */
export function useRevokeSession() {
  return useApiMutation({
    mutationFn: (session: Session) => revokeSession(session.id),
    invalidates: [{ resource: 'staff' }],
    invalidateKeys: [SESSIONS_KEY],
    successNotification: (_result, session) => ({
      message: 'Session ended',
      description: `${session.subject.name} was signed out of that device.`,
    }),
    errorNotification: () => false,
  });
}
