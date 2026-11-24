// Types for the report routes (`/admin/reports/profit`, `/wallet-exposure`, `/vat`, `/funnel`), new in the console (MISMATCHES M124). The
// map gives no bodies (MISMATCHES M10), so every shape is an assumed contract. The server works out every figure.
import type { Id, Money } from '@/lib/api';

// ---- Profit ----

/** What the profit report is split by. */
export type ProfitGroup = 'day' | 'service' | 'supplier' | 'client';

/** One group of the profit report. For `day` the `key` is the date (`2026-10-28`); otherwise it is the record's id. */
export type ProfitRow = {
  key: string;
  label: string;
  orders: number;
  revenue: Money;
  cost: Money;
  profit: Money;
};

/** The whole report's figures, summed by the server. */
export type ProfitTotals = { orders: number; revenue: Money; cost: Money; profit: Money };

/** `GET /admin/reports/profit` (assumed contract). `from` and `to` echo the dates the server used. */
export type ProfitReport = {
  groupBy: ProfitGroup;
  from: string;
  to: string;
  currency: string;
  rows: ProfitRow[];
  totals: ProfitTotals;
};

/** The query of the profit report: the split and the dates (`YYYY-MM-DD`, both included). */
export type ProfitQuery = { groupBy: ProfitGroup; from: string; to: string };

// ---- Wallet exposure ----

/** One merchant's wallet: what it holds, what is reserved for open orders, and the overdraft allowed and used. */
export type WalletExposureRow = {
  clientId: Id;
  name: string;
  balance: Money;
  reserved: Money;
  overdraftLimit: Money;
  overdraftUsed: Money;
};

/** The wallets added up by the server. `inOverdraft` counts the merchants whose balance is below zero. */
export type WalletExposureTotals = {
  clients: number;
  balance: Money;
  reserved: Money;
  overdraftLimit: Money;
  overdraftUsed: Money;
  inOverdraft: number;
};

/** `GET /admin/reports/wallet-exposure` (assumed contract): the totals and the largest wallets first. */
export type WalletExposure = {
  currency: string;
  totals: WalletExposureTotals;
  rows: WalletExposureRow[];
};

// ---- VAT ----

/** VAT due for one country in one month (`period` is `2026-10`). `rate` is the percent applied. */
export type VatRow = {
  country: string;
  period: string;
  rate: string;
  orders: number;
  /** Sales before VAT. */
  taxable: Money;
  vat: Money;
};

/** `GET /admin/reports/vat` (assumed contract), worked out from ledger entries rather than invoices. */
export type VatReport = {
  from: string;
  to: string;
  currency: string;
  rows: VatRow[];
  totals: { orders: number; taxable: Money; vat: Money };
};

/** The query of the VAT report: the dates (`YYYY-MM-DD`, both included). */
export type VatQuery = { from: string; to: string };

// ---- Sales funnel ----

/** The query of the sales funnel: how many days back it looks (7, 30 or 90; the server uses 30 when it is left out). */
export type FunnelQuery = { days?: number };

/**
 * `GET /admin/reports/funnel` (assumed contract): how many people reached each step in the last `days` days. The three counts
 * are the steps after the basket: a payment started, paid, delivered. The server counts; the console only formats. A backend
 * that still sends an IMEI-check count (the retired first step) is read the same way: the key is ignored.
 */
export type FunnelReport = {
  days: number;
  paymentStarted: number;
  paid: number;
  delivered: number;
};
