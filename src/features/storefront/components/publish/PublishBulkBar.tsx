// PublishBulkBar: the strip above the preview table while rows are ticked: how many, Include, Leave out, Set brand, Set carrier, Set
// country and Clear. With every row of the page ticked and more rows matching, it offers "Select all N rows that match": the next
// call then goes by the table's filter, on the server, not by the ids in view. It also says what the last call changed.
import { useState } from 'react';
import { Button } from '@/components/ui';
import type { Id } from '@/lib/api';
import { num } from '@/lib/format';
import { useBulkPublishItems, useRereadPublishRun } from '../../hooks/usePublishMutations';
import { bulkNote, BULK_IDS_MAX } from '../../lib/publishPreview';
import { isConflict, refusalText } from '../../lib/publish';
import type { BulkPublishItemsBody } from '../../types';
import { FACT_WORDS, PublishBulkFactDialog, type FactKey } from './PublishBulkFactDialog';

export interface PublishBulkBarProps {
  runId: Id;
  /** What the call reaches; null when nothing is ticked or more than the route takes by id. */
  select: BulkPublishItemsBody['select'] | null;
  /** The ticked rows (across pages); with `allMatching` the bar counts `total` instead. */
  ticked: number;
  allMatching: boolean;
  /** How many rows match the table's search and filters (the server's count). */
  total: number;
  /** Every row of this page is ticked and more rows match: offer "all that match". */
  offerAll: boolean;
  onSelectAll: () => void;
  onClear: () => void;
}

/** The strip, its dialogs, and the note or refusal of the last call (kept after the rows are unticked). */
export function PublishBulkBar({
  runId,
  select,
  ticked,
  allMatching,
  total,
  offerAll,
  onSelectAll,
  onClear,
}: PublishBulkBarProps) {
  const bulk = useBulkPublishItems(runId);
  const reread = useRereadPublishRun();
  const [fact, setFact] = useState<{ key: FactKey; rows: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const count = allMatching ? total : ticked;

  /** Sends one call; on success the rows are unticked and the note says what changed. A refusal is thrown to the caller. */
  const send = async (set: BulkPublishItemsBody['set']) => {
    if (!select) return;
    setNote(null);
    setError(null);
    try {
      setNote(bulkNote(await bulk.mutateAsync({ select, set })));
      onClear();
    } catch (failure) {
      if (isConflict(failure)) reread(runId);
      throw failure;
    }
  };
  const quick = (set: BulkPublishItemsBody['set']) =>
    void send(set).catch((failure) => setError(refusalText(failure)));
  const blocked = select === null;

  return (
    <>
      {ticked > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft px-3.5 py-2"
          role="region"
          aria-label="Selected rows"
        >
          <span className="text-sm font-medium text-accent-ink">
            {allMatching ? `All ${num(total)} rows that match are selected` : `${num(count)} selected`}
          </span>
          {offerAll && !allMatching && (
            <Button variant="ghost" size="sm" onClick={onSelectAll}>
              Select all {num(total)} rows that match
            </Button>
          )}
          <span className="flex-1" />
          {blocked && (
            <span className="text-xs text-ink3">
              Pick at most {BULK_IDS_MAX} rows by hand, or select all that match.
            </span>
          )}
          <Button
            size="sm"
            disabled={blocked}
            loading={bulk.isPending}
            onClick={() => quick({ included: true })}
          >
            Include
          </Button>
          <Button
            size="sm"
            disabled={blocked}
            loading={bulk.isPending}
            onClick={() => quick({ included: false })}
          >
            Leave out
          </Button>
          {(Object.keys(FACT_WORDS) as FactKey[]).map((key) => (
            <Button key={key} size="sm" disabled={blocked} onClick={() => setFact({ key, rows: count })}>
              Set {key}…
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={onClear}>
            Clear
          </Button>
        </div>
      )}
      {note && (
        <p className="border-b border-line px-3.5 py-2 text-sm text-ink2" role="status">
          {note}
        </p>
      )}
      {error && (
        <p className="border-b border-line px-3.5 py-2 text-sm text-crit-fg" role="alert">
          {error}
        </p>
      )}
      {fact && (
        <PublishBulkFactDialog
          fact={fact.key}
          rows={fact.rows}
          onSave={(value) => send({ [fact.key]: value })}
          onClose={() => setFact(null)}
        />
      )}
    </>
  );
}
