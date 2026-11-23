// The draft of one service's supplier chain while it is edited, for the "Edit links" dialog and the supplier connection of a service.
// It starts from the chain the server has, and follows the server's chain again as long as nothing was edited.
import { useState } from 'react';
import type { ChainStep, Supplier, SupplierService } from '../types';
import {
  chainSignature,
  draftFromChain,
  moveStep,
  newStepKey,
  removeStep,
  sameChain,
  type DraftStep,
} from '../lib/links';

/**
 * `steps` are the places in order. `dirty` says the draft is not the chain the server has (a move, a removal, an added supplier,
 * even one whose service is not picked yet). When the chain read changes (a save, or a change made elsewhere) an untouched draft
 * takes it over; a draft that was edited is kept, and `dirty` is then worked out against the new chain.
 */
export function useLinksDraft(chain: readonly ChainStep[]) {
  const [state, setState] = useState(() => ({ steps: draftFromChain(chain), base: chain }));
  if (chainSignature(state.base) !== chainSignature(chain)) {
    setState({
      steps: sameChain(state.steps, state.base) ? draftFromChain(chain) : state.steps,
      base: chain,
    });
  }
  const { steps } = state;
  const change = (next: (current: DraftStep[]) => DraftStep[]) =>
    setState((current) => ({ ...current, steps: next(current.steps) }));

  return {
    steps,
    dirty: !sameChain(steps, chain),
    /** Adds a supplier at the end; its service is picked next, so the step starts without one. */
    add: (supplier: Pick<Supplier, 'id' | 'name'>) =>
      change((current) => [
        ...current,
        {
          key: newStepKey(),
          supplierId: supplier.id,
          supplierName: supplier.name,
          supplierServiceId: null,
          supplierServiceName: '',
        },
      ]),
    /** Sets the supplier service of the step with this key. */
    pick: (key: string, item: SupplierService) =>
      change((current) =>
        current.map((step) =>
          step.key === key ? { ...step, supplierServiceId: item.id, supplierServiceName: item.name } : step,
        ),
      ),
    move: (from: number, to: number) => change((current) => moveStep(current, from, to)),
    remove: (index: number) => change((current) => removeStep(current, index)),
  };
}
