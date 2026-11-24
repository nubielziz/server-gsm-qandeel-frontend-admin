// The two saves of the Pricing view: the typed prices (row by row, through the existing routes) and the typed positions (one call). Each one reads
// what the person typed, asks the plan helpers what to send, sends it and hands the answer back to the unsaved state, which keeps whatever the
// server refused with the server's words. A failure that is not an answer of the server (a lost connection) is told by the default toast.
import { useCallback } from 'react';
import { isApiError, type Id } from '@/lib/api';
import { useSavePriceGrid } from '../../../hooks/useSavePriceGrid';
import { useSaveServiceOrder } from '../../../hooks/useSaveServiceOrder';
import { planOrder, planSave, refusalOfOrder } from '../../../lib/priceGrid';
import { MAX_ORDER_ITEMS } from '../../../types';
import type { PriceEdits } from './usePriceEdits';

/**
 * `savePrices` and `saveOrder`, with whether each is running. `retailGroupId` is the rank of kind `b2c_retail` (the shop group), which
 * the group prices replace needs to send the shop price back; it is undefined while the group list is not known.
 */
export function usePricingSave(editing: PriceEdits, retailGroupId: Id | undefined) {
  const { mutateAsync: sendPrices, isPending: savingPrices } = useSavePriceGrid();
  const { mutateAsync: sendOrder, isPending: savingOrder } = useSaveServiceOrder();
  const { edits, orders, rowsById, applySave, setOrderProblems, finishOrder } = editing;

  const savePrices = useCallback(async () => {
    const plan = planSave(edits, rowsById(), retailGroupId);
    if (plan.rows.length === 0 && Object.keys(plan.problems).length === 0) return;
    try {
      applySave(await sendPrices(plan));
    } catch {
      // The default error toast told what failed; the typed prices stay where they are.
    }
  }, [edits, rowsById, retailGroupId, applySave, sendPrices]);

  const saveOrder = useCallback(async () => {
    const plan = planOrder(orders);
    const tooMany = plan.tooMany ? `Save at most ${MAX_ORDER_ITEMS} services at a time.` : null;
    setOrderProblems(plan.problems, tooMany);
    if (plan.items.length === 0 || tooMany || Object.keys(plan.problems).length > 0) return;
    try {
      await sendOrder({ items: plan.items });
      finishOrder();
    } catch (error) {
      if (!isApiError(error)) return;
      const { byService, general } = refusalOfOrder(error, plan.items);
      setOrderProblems(byService, general.length > 0 ? general.join(' ') : null);
    }
  }, [orders, sendOrder, setOrderProblems, finishOrder]);

  return { savePrices, saveOrder, savingPrices, savingOrder };
}
