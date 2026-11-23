// The state of the Add services frame: which supplier is marked, which way was chosen, and the opening address that starts a path at once.
import { useState } from 'react';
import type { Id } from '@/lib/api';
import type { Supplier } from '../../types';
import { startNotice, supplierBlock, type AddFlowFrom, type AddFlowInitial } from './addFlowChoice';

/** The supplier and the way that took over from step 1. The supplier is kept as it was when chosen, so a path never changes under itself. */
export type AddFlowChosen = { supplier: Supplier; from: AddFlowFrom };

/**
 * Keeps the choices of step 1. `marked` is the supplier that can be chosen (a disabled one is never marked); `chosen` is set once a way
 * was picked and the path takes over; `back` returns to step 1 with the supplier still marked. The opening address (`initial`, read once)
 * starts the path as soon as the list is loaded and has the supplier; a supplier that is unknown or disabled leaves step 1 with a `notice`.
 * `loaded` is true once the list was read.
 */
export function useAddFlowChoice(
  initial: AddFlowInitial | undefined,
  suppliers: readonly Supplier[],
  loaded: boolean,
) {
  const [start] = useState(initial);
  const [markedId, setMarkedId] = useState<Id | null>(start?.supplierId ?? null);
  const [chosen, setChosen] = useState<AddFlowChosen | null>(null);
  const [pending, setPending] = useState(start?.supplierId !== undefined && start.from !== undefined);
  const [noticeOpen, setNoticeOpen] = useState(start?.supplierId !== undefined);

  const named = suppliers.find((supplier) => supplier.id === start?.supplierId);
  // The first time the list is there, the address either starts its path or gives up (adjusted while rendering, so no frame shows step 1 first).
  if (pending && loaded) {
    setPending(false);
    if (named && start?.from && supplierBlock(named) === undefined)
      setChosen({ supplier: named, from: start.from });
  }

  const found = suppliers.find((supplier) => supplier.id === markedId);
  const marked = found && supplierBlock(found) === undefined ? found : undefined;

  return {
    chosen,
    marked,
    notice: noticeOpen && loaded ? startNotice(start?.supplierId, suppliers) : undefined,
    mark(id: Id) {
      setMarkedId(id);
      setPending(false);
      setNoticeOpen(false);
    },
    pick(from: AddFlowFrom) {
      if (!marked) return;
      setPending(false);
      setChosen({ supplier: marked, from });
    },
    back() {
      setChosen(null);
      setPending(false);
    },
  };
}
