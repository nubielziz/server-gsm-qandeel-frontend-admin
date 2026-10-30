// Small helpers the customers mock handlers share: the stores a request needs, the checks on input, and the made-up password.
// Mocks fake answers and simple state changes only; the real server owns the rules (decision 014).
import { ordersByCustomer } from './dto';
import { COUNTRY_CURRENCY, customerState } from './store';
import type { CustomerState, MockCustomer } from './types';
import type { MockOrder } from '@/mocks/orders';

/** The stores a customers answer is built from, and the orders of one customer. */
export type Context = { state: CustomerState; ordersOf: (customerId: number) => readonly MockOrder[] };

export async function context(): Promise<Context> {
  const [state, groups] = await Promise.all([customerState(), ordersByCustomer()]);
  return { state, ordersOf: (customerId) => groups.get(customerId) ?? [] };
}

export const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

/** True for a country the storefront sells to. */
export const knownCountry = (code: string): boolean => Object.hasOwn(COUNTRY_CURRENCY, code);

/** The customer that already uses this address (case does not matter), if any. */
export function emailOwner(state: CustomerState, email: string, exceptId?: number): MockCustomer | undefined {
  return state.customers.list().find((other) => other.id !== exceptId && other.email.toLowerCase() === email);
}

// A password the way the server would generate one (the demo's alphabet, without look-alike characters).
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function temporaryPassword(): string {
  return Array.from({ length: 14 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
}
