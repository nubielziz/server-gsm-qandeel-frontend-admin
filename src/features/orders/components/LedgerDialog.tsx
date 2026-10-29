// LedgerDialog: "Ledger entries for <order>", the order's money trail. Ports showJournals('order', id) of 20-ui.js: each entry
// with its kind, time, author, memo and lines. The entries come from the finance feature's ledger route.
import { ledgerKindLabel, journalLabel } from '@/features/finance';
import { Modal, QueryState, TypeTag } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { useLedgerTrail } from '../hooks/useLedgerTrail';
import { orderLabel } from '../lib/status';
import type { Order } from '../types';
import { LedgerEntryTable } from './LedgerEntryTable';

export function LedgerDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const trail = useLedgerTrail(order.id);
  const entries = trail.data ?? [];

  return (
    <Modal
      open
      size="lg"
      title={`Ledger entries for ${orderLabel(order)}`}
      sub={
        trail.isSuccess
          ? `${entries.length} ${entries.length === 1 ? 'journal' : 'journals'} posted. Debits equal credits in each.`
          : undefined
      }
      onClose={onClose}
    >
      <QueryState
        isLoading={trail.isLoading}
        isError={trail.isError}
        error={trail.error}
        onRetry={() => void trail.refetch()}
        errorTitle="Could not load the ledger entries"
        isEmpty={entries.length === 0}
        empty={<p className="text-sm text-ink2">No journals posted yet.</p>}
      >
        {entries.map((entry) => (
          <div key={entry.id} className="mb-4 last:mb-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="mono font-medium">{journalLabel(entry.id)}</span>
              <TypeTag>{ledgerKindLabel(entry.kind)}</TypeTag>
              <span className="text-xs text-ink3">
                {fmtDate(entry.createdAt)} · by {entry.createdBy.name ?? 'System'}
              </span>
            </div>
            <p className="mb-1 text-sm text-ink2">{entry.memo}</p>
            <LedgerEntryTable entries={entry.entries} />
          </div>
        ))}
      </QueryState>
    </Modal>
  );
}
