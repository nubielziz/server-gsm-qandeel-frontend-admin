// Builds the settings mock stores from the demo seed (`S.settings`, `S.merchants`) with the API's row shapes. The policies stay in the
// shared settings mock (`src/mocks/settings.ts`), which also serves `GET` and `PATCH /admin/settings`.
import { Collection } from '@/mocks/db';
import { demoRows, type DemoState } from '@/mocks/seed';
import type {
  Currency,
  NotificationLogEntry,
  NotificationTemplate,
  PaymentGateway,
  TaxRate,
  WebhookDeliveryDetail,
} from '../types';
import { notificationRows, templateRows } from './seedMessages';
import {
  currencyRows,
  gatewayRows,
  taxRows,
  type DemoCurrency,
  type DemoGateway,
  type DemoTax,
} from './seedPayments';
import { deliveryRows } from './seedWebhooks';

/** Everything the settings routes keep. */
export type Stores = {
  gateways: Collection<PaymentGateway>;
  taxRates: Collection<TaxRate>;
  currencies: Collection<Currency>;
  templates: Collection<NotificationTemplate>;
  notifications: Collection<NotificationLogEntry>;
  deliveries: Collection<WebhookDeliveryDetail>;
};

type DemoSettings = {
  gateways?: DemoGateway[];
  taxes?: DemoTax[];
  currencies?: DemoCurrency[];
  notifs?: Parameters<typeof templateRows>[0];
};

/** The stores for a demo state. */
export function buildStores(state: DemoState): Stores {
  const settings = (state.settings ?? {}) as DemoSettings;
  const templates = templateRows(settings.notifs ?? []);
  return {
    gateways: new Collection(gatewayRows(settings.gateways ?? [])),
    taxRates: new Collection(taxRows(settings.taxes ?? [])),
    currencies: new Collection(currencyRows(settings.currencies ?? [])),
    templates: new Collection(templates),
    notifications: new Collection(notificationRows(templates)),
    deliveries: new Collection(deliveryRows(demoRows(state, 'merchants'))),
  };
}
