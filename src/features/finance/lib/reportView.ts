// The Reports tab's choices as address parameters (`?tab=reports&report=profit&by=day&range=30`) and which reports a staff
// member may open. New in the console (MISMATCHES M124).
import { hasPermission } from '@/lib/auth/permissions';
import type { ProfitGroup } from '../types';
import { PROFIT_GROUPS, PROFIT_RANGES, VAT_PERIODS, type ProfitRange, type VatPeriod } from './reports';
import { withParams } from './url';

export type ReportId = 'profit' | 'exposure' | 'vat';

/** The reports and the permission each needs: profit and wallet exposure `reports:read`, VAT `reports:finance`. */
export const REPORTS: readonly { id: ReportId; label: string; permission: string }[] = [
  { id: 'profit', label: 'Profit', permission: 'reports:read' },
  { id: 'exposure', label: 'Wallet exposure', permission: 'reports:read' },
  { id: 'vat', label: 'VAT', permission: 'reports:finance' },
];

export const DEFAULT_GROUP: ProfitGroup = 'day';
export const DEFAULT_RANGE: ProfitRange = '30';
export const DEFAULT_PERIOD: VatPeriod = 'last-month';

/** The choices inside the open report. */
export type ReportChoices = { by: ProfitGroup; range: ProfitRange; period: VatPeriod };

export function visibleReports(granted: readonly string[]) {
  return REPORTS.filter((report) => hasPermission(granted, report.permission));
}

/** The report in the address when the staff member may open it, else the first they may open. */
export function resolveReport(requested: string | null, reports: ReturnType<typeof visibleReports>) {
  return (reports.find((report) => report.id === requested) ?? reports[0])?.id;
}

/** Reads the report choices from the address; anything unknown falls back to the default. */
export function parseReportChoices(params: URLSearchParams): ReportChoices {
  return {
    by: PROFIT_GROUPS.find((group) => group.value === params.get('by'))?.value ?? DEFAULT_GROUP,
    range: PROFIT_RANGES.find((range) => range.value === params.get('range'))?.value ?? DEFAULT_RANGE,
    period: VAT_PERIODS.find((period) => period.value === params.get('period'))?.value ?? DEFAULT_PERIOD,
  };
}

/** The address with some choices changed; a default choice leaves no trace. */
export function writeReportChoices(base: URLSearchParams, patch: Partial<ReportChoices>): URLSearchParams {
  const merged = { ...parseReportChoices(base), ...patch };
  return withParams(base, {
    by: merged.by === DEFAULT_GROUP ? undefined : merged.by,
    range: merged.range === DEFAULT_RANGE ? undefined : merged.range,
    period: merged.period === DEFAULT_PERIOD ? undefined : merged.period,
  });
}
