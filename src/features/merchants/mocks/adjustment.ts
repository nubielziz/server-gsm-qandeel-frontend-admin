// Posts a manual wallet adjustment into the mock ledger and the merchant's statement, so the statement shows the new line and its
// journal opens in the journal dialog. A balanced pair of lines against the `adjustments` account, as the demo's adjustWallet did.
// Mock data only: the real server posts the ledger entries (decision 014).
import type { LedgerAccountRef, LedgerRefType } from '@/features/finance';
import { ledgerStore } from '@/mocks/ledger';
import { toMoney } from '@/mocks/seed';
import type { AdjustDirection } from '../types';
import type { MerchantStore, MockClient } from './store';

let lineSeq = 900_000;

/** Moves the merchant's balance, appends the statement line and adds the journal; returns the journal's id. */
export async function postAdjustment(
  store: MerchantStore,
  client: MockClient,
  adjustment: { direction: AdjustDirection; amount: number; reason: string },
  by: { id: number; name: string },
): Promise<number> {
  const { direction, amount, reason } = adjustment;
  const signed = direction === 'credit' ? amount : -amount;
  const balance = Math.round((client.balance + signed) * 10_000) / 10_000;
  store.clients.patch(client.id, { balance });

  const ledger = await ledgerStore();
  const id = ledger.list().reduce((max, row) => Math.max(max, row.id), 0) + 1;
  const createdAt = new Date().toISOString();
  const memo = `Manual ${direction}: ${reason}`;
  const wallet: LedgerAccountRef = {
    id: 800_000 + client.id,
    kind: 'client_wallet',
    ownerType: 'client',
    ownerId: client.id,
    ownerName: client.name,
  };
  const adjustments: LedgerAccountRef = {
    id: 800_000,
    kind: 'adjustments',
    ownerType: null,
    ownerId: null,
    ownerName: null,
  };
  // The ledger writes a debit as a positive amount: a credit to the wallet debits the adjustments account.
  const lines = [
    { id: ++lineSeq, account: adjustments, amount: toMoney(signed), balanceAfter: toMoney(0) },
    { id: ++lineSeq, account: wallet, amount: toMoney(-signed), balanceAfter: toMoney(balance) },
  ];
  ledger.insert({
    id,
    kind: 'adjustment',
    memo,
    // The finance types do not list merchant references yet; the demo's adjustments referenced the merchant.
    refType: 'merchant' as LedgerRefType,
    refId: client.id,
    createdAt,
    createdBy: { type: 'staff', id: by.id, name: by.name },
    entries: lines,
  });

  const statement = store.statements.get(client.id) ?? [];
  statement.push({
    id: lines[1].id,
    transactionId: id,
    kind: 'adjustment',
    memo,
    amount: toMoney(signed),
    balanceAfter: toMoney(balance),
    createdAt,
  });
  store.statements.set(client.id, statement);
  return id;
}
