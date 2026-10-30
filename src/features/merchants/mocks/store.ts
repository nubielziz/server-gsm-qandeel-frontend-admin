// The merchants feature's mock data (decision 014): the stores the mock routes read and change, and the accessor that builds them
// from the demo seed on first use. Rows are kept in a shape close to the API's, plus the few numbers the mock needs to play the
// server (balances, the service catalog). `dto.ts` turns them into what the API sends. Mock data only: the real rules are the server's.
import type { Collection } from '@/mocks/db';
import type {
  ApiKey,
  Client,
  ClientGroup,
  ClientPrice,
  ClientStats,
  KycSubmission,
  StatementRow,
} from '../types';
import { buildStore } from './seed';

/** A merchant as the mock keeps it: the API row without its joins, plus the wallet numbers in dollars. */
export type MockClient = Omit<Client, 'group' | 'referredBy' | 'wallet' | 'stats'> & {
  referredById: number | null;
  /** The wallet balance, what is held for open orders and the credit limit, all in dollars. */
  balance: number;
  reserved: number;
  creditLimit: number;
  stats: ClientStats;
};

/** A fixed price as stored: the join with the service and the group price are worked out when it is read. */
export type MockPrice = Pick<ClientPrice, 'id' | 'serviceId' | 'clientId' | 'price' | 'note' | 'createdAt'>;

/** A request as stored: the merchant is joined when it is read. */
export type MockKyc = Omit<KycSubmission, 'client'>;

/** The service catalog the mock prices against (cost and minimum profit set the floor). */
export type MockService = {
  id: number;
  name: string;
  type: string;
  basePrice: number;
  cost: number;
  minProfit: number;
};

export type MerchantStore = {
  clients: Collection<MockClient>;
  groups: Collection<ClientGroup>;
  prices: Collection<MockPrice>;
  kyc: Collection<MockKyc>;
  keys: Collection<ApiKey>;
  /** The wallet statement of each merchant, oldest first, with the running balance. */
  statements: Map<number, StatementRow[]>;
  services: Map<number, MockService>;
  /** Fixed prices of a group for a service, by `<groupId>|<serviceId>`. */
  groupPrices: Map<string, number>;
};

let store: Promise<MerchantStore> | undefined;

/** The mock data, seeded from the demo on first use. Handlers change it in place. */
export function merchantStore(): Promise<MerchantStore> {
  store ??= buildStore();
  return store;
}

/** Drops the data so the next use re-seeds it (tests). */
export function resetMerchantStore(): void {
  store = undefined;
}
