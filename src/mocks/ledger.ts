// Mock ledger: the demo's journals as the API's journal entries (a header and signed lines), plus a helper the order mocks use
// to post new entries when an order is completed, rejected, reopened or refunded. Mock data only (decision 014): the real
// ledger is the server's; this keeps the order drawer's money trail alive in the dev layer.
import type { LedgerAccountRef, LedgerOwnerType, LedgerRefType, LedgerTransaction } from '@/features/finance';
import { Collection } from './db';
import { demoNumericId, demoRows, loadDemoState, toIso, toMoney } from './seed';

/** A journal of the demo seed, as the demo stores it (the fields the mock uses). */
type DemoJournal = {
  id: string;
  ts: number;
  kind: string;
  memo: string;
  refType: string;
  refId: string;
  by: string;
  entries: { acct: string; mid?: string; sid?: string; dr?: number; cr?: number }[];
};

type Named = { id: string; name: string };

/** One line to post: the account (kind and owner) and a signed amount, positive for a debit, negative for a credit. */
export type LedgerLine = {
  kind: string;
  ownerType?: LedgerOwnerType;
  ownerId?: number;
  ownerName?: string;
  amount: number;
};

/** What to post: the header of an entry about an order and its lines. */
export type LedgerPost = { kind: string; memo: string; orderId: number; by: string; lines: LedgerLine[] };

// "ORD-48100" is 48100; a reference without digits (an opening balance) is 0.
function refNumber(id: string): number {
  try {
    return demoNumericId(id);
  } catch {
    return 0;
  }
}

const accountIds = new Map<string, number>();
let entrySeq = 0;

// A ledger account gets a stable id the first time its (kind, owner) pair is seen.
function accountOf(line: LedgerLine): LedgerAccountRef {
  const key = `${line.kind}|${line.ownerType ?? ''}|${line.ownerId ?? ''}`;
  let id = accountIds.get(key);
  if (id === undefined) {
    id = accountIds.size + 1;
    accountIds.set(key, id);
  }
  return {
    id,
    kind: line.kind,
    ownerType: line.ownerType ?? null,
    ownerId: line.ownerId ?? null,
    ownerName: line.ownerName ?? null,
  };
}

function toTransaction(
  id: number,
  header: Pick<LedgerTransaction, 'kind' | 'memo' | 'refType' | 'refId'> & { by: string; at: string },
  lines: LedgerLine[],
): LedgerTransaction {
  return {
    id,
    kind: header.kind,
    memo: header.memo,
    refType: header.refType,
    refId: header.refId,
    createdAt: header.at,
    createdBy: { type: header.by === 'System' ? 'system' : 'staff', id: null, name: header.by },
    entries: lines.map((line) => ({
      id: ++entrySeq,
      account: accountOf(line),
      amount: toMoney(line.amount),
      balanceAfter: toMoney(0),
    })),
  };
}

function fromDemo(
  journal: DemoJournal,
  merchants: Map<string, string>,
  suppliers: Map<string, string>,
): LedgerTransaction {
  const lines = journal.entries.map((entry): LedgerLine => {
    const owner = entry.mid
      ? { ownerType: 'client' as const, ownerId: refNumber(entry.mid), ownerName: merchants.get(entry.mid) }
      : entry.sid
        ? {
            ownerType: 'supplier' as const,
            ownerId: refNumber(entry.sid),
            ownerName: suppliers.get(entry.sid),
          }
        : {};
    return { kind: entry.acct, ...owner, amount: (entry.dr ?? 0) - (entry.cr ?? 0) };
  });
  return toTransaction(
    refNumber(journal.id),
    {
      kind: journal.kind,
      memo: journal.memo,
      refType: journal.refType as LedgerRefType,
      refId: refNumber(journal.refId),
      by: journal.by,
      at: toIso(journal.ts),
    },
    lines,
  );
}

let store: Promise<Collection<LedgerTransaction>> | undefined;

/** The journal entries, seeded from the demo on first use. */
export function ledgerStore(): Promise<Collection<LedgerTransaction>> {
  store ??= loadDemoState().then((state) => {
    const names = (key: string) => new Map(demoRows<Named>(state, key).map((row) => [row.id, row.name]));
    const merchants = names('merchants');
    const suppliers = names('suppliers');
    const rows = demoRows<DemoJournal>(state, 'journals').map((journal) =>
      fromDemo(journal, merchants, suppliers),
    );
    return new Collection(rows);
  });
  return store;
}

/** Posts a new entry about an order. Its lines sum to zero when the caller's amounts do. */
export async function postLedger(post: LedgerPost): Promise<LedgerTransaction> {
  const ledger = await ledgerStore();
  const id = ledger.list().reduce((max, row) => Math.max(max, row.id), 0) + 1;
  const entry = toTransaction(
    id,
    {
      kind: post.kind,
      memo: post.memo,
      refType: 'order',
      refId: post.orderId,
      by: post.by,
      at: new Date().toISOString(),
    },
    post.lines,
  );
  return ledger.insert(entry);
}

/** Drops the store so the next use re-seeds it (tests). */
export function resetLedgerStore(): void {
  store = undefined;
  accountIds.clear();
  entrySeq = 0;
}
