// The plain rules of step 1 ("Where from") of the Add services flow: the two ways in, which suppliers can be chosen and what the opening
// address says about one that cannot. No figures here: the console only names the choice, the server decides what can be added.
import type { Id } from '@/lib/api';
import type { Supplier } from '../../types';

/** The two ways in once a supplier is chosen: whole groups (the Quick add mechanism) or single services (the import mechanism). */
export type AddFlowFrom = 'groups' | 'services';

/** What the opening address may say about the flow: a supplier to start from and the way in. */
export type AddFlowInitial = { supplierId?: Id; from?: AddFlowFrom };

/** The permission that reads the connected suppliers (the list of step 1). */
export const SUPPLIERS_READ = 'suppliers:read';

/** The permission both ways in need on the server (Quick add and the import), and the new service of my own. */
export const CATALOG_CREATE = 'catalog:create';

/** The words under the two ways in, in the order they are shown. */
export const WAYS: readonly { id: AddFlowFrom; label: string; hint: string }[] = [
  { id: 'groups', label: 'Whole groups', hint: 'Add every service of a group at once, in the background.' },
  {
    id: 'services',
    label: 'Single services',
    hint: 'Pick services one by one and check their prices first.',
  },
];

/** A control that may be locked: the props of a disabled control carry the missing permission in their title. */
export type Lock = { disabled: boolean; title?: string };

/** The first lock that is on, or an open one: a control that needs several permissions names the first one it misses. */
export function firstLock(...locks: readonly Lock[]): Lock {
  return locks.find((lock) => lock.disabled) ?? { disabled: false };
}

/** Why a supplier cannot be chosen, or `undefined` when it can. A disabled supplier takes no work, so none of its services are added. */
export function supplierBlock(supplier: Pick<Supplier, 'status'>): string | undefined {
  return supplier.status === 'disabled'
    ? 'Switch it on from the Suppliers page to add its services.'
    : undefined;
}

/**
 * The line step 1 shows when the opening address named a supplier that cannot start the flow: one the list does not have, or one that
 * is disabled. `undefined` when the supplier is fine (or the address named none).
 */
export function startNotice(supplierId: Id | undefined, suppliers: readonly Supplier[]): string | undefined {
  if (supplierId === undefined) return undefined;
  const named = suppliers.find((supplier) => supplier.id === supplierId);
  if (!named) return 'That supplier is not among your connected suppliers. Pick one below.';
  if (supplierBlock(named) === undefined) return undefined;
  return `${named.name} is disabled, so its services cannot be added. Switch it on from the Suppliers page, or pick another supplier.`;
}
