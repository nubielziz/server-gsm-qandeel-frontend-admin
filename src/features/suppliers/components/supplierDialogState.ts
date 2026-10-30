// Which dialog of the Suppliers page is open and what it was opened for. One value, so only one dialog is open at a time and
// the row or supplier it acts on travels with it.
import type { Supplier, SupplierLink } from '../types';

/** The dialog that is open and what it was opened for. */
export type SupplierDialogState =
  | { kind: 'connect' }
  | { kind: 'edit'; supplier: Supplier }
  /** `links` are the services the supplier serves, for the "N services go to their fallback" sentence; unknown until loaded. */
  | { kind: 'disable'; supplier: Supplier; links: readonly SupplierLink[] | undefined }
  | { kind: 'delete'; supplier: Supplier }
  | { kind: 'import'; supplier: Supplier }
  | { kind: 'links'; supplier: Supplier; link: SupplierLink }
  | { kind: 'reroute'; supplier: Supplier };
