// Posts the ledger journal of an approved commission batch into the mock ledger: the Commission expense account is debited and the
// agent's wallet is credited, as the demo's `approveAccruals` did. The journal's number becomes the accruals' `ledgerTxId`. The merchants
// mock's wallet balance is not moved (that store belongs to the merchants feature). Mock data only: the real server posts the entries.
import type { LedgerAccountRef, LedgerRefType } from '@/features/finance';
import { ledgerStore } from '@/mocks/ledger';
import { currentStaff } from '@/mocks/session';
import { toMoney } from '@/mocks/seed';
import type { MockAccrual, MockMerchant } from './types';

let lineSeq = 950_000;

/** Adds one journal for an agent's approved accruals and returns its id. `total` is in dollars. */
export async function postCommissionJournal(
  agent: MockMerchant,
  accruals: readonly MockAccrual[],
  total: number,
): Promise<number> {
  const ledger = await ledgerStore();
  const staff = await currentStaff();
  const id = ledger.list().reduce((max, row) => Math.max(max, row.id), 0) + 1;
  const expense: LedgerAccountRef = {
    id: 810_000,
    kind: 'commission_expense',
    ownerType: null,
    ownerId: null,
    ownerName: null,
  };
  const wallet: LedgerAccountRef = {
    id: 820_000 + agent.id,
    kind: 'client_wallet',
    ownerType: 'client',
    ownerId: agent.id,
    ownerName: agent.name,
  };
  ledger.insert({
    id,
    kind: 'commission',
    memo: `Commission batch, ${accruals.length} ${accruals.length === 1 ? 'accrual' : 'accruals'} to ${agent.name}`,
    // The finance types do not list accruals yet; the demo's commission journals referenced the first accrual.
    refType: 'accrual' as LedgerRefType,
    refId: accruals[0].id,
    createdAt: new Date().toISOString(),
    createdBy: { type: 'staff', id: staff?.id ?? null, name: staff?.name ?? null },
    entries: [
      { id: ++lineSeq, account: expense, amount: toMoney(total), balanceAfter: toMoney(0) },
      { id: ++lineSeq, account: wallet, amount: toMoney(-total), balanceAfter: toMoney(0) },
    ],
  });
  return id;
}
