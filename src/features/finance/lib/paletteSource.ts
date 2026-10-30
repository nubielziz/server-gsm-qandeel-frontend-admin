// The command palette's journal search: type a memo or a journal number and get up to five entries, newest first, each
// opening its drawer on the Ledger tab. New in the console; the server does the matching (`q` on the ledger list).
import type { PaletteSource } from '@/app/palette';
import { listLedgerTransactions } from '../api/ledger';
import { ledgerKindLabel, journalLabel } from './kinds';
import { normalizeLedgerSearch } from './ledgerView';
import { financeJournalPath } from './tabs';

/** Most entries the palette lists. */
export const PALETTE_JOURNAL_LIMIT = 5;

export const ledgerPaletteSource: PaletteSource = {
  id: 'journals',
  group: 'Ledger',
  permission: 'ledger:read',
  async search(query, signal, go) {
    const { data } = await listLedgerTransactions(
      {
        q: normalizeLedgerSearch(query),
        start: 0,
        end: PALETTE_JOURNAL_LIMIT,
        sort: ['createdAt'],
        order: ['desc'],
      },
      { signal },
    );
    return data.map((entry) => ({
      id: `journal:${entry.id}`,
      label: `${journalLabel(entry.id)}  ${entry.memo}`,
      hint: ledgerKindLabel(entry.kind),
      icon: 'receipt' as const,
      run: () => go(financeJournalPath(entry.id)),
    }));
  },
};
