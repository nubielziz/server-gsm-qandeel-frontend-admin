// What the Payment methods tab says about a gateway: its audience, fee and limits in words, and whether customers can still pay.
// Ports gatewayCard and tabGateways of 55-p-settings.js. These are display texts; the server decides what a gateway may do.
import { money } from '@/lib/format';
import type { Id } from '@/lib/api';
import type { GatewayAudience, PaymentGateway } from '../types';
import { isZero, trimDecimal } from './decimal';

/** The audience tag, as the demo wrote it. */
export const AUDIENCE_LABEL: Record<GatewayAudience, string> = {
  b2c: 'B2C',
  b2b: 'B2B',
  both: 'B2C and B2B',
};

/** Whether the storefront's customers can pay with this gateway (it is not merchants-only). */
export function servesStorefront(gateway: PaymentGateway): boolean {
  return gateway.audience !== 'b2b';
}

/** Whether at least one storefront payment method is on. The demo warns "Customers can’t pay" when none is. */
export function customersCanPay(gateways: readonly PaymentGateway[]): boolean {
  return gateways.some((gateway) => gateway.isActive && servesStorefront(gateway));
}

/** Whether turning this gateway off would leave the storefront with no way to pay (the demo asks first). */
export function isLastStorefrontMethod(gateway: PaymentGateway, all: readonly PaymentGateway[]): boolean {
  if (!gateway.isActive || !servesStorefront(gateway)) return false;
  return !all.some((other) => other.id !== gateway.id && other.isActive && servesStorefront(other));
}

/** "2.9% + $0.30", "1%", or "Free" when the gateway charges nothing. */
export function feeText(gateway: Pick<PaymentGateway, 'feePercent' | 'feeFixed'>): string {
  const parts: string[] = [];
  if (!isZero(gateway.feePercent)) parts.push(`${trimDecimal(gateway.feePercent)}%`);
  if (!isZero(gateway.feeFixed)) parts.push(money(gateway.feeFixed));
  return parts.length > 0 ? parts.join(' + ') : 'Free';
}

/** "$1.00 to $2,000.00"; a zero minimum or maximum means no limit on that side. */
export function limitsText(gateway: Pick<PaymentGateway, 'minAmount' | 'maxAmount'>): string {
  const min = isZero(gateway.minAmount) ? null : money(gateway.minAmount);
  const max = isZero(gateway.maxAmount) ? null : money(gateway.maxAmount);
  if (min && max) return `${min} to ${max}`;
  if (min) return `From ${min}`;
  if (max) return `Up to ${max}`;
  return 'No limits';
}

/** "All groups" when none are picked, else the group names (a group the list does not know is shown by its number). */
export function groupsText(
  ids: readonly Id[],
  groups: readonly { id: Id; name: string }[] | undefined,
): string {
  if (ids.length === 0) return 'All groups';
  return ids.map((id) => groups?.find((group) => group.id === id)?.name ?? `Group ${id}`).join(', ');
}

/** The demo's Live / Manual badge: a manual gateway needs a person to check each payment. */
export function modeLabel(gateway: Pick<PaymentGateway, 'isManual'>): 'Live' | 'Manual' {
  return gateway.isManual ? 'Manual' : 'Live';
}
