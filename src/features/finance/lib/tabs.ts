// The addresses of the finance views on the Money page. The Finance page's tabs became views of the Money page (decision 026, ids and
// permissions in features/money); what is kept here is the old tab names other features link with, and the path builders.
import { moneyPath, viewOfFinanceTab } from '@/features/money';

/** The old Finance tabs, still the names the links of other features use: `payments` is the Deposits view, `accounts` the Trial balance. */
export type FinanceTab = 'ledger' | 'payments' | 'accounts' | 'wallets' | 'invoices' | 'reports';

/**
 * The address of what was a Finance tab, now a view of the Money page (decision 026), with that view's own parameters:
 * `financePath('payments')` is the Deposits view, `financePath('reports', { report: 'vat' })` the VAT report. Other pages link here.
 */
export function financePath(
  tab: FinanceTab = 'ledger',
  params: Readonly<Record<string, string | number | undefined>> = {},
): string {
  const { report, ...rest } = params;
  return moneyPath(viewOfFinanceTab(tab, report === undefined ? null : String(report)), rest);
}

/** The address that opens one deposit's dialog, on the All sub-tab so the row is in the list whatever its status. */
export function financePaymentPath(id: number): string {
  return financePath('payments', { status: 'all', payment: id });
}

/** The address that opens one journal entry's drawer on the Ledger view. */
export function financeJournalPath(id: number): string {
  return financePath('ledger', { journal: id });
}

/** The address that opens one invoice's drawer on the Invoices view. */
export function financeInvoicePath(id: number): string {
  return financePath('invoices', { invoice: id });
}
