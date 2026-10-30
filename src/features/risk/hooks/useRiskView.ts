// The Risk page's tab, filters, page, sort and open IMEI check, kept in the address (`?tab=checks&kind=icloud&page=2`), so a
// link or a reload shows the same screen. Filter, page and sort changes replace the history entry (Back should leave the
// page, not walk through every keystroke); a tab change and an opened check add one, so Back goes to the tab or closes the check.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  BLOCK_SORT_FIELDS,
  CHECK_SORT_FIELDS,
  parseBlockView,
  parseCheckId,
  parseChecksView,
  parsePage,
  parseSort,
  parseTab,
  writeBlockView,
  writeCheckId,
  writeChecksView,
  writePage,
  writeSort,
  writeTab,
  type BlockView,
  type ChecksView,
  type RiskTab,
} from '../lib/view';
import type { SortState } from '@/components/ui';

export function useRiskView() {
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params);
  const checks = useMemo(() => parseChecksView(params), [params]);
  const block = useMemo(() => parseBlockView(params), [params]);
  const page = parsePage(params);
  const sort = useMemo(
    () => parseSort(params, tab === 'block' ? BLOCK_SORT_FIELDS : CHECK_SORT_FIELDS),
    [params, tab],
  );
  const checkId = parseCheckId(params);

  const setTab = useCallback((next: RiskTab) => setParams(writeTab(next)), [setParams]);
  const setChecks = useCallback(
    (patch: Partial<ChecksView>) => setParams((prev) => writeChecksView(prev, patch), { replace: true }),
    [setParams],
  );
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
  const openCheck = useCallback((id: number) => setParams((prev) => writeCheckId(prev, id)), [setParams]);
  const closeCheck = useCallback(
    () => setParams((prev) => writeCheckId(prev, null), { replace: true }),
    [setParams],
  );

  return {
    tab,
    checks,
    block,
    page,
    sort,
    checkId,
    setTab,
    setChecks,
    setBlock,
    setPage,
    setSort,
    openCheck,
    closeCheck,
  };
}
