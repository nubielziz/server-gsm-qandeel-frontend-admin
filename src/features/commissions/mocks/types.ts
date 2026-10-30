// The commissions mock rows: the API rows without their joins (the DTO builder adds them when a row is read), plus the merchant
// names the joins need. Mock data only (decision 014): the real rules are the server's.
import type { CommissionAccrual, CommissionAssignment } from '../types';

/** An assignment as stored: the merchant and the plan are joined when it is read. */
export type MockAssignment = Omit<CommissionAssignment, 'beneficiary' | 'plan'>;

/** An accrual as stored: the agent and the referred merchant are joined when it is read. */
export type MockAccrual = Omit<CommissionAccrual, 'beneficiary' | 'merchant'> & { merchantId: number };

/** A merchant of the demo seed, with the few fields the joins show. */
export type MockMerchant = { id: number; name: string; country: string };
