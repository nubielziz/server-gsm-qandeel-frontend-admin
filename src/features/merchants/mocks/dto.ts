// Turns the merchants mock rows into what the API sends: the merchant with its joined group and referrer, the wallet figures, the
// group with its merchant count, the fixed price with its service and group price, and the request with its merchant. The mock plays
// the server here (it works out the floor and the group price); the console never does.
import { toMoney } from '@/mocks/seed';
import type { Client, ClientGroup, ClientPrice, ClientWallet, KycSubmission } from '../types';
import type { MerchantStore, MockClient, MockKyc, MockPrice, MockService } from './store';

/** The lowest price the mock accepts for a service: cost plus minimum profit. */
export function floorOf(service: MockService): number {
  return Math.round((service.cost + service.minProfit) * 10_000) / 10_000;
}

/** The three wallet figures plus what can be spent: the balance and the credit limit (holds are already out of the balance). */
export function toWallet(row: MockClient): ClientWallet {
  return {
    balance: toMoney(row.balance),
    reserved: toMoney(row.reserved),
    creditLimit: toMoney(row.creditLimit),
    available: toMoney(row.balance + row.creditLimit),
  };
}

export function toClient(row: MockClient, store: MerchantStore): Client {
  const { referredById, balance: _balance, reserved: _reserved, creditLimit: _creditLimit, ...rest } = row;
  const group = store.groups.find(row.groupId);
  const referrer = referredById === null ? undefined : store.clients.find(referredById);
  return {
    ...rest,
    group: group ? { id: group.id, name: group.name, discountPercent: group.discountPercent } : null,
    referredBy: referrer ? { id: referrer.id, name: referrer.name } : null,
    wallet: toWallet(row),
  };
}

export function toGroup(group: ClientGroup, store: MerchantStore): ClientGroup {
  const merchantCount = store.clients.list().filter((client) => client.groupId === group.id).length;
  return { ...group, merchantCount };
}

/** A fixed price with the service it is for and what the merchant would pay without it (the group's fixed price, else base less the discount). */
export function toPrice(row: MockPrice, store: MerchantStore): ClientPrice {
  const service = store.services.get(row.serviceId);
  const client = store.clients.find(row.clientId);
  const group = client ? store.groups.find(client.groupId) : undefined;
  const fixed = client ? store.groupPrices.get(`${client.groupId}|${row.serviceId}`) : undefined;
  const discounted =
    service && group ? service.basePrice * (1 - Number(group.discountPercent) / 100) : undefined;
  const groupPrice = fixed ?? discounted;
  return {
    ...row,
    service: {
      id: row.serviceId,
      name: service?.name ?? `Service ${row.serviceId}`,
      type: service?.type,
      basePrice: service ? toMoney(service.basePrice) : null,
      floorPrice: service ? toMoney(floorOf(service)) : null,
    },
    groupPrice: groupPrice === undefined ? null : toMoney(groupPrice),
  };
}

export function toKyc(row: MockKyc, store: MerchantStore): KycSubmission {
  const client = store.clients.find(row.clientId);
  return {
    ...row,
    client: {
      id: row.clientId,
      name: client?.name ?? `Merchant ${row.clientId}`,
      email: client?.email ?? '',
      country: client?.country ?? '',
      status: client?.status ?? 'pending',
    },
  };
}
