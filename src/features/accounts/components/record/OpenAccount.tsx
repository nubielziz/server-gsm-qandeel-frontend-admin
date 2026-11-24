// OpenAccount: an account that has been read, drawn as the layout of a record with many parts. The parts come from the
// registry (record/accountParts), narrowed to what the role may see; the part the address names is shown, or the first one when it names
// none (or one the role may not see). It asks the unsaved-changes question: a part says it has unsaved changes (the mark the page
// holds beside its read of the record), and while it has, another part, the back link, another view or a reload asks first (UnsavedGuard).
// It also keeps a form part from working on a stale copy of the account (usePartStart), and mounts the dialog host the parts open.
import { ButtonLink, EmptyState, PartsLayout, UnsavedGuard, type DirtyMark } from '@/components/ui';
import { accountPath } from '../../lib/paths';
import type { AccountDetail } from '../../types';
import { lastListLink } from '../frame/lastListAddress';
import type { AccountGrants } from '../frame/useAccountGrants';
import { accountLabel } from '../shared/accountLabel';
import { AccountStatus } from '../shared/AccountStatus';
import type { AccountPartId } from '../types';
import { AccountDialogs } from './AccountDialogs';
import { openPart } from './openPart';
import { RecordLoading } from './RecordLoading';
import { useAccountDialogs } from './useAccountDialogs';
import { usePartStart } from './usePartStart';

/**
 * The parts that fill a form from the record when they open (the ones that save a changed copy of it). Only these wait for a fresh
 * record and start again when it changes; the others read their own data or follow their props.
 */
const STARTS_FROM_RECORD: readonly AccountPartId[] = ['profile'];

export interface OpenAccountProps {
  account: AccountDetail;
  /** The part the address names, or null when it names none. */
  part: AccountPartId | null;
  grants: AccountGrants;
  /** The record is being read again (a change marked it stale): a part that fills a form from it is not drawn until the new copy is here. */
  refreshing: boolean;
  /** The unsaved mark of the open part (useDirtyMark on the scope of openPart), held by the caller beside its read of the record. */
  mark: DirtyMark;
}

/** The menu of parts, the part that is open and the question asked before its unsaved changes are left. */
export function OpenAccount({ account, part, grants, refreshing, mark }: OpenAccountProps) {
  const { parts, current, scope } = openPart(account, part, grants);
  // One mark per part of one account: a part that has been closed cannot mark the next one.
  const { dirty, report } = mark;
  const { waiting, version } = usePartStart(scope, account, {
    fromRecord: current !== undefined && STARTS_FROM_RECORD.includes(current.id),
    dirty,
    refreshing,
  });
  const dialogs = useAccountDialogs();
  // The list as it was last seen (its filters and page), not the first page of everything.
  const back = { label: 'Back to All', to: lastListLink() };
  if (!current) {
    return (
      <EmptyState
        icon="lock"
        title="Nothing to show for your role"
        cta={<ButtonLink to={back.to}>{back.label}</ButtonLink>}
      >
        Your role cannot see any part of this account.
      </EmptyState>
    );
  }
  return (
    <>
      <PartsLayout
        title={accountLabel(account)}
        sub={
          <>
            #{account.id} · {account.rank.name} · <AccountStatus account={account} />
          </>
        }
        back={back}
        menuLabel="Parts of the account"
        items={parts.map((candidate) => ({
          id: candidate.id,
          label: candidate.label,
          to: accountPath(account.id, candidate.id),
          count: candidate.count?.(account),
        }))}
        current={current.id}
      >
        {waiting ? (
          <RecordLoading />
        ) : (
          <current.Component
            key={`${account.id}:${current.id}:${version}`}
            account={account}
            grants={grants}
            onDirtyChange={report}
            onAction={dialogs.open}
          />
        )}
      </PartsLayout>
      <UnsavedGuard active={dirty} what={current.label} stays={accountPath(account.id, current.id)} />
      <AccountDialogs request={dialogs.request} onClose={dialogs.close} />
    </>
  );
}
