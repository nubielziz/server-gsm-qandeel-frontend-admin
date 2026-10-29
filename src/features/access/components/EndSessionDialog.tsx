// EndSessionDialog: "End this session?" with a review step. Ending a session signs that person out of that device; ending
// your own signs you out of the console.
import { ConfirmDialog } from '@/components/ui';
import { useRevokeSession } from '../hooks/useSessions';
import { describeUserAgent } from '../lib/userAgent';
import type { Session } from '../types';

export function EndSessionDialog({ session, onClose }: { session: Session; onClose: () => void }) {
  const revoke = useRevokeSession();
  return (
    <ConfirmDialog
      open
      title={`End ${session.subject.name}'s session?`}
      body={
        <>
          <p>
            {session.subject.name} is signed out of {describeUserAgent(session.userAgent)} at{' '}
            <span className="mono">{session.ip}</span> right away and must sign in again.
          </p>
          {session.current && (
            <p className="mt-2 font-medium text-crit-fg">
              This is your own session. Ending it signs you out of the console.
            </p>
          )}
        </>
      }
      confirm="End session"
      kind="danger"
      onClose={onClose}
      onConfirm={() => revoke.mutateAsync(session).then(() => undefined)}
    />
  );
}
