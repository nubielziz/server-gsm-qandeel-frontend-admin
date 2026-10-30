// Turns the commissions mock rows into what the API sends: an assignment with its merchant and plan, an accrual with its agent and the
// referred merchant. The mock plays the server here; the console only reads the joins.
import type { CommissionAccrual, CommissionAssignment } from '../types';
import type { CommissionStores } from './store';
import type { MockAccrual, MockAssignment } from './types';

/** An assignment with the merchant (name and country) and the plan (name and rate) it links. */
export function toAssignment(row: MockAssignment, stores: CommissionStores): CommissionAssignment {
  const merchant = stores.merchants.get(row.beneficiaryId);
  const plan = stores.plans.find(row.planId);
  return {
    ...row,
    beneficiary: merchant ? { id: merchant.id, name: merchant.name, country: merchant.country } : null,
    plan: plan ? { id: plan.id, name: plan.name, percent: plan.percent } : null,
  };
}

/** An accrual with its agent and the referred merchant whose order earned it. */
export function toAccrual(row: MockAccrual, stores: CommissionStores): CommissionAccrual {
  const { merchantId, ...rest } = row;
  const agent = stores.merchants.get(row.beneficiaryId);
  const referred = stores.merchants.get(merchantId);
  return {
    ...rest,
    beneficiary: agent ? { id: agent.id, name: agent.name } : null,
    merchant: referred ? { id: referred.id, name: referred.name } : null,
  };
}
