// Test fixtures for the orders feature: one valid order and event, changed per test.
import type { Order, OrderEvent } from '@/features/orders';

/** A merchant order that was sent to its supplier an hour ago (processing, no queue), changed by `overrides`. */
export function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 48100,
    status: 'processing',
    queue: null,
    reviewReason: null,
    dispatchState: 'sent',
    channel: 'b2b',
    source: 'dhru',
    service: {
      id: 6,
      name: 'T-Mobile USA Unlock',
      type: 'imei',
      slaMinutes: 120,
      category: 'Carrier unlock',
    },
    client: { id: 13, name: 'Muscat Mobile Clinic' },
    customer: null,
    imei: '354607116588777',
    quantity: 1,
    inputs: {},
    unitPrice: '12.4900',
    totalPrice: '12.4900',
    unitCost: '9.8000',
    totalCost: '9.8000',
    currency: 'USD',
    taxAmount: '0.0000',
    supplier: { id: 1, name: 'Nordic GSM' },
    supplierRef: 'NG-391977',
    attempts: 1,
    result: { code: null, comment: null, fileId: null },
    verificationStatus: null,
    inputFileId: null,
    clientNote: null,
    adminNote: null,
    pricingSnapshot: {},
    createdAt: '2026-01-01T11:00:00.000Z',
    sentAt: '2026-01-01T11:00:03.000Z',
    completedAt: null,
    ...overrides,
  };
}

export function orderEvent(overrides: Partial<OrderEvent> = {}): OrderEvent {
  return {
    id: 1,
    type: 'created',
    fromStatus: null,
    toStatus: null,
    actor: { type: 'system', id: null, name: 'System' },
    data: {},
    createdAt: '2026-01-01T11:00:00.000Z',
    ...overrides,
  };
}

/** The moment the fixtures treat as "now": one hour after the order was placed. */
export const NOW = Date.parse('2026-01-01T12:00:00.000Z');
