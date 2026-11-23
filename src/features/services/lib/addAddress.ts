// The Add services flow's part of the Catalog address: `?add=<supplier id>|new` and `?from=groups|services`. Pure functions that read
// and write those two keys and leave every other key of the table's address alone, so opening or closing the flow never loses a filter.
import type { CatalogTableLink } from './paths';

/** What `add` names: a supplier to add from (its id), or `new` to start the flow with no supplier chosen. */
export type AddTarget = NonNullable<CatalogTableLink['add']>;

/** Which way the flow starts once a supplier is chosen: whole groups, or single services. */
export type AddFrom = NonNullable<CatalogTableLink['from']>;

/** The flow as the address names it. `from` is only ever set together with a supplier. */
export type AddAddress = { add: AddTarget; from?: AddFrom };

/** What the Add services action needs: it makes services, as the New service form and the suppliers' Quick add do. The server still checks. */
export const ADD_SERVICES_PERMISSION = 'catalog:create';

const FROM_VALUES: readonly AddFrom[] = ['groups', 'services'];

/**
 * Reads the flow from the address. `add` must be `new` or a supplier id (digits, not zero); anything else means the flow is
 * closed. A `from` that is not one of the two ways is dropped, and so is a `from` without a supplier: the way needs one.
 */
export function parseAddAddress(params: URLSearchParams): AddAddress | null {
  const raw = params.get('add');
  if (raw === 'new') return { add: 'new' };
  if (raw === null || !/^[1-9]\d*$/.test(raw)) return null;
  const from = FROM_VALUES.find((candidate) => candidate === params.get('from'));
  return from ? { add: Number(raw), from } : { add: Number(raw) };
}

/** The address with the flow open: `add` (and `from` when given) written, everything else kept. */
export function writeAddAddress(base: URLSearchParams, link: AddAddress): URLSearchParams {
  const next = new URLSearchParams(base);
  next.set('add', String(link.add));
  if (link.from) next.set('from', link.from);
  else next.delete('from');
  return next;
}

/** The address with the flow closed: both keys removed, everything else kept. */
export function clearAddAddress(base: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(base);
  next.delete('add');
  next.delete('from');
  return next;
}
