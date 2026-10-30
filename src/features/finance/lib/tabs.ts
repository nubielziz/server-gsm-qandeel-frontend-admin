// The tabs of the Finance page, what each needs, and the addresses that open them. Ports the `tabs` list of pageFinance in
// 45-p-finance.js; Withdrawals stays out (MISMATCHES M3) and Invoices and Reports are new (MISMATCHES M123, MISMATCHES M124).
import { hasPermission } from '@/lib/auth/permissions';

export type FinanceTab = 'ledger' | 'payments' | 'accounts' | 'invoices' | 'reports';

type TabSpec = { id: FinanceTab; label: string; permission: string | readonly string[] };

/** The tabs in the order they are shown. `payments` is called Deposits on screen, as in the demo. */
export const FINANCE_TABS: readonly TabSpec[] = [
  { id: 'ledger', label: 'Ledger', permission: 'ledger:read' },
  { id: 'payments', label: 'Deposits', permission: 'payments:read' },
  { id: 'accounts', label: 'Trial balance', permission: 'ledger:read' },
  { id: 'invoices', label: 'Invoices', permission: 'invoices:read' },
  { id: 'reports', label: 'Reports', permission: ['reports:read', 'reports:finance'] },
];

/** Any one of these opens the page (the page permission of the manifest); each tab then checks its own. */
export const FINANCE_PAGE_PERMISSION: readonly string[] = [
  'ledger:read',
  'payments:read',
  'invoices:read',
  'reports:read',
  'reports:finance',
];

export function isFinanceTab(value: string | null): value is FinanceTab {
  return FINANCE_TABS.some((tab) => tab.id === value);
}

/** The tabs a staff member may open, from their permissions. A hint only: the server checks every request. */
export function visibleTabs(granted: readonly string[]): TabSpec[] {
  return FINANCE_TABS.filter((tab) => hasPermission(granted, tab.permission));
}

/**
 * The tab to show: the one in the address when the staff member may open it, else the first they may open (the
 * Ledger for most roles).
 */
export function resolveTab(requested: string | null, tabs: readonly TabSpec[]): FinanceTab | undefined {
  const asked = tabs.find((tab) => tab.id === requested);
  return (asked ?? tabs[0])?.id;
}

/**
 * The address of the Finance page on a tab, with that tab's own parameters. The Ledger is the default tab, so it adds no
 * `tab` parameter. Other pages link here: `financePath('payments')` is the pending deposits.
 */
export function financePath(
  tab: FinanceTab = 'ledger',
  params: Readonly<Record<string, string | number | undefined>> = {},
): string {
  const query = new URLSearchParams();
  if (tab !== 'ledger') query.set('tab', tab);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `/finance?${text}` : '/finance';
}

/** The address that opens one deposit's dialog, on the All sub-tab so the row is in the list whatever its status. */
export function financePaymentPath(id: number): string {
  return financePath('payments', { status: 'all', payment: id });
}

/** The address that opens one journal entry's drawer on the Ledger tab. */
export function financeJournalPath(id: number): string {
  return financePath('ledger', { journal: id });
}

/** The address that opens one invoice's drawer on the Invoices tab. */
export function financeInvoicePath(id: number): string {
  return financePath('invoices', { invoice: id });
}
