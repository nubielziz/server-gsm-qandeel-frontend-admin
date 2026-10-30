// The three report reads of the Reports tab. Each report has its own route and its own query key, so opening one asks
// only for it, and the server does all the adding up. New in the console (MISMATCHES M124).
import { useApiQuery } from '@/lib/query';
import { getProfitReport, getVatReport, getWalletExposure } from '../api';
import { profitDates, vatDates, type ProfitRange, type VatPeriod } from '../lib/reports';
import type { ProfitGroup } from '../types';
import { REFRESH_MS, REPORT_KEY } from './keys';

/** Profit split by day, service, supplier or merchant over the last 7, 30 or 90 days. */
export function useProfitReport(by: ProfitGroup, range: ProfitRange, enabled = true) {
  const { from, to } = profitDates(range);
  return useApiQuery({
    queryKey: [...REPORT_KEY, 'profit', by, from, to],
    queryFn: ({ signal }) => getProfitReport({ groupBy: by, from, to }, { signal }),
    enabled,
  });
}

/** The merchants' wallets. The header's wallet figures share this read, so it asks again as the header does. */
export function useWalletExposure(enabled = true) {
  return useApiQuery({
    queryKey: [...REPORT_KEY, 'wallet-exposure'],
    queryFn: ({ signal }) => getWalletExposure({ signal }),
    enabled,
    refetchInterval: REFRESH_MS,
  });
}

/** VAT due by country and month for a period. Needs `reports:finance`. */
export function useVatReport(period: VatPeriod, enabled = true) {
  const { from, to } = vatDates(period);
  return useApiQuery({
    queryKey: [...REPORT_KEY, 'vat', from, to],
    queryFn: ({ signal }) => getVatReport({ from, to }, { signal }),
    enabled,
  });
}
