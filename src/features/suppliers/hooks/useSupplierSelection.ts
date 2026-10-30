// The selected supplier, kept in the address as `?supplier=<id>` so a link, a reload and the dashboard's supplier rows show
// the same one (ARCHITECTURE §5.2). Without a valid id the first supplier is selected, as in the demo.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { parseSupplierParam, SUPPLIER_PARAM } from '../lib/paths';
import type { Supplier } from '../types';

/** `selected` is the supplier named in the address, else the first one; `select(id)` changes it and `select(null)` clears it. */
export function useSupplierSelection(suppliers: readonly Supplier[]) {
  const [params, setParams] = useSearchParams();
  const wanted = parseSupplierParam(params);
  const selected = suppliers.find((supplier) => supplier.id === wanted) ?? suppliers[0];

  // Choosing a supplier replaces the history entry: Back should leave the page, not walk through every click.
  const select = useCallback(
    (id: number | null) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id === null) next.delete(SUPPLIER_PARAM);
          else next.set(SUPPLIER_PARAM, String(id));
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  return { selected, select };
}
