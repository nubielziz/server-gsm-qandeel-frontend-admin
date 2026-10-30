// Types of the suppliers mock: the shapes of the demo's rows it reads and the tables it keeps (decision 014).
import type { JsonValue } from '@/lib/api';
import type { Collection } from '@/mocks/db';
import type { HourlyPoint, Supplier, SupplierApiLog, SupplierService } from '../types';

/** A supplier of the demo seed (`S.suppliers`), with its 24 hours of history. */
export type DemoSupplier = {
  id: string;
  name: string;
  api: string;
  host: string;
  status: 'up' | 'degraded' | 'down';
  enabled: boolean;
  successRate: number;
  p50: number;
  p95: number;
  minBalance: number;
  lastSync: number;
  key: string;
  hist: { t: number; ok: number; ms: number }[];
};
/** A service of the demo seed: its primary supplier (`sup`) and fallback (`fb`). */
export type DemoService = {
  id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  cost: number;
  sla: number;
  sup: string;
  fb: string | null;
  status: string;
};
/** A call of the demo's API log (`S.apiLog`). */
export type DemoLog = {
  id: number;
  sid: string;
  ts: number;
  path: string;
  code: number;
  ms: number;
  ref: string | null;
  msg: string;
};
/** The fields of a demo order the seed reads, for the 7-day spend. */
export type DemoOrder = { sup: string; status: string; cost: number; doneAt: number | null };

/** A supplier as the mock keeps it: the DTO without the counts the handlers read from the orders, plus the history. */
export type MockSupplier = Omit<Supplier, 'openOrders' | 'reviewOrders'> & { history: HourlyPoint[] };
/** A service of the console, with the cost recorded when it was imported. */
export type MockService = {
  id: number;
  name: string;
  code: string;
  status: string;
  slaMinutes: number;
  cost: string;
};
/** `service_supplier_links`: a service, the supplier service it uses and its place in the chain. */
export type MockLink = { serviceId: number; supplierServiceId: number; priority: number };
/** A call to a supplier with its bodies; the list leaves the bodies out. */
export type MockLog = SupplierApiLog & { request: JsonValue; response: JsonValue };

/** An item of a supplier's list; `previousCredit` is set while its cost has changed since the last import. */
export type MockItem = SupplierService & { previousCredit: string | null };

/** Every table of the suppliers mock. */
export type SuppliersState = {
  suppliers: Collection<MockSupplier>;
  catalogue: Collection<MockItem>;
  services: Collection<MockService>;
  links: MockLink[];
  logs: Collection<MockLog>;
};
