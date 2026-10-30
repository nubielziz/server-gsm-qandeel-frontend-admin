// Seed of the suppliers mock: the demo's suppliers (with their 24-hour history and prepaid balance), services (primary and
// fallback supplier), and API log, mapped to the DTOs of this feature (decision 014). The map has no supplier catalogue in the
// demo, so each supplier gets the services it already serves plus three it does not (to try the import with).
import { Collection } from '@/mocks/db';
import { demoNumericId, demoRows, loadDemoState, toIso, toMoney } from '@/mocks/seed';
import type { ChainStep } from '../types';
import { ACTIONS, bodiesOf, deliveryText, EXTRAS } from './seedData';
import type {
  DemoLog,
  DemoOrder,
  DemoService,
  DemoSupplier,
  MockItem,
  MockLink,
  MockLog,
  MockService,
  MockSupplier,
  SuppliersState,
} from './seedTypes';

export type { MockItem, MockLink, MockLog, MockService, MockSupplier, SuppliersState } from './seedTypes';

const DAY = 86_400_000;

function mapSupplier(demo: DemoSupplier, balance: number, burn: number): MockSupplier {
  const last = demo.hist[demo.hist.length - 1];
  const runway = burn > 0 ? balance / burn : null;
  return {
    id: demoNumericId(demo.id),
    name: demo.name,
    driver: demo.api.startsWith('Dhru') ? 'dhru' : 'rest',
    baseUrl: `https://${demo.host}`,
    username: 'gsm-supply',
    currency: 'USD',
    creditRate: '1.0000',
    status: demo.enabled ? 'active' : 'disabled',
    apiKeyHint: demo.key.slice(0, 5),
    health: demo.status,
    successRate1h: last.ok,
    successRate24h: demo.hist.reduce((total, hour) => total + hour.ok, 0) / demo.hist.length,
    p50Ms: demo.p50,
    p95Ms: demo.p95,
    balance: toMoney(balance),
    balanceCheckedAt: toIso(demo.lastSync),
    lowBalanceAlert: toMoney(demo.minBalance),
    // The demo's rule, applied once to the seed: under the minimum, or under two days of spending.
    lowBalance: balance < demo.minBalance || (runway !== null && runway < 2),
    runwayDays: runway,
    maxConcurrency: 5,
    rateLimitPerMin: 60,
    timeoutMs: 15_000,
    createdAt: toIso(demo.lastSync - 120 * DAY),
    history: demo.hist.map((hour) => ({ at: toIso(hour.t), successRate: hour.ok, medianMs: hour.ms })),
  };
}

/** Builds every table of the mock from the demo state. Called once per test or page load. */
export async function buildState(): Promise<SuppliersState> {
  const demo = await loadDemoState();
  const prepaid = (demo.prepaid ?? {}) as Record<string, number>;
  const orders = demoRows<DemoOrder>(demo, 'orders');
  const now = Date.now();

  const suppliers = demoRows<DemoSupplier>(demo, 'suppliers').map((supplier) => {
    // Seven days of delivered orders' supplier cost, the demo's spending rate.
    const week = orders.filter(
      (order) =>
        order.sup === supplier.id &&
        order.status === 'completed' &&
        order.doneAt &&
        now - order.doneAt < 7 * DAY,
    );
    const burn = week.reduce((total, order) => total + order.cost, 0) / 7;
    return mapSupplier(supplier, prepaid[supplier.id] ?? 0, burn);
  });

  const catalogue: MockItem[] = [];
  const services: MockService[] = [];
  const links: MockLink[] = [];
  const addItem = (
    supplierId: number,
    name: string,
    group: string,
    type: string,
    credit: string,
    time: string,
  ) => {
    const item: MockItem = {
      id: catalogue.length + 1,
      supplierId,
      remoteId: `${supplierId}${String(catalogue.length + 1).padStart(4, '0')}`,
      remoteGroup: group,
      type,
      name,
      credit,
      time,
      isAvailable: true,
      lastSeenAt: toIso(now - 3_600_000),
      priceChangedAt: null,
      imported: false,
      linkedServiceId: null,
      previousCredit: null,
    };
    catalogue.push(item);
    return item;
  };

  for (const service of demoRows<DemoService>(demo, 'services')) {
    const id = demoNumericId(service.id);
    const cost = toMoney(service.cost);
    services.push({
      id,
      name: service.name,
      code: service.code,
      status: service.status,
      slaMinutes: service.sla,
      cost,
    });
    const chain = [service.sup, service.fb].filter((supplier): supplier is string => Boolean(supplier));
    chain.forEach((supplierId, index) => {
      // A fallback charges a little more than the primary, so the two costs differ.
      const credit = index === 0 ? cost : toMoney(service.cost * 1.08);
      const item = addItem(
        demoNumericId(supplierId),
        service.name,
        service.category,
        service.type.toLowerCase(),
        credit,
        deliveryText(service.sla),
      );
      item.imported = true;
      item.linkedServiceId = id;
      links.push({ serviceId: id, supplierServiceId: item.id, priority: index + 1 });
    });
  }
  // One imported item per supplier has a new cost at the supplier, so the preview has something "changed" to show.
  for (const supplier of suppliers) {
    const changed = catalogue.find((item) => item.supplierId === supplier.id && item.imported);
    if (changed) {
      changed.previousCredit = changed.credit;
      changed.credit = toMoney(Number(changed.credit) + 0.5);
      changed.priceChangedAt = toIso(now - 2 * DAY);
    }
  }
  for (const supplier of suppliers) {
    for (const [index, [name, group, type]] of (EXTRAS[supplier.id] ?? []).entries()) {
      addItem(supplier.id, name, group, type, toMoney(2.5 + index * 1.75), `${(index + 1) * 2} hours`);
    }
  }

  const logs = demoRows<DemoLog>(demo, 'apiLog').map((log): MockLog => {
    const action = ACTIONS[log.path] ?? 'accountinfo';
    // A balance check belongs to no order (the demo attached a random one to every call).
    const orderId = log.ref && action !== 'accountinfo' ? demoNumericId(log.ref) : null;
    return {
      id: log.id,
      supplierId: demoNumericId(log.sid),
      orderId,
      action,
      httpStatus: log.code,
      durationMs: log.ms,
      error: log.code === 200 ? '' : log.msg,
      createdAt: toIso(log.ts),
      ...bodiesOf(action, orderId, log.code, log.msg),
    };
  });

  return {
    suppliers: new Collection(suppliers),
    catalogue: new Collection(catalogue),
    services: new Collection(services),
    links,
    logs: new Collection(logs),
  };
}

/** The steps of a service's chain, in priority order, with the supplier and supplier service named. */
export function chainOf(state: SuppliersState, serviceId: number): ChainStep[] {
  return state.links
    .filter((link) => link.serviceId === serviceId)
    .sort((a, b) => a.priority - b.priority)
    .flatMap((link) => {
      const item = state.catalogue.find(link.supplierServiceId);
      const supplier = item && state.suppliers.find(item.supplierId);
      return item && supplier
        ? [
            {
              priority: link.priority,
              supplierId: supplier.id,
              supplierName: supplier.name,
              supplierServiceId: item.id,
              supplierServiceName: item.name,
            },
          ]
        : [];
    });
}
