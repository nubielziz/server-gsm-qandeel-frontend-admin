// The one number space of the accounts mock: a merchant keeps its demo number (`m3` is account 3) and demo customer
// `cN` is account `100 + N`, so an old customer number never names a converted customer. The mocks of orders, refunds, tickets and
// finance still say `customer` with the old numbers; they map through these helpers until those mocks switch to accounts.
import { demoNumericId } from '.';

/** How far the customers' numbers are moved: customer 1 is account 101. Merchants keep numbers below it. */
export const CUSTOMER_ACCOUNT_OFFSET = 100;

/** The account id of an old customer number. */
export function customerAccountId(customerId: number): number {
  return CUSTOMER_ACCOUNT_OFFSET + customerId;
}

/** The account id of an old merchant number: the same number. */
export function merchantAccountId(merchantId: number): number {
  return merchantId;
}

/** The account id of a demo id: `m3` is 3, `c3` is 103. Throws for an id that ends in no digits, as `demoNumericId` does. */
export function accountIdOfDemo(id: string): number {
  const number = demoNumericId(id);
  return id.startsWith('c') ? customerAccountId(number) : merchantAccountId(number);
}

/** The record of the old model an account came from: a merchant row keeps its number, a customer row has its own. */
export type LegacyRecord = { type: 'merchant' | 'customer'; id: number };

/** Which old record an account id came from, by the number space it falls in. */
export function legacyRecordOf(accountId: number): LegacyRecord {
  return accountId > CUSTOMER_ACCOUNT_OFFSET
    ? { type: 'customer', id: accountId - CUSTOMER_ACCOUNT_OFFSET }
    : { type: 'merchant', id: accountId };
}

/** The account an old record became: `customer` numbers move, `merchant` and `client` numbers stay. */
export function accountIdOfLegacy(type: 'client' | 'merchant' | 'customer', id: number): number {
  return type === 'customer' ? customerAccountId(id) : merchantAccountId(id);
}
