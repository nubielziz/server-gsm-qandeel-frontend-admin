// The choices inside a report (split, range, period), kept in the address (`?view=vat&period=last-quarter`). Which report is open is
// the Money page's view, so this hook no longer picks one. New (MISMATCHES M124).
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { parseReportChoices, writeReportChoices, type ReportChoices } from '../lib/reportView';

/**
 * `choices` are read from the address (anything unknown is the default); `setChoices` writes some of them back and replaces the
 * history entry, so a change of split or period does not fill the Back button. Every other parameter stays as it is.
 */
export function useReportView() {
  const [params, setParams] = useSearchParams();
  const choices = useMemo(() => parseReportChoices(params), [params]);
  const setChoices = useCallback(
    (patch: Partial<ReportChoices>) =>
      setParams((prev) => writeReportChoices(prev, patch), { replace: true }),
    [setParams],
  );
  return { choices, setChoices };
}
