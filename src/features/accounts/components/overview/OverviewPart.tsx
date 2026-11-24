// OverviewPart: the first part of a record: who the account is, its status, how it signs in, its figures and its notes. It is read-only and
// has no bar of its own; what changes here changes through a dialog that saves itself (change the rank, suspend, reactivate, make an account).
// It re-hosts the old merchant and customer headers, figures and banners in the layout the owner asked for.
import { useNow } from '@/lib/format';
import type { AccountPartProps } from '../types';
import { AccountSection } from './AccountSection';
import { FiguresSection } from './FiguresSection';
import { NotesSection } from './NotesSection';
import { SignInSection } from './SignInSection';
import { StatusSection } from './StatusSection';

/**
 * The Overview part. Reads nothing of its own: the record's answer carries the rank, the status, the sign-in facts, and (with
 * `wallet:read`) the wallet and the 30-day figures. Opens the rank, suspend, reactivate and make-an-account dialogs through `onAction`.
 *
 * @param props the part contract: the account, the grants and the dialog opener
 */
export function OverviewPart({ account, grants, onAction }: AccountPartProps) {
  const now = useNow();
  return (
    <section aria-label="Overview" className="min-w-0">
      <AccountSection account={account} grants={grants} onAction={onAction} now={now} />
      <StatusSection account={account} grants={grants} onAction={onAction} now={now} />
      <SignInSection account={account} grants={grants} onAction={onAction} now={now} />
      <FiguresSection account={account} grants={grants} now={now} />
      <NotesSection account={account} />
    </section>
  );
}
