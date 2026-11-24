// Seeds the risk mocks from the demo's own data: the storefront orders' risk blocks (`S.orders[].risk`), `S.risk.block` and
// `S.risk.rules`, mapped to the DTOs of this feature (decision 014). Mock data only: the real scores and rules come from
// the server. Shapes of the demo are listed here so the mapping can be read in one place.
import { Collection } from '@/mocks/db';
import { demoNumericId, demoRows, toIso, toMoney, type DemoState } from '@/mocks/seed';
import { demoStaffIds } from '@/mocks/staff';
import type { BlocklistEntry, HeldOrder, NamedRef, RiskOutcome, RiskRule } from '../types';
import type { DemoBlock, DemoCustomer, DemoNamed, DemoRiskOrder, DemoRule } from './demoShapes';

/** A storefront order's risk assessment as the mock keeps it: the held order's DTO plus the decision. `id` is the order id. */
export type MockAssessment = HeldOrder & {
  id: number;
  decision: 'allow' | 'review';
  reviewedBy: NamedRef | null;
  reviewedAt: string | null;
  outcome: RiskOutcome | null;
};

/** Everything the risk mocks keep. */
export type RiskMockState = {
  assessments: Collection<MockAssessment>;
  blocklist: Collection<BlocklistEntry>;
  rules: RiskRule[];
};

// The demo's rr1..rr8 become named rules (the API's words; assumed contract).
const RULE_IDS: Record<string, string> = {
  rr2: 'reviewThreshold',
  rr3: 'blockThreshold',
  rr4: 'maxOrdersPerEmail',
  rr5: 'reviewFirstOrderAbove',
  rr6: 'require3ds',
  rr7: 'reviewIpCountryMismatch',
  rr8: 'blockDisposableEmail',
};

function assessments(state: DemoState, ids: Map<string, number>): MockAssessment[] {
  const named = (key: string) => new Map(demoRows<DemoNamed>(state, key).map((row) => [row.id, row]));
  const services = named('services');
  const suppliers = named('suppliers');
  const customers = new Map(demoRows<DemoCustomer>(state, 'customers').map((row) => [row.id, row]));
  const orders = demoRows<DemoRiskOrder>(state, 'orders').filter((order) => order.cid);
  const countBy = (key: string, cid: string) =>
    demoRows<{ cid: string }>(state, key).filter((row) => row.cid === cid).length;

  return orders.flatMap((order) => {
    const customer = customers.get(order.cid as string);
    const service = services.get(order.sid);
    if (!customer || !service) return [];
    const supplier = suppliers.get(order.sup);
    const reviewer = order.risk.reviewedBy;
    // The demo counts every order of the customer and says "N earlier orders" for the count minus the held one.
    const earlier = Math.max(0, orders.filter((other) => other.cid === customer.id).length - 1);
    return [
      {
        id: demoNumericId(order.id),
        orderId: demoNumericId(order.id),
        paidAt: toIso(order.created),
        score: order.risk.score,
        decision: order.risk.decision,
        service: { id: demoNumericId(service.id), name: service.name },
        supplier: supplier ? { id: demoNumericId(supplier.id), name: supplier.name } : null,
        imei: order.input,
        device: order.device ?? null,
        capturedAmount: toMoney(order.gross),
        currency: order.cur,
        fxRate: order.fx.toFixed(4),
        paymentMethod: order.pay.method,
        signals: order.risk.signals,
        customer: {
          id: demoNumericId(customer.id),
          name: customer.name,
          email: customer.email,
          country: customer.country,
          history: {
            earlierOrders: earlier,
            refunds: countBy('refunds', customer.id),
            disputes: countBy('disputes', customer.id),
          },
        },
        reviewedBy: reviewer ? { id: ids.get(reviewer) ?? 0, name: reviewer } : null,
        reviewedAt: order.risk.reviewedAt ? toIso(order.risk.reviewedAt) : null,
        outcome: order.risk.outcome,
      },
    ];
  });
}

function blocklist(state: DemoState, ids: Map<string, number>): BlocklistEntry[] {
  const risk = state.risk as { block?: DemoBlock[] } | undefined;
  return (risk?.block ?? []).map((row) => ({
    id: demoNumericId(row.id),
    kind: row.kind,
    display: row.display,
    reason: row.reason,
    expiresAt: null,
    source: row.source,
    createdBy: ids.has(row.by) ? { id: ids.get(row.by) as number, name: row.by } : null,
    createdAt: toIso(row.ts),
  }));
}

function rules(state: DemoState): RiskRule[] {
  const risk = state.risk as { rules?: DemoRule[] } | undefined;
  return (risk?.rules ?? []).map((rule) => ({
    id: RULE_IDS[rule.id] ?? rule.id,
    on: rule.on,
    value: rule.value,
  }));
}

/** Builds the mock state from the loaded demo state. */
export function buildRiskState(state: DemoState): RiskMockState {
  const ids = demoStaffIds(state);
  return {
    assessments: new Collection(assessments(state, ids)),
    blocklist: new Collection(blocklist(state, ids)),
    rules: rules(state),
  };
}
