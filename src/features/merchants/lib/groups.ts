// Helpers for merchant groups: how a group reads in a menu, which groups a merchant can be put in, and the percent text.
// Ports the GROUPS labels of 42-p-merchants.js ("Wholesale (-4%)").
import type { Decimal } from '@/lib/api';
import type { ClientGroup } from '../types';

/** The `kind` of the storefront's single retail group (the map says so): merchants are never moved into it. */
export const RETAIL_KIND = 'b2c_retail';

export function isRetailGroup(group: Pick<ClientGroup, 'kind'>): boolean {
  return group.kind === RETAIL_KIND;
}

/** The groups a merchant can belong to: all but the storefront's retail group. A hint only; the server decides. */
export function merchantGroups<T extends Pick<ClientGroup, 'kind'>>(groups: readonly T[]): T[] {
  return groups.filter((group) => !isRetailGroup(group));
}

/** A percent as text without extra zeros: "4.0000" is "4%", "2.50" is "2.5%". */
export function percentText(value: Decimal): string {
  const number = Number(value);
  return Number.isFinite(number) ? `${number}%` : '–';
}

/** A group in a menu: its name and, when it has a discount, the discount ("Wholesale (-4%)"). */
export function groupLabel(group: Pick<ClientGroup, 'name' | 'discountPercent'>): string {
  const discount = Number(group.discountPercent);
  return discount > 0 ? `${group.name} (-${discount}%)` : group.name;
}

/** The group a new merchant starts in: the default one, else the first. Undefined when there are none. */
export function defaultGroupId(groups: readonly ClientGroup[]): number | undefined {
  return (groups.find((group) => group.isDefault) ?? groups[0])?.id;
}
