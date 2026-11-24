// The report reads of the Reports tab. Each report has its own route and its own query key, so opening one asks
// only for it, and the server does all the adding up. New in the console (MISMATCHES M124).
import { useApiQuery } from '@/lib/query';
import { getFunnel, getProfitReport, getVatReport, getWalletExposure } from '../api';
import { profitDates, vatDates, type ProfitRange, type VatPeriod } from '../lib/reports';
import type { ProfitGroup } from '../types';
import { REFRESH_MS, REPORT_KEY } from './keys';

/** Profit split by day, service, supplier or merchant (an account of a merchant rank) over the last 7, 30 or 90 days. */
export function useProfitReport(by: ProfitGroup, range: ProfitRange, enabled = true) {
  const { from, to } = profitDates(range);
  return useApiQuery({
    queryKey: [...REPORT_KEY, 'profit', by, from, to],
    queryFn: ({ signal }) => getProfitReport({ groupBy: by, from, to }, { signal }),
    enabled,
  });
}

/** The merchant wallets and the store balances. The header's wallet figures share this read, so it asks again as the header does. */
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

const ONE_MINUTE = 60_000;

/**
 * How far shop sales got in the last 7, 30 or 90 days. The report is a total, not a live queue, so it is read again at most once a
 * minute. Needs `reports:growth`.
 */
export function useFunnelReport(range: ProfitRange, enabled = true) {
  const days = Number(range);
  return useApiQuery({
    queryKey: [...REPORT_KEY, 'funnel', days],
    queryFn: ({ signal }) => getFunnel({ days }, { signal }),
    enabled,
    staleTime: ONE_MINUTE,
  });
}
