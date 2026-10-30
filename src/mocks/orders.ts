// Mock orders, taken from the demo's orders with their services, merchants, customers, suppliers and events, mapped to the
// order DTO of the orders feature (decision 014). The demo's five states become the API's `status` + `queue` (MISMATCHES M20),
// and ids lose their prefix (`ORD-48100` is 48100). A few orders are changed on purpose so every screen of the drawer has
// something to show: one queued merchant order becomes a manual order and the two newest completed merchant orders wait for
// a verification decision (the demo has neither).
import type { EventActorType, Order, OrderEvent, ServiceType, SupplierOption } from '@/features/orders';
import type { JsonObject } from '@/lib/api';
import { Collection } from './db';
import { demoNumericId, demoRows, loadDemoState, toIso, toMoney } from './seed';

type DemoEvent = { ts: number; k: string; text: string; by: string };

/** An order of the demo seed, as the demo stores it (the fields the mock uses). */
type DemoOrder = {
  id: string;
  mid?: string;
  cid?: string;
  sid: string;
  input: string;
  device?: string | null;
  qty: number;
  created: number;
  status: 'queued' | 'processing' | 'review' | 'completed' | 'rejected';
  price: number;
  list?: number;
  cost: number;
  sup: string;
  source: string;
  chan: string;
  reason: string | null;
  attempts: number;
  ref: string;
  doneAt: number | null;
  reply: string | null;
  events: DemoEvent[];
  cur?: string;
  fx?: number;
  taxRate?: number;
  tax?: number;
  risk?: { decision: string; reviewedAt: number | null };
};

type DemoService = {
  id: string;
  name: string;
  type: 'IMEI' | 'Server' | 'Remote' | 'File';
  category: string;
  cost: number;
  markup: number;
  price: number;
  minProfit: number;
  sla: number;
};
type DemoNamed = { id: string; name: string };
type DemoCustomer = DemoNamed & { email: string };
type DemoSupplier = DemoNamed & { status: string; enabled: boolean };

/** The reason text of a manual order (REVIEW_REASONS.manual in 10-data.js). */
export const MANUAL_REASON = 'Manual service: operator dispatch required';
const VERIFICATION_REASON = 'The merchant asked for the result to be checked';

/** An order as the mock keeps it: the DTO plus its timeline. */
export type MockOrder = Order & { events: OrderEvent[] };

/** The DTO the API sends, without the mock's own timeline. */
export function toOrder(row: MockOrder): Order {
  const { events: _events, ...order } = row;
  return order;
}

const SYSTEM_ACTORS = new Set(['System', 'Risk engine', 'Payment gateway']);
const SOURCES: Record<string, string> = {
  'Dhru API': 'dhru',
  'REST API': 'v1',
  Portal: 'portal',
  Storefront: 'store',
};

let eventSeq = 0;

/** Adds one line to an order's timeline. */
export function addEvent(
  order: MockOrder,
  type: string,
  message: string,
  actor: OrderEvent['actor'],
  data: JsonObject = {},
): void {
  eventSeq += 1;
  order.events.push({
    id: eventSeq,
    type,
    fromStatus: null,
    toStatus: order.status,
    actor,
    data: { message, ...data },
    createdAt: new Date().toISOString(),
  });
}

type Context = {
  services: Map<string, DemoService>;
  merchants: Map<string, DemoNamed>;
  customers: Map<string, DemoCustomer>;
  suppliers: Map<string, DemoSupplier>;
  staff: Set<string>;
};

// What the order's status and queue are, in the API's words.
function stateOf(order: DemoOrder): Pick<Order, 'status' | 'queue' | 'reviewReason' | 'dispatchState'> {
  const none = { reviewReason: null };
  switch (order.status) {
    case 'completed':
      return { ...none, status: 'completed', queue: null, dispatchState: 'sent' };
    case 'rejected':
      return { ...none, status: 'rejected', queue: null, dispatchState: 'sent' };
    case 'queued':
      return { ...none, status: 'pending', queue: 'pending', dispatchState: 'pending' };
    case 'processing':
      return { ...none, status: 'processing', queue: null, dispatchState: 'sent' };
    case 'review': {
      const reviewReason = order.reason;
      // A paid storefront order the risk engine holds waits in the review queue; a supplier problem needs attention.
      if (order.cid && order.risk?.decision === 'review' && !order.risk.reviewedAt) {
        return { reviewReason, status: 'pending', queue: 'review', dispatchState: 'held' };
      }
      if (reviewReason === MANUAL_REASON) {
        return { reviewReason, status: 'pending', queue: 'manual', dispatchState: 'manual' };
      }
      return {
        reviewReason,
        status: 'processing',
        queue: 'needs_attention',
        dispatchState: 'needs_attention',
      };
    }
  }
}

// What the resolver decided at order time: the price source and the steps that led to it (an assumed shape).
function snapshotOf(order: DemoOrder, service: DemoService): JsonObject {
  const unit = order.price / order.qty;
  const floor = service.cost + service.minProfit;
  const base: JsonObject = {
    source: order.source,
    price: toMoney(unit),
    floor: toMoney(floor),
    clamped: false,
    fx: order.fx ?? 1,
    taxRate: order.taxRate ?? 0,
  };
  if (order.source === 'retail') {
    return {
      ...base,
      steps: [
        {
          id: 'retail',
          label: 'Storefront price',
          state: 'win',
          value: order.list ?? unit,
          after: unit,
          note: 'Listed price in the storefront',
        },
      ],
    };
  }
  const fixed = order.source === 'client' || order.source === 'group';
  return {
    ...base,
    steps: [
      {
        id: 'client',
        label: 'Client override',
        state: order.source === 'client' ? 'win' : 'none',
        value: order.source === 'client' ? unit : null,
        after: order.source === 'client' ? unit : null,
        note: order.source === 'client' ? 'Fixed price set for this merchant' : 'None for this merchant',
      },
      {
        id: 'group',
        label: 'Group service price',
        state: order.source === 'group' ? 'win' : order.source === 'client' ? 'skip' : 'none',
        value: order.source === 'group' ? unit : null,
        after: order.source === 'group' ? unit : null,
        note: order.source === 'group' ? 'Group price for this service' : 'None for the merchant’s group',
      },
      {
        id: 'base',
        label: 'Base price',
        state: fixed ? 'skip' : 'apply',
        value: service.price,
        after: fixed ? null : unit,
        note: fixed
          ? 'Skipped, a fixed price applies'
          : `Cost ${toMoney(service.cost)} plus ${Math.round(service.markup * 100)}% markup`,
      },
    ],
  };
}

function mapOrder(demo: DemoOrder, ctx: Context): MockOrder {
  const service = ctx.services.get(demo.sid) as DemoService;
  const b2c = Boolean(demo.cid);
  const merchant = demo.mid ? ctx.merchants.get(demo.mid) : undefined;
  const customer = demo.cid ? ctx.customers.get(demo.cid) : undefined;
  const supplier = ctx.suppliers.get(demo.sup);
  const state = stateOf(demo);
  const actorOf = (by: string): OrderEvent['actor'] => {
    let type: EventActorType = b2c ? 'customer' : 'client';
    if (SYSTEM_ACTORS.has(by)) type = 'system';
    else if ([...ctx.suppliers.values()].some((s) => s.name === by)) type = 'supplier';
    else if (ctx.staff.has(by)) type = 'staff';
    return { type, id: null, name: by };
  };
  const dispatched = demo.events.find((event) => event.k === 'dispatch');

  return {
    id: demoNumericId(demo.id),
    ...state,
    channel: b2c ? 'b2c' : 'b2b',
    source: SOURCES[demo.chan] ?? 'portal',
    service: {
      id: demoNumericId(service.id),
      name: service.name,
      type: service.type.toLowerCase() as ServiceType,
      slaMinutes: service.sla,
      category: service.category,
    },
    client: merchant ? { id: demoNumericId(merchant.id), name: merchant.name } : null,
    customer: customer
      ? { id: demoNumericId(customer.id), name: customer.name, email: customer.email }
      : null,
    imei: demo.input,
    quantity: demo.qty,
    inputs: demo.device ? { device: demo.device } : {},
    unitPrice: toMoney(demo.price / demo.qty),
    totalPrice: toMoney(demo.price),
    unitCost: toMoney(demo.cost / demo.qty),
    totalCost: toMoney(demo.cost),
    currency: demo.cur ?? 'USD',
    taxAmount: toMoney(demo.tax ?? 0),
    supplier: supplier ? { id: demoNumericId(supplier.id), name: supplier.name } : null,
    supplierRef: demo.ref,
    attempts: demo.attempts,
    result:
      demo.status === 'completed'
        ? { code: demo.reply, comment: null, fileId: service.type === 'File' ? demoNumericId(demo.id) : null }
        : demo.status === 'rejected'
          ? { code: demo.reason, comment: null, fileId: null }
          : { code: null, comment: null, fileId: null },
    verificationStatus: null,
    inputFileId: null,
    clientNote: null,
    adminNote: null,
    pricingSnapshot: snapshotOf(demo, service),
    createdAt: toIso(demo.created),
    sentAt: dispatched ? toIso(dispatched.ts) : null,
    completedAt: demo.doneAt ? toIso(Math.round(demo.doneAt)) : null,
    events: demo.events.map((event) => ({
      id: ++eventSeq,
      type: event.k,
      fromStatus: null,
      toStatus: null,
      actor: actorOf(event.by),
      data: { message: event.text },
      createdAt: toIso(event.ts),
    })),
  };
}

// The enrichment described at the top of the file.
function enrich(rows: MockOrder[]): void {
  const system = { type: 'system' as const, id: null, name: 'System' };
  const queued = rows.find((row) => row.queue === 'pending' && row.channel === 'b2b');
  if (queued) {
    queued.queue = 'manual';
    queued.dispatchState = 'manual';
    queued.reviewReason = MANUAL_REASON;
    queued.supplier = null;
    queued.supplierRef = null;
    queued.attempts = 0;
    queued.sentAt = null;
    queued.events = queued.events.filter((event) => event.type === 'created' || event.type === 'hold');
    addEvent(queued, 'review', MANUAL_REASON, system);
  }
  const delivered = rows
    .filter((row) => row.status === 'completed' && row.channel === 'b2b' && row.completedAt)
    .sort((a, b) => Date.parse(b.completedAt as string) - Date.parse(a.completedAt as string))
    .slice(0, 2);
  for (const row of delivered) {
    row.queue = 'verification';
    row.verificationStatus = 'requested';
    row.reviewReason = VERIFICATION_REASON;
    addEvent(row, 'verification', 'Verification requested by the merchant', {
      type: 'client',
      id: row.client?.id ?? null,
      name: row.client?.name ?? null,
    });
  }
}

let store: Promise<Collection<MockOrder>> | undefined;

/** The orders, seeded from the demo on first use. Handlers change them in place. */
export function orderStore(): Promise<Collection<MockOrder>> {
  store ??= loadDemoState().then((state) => {
    const by = <T extends DemoNamed>(key: string) =>
      new Map(demoRows<T>(state, key).map((row) => [row.id, row]));
    const context: Context = {
      services: by<DemoService>('services'),
      merchants: by('merchants'),
      customers: by<DemoCustomer>('customers'),
      suppliers: by<DemoSupplier>('suppliers'),
      staff: new Set(demoRows<DemoNamed>(state, 'admins').map((admin) => admin.name)),
    };
    const rows = demoRows<DemoOrder>(state, 'orders').map((demo) => mapOrder(demo, context));
    enrich(rows);
    return new Collection(rows);
  });
  return store;
}

/** The suppliers and merchants by name, for the filter menus. */
export async function supplierOptions(): Promise<SupplierOption[]> {
  const state = await loadDemoState();
  return demoRows<DemoSupplier>(state, 'suppliers').map((supplier) => ({
    id: demoNumericId(supplier.id),
    name: supplier.name,
    status: supplier.status,
    enabled: supplier.enabled,
  }));
}

/** Drops the store so the next use re-seeds it (tests). */
export function resetOrderStore(): void {
  store = undefined;
  eventSeq = 0;
}
