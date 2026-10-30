// Test fixtures for the customers feature: one valid customer, customer detail and data request, changed per test.
import type { Customer, CustomerDetail, DataRequest } from '../types';

/** An active customer with an account, who joined on 1 January 2026, changed by `overrides`. */
export function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1,
    email: 'daniel.whitmore@mail.example',
    emailVerifiedAt: '2025-12-01T12:00:00.000Z',
    name: 'Daniel Whitmore',
    phone: '',
    country: 'GB',
    locale: 'en',
    currency: 2,
    currencyCode: 'GBP',
    hasAccount: true,
    createdBy: null,
    marketingOptIn: false,
    riskLevel: 'low',
    status: 'active',
    suspendedAt: null,
    suspendedReason: null,
    suspendedBy: null,
    internalNotes: '',
    lastLoginAt: '2025-12-28T12:00:00.000Z',
    firstOrderAt: '2025-12-08T12:00:00.000Z',
    totalSpent: '38.3700',
    anonymizedAt: null,
    createdAt: '2025-12-01T12:00:00.000Z',
    ordersCount: 4,
    lastOrderAt: '2025-12-30T12:00:00.000Z',
    ...overrides,
  };
}

/** The same customer with the detail figures, an account, no consent records yet and no risk signals. */
export function customerDetail(overrides: Partial<CustomerDetail> = {}): CustomerDetail {
  return {
    ...customer(),
    stats: {
      orders: 4,
      spent: '38.3700',
      lastOrderAt: '2025-12-30T12:00:00.000Z',
      refunds: 1,
      tickets: 0,
      disputes: 1,
    },
    account: {
      emailVerified: true,
      mustChangePassword: false,
      passwordChangedAt: '2025-11-01T12:00:00.000Z',
      resetSentAt: null,
      activeSessions: 1,
      lastIp: '203.0.113.177',
    },
    latestConsents: null,
    risk: { highestScore: null, signals: [] },
    ...overrides,
  };
}

/** An open erasure request from 1 January 2026 with a deadline thirty days later. */
export function dataRequest(overrides: Partial<DataRequest> = {}): DataRequest {
  return {
    id: 32,
    customerId: 16,
    customerName: 'Mia Schneider',
    kind: 'erasure',
    status: 'open',
    requestedAt: '2026-01-01T12:00:00.000Z',
    dueAt: '2026-01-31T12:00:00.000Z',
    completedAt: null,
    handledBy: null,
    fileId: null,
    createdAt: '2026-01-01T12:00:00.000Z',
    ...overrides,
  };
}

/** The moment the fixtures treat as "now": three days after the request came in. */
export const NOW = Date.parse('2026-01-04T12:00:00.000Z');
