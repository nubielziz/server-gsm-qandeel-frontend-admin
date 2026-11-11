// The open sessions of one merchant for the Security tab, and ending one of them. The list is the access feature's
// `GET /admin/sessions` with `subjectType=client&subjectId=<id>` (it needs `sessions:read`).
import { listSessions, revokeSession, type Session } from '@/features/access';
import { useApiMutation, useApiQuery } from '@/lib/query';
import { MERCHANT_SESSIONS_KEY, staleClient } from './keys';

/** The most sessions the tab lists; a merchant has few, and the count above it is the server's. */
export const MERCHANT_SESSIONS_LIMIT = 25;

/** The signed-in sessions of one merchant, most recently seen first. Pass `enabled: false` while the staff member lacks `sessions:read`. */
export function useMerchantSessions(clientId: number, enabled = true) {
  return useApiQuery({
    queryKey: [...MERCHANT_SESSIONS_KEY, clientId],
    queryFn: ({ signal }) =>
      listSessions(
        {
          start: 0,
          end: MERCHANT_SESSIONS_LIMIT,
          filters: { subjectType: 'client', subjectId: clientId },
        },
        { signal },
      ),
    enabled,
  });
}

/** Ends one session of a merchant; the merchant's open-session count on the Security tab follows. */
export function useEndMerchantSession() {
  return useApiMutation({
    mutationFn: (session: Session) => revokeSession(session.id),
    invalidates: (_result, session) => staleClient(session.subject.id),
    invalidateKeys: [MERCHANT_SESSIONS_KEY],
    successNotification: (_result, session) => ({
      message: 'Session ended',
      description: `${session.subject.name} was signed out of that device.`,
    }),
  });
}
