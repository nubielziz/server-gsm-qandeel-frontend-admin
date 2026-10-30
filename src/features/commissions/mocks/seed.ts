// Builds the commissions mock stores from the demo's seed (`S.plans`, `S.accruals`, the agents among `S.merchants`) in the API's shapes:
// percents as "3.0000", ids without their prefix (`CA-0001` is 1), an assignment per agent, and each approved accrual's journal as its
// `ledgerTxId`. The demo has no rebate plan, so one is made up; nobody is on it, so it can be deleted.
import { Collection } from '@/mocks/db';
import { demoNumericId, demoRows, toIso, toMoney, type DemoState } from '@/mocks/seed';
import type { CommissionPlan } from '../types';
import type { CommissionStores } from './store';
import type { MockAccrual, MockAssignment, MockMerchant } from './types';

type DemoPlan = { id: string; name: string; basis: string; rate: number; minPayout: number; note: string };
type DemoAccrual = {
  id: string;
  agent: string;
  mid: string;
  orderId: string;
  base: number;
  rate: number;
  amount: number;
  created: number;
  status: 'accrued' | 'approved';
  approvedAt?: number;
};
type DemoMerchant = {
  id: string;
  name: string;
  cc: string;
  plan: string | null;
  isAgent: boolean;
  joined: number;
};
type DemoJournal = { id: string; kind: string; refType: string; refId: string };

const DAY_MS = 86_400_000;

// A rate in the demo is a fraction (0.03); the API's percent is 3.
const percentOf = (fraction: number) => toMoney(Math.round(fraction * 1_000_000) / 10_000);

function planOf(plan: DemoPlan, now: number): CommissionPlan {
  const id = demoNumericId(plan.id);
  return {
    id,
    name: plan.name,
    kind: 'referral',
    basis: plan.basis,
    percent: percentOf(plan.rate),
    // The demo's minimum payout, and for the Partner plan its note ("agents who refer 3+ active merchants") as a condition.
    tiers:
      id === 2
        ? { minPayout: toMoney(plan.minPayout), minReferrals: 3 }
        : { minPayout: toMoney(plan.minPayout) },
    period: 'monthly',
    isActive: true,
    createdAt: toIso(now - 400 * DAY_MS),
    updatedAt: toIso(now - 40 * DAY_MS),
  };
}

const volumeRebate = (id: number, now: number): CommissionPlan => ({
  id,
  name: 'Volume rebate',
  kind: 'rebate',
  basis: 'Own order revenue of the merchant',
  percent: '1.5000',
  tiers: {
    brackets: [
      { from: '1000', percent: '1.0' },
      { from: '5000', percent: '1.5' },
    ],
  },
  period: 'monthly',
  isActive: true,
  createdAt: toIso(now - 30 * DAY_MS),
  updatedAt: toIso(now - 30 * DAY_MS),
});

/** The stores for the commissions mock routes. */
export function buildStores(state: DemoState): CommissionStores {
  const now = Date.now();
  const demoPlans = demoRows<DemoPlan>(state, 'plans');
  const merchants = demoRows<DemoMerchant>(state, 'merchants');
  const journals = demoRows<DemoJournal>(state, 'journals');

  const plans = demoPlans.map((plan) => planOf(plan, now));
  plans.push(volumeRebate(Math.max(0, ...plans.map((plan) => plan.id)) + 1, now));

  const names = new Map<number, MockMerchant>(
    merchants.map((merchant) => [
      demoNumericId(merchant.id),
      { id: demoNumericId(merchant.id), name: merchant.name, country: merchant.cc },
    ]),
  );
  const agentPlan = new Map<number, number>();
  const assignments: MockAssignment[] = [];
  for (const merchant of merchants.filter((m) => m.isAgent && m.plan)) {
    const beneficiaryId = demoNumericId(merchant.id);
    const planId = demoNumericId(merchant.plan as string);
    agentPlan.set(beneficiaryId, planId);
    const since = toIso(now - merchant.joined * DAY_MS);
    assignments.push({
      id: assignments.length + 1,
      planId,
      beneficiaryId,
      scope: 'referrals',
      startsAt: since,
      endsAt: null,
      createdAt: since,
      updatedAt: since,
    });
  }

  // Each approved accrual has a "commission" journal in the demo; its number becomes the accrual's `ledgerTxId`.
  const journalOf = new Map(
    journals
      .filter((j) => j.kind === 'commission' && j.refType === 'accrual')
      .map((j) => [j.refId, demoNumericId(j.id)]),
  );
  const accruals = demoRows<DemoAccrual>(state, 'accruals').map((accrual): MockAccrual => {
    const beneficiaryId = demoNumericId(accrual.agent);
    return {
      id: demoNumericId(accrual.id),
      planId: agentPlan.get(beneficiaryId) ?? 1,
      beneficiaryId,
      merchantId: demoNumericId(accrual.mid),
      orderId: demoNumericId(accrual.orderId),
      period: toIso(accrual.created).slice(0, 7),
      basisAmount: toMoney(accrual.base),
      percent: percentOf(accrual.rate),
      amount: toMoney(accrual.amount),
      status: accrual.status,
      ledgerTxId: accrual.status === 'approved' ? (journalOf.get(accrual.id) ?? null) : null,
      createdAt: toIso(accrual.created),
      updatedAt: toIso(accrual.approvedAt ?? accrual.created),
    };
  });

  return {
    plans: new Collection(plans),
    assignments: new Collection(assignments),
    accruals: new Collection(accruals),
    merchants: names,
  };
}
