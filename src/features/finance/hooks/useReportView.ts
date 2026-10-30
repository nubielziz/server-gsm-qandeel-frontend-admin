// The Reports tab's open report and its choices (split, range, period), kept in the address
// (`?tab=reports&report=vat&period=last-quarter`), limited to the reports the staff member may open. New (MISMATCHES M124).
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  parseReportChoices,
  resolveReport,
  visibleReports,
  writeReportChoices,
  type ReportChoices,
  type ReportId,
} from '../lib/reportView';
import { withParams } from '../lib/url';

export function useReportView(permissions: readonly string[]) {
  const [params, setParams] = useSearchParams();
  const reports = useMemo(() => visibleReports(permissions), [permissions]);
  const report = resolveReport(params.get('report'), reports);
  const choices = useMemo(() => parseReportChoices(params), [params]);

  /** Opens a report; the first one the staff member may open is the default and leaves no trace in the address. */
  const setReport = useCallback(
    (next: ReportId) =>
      setParams((prev) => withParams(prev, { report: next === reports[0]?.id ? undefined : next }), {
        replace: true,
      }),
    [reports, setParams],
  );
  const setChoices = useCallback(
    (patch: Partial<ReportChoices>) =>
      setParams((prev) => writeReportChoices(prev, patch), { replace: true }),
    [setParams],
  );
  return { report, reports, choices, setReport, setChoices };
}
