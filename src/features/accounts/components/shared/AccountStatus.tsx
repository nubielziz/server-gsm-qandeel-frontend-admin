// AccountStatus: the status of an account as a square and a word (never colour alone: an "off" square is hollow). The look is the data layer's
// (lib/status): by precedence anonymized, blocked, suspended, guest, invitation pending, active; a word the console does not know shows
// as it is, so a new status on the server is never a blank or a crash.
import { StatusSquare } from '@/components/ui';
import { accountStatusLook } from '../../lib/status';
import type { AccountRow } from '../../types';

export interface AccountStatusProps {
  account: Pick<AccountRow, 'status' | 'hasAccount' | 'invitationPending'>;
}

/** A status square and its word. */
export function AccountStatus({ account }: AccountStatusProps) {
  const look = accountStatusLook(account);
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusSquare tone={look.tone} label={look.word} />
      <span>{look.word}</span>
    </span>
  );
}
