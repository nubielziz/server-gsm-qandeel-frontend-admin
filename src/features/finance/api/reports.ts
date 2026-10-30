// Report routes (`/admin/reports/profit`, `/wallet-exposure`, `/vat`): the Reports tab and the header's wallet figures. New
// in the console (MISMATCHES M124); the map gives no bodies (MISMATCHES M10). The server adds everything up.
import { apiGet, type ApiInit } from '@/lib/api';
import type { ProfitQuery, ProfitReport, VatQuery, VatReport, WalletExposure } from '../types';

/**
 * Profit split by day, service, supplier or merchant, for a date range. Why a report route: profit is revenue minus
 * what the supplier cost, worked out from orders and ledger entries, so only the server can say it.
 * Assumed contract: query `groupBy` (`day`, `service`, `supplier` or `client`), `from` and `to` (`YYYY-MM-DD`, both
 * included); the answer has one row per group and the totals.
 * @route GET /admin/reports/profit
 */
export function getProfitReport(query: ProfitQuery, init?: ApiInit): Promise<ProfitReport> {
  return apiGet<ProfitReport>(
    '/admin/reports/profit',
    { groupBy: query.groupBy, from: query.from, to: query.to },
    init,
  );
}

/**
 * What the merchants' wallets hold: balances, reserved amounts (held for open orders) and the overdraft allowed and
 * used. The header's wallet figures read the totals of this report too.
 * Assumed contract: the answer has the totals and the largest wallets first (the server caps the list).
 * @route GET /admin/reports/wallet-exposure
 */
export function getWalletExposure(init?: ApiInit): Promise<WalletExposure> {
  return apiGet<WalletExposure>('/admin/reports/wallet-exposure', undefined, init);
}

/**
 * VAT due by country and month for a date range. The server works it out from ledger entries, not from invoices, so
 * it matches what the books say; it needs the `reports:finance` permission.
 * Assumed contract: query `from` and `to` (`YYYY-MM-DD`, both included); one row per country and month.
 * @route GET /admin/reports/vat
 */
export function getVatReport(query: VatQuery, init?: ApiInit): Promise<VatReport> {
  return apiGet<VatReport>('/admin/reports/vat', { from: query.from, to: query.to }, init);
}
