// Types for the ledger routes (`/admin/ledger/transactions`): a journal entry and its lines. The finance page extends
// this later; the order drawer already uses it for the money trail. The map gives no bodies (MISMATCHES M10), so every
// shape below is an assumed contract, built from the generated rows in `src/lib/api/schema.gen.ts`.
import type { Id } from '@/lib/api';
import type { LedgerAccountRow, LedgerEntryRow, LedgerTransactionRow } from '@/lib/api/schema.gen';

/** What a journal entry is about (`ref_type`): an order, an invoice, a refund or a dispute. */
export type LedgerRefType = 'order' | 'invoice' | 'refund' | 'dispute';

/** Who owns a ledger account. Platform accounts (revenue, VAT payable…) have no owner. */
export type LedgerOwnerType = 'client' | 'supplier' | 'customer';

/** The account behind one line: its kind (`client_wallet`, `revenue`…) and, when it has one, the owner's name. */
export type LedgerAccountRef = Pick<LedgerAccountRow, 'id' | 'kind'> & {
  ownerType: LedgerOwnerType | null;
  ownerId: Id | null;
  ownerName: string | null;
};

/**
 * One line of an entry. The lines of one entry sum to zero: a positive amount is a debit and a negative one a
 * credit (assumed; the map only says that the lines sum to zero).
 */
export type LedgerEntry = Pick<LedgerEntryRow, 'id' | 'amount' | 'balanceAfter'> & {
  account: LedgerAccountRef;
};

/** Who posted the entry: a staff member, the system, or the merchant or customer whose action caused it. */
export type LedgerActor = {
  type: 'staff' | 'system' | 'client' | 'customer';
  id: Id | null;
  name: string | null;
};

/** A journal entry with its lines, as the ledger routes send it (assumed contract). */
export type LedgerTransaction = Pick<LedgerTransactionRow, 'id' | 'kind' | 'memo' | 'refId' | 'createdAt'> & {
  refType: LedgerRefType;
  createdBy: LedgerActor;
  entries: LedgerEntry[];
};

/** The filters `GET /admin/ledger/transactions` understands besides paging and sorting (assumed contract). */
export type LedgerTransactionFilters = {
  /** With `refId`: only the entries about that record (an order's money trail). */
  refType?: LedgerRefType;
  refId?: Id;
  /** One entry kind such as `order_settle`. */
  kind?: string;
};
