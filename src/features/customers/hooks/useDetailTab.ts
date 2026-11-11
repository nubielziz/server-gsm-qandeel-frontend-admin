// Which tab of the customer page is open, kept in the address as `?tab=account` (the Orders tab is the default and leaves the
// address clean). Other parameters, such as the open order's `?order=`, are kept as they are. A tab the staff member may not
// open (`visible` leaves it out) shows the default tab instead.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { DEFAULT_DETAIL_TAB, DETAIL_TABS, isDetailTab, type DetailTab } from '../lib/detailTabs';

const DETAIL_TAB_IDS: readonly DetailTab[] = DETAIL_TABS.map((tab) => tab.id);

export function useDetailTab(
  visible: readonly DetailTab[] = DETAIL_TAB_IDS,
): [DetailTab, (tab: DetailTab) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab = isDetailTab(raw) && visible.includes(raw) ? raw : DEFAULT_DETAIL_TAB;

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
