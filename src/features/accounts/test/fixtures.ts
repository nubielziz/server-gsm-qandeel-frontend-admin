// Test fixtures for the accounts feature: one valid account, wallet, rank and data request, changed per test.
import type { AccountRow, AccountWallet, DataRequest, Rank } from '../types';

/** The rank of a merchant that pays VIP prices. */
export const VIP_RANK: AccountRow['rank'] = {
  id: 3,
  name: 'VIP',
  kind: 'merchant',
  discountPercent: '8.0000',
  creditAllowed: true,
};

/** The shop's retail rank. */
export const RETAIL_RANK: AccountRow['rank'] = {
  id: 4,
  name: 'Storefront retail',
  kind: 'retail',
  discountPercent: '0.0000',
  creditAllowed: false,
};

/** An active retail account with a login, who joined on 1 December 2025, changed by `overrides`. */
export function account(overrides: Partial<AccountRow> = {}): AccountRow {
  return {
    id: 101,
    createdAt: '2025-12-01T12:00:00.000Z',
    name: 'Daniel Whitmore',
    email: 'daniel.whitmore@mail.example',
    emailVerifiedAt: '2025-12-01T12:00:00.000Z',
    phone: '',
    country: 'GB',
    company: '',
    address: '',
    taxId: '',
    internalNotes: '',
    username: null,
    status: 'active',
    rank: RETAIL_RANK,
    hasAccount: true,
    invitationPending: false,
    currencyCode: 'GBP',
    marketingOptIn: false,
    createdBy: null,
    suspension: null,
    anonymizedAt: null,
    lastLoginAt: '2025-12-28T12:00:00.000Z',
    ordersCount: 4,
    lastOrderAt: '2025-12-30T12:00:00.000Z',
    security: {
      hasPassword: true,
      mustChangePassword: false,
      passwordChangedAt: '2025-11-01T12:00:00.000Z',
      twofaEnabled: false,
      lastLoginAt: '2025-12-28T12:00:00.000Z',
      lastLoginIp: '203.0.113.177',
      activeSessions: 1,
      linkSentAt: null,
      verificationSentAt: null,
    },
    ...overrides,
  };
}

/** An active merchant account on the VIP rank, with a Dhru username. */
export function merchantAccount(overrides: Partial<AccountRow> = {}): AccountRow {
  return account({
    id: 1,
    name: 'Zain Mobile Hub',
    email: 'ops@zainmobilehub.example',
    country: 'JO',
    company: 'Zain Mobile Hub',
    username: 'zain-mobile-hub',
    rank: VIP_RANK,
    currencyCode: 'USD',
    ...overrides,
  });
}

/** A guest: a record a checkout made, with no login, on the retail rank. */
export function guest(overrides: Partial<AccountRow> = {}): AccountRow {
  return account({
    id: 102,
    name: 'Sofia Alvarez',
    email: 'sofia.alvarez@inbox.example',
    hasAccount: false,
    security: null,
    lastLoginAt: null,
    emailVerifiedAt: null,
    ordersCount: 0,
    lastOrderAt: null,
    ...overrides,
  });
}

/** A store balance of $50 with nothing on hold. */
export function storeWallet(overrides: Partial<AccountWallet> = {}): AccountWallet {
  return {
    kind: 'store',
    currency: 'USD',
    balance: '50.0000',
    reserved: '0.0000',
    creditLimit: '0.0000',
    available: '50.0000',
    creditAllowed: false,
    adjustApprovalLimit: '500.0000',
    frozen: null,
    enabled: true,
    pendingTopUps: { count: 0, amount: '0.0000' },
    openDisputes: 0,
    ...overrides,
  };
}

/** An open erasure request from 1 January 2026 with a deadline thirty days later. */
export function dataRequest(overrides: Partial<DataRequest> = {}): DataRequest {
  return {
    id: 32,
    accountId: 116,
    accountName: 'Mia Schneider',
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

/** A rank of the merchant kind, changed by `overrides`. */
export function rank(overrides: Partial<Rank> = {}): Rank {
  return {
    id: 1,
    name: 'Standard',
    kind: 'b2b',
    rankKind: 'merchant',
    discountPercent: '0.0000',
    isDefault: false,
    depositLimit: '0.0000',
    overdraftAllowed: false,
    sort: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    accountCount: 0,
    ...overrides,
  };
}

/** The moment the fixtures treat as "now": three days after the request came in. */
export const NOW = Date.parse('2026-01-04T12:00:00.000Z');
