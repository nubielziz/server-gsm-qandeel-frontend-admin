// Which tab of the customer page is open, kept in the address as `?tab=account` (the Orders tab is the default and leaves the
// address clean). Other parameters, such as the open order's `?order=`, are kept as they are.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { DEFAULT_DETAIL_TAB, isDetailTab, type DetailTab } from '../lib/detailTabs';

export function useDetailTab(): [DetailTab, (tab: DetailTab) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab = isDetailTab(raw) ? raw : DEFAULT_DETAIL_TAB;

  const select = useCallback(
    (next: DetailTab) =>
      setParams(
        (prev) => {
          const out = new URLSearchParams(prev);
          if (next === DEFAULT_DETAIL_TAB) out.delete('tab');
          else out.set('tab', next);
          return out;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [tab, select];
}
