// JournalDrawer: the side sheet of one journal entry: its memo, its lines with debits and credits, and a link to the record
// it is about. Ports the `jrn-open` modal of 45-p-finance.js (the brief opens it as a drawer). A link to an entry that is
// not on the page (`?journal=25`) has no list row, so it loads the entry first.
import { Link } from 'react-router';
import { Drawer, ErrorState, SkeletonTable, TypeTag } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { useLedgerTransaction } from '../hooks/useLedgerTransaction';
import { journalLabel, ledgerKindLabel } from '../lib/kinds';
import { referenceLink } from '../lib/refs';
import type { LedgerTransaction } from '../types';
import { JournalLines } from './JournalLines';

export interface JournalDrawerProps {
  id: number;
  /** The row from the list, shown at once while the single-entry read loads. */
  row?: LedgerTransaction;
  onClose: () => void;
}

export function JournalDrawer({ id, row, onClose }: JournalDrawerProps) {
  const { entry, query } = useLedgerTransaction(id, row);

  if (!entry) {
    return (
      <Drawer open onClose={onClose} title={journalLabel(id)} titleClassName="mono">
        {query.isError ? (
          <ErrorState
            title="Could not load this entry"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <SkeletonTable cols={2} rows={6} />
        )}
      </Drawer>
    );
  }

  const link = referenceLink(entry.refType, entry.refId);
  return (
    <Drawer
      open
      onClose={onClose}
      title={journalLabel(entry.id)}
      titleClassName="mono"
      badges={<TypeTag>{ledgerKindLabel(entry.kind)}</TypeTag>}
      sub={`${fmtDate(entry.createdAt)} · posted by ${entry.createdBy.name ?? 'System'}`}
    >
      <p className="mb-3 text-sm text-ink2">{entry.memo}</p>
      <JournalLines entries={entry.entries} />
      {link && (
        <p className="mt-3 text-sm">
          <span className="text-ink3">About </span>
          <Link className="link" to={link.to}>
            {link.label}
          </Link>
        </p>
      )}
      <p className="mt-3 text-xs text-ink3">
        Debits equal credits. Posted entries are never edited. A mistake is fixed with a new reversing entry.
      </p>
    </Drawer>
  );
}
