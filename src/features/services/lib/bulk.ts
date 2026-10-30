// The bulk price change dialog's form turned into the request body, and the words that describe the change. The dialog asks the
// server to preview, then to apply, with the same body; nothing is priced here. The checks are hints so an empty or odd amount
// never leaves the browser; the server validates the change for real.
import { money } from '@/lib/format';
import type { BulkChangeType, BulkPriceBody, BulkPriceChange } from '../types';
import { isMoneyText } from './money';

/** What the form holds. `categoryId` is the text of a select; `amount` is a positive number as typed. */
export type BulkValues = {
  scope: 'category' | 'selected';
  categoryId: string;
  direction: 'raise' | 'lower';
  type: BulkChangeType;
  amount: string;
};

/** The request body, or the first mistake and the field it belongs to. */
export type BulkBodyResult =
  { body: BulkPriceBody } | { error: string; field: 'categoryId' | 'amount' | 'scope' };

/** The request body for the form, or the first mistake to show under its field. */
export function buildBulkBody(values: BulkValues, selectedIds: readonly number[]): BulkBodyResult {
  const amount = values.amount.trim();
  if (!isMoneyText(amount) || Number(amount) <= 0) {
    return { error: 'Enter an amount greater than zero.', field: 'amount' };
  }
  const change: BulkPriceChange = {
    type: values.type,
    value: values.direction === 'lower' ? `-${amount}` : amount,
  };
  if (values.scope === 'selected') {
    if (selectedIds.length === 0) return { error: 'Tick at least one service first.', field: 'scope' };
    return { body: { serviceIds: [...selectedIds], change } };
  }
  if (!/^\d+$/.test(values.categoryId)) return { error: 'Choose a category.', field: 'categoryId' };
  return { body: { categoryId: Number(values.categoryId), change } };
}

/** "Raise prices by 5%", "Lower prices by $0.25": the change in words, for the preview's summary. */
export function describeChange(change: BulkPriceChange): string {
  const lower = change.value.startsWith('-');
  const amount = change.value.replace(/^-/, '');
  const size = change.type === 'percent' ? `${Number(amount)}%` : money(amount);
  return `${lower ? 'Lower' : 'Raise'} prices by ${size}`;
}

/** "3 services" / "1 service". */
export function servicesText(count: number): string {
  return `${count} ${count === 1 ? 'service' : 'services'}`;
}
