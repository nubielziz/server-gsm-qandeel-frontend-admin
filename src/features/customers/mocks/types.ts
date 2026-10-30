// The shapes the customers mock keeps: a customer (API-style names plus the account side), a data request, the risk of an order,
// and the whole state the handlers work on. Dev and tests only.
import type { Collection } from '@/mocks/db';
import type { CustomerStatus, DataRequestKind, DataRequestStatus, RiskLevel } from '../types';

/** A customer as the mock keeps it: API-style names, plus the account side and the address of the last checkout. */
export type MockCustomer = {
  id: number;
  email: string;
  emailVerifiedAt: string | null;
  name: string;
  phone: string;
  country: string;
  locale: string;
  currency: number;
  currencyCode: string;
  hasAccount: boolean;
  createdBy: number | null;
  marketingOptIn: boolean;
  riskLevel: RiskLevel;
  status: CustomerStatus;
  suspendedAt: string | null;
  suspendedReason: string | null;
  suspendedBy: number | null;
  internalNotes: string;
  lastLoginAt: string | null;
  anonymizedAt: string | null;
  createdAt: string;
  mustChangePassword: boolean;
  passwordChangedAt: string | null;
  resetSentAt: string | null;
  activeSessions: number;
  lastIp: string | null;
  /** The address the consent records were given from. */
  checkoutIp: string;
};

/** A data request as the mock keeps it. */
export type MockRequest = {
  id: number;
  customerId: number;
  kind: DataRequestKind;
  status: DataRequestStatus;
  requestedAt: string;
  dueAt: string;
  completedAt: string | null;
  handledBy: number | null;
  fileId: number | null;
  createdAt: string;
};

/** The risk of one storefront order: the score and the signals behind it. */
export type OrderRisk = { orderId: number; score: number; signals: string[] };

export type CustomerState = {
  customers: Collection<MockCustomer>;
  requests: Collection<MockRequest>;
  /** Refunds, tickets and disputes per customer; the detail only shows how many. */
  counts: Map<number, { refunds: number; tickets: number; disputes: number }>;
  /** The risk of each customer's storefront orders, newest first. */
  risk: Map<number, OrderRisk[]>;
  /** The current legal documents with their version, such as "Terms of service v3.2", by type. */
  legal: Map<string, string>;
};
