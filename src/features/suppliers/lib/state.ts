// How the screen names a supplier's state: Healthy, Degraded, Down or Disabled. Ports statusDot and supBadge of 20-ui.js.
// The server works out the health; these helpers only pick the word, the colour and the icon (status is never colour alone).
import type { BadgeTone, IconName } from '@/components/ui';
import type { Supplier, SupplierHealth } from '../types';

/** The four states a badge can show. A disabled supplier shows Disabled whatever its health is. */
export type SupplierState = SupplierHealth | 'disabled';

/** The badge of each state: word, tone and icon. */
export const STATE_BADGE: Readonly<
  Record<SupplierState, { label: string; tone: BadgeTone; icon: IconName }>
> = {
  up: { label: 'Healthy', tone: 'good', icon: 'checkCircle' },
  degraded: { label: 'Degraded', tone: 'serious', icon: 'alert' },
  down: { label: 'Down', tone: 'crit', icon: 'xCircle' },
  disabled: { label: 'Disabled', tone: 'neutral', icon: 'ban' },
};

/** True while the supplier takes orders (the demo's `enabled`). */
export function isEnabled(supplier: Pick<Supplier, 'status'>): boolean {
  return supplier.status !== 'disabled';
}

/** The state the badge shows. */
export function supplierState(supplier: Pick<Supplier, 'status' | 'health'>): SupplierState {
  return isEnabled(supplier) ? supplier.health : 'disabled';
}

/** An enabled supplier that is not healthy: the page header counts it and the detail opens with a banner. */
export function needsAttention(supplier: Pick<Supplier, 'status' | 'health'>): boolean {
  return isEnabled(supplier) && supplier.health !== 'up';
}

/** Where open orders can be sent: enabled and not down (a degraded supplier still answers some calls). */
export function canTakeOrders(supplier: Pick<Supplier, 'status' | 'health'>): boolean {
  return isEnabled(supplier) && supplier.health !== 'down';
}

/** The numbers behind the page's subtitle: how many enabled suppliers are not healthy and how many are low on balance. */
export function summarize(suppliers: readonly Supplier[]): { total: number; unhealthy: number; low: number } {
  return {
    total: suppliers.length,
    unhealthy: suppliers.filter(needsAttention).length,
    low: suppliers.filter((supplier) => isEnabled(supplier) && supplier.lowBalance).length,
  };
}
