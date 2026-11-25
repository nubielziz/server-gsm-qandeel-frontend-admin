// Report routes (`/admin/reports/profit`, `/wallet-exposure`, `/vat`, `/funnel`): the report views and the Overview's wallet figures. New
// in the console (MISMATCHES M124); the map gives no bodies (MISMATCHES M10). The server adds everything up.
import { apiGet, type ApiInit } from '@/lib/api';
import type {
  FunnelQuery,
  FunnelReport,
  ProfitQuery,
  ProfitReport,
  VatQuery,
  VatReport,
  WalletExposure,
} from '../types';

/**
 * Profit split by day, service, supplier or merchant (an account of a merchant rank), for a date range. Why a report route: profit is revenue minus
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
 * What the merchant wallets hold: balances, reserved amounts (held for open orders) and the overdraft allowed and
 * used, and beside them the totals of the store balances (`storeBalances`). The Overview's wallet figures read the totals of this
 * report too.
 * Assumed contract: the answer has the merchant totals, the store balance totals and the largest merchant wallets first (the server
 * caps the list); `clientId` of a row is the account id.
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

/**
 * How many people reached each step of a shop sale in the last `days` days (30 when left out): started a payment, paid, got their
 * order delivered. The server counts every step; the console formats them and shows each step's share of the one before. Needs
 * the `reports:growth` permission.
 * Assumed contract: query `days`, answer `{ days, paymentStarted, paid, delivered }`.
 * @route GET /admin/reports/funnel
 */
export function getFunnel(query: FunnelQuery = {}, init?: ApiInit): Promise<FunnelReport> {
  return apiGet<FunnelReport>('/admin/reports/funnel', query, init);
}
