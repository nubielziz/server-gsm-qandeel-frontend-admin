// The draft of a service's API connections for the API Connection part: the chain of the supplier links, seen as one primary connection
// and the secondary ones after it. It is the links draft of the "Edit links" dialog with one more move: changing the primary.
import { useLinksDraft } from '../../hooks/useLinksDraft';
import type { ChainStep, Supplier } from '../../types';

/** A supplier as the menus offer it. */
export type SupplierRef = Pick<Supplier, 'id' | 'name'>;

/**
 * `steps` are the places in order: the first is the primary connection, the rest are the secondary ones, in the order they take over.
 * `setPrimary` puts a supplier in the first place (its service is picked next, so the step starts without one) and keeps the secondary
 * ones as they are; `null` takes the primary out, which only works for a chain that has no secondary one (the first of those would
 * become the primary without the staff member saying so). The rest is the links draft: `dirty`, `add`, `pick`, `move`, `remove`.
 */
export function useConnectionDraft(chain: readonly ChainStep[]) {
  const draft = useLinksDraft(chain);
  const count = draft.steps.length;

  /** Replaces the primary connection: take the old one out, add the new one at the end and move it to the front. */
  function setPrimary(supplier: SupplierRef | null) {
    if (supplier === null && count > 1) return;
    if (count > 0) draft.remove(0);
    if (supplier === null) return;
    draft.add(supplier);
    if (count > 0) draft.move(count - 1, 0);
  }

  return {
    steps: draft.steps,
    dirty: draft.dirty,
    primary: draft.steps[0] ?? null,
    secondary: draft.steps.slice(1),
    setPrimary,
    add: draft.add,
    pick: draft.pick,
    move: draft.move,
    remove: draft.remove,
  };
}
