// The mock server's stores for the commissions feature, built once from the demo seed on first use. `resetCommissionsStore` puts
// everything back (tests call it after each test through the feature's `reset`).
import type { Collection } from '@/mocks/db';
import { loadDemoState } from '@/mocks/seed';
import type { CommissionPlan } from '../types';
import { buildStores } from './seed';
import type { MockAccrual, MockAssignment, MockMerchant } from './types';

/** Everything the mock server keeps for this feature. */
export type CommissionStores = {
  plans: Collection<CommissionPlan>;
  assignments: Collection<MockAssignment>;
  accruals: Collection<MockAccrual>;
  merchants: ReadonlyMap<number, MockMerchant>;
};

let stores: Promise<CommissionStores> | undefined;

/** The stores, seeded from the demo on first use. Handlers change them in place. */
export function commissionsStore(): Promise<CommissionStores> {
  stores ??= loadDemoState().then(buildStores);
  return stores;
}

/** Forgets the stores, so the next request seeds them again from the demo. */
export function resetCommissionsStore(): void {
  stores = undefined;
}
