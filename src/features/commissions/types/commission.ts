// Types of the commissions feature: plans, assignments (the agents tab) and accruals, as the `/admin/commission-*` routes send
// them, and the bodies of the changes. The map names the routes but gives no bodies (MISMATCHES M10), so every shape here is an
// assumed contract built on the generated rows in `src/lib/api/schema.gen.ts`.
import type { Decimal, Id, IsoDateTime, JsonObject, Money } from '@/lib/api';
import type { CommissionAccrualRow, CommissionAssignmentRow, CommissionPlanRow } from '@/lib/api/schema.gen';

/** A record named in a join. */
export type NamedRef = { id: Id; name: string };

/** What a plan pays for: a referral commission to the agent who brought a merchant, or a rebate to a merchant on its own orders. */
export type PlanKind = 'referral' | 'rebate';

/**
 * One commission plan (assumed contract). `percent` is the rate ("3.0000" is 3%), `basis` says what it is paid on, and `tiers`
 * holds the plan's conditions as the server stores them (minimum payout, brackets…); the console shows them and does not
 * read any rule out of them.
 */
export type CommissionPlan = Pick<
  CommissionPlanRow,
  'id' | 'name' | 'basis' | 'percent' | 'tiers' | 'period' | 'isActive' | 'createdAt' | 'updatedAt'
> & { kind: PlanKind };

/** Body of `POST /admin/commission-plans` (assumed contract). */
export type CreatePlanBody = {
  name: string;
  kind: PlanKind;
  percent: Decimal;
  basis: string;
  period: string;
  tiers: JsonObject;
  isActive: boolean;
};

/** Body of `PATCH /admin/commission-plans/:id` (assumed contract): only the fields that change. */
export type UpdatePlanBody = Partial<CreatePlanBody>;

/** The merchant on an assignment, named in a join (assumed contract). `country` may be missing. */
export type AgentRef = NamedRef & { country?: string };

/** The plan on an assignment, named in a join with its rate (assumed contract). */
export type PlanRef = NamedRef & { percent: Decimal };

/**
 * A plan assigned to a merchant, so the merchant is an agent (assumed contract). The server joins `beneficiary` and `plan`
 * so a row needs no second request; a screen falls back to the ids when a join is missing.
 */
export type CommissionAssignment = Pick<
  CommissionAssignmentRow,
  'id' | 'planId' | 'beneficiaryId' | 'scope' | 'startsAt' | 'endsAt' | 'createdAt' | 'updatedAt'
> & {
  beneficiary?: AgentRef | null;
  plan?: PlanRef | null;
};

/** Body of `POST /admin/commission-assignments` (assumed contract): the server sets the scope and the start (now). */
export type CreateAssignmentBody = { beneficiaryId: Id; planId: Id };

/** Body of `PATCH /admin/commission-assignments/:id` (assumed contract): the new plan. */
export type UpdateAssignmentBody = { planId: Id };

/** Where an accrual stands: earned and waiting for staff, or approved and paid into the agent's wallet. */
export type AccrualStatus = 'accrued' | 'approved';

/**
 * One accrual (assumed contract). `status` stays text because the table has no fixed list of values; the screen knows
 * `accrued` and `approved` and shows any other value as it is. `ledgerTxId` is null until the accrual is paid out.
 * `beneficiary` is the agent and `merchant` the referred merchant whose order earned it, both as joins.
 */
export type CommissionAccrual = Pick<
  CommissionAccrualRow,
  | 'id'
  | 'planId'
  | 'beneficiaryId'
  | 'orderId'
  | 'period'
  | 'basisAmount'
  | 'percent'
  | 'amount'
  | 'createdAt'
  | 'updatedAt'
> & {
  status: string;
  ledgerTxId: Id | null;
  beneficiary?: NamedRef | null;
  merchant?: NamedRef | null;
};

/** The field filters of `GET /admin/commission-accruals` besides paging and sorting (assumed contract). */
export type AccrualListFilters = {
  status?: AccrualStatus;
  beneficiaryId?: Id;
  /** Accruals earned on or after this moment (the header strip's 30 days). */
  createdAt_gte?: IsoDateTime;
};

/** Body of `POST /admin/commission-accruals/approve` (assumed contract): the accruals to approve and pay out. */
export type ApproveAccrualsBody = { ids: Id[] };

/** An accrual the server did not approve, with its reason (assumed contract). */
export type SkippedAccrual = { id: Id; reason: string };

/**
 * What the server answers to the bulk approval (assumed contract): how many accruals it approved, the total it posted to
 * the agents' wallets, and the accruals it skipped with the reason for each (already approved, not found, refunded…).
 */
export type ApproveAccrualsResult = {
  approved: number;
  total: Money;
  skipped: SkippedAccrual[];
};
