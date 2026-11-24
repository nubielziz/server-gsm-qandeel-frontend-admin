// The shapes the accounts mock keeps: an account (API-style names plus what the mock needs to play the server), a fixed price, a data
// request, the risk of an order, a service of the catalog it prices against, and the whole state the handlers work on. Dev and tests only.
import type { Collection } from '@/mocks/db';
import type { LegacyRecord } from '@/mocks/seed/accountIds';
import type {
  AccountSecurity,
  AccountStatus,
  AccountSuspension,
  AccountPrice,
  ApiKey,
  DataRequestKind,
  DataRequestStatus,
  NamedRef,
  Rank,
  RankChangeResult,
} from '../types';

/**
 * An account as the mock keeps it: the row without its joins and figures (the rank is joined, the wallet and the order figures are
 * worked out when asked). `security` is kept for guests too and left out of what a guest's row sends.
 */
export type MockAccount = {
  id: number;
  email: string;
  emailVerifiedAt: string | null;
  name: string;
  phone: string;
  country: string;
  company: string;
  address: string;
  taxId: string;
  internalNotes: string;
  username: string | null;
  status: AccountStatus;
  rankId: number;
  hasAccount: boolean;
  createdAt: string;
  createdBy: NamedRef | null;
  currencyCode: string | null;
  marketingOptIn: boolean;
  suspension: AccountSuspension | null;
  anonymizedAt: string | null;
  lastLoginAt: string | null;
  security: AccountSecurity;
  /** The record of the old model this account came from (the legacy lookup reads it); null for an account made since the merge. */
  legacy: LegacyRecord | null;
  /** The address the consent records were given from. */
  checkoutIp: string;
};

/** A fixed price as stored: the join with the service and the rank price are worked out when it is read. */
export type MockPrice = Pick<AccountPrice, 'id' | 'serviceId' | 'clientId' | 'price' | 'note' | 'createdAt'>;

/** The service catalog the mock prices against (cost and minimum profit set the floor). */
export type MockService = {
  id: number;
  name: string;
  type: string;
  basePrice: number;
  cost: number;
  minProfit: number;
};

/** A data request as the mock keeps it. */
export type MockRequest = {
  id: number;
  accountId: number;
  kind: DataRequestKind;
  status: DataRequestStatus;
  requestedAt: string;
  dueAt: string;
  completedAt: string | null;
  handledBy: number | null;
  fileId: number | null;
  createdAt: string;
};

/** The risk of one shop order: the score and the signals behind it. */
export type OrderRisk = { orderId: number; score: number; signals: string[] };

/** The answer kept for a used rank-change key: the rank asked for and what was answered. */
export type RankChangeReplay = { groupId: number; result: RankChangeResult };

/** What a merchant's wallet holds when the mock starts, in dollars: the balance, what open orders hold, and the credit limit. */
export type OpeningWallet = { balance: number; reserved: number; creditLimit: number };

export type AccountState = {
  accounts: Collection<MockAccount>;
  /** The merchant wallets of the demo, by account id (a customer starts with no wallet figures here). */
  openingWallets: Map<number, OpeningWallet>;
  ranks: Collection<Rank>;
  prices: Collection<MockPrice>;
  keys: Collection<ApiKey>;
  requests: Collection<MockRequest>;
  services: Map<number, MockService>;
  /** Fixed prices of a rank for a service, by `<rankId>|<serviceId>`. */
  rankPrices: Map<string, number>;
  /** The risk of each account's shop orders, newest first. */
  risk: Map<number, OrderRisk[]>;
  /** The current legal documents with their version, such as "Terms of service v3.2", by type. */
  legal: Map<string, string>;
  /** Rank changes already made, by `<accountId>|<key>`. */
  rankChanges: Map<string, RankChangeReplay>;
};
