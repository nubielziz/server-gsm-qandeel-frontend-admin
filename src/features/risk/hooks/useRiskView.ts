// The Risk page's tab, blocklist filter, page and sort, kept in the address (`?tab=block&kind=imei&page=2`), so a link or a reload
// shows the same screen. Filter, page and sort changes replace the history entry (Back should leave the page, not walk through
// every keystroke); a tab change adds one, so Back goes to the tab.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  BLOCK_SORT_FIELDS,
  parseBlockView,
  parsePage,
  parseSort,
  parseTab,
  writeBlockView,
  writePage,
  writeSort,
  writeTab,
  type BlockView,
  type RiskTab,
} from '../lib/view';
import type { SortState } from '@/components/ui';

export function useRiskView() {
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params);
  const block = useMemo(() => parseBlockView(params), [params]);
  const page = parsePage(params);
  const sort = useMemo(() => parseSort(params, BLOCK_SORT_FIELDS), [params]);

  const setTab = useCallback((next: RiskTab) => setParams(writeTab(next)), [setParams]);
  const setBlock = useCallback(
    (patch: Partial<BlockView>) => setParams((prev) => writeBlockView(prev, patch), { replace: true }),
    [setParams],
  );
  const setPage = useCallback(
    (next: number) => setParams((prev) => writePage(prev, next), { replace: true }),
    [setParams],
  );
  const setSort = useCallback(
    (next: SortState) => setParams((prev) => writeSort(prev, next), { replace: true }),
    [setParams],
  );

  return { tab, block, page, sort, setTab, setBlock, setPage, setSort };
}
