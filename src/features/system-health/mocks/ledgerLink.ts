// The one link from the System health mock to another mock: whether Finance has put the merchant wallet of the
// `maintenance` scenario right (the "reversing entry" of the map's `system-integrity` scenario), read from the ledger mock.
import type { LedgerTransaction } from '@/features/finance';
import { ledgerStore } from '@/mocks/ledger';
import { MISMATCH_CLIENT_ID } from './profile';
import type { HealthState } from './state';

const touchesWallet = (transaction: LedgerTransaction): boolean =>
  transaction.entries.some(
    (entry) => entry.account.kind === 'client_wallet' && entry.account.ownerId === MISMATCH_CLIENT_ID,
  );

/**
 * True when a manual adjustment on that merchant's wallet was posted after the state was seeded (the wallet adjust of
 * the merchants mock writes one). Only the ledger-mismatch scenario has a difference to put right.
 */
export async function reversingEntryPosted(state: HealthState): Promise<boolean> {
  if (!state.profile.ledgerMismatch) return false;
  const ledger = await ledgerStore();
  return ledger
    .list()
    .some(
      (transaction) =>
        transaction.kind === 'adjustment' &&
        Date.parse(transaction.createdAt) >= state.anchor &&
        touchesWallet(transaction),
    );
}
