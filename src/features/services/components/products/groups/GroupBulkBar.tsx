// GroupBulkBar: "Check All / Uncheck All   With selected: [Activate] [Deactivate] [Delete]" under the Group table. Activate and Deactivate run at
// once; Delete asks first, and the server refuses a group that services still use: the words come back in a summary, and that group stays.
import { useState } from 'react';
import { BulkSummaryDialog, Button, ConfirmDialog, WithSelected, type BulkSummary } from '@/components/ui';
import { useGroupBulk } from '../../../hooks/useGroupActions';
import type { ServiceGrants } from '../../../hooks/useServiceGrants';
import type { ServiceCategory } from '../../../types';

export interface GroupBulkBarProps {
  /** The ticked groups. */
  selected: readonly ServiceCategory[];
  onCheckAll: () => void;
  onUncheckAll: () => void;
  /** An action ended (whatever it did): the ticks are cleared. */
  onDone: () => void;
  grants: ServiceGrants;
}

/** The strip and its two dialogs: the delete question and the summary of what the server refused. */
export function GroupBulkBar({ selected, onCheckAll, onUncheckAll, onDone, grants }: GroupBulkBarProps) {
  const bulk = useGroupBulk();
  const [confirming, setConfirming] = useState(false);
  const [summary, setSummary] = useState<BulkSummary | null>(null);
  const updateLock = grants.needs('catalog:update');
  const deleteLock = grants.needs('catalog:delete');
  const busy = bulk.progress !== null;

  async function run(action: () => Promise<BulkSummary | null>) {
    setSummary(await action());
    onDone();
  }

  const many = selected.length !== 1;
  return (
    <>
      <WithSelected count={selected.length} onCheckAll={onCheckAll} onUncheckAll={onUncheckAll}>
        <Button
          size="sm"
          {...updateLock}
          disabled={updateLock.disabled || busy}
          onClick={() => void run(() => bulk.activate(selected))}
        >
          Activate
        </Button>
        <Button
          size="sm"
          {...updateLock}
          disabled={updateLock.disabled || busy}
          onClick={() => void run(() => bulk.deactivate(selected))}
        >
          Deactivate
        </Button>
        <Button
          size="sm"
          variant="danger"
          {...deleteLock}
          disabled={deleteLock.disabled || busy}
          onClick={() => setConfirming(true)}
        >
          Delete
        </Button>
      </WithSelected>
      {bulk.progress && (
        <p role="status" className="px-3.5 text-xs text-ink3">
          {bulk.progress.verb} {bulk.progress.done} of {bulk.progress.total}…
        </p>
      )}
      {confirming && (
        <ConfirmDialog
          open
          title={many ? `Delete ${selected.length} groups?` : `Delete ${selected[0]?.name ?? 'the group'}?`}
          body={
            <>
              <p>
                {many ? 'These groups are' : 'This group is'} removed for good. A group that services still
                use cannot be deleted: the server says which, and it stays.
              </p>
              {many && (
                <ul className="mt-2 list-disc ps-5">
                  {selected.map((group) => (
                    <li key={group.id}>{group.name}</li>
                  ))}
                </ul>
              )}
            </>
          }
          confirm={many ? 'Delete groups' : 'Delete group'}
          kind="danger"
          onClose={() => setConfirming(false)}
          onConfirm={() => run(() => bulk.remove(selected))}
        />
      )}
      {summary && (
        <BulkSummaryDialog
          summary={summary}
          unit={{ one: 'group', many: 'groups' }}
          onClose={() => setSummary(null)}
        />
      )}
    </>
  );
}
