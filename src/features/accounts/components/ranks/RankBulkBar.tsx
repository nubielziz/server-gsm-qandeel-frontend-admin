// RankBulkBar: "Check All / Uncheck All   With selected: [Delete]" under the Ranks table. Delete counts only the ticked ranks with no account that are
// not the retail rank, asks first, and shows the server's refusals in a summary (a rank that gained an account meanwhile stays).
import { useState } from 'react';
import { BulkSummaryDialog, Button, WithSelected, type BulkSummary } from '@/components/ui';
import type { Rank } from '../../types';
import type { AccountGrants } from '../frame/useAccountGrants';
import { DeleteRanksDialog } from './DeleteRanksDialog';
import { deleteOffer, type DeleteOffer } from './rankList';
import { useRankBulk } from './useRankBulk';

export interface RankBulkBarProps {
  /** The ticked ranks of the page. */
  selected: readonly Rank[];
  onCheckAll: () => void;
  onUncheckAll: () => void;
  /** The action ended (whatever it did): the ticks are cleared. */
  onDone: () => void;
  grants: AccountGrants;
}

/** The strip and its two dialogs: the delete question and the summary of what the server refused. Needs `groups:delete`. */
export function RankBulkBar({ selected, onCheckAll, onUncheckAll, onDone, grants }: RankBulkBarProps) {
  const bulk = useRankBulk();
  // The offer the question was asked with: it stays while the ticks are cleared at the end of the run.
  const [asking, setAsking] = useState<DeleteOffer | null>(null);
  const [summary, setSummary] = useState<BulkSummary | null>(null);
  const lock = grants.needs('groups:delete');
  const offer = deleteOffer(selected);
  const busy = bulk.progress !== null;
  // Why Delete is off, when it is: the missing permission first, else why none of the ticked ranks can go.
  const reason = lock.title ?? (selected.length > 0 ? offer.reason : undefined);

  async function remove(targets: DeleteOffer['targets']) {
    setSummary(await bulk.remove(targets));
    onDone();
  }

  return (
    <>
      <WithSelected count={selected.length} onCheckAll={onCheckAll} onUncheckAll={onUncheckAll}>
        <Button
          size="sm"
          variant="danger"
          disabled={lock.disabled || busy || offer.targets.length === 0}
          title={reason}
          onClick={() => setAsking(offer)}
        >
          Delete
        </Button>
      </WithSelected>
      {bulk.progress && (
        <p role="status" className="px-3.5 text-xs text-ink3">
          {bulk.progress.verb} {bulk.progress.done} of {bulk.progress.total}…
        </p>
      )}
      {asking && (
        <DeleteRanksDialog
          offer={asking}
          onClose={() => setAsking(null)}
          onConfirm={() => remove(asking.targets)}
        />
      )}
      {summary && (
        <BulkSummaryDialog
          summary={summary}
          unit={{ one: 'rank', many: 'ranks' }}
          onClose={() => setSummary(null)}
        />
      )}
    </>
  );
}
