// The choices inside a report as address parameters (`?view=profit&by=day&range=30`). They are the same for every report; which
// report is open is the Money page's view. New in the console (MISMATCHES M124).
import type { ProfitGroup } from '../types';
import { PROFIT_GROUPS, PROFIT_RANGES, VAT_PERIODS, type ProfitRange, type VatPeriod } from './reports';
import { withParams } from './url';

export const DEFAULT_GROUP: ProfitGroup = 'day';
export const DEFAULT_RANGE: ProfitRange = '30';
export const DEFAULT_PERIOD: VatPeriod = 'last-month';

/** The choices inside the open report. The funnel takes its period (7, 30 or 90 days) from `range`, as the profit report does. */
export type ReportChoices = { by: ProfitGroup; range: ProfitRange; period: VatPeriod };

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
