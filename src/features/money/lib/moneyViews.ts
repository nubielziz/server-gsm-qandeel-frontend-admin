// The Money page as data (decision 026): the five tabs of its strip, the views under each tab, what each view needs, and the addresses
// that open them. It joins the old Finance and "Refunds & disputes" pages in the layout of the Accounts page. Pure (no React, no other
// feature), because the finance and refunds features build their links with it and the old addresses are converted with it.
import { hasPermission } from '@/lib/auth/permissions';

/** The tabs of the strip (level 1). */
export type MoneyArea = 'overview' | 'in' | 'back' | 'books' | 'reports';

/** The views (level 2). Each one is a full view of the page with its own address (`/money?view=deposits`). */
export type MoneyViewId =
  | 'overview'
  | 'deposits'
  | 'shop-payments'
  | 'refunds'
  | 'disputes'
  | 'ledger'
  | 'trial-balance'
  | 'store-balances'
  | 'invoices'
  | 'issue-invoice'
  | 'profit'
  | 'exposure'
  | 'vat'
  | 'funnel';

/**
 * One view: its tab, its link text, and the permissions that let a staff member use it. `all`: every one is needed; `any`: one of them
 * is enough. The rule is a hint for what to draw; the server checks every call.
 */
export type MoneyViewSpec = {
  id: MoneyViewId;
  area: MoneyArea;
  label: string;
  /** Draws a plus before the link ("+Issue invoice"), as the Accounts page's "+Add Account". */
  add?: boolean;
  all?: readonly string[];
  any?: readonly string[];
};

/** The tabs of the strip, in the order they are shown. */
export const MONEY_AREAS: readonly { id: MoneyArea; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'in', label: 'Money in' },
  { id: 'back', label: 'Money back' },
  { id: 'books', label: 'Books' },
  { id: 'reports', label: 'Reports' },
];

/**
 * The views in the order their links appear. The permissions are the old tabs' own: Deposits `payments:read`, Shop payments (the old
 * Refunds page's Payments tab) `reports:finance`, the ledger and the trial balance `ledger:read`, Store balances `wallet:read`,
 * Invoices `invoices:read`; issuing one needs `invoices:create`, and `clients:read` for the merchant picker; Profit and Wallet exposure
 * `reports:read`, VAT `reports:finance`, the sales funnel `reports:growth`. The Overview shows the figures of both old pages, so any
 * one of their permissions opens it.
 */
export const MONEY_VIEWS: readonly MoneyViewSpec[] = [
  {
    id: 'overview',
    area: 'overview',
    label: 'Overview',
    any: ['ledger:read', 'reports:read', 'payments:read', 'refunds:read', 'disputes:read', 'reports:finance'],
  },
  { id: 'deposits', area: 'in', label: 'Deposits', all: ['payments:read'] },
  { id: 'shop-payments', area: 'in', label: 'Shop payments', all: ['reports:finance'] },
  { id: 'refunds', area: 'back', label: 'Refunds', all: ['refunds:read'] },
  { id: 'disputes', area: 'back', label: 'Card disputes', all: ['disputes:read'] },
  { id: 'ledger', area: 'books', label: 'Ledger', all: ['ledger:read'] },
  { id: 'trial-balance', area: 'books', label: 'Trial balance', all: ['ledger:read'] },
  { id: 'store-balances', area: 'books', label: 'Store balances', all: ['wallet:read'] },
  { id: 'invoices', area: 'books', label: 'Invoices', all: ['invoices:read'] },
  {
    id: 'issue-invoice',
    area: 'books',
    label: 'Issue invoice',
    add: true,
    all: ['invoices:read', 'invoices:create', 'clients:read'],
  },
  { id: 'profit', area: 'reports', label: 'Profit', all: ['reports:read'] },
  { id: 'exposure', area: 'reports', label: 'Wallet exposure', all: ['reports:read'] },
  { id: 'vat', area: 'reports', label: 'VAT', all: ['reports:finance'] },
  { id: 'funnel', area: 'reports', label: 'Sales funnel', all: ['reports:growth'] },
];

/** Any one of these opens the page (the page gate of the manifest and of src/app/resources.ts); each view then checks its own. */
export const MONEY_PAGE_PERMISSIONS: readonly string[] = [
  'ledger:read',
  'payments:read',
  'wallet:read',
  'invoices:read',
  'reports:read',
  'reports:finance',
  'reports:growth',
  'refunds:read',
  'disputes:read',
];

/** The page's heading, the same on every view (the sidebar label is the same word). */
export const MONEY_HEADING = 'Money';

export function isMoneyView(value: unknown): value is MoneyViewId {
  return MONEY_VIEWS.some((spec) => spec.id === value);
}

/** The spec of a view. */
export function viewSpec(id: MoneyViewId): MoneyViewSpec {
  const spec = MONEY_VIEWS.find((candidate) => candidate.id === id);
  if (!spec) throw new Error(`Unknown Money view "${id}"`);
  return spec;
}

/** The tab a view belongs to. */
export function areaOf(id: MoneyViewId): MoneyArea {
  return viewSpec(id).area;
}

/** Whether a staff member with these permissions may use the view. */
export function canUseView(spec: MoneyViewSpec, granted: readonly string[]): boolean {
  const all = spec.all ?? [];
  const any = spec.any ?? [];
  return (
    all.every((permission) => hasPermission(granted, permission)) &&
    (any.length === 0 || hasPermission(granted, any))
  );
}

/** The views this staff member may use, in the order of their links. */
export function usableViews(granted: readonly string[]): MoneyViewSpec[] {
  return MONEY_VIEWS.filter((spec) => canUseView(spec, granted));
}

/** The tabs that hold at least one view the staff member may use, in the strip's order. */
export function usableAreas(usable: readonly MoneyViewSpec[]): { id: MoneyArea; label: string }[] {
  return MONEY_AREAS.filter((area) => usable.some((spec) => spec.area === area.id));
}

/** The first view of a tab that the staff member may use: where the tab's link goes. */
export function firstViewOf(area: MoneyArea, usable: readonly MoneyViewSpec[]): MoneyViewId | undefined {
  return usable.find((spec) => spec.area === area)?.id;
}

/**
 * The view to show for the `view` the address names. A view the staff member may use is shown. A known view they may not use falls back
 * to the first view of the same tab they may use (an old link to the Profit report opens another report for a role without
 * `reports:read`), then to their first view. Nothing, or an unknown word, is their first view. Null when they may use none.
 */
export function resolveView(requested: string | null, usable: readonly MoneyViewSpec[]): MoneyViewId | null {
  if (usable.length === 0) return null;
  if (isMoneyView(requested)) {
    if (usable.some((spec) => spec.id === requested)) return requested;
    const sameTab = firstViewOf(areaOf(requested), usable);
    if (sameTab) return sameTab;
  }
  return usable[0].id;
}

/**
 * The address of a view with its own parameters (`moneyPath('deposits', { status: 'all', payment: 7 })`). The Overview is the default
 * and leaves no `view` parameter, so `moneyPath()` is `/money`. An empty or missing parameter is left out; `view` always comes first.
 */
export function moneyPath(
  view: MoneyViewId = 'overview',
  params: Readonly<Record<string, string | number | undefined | null>> = {},
): string {
  const query = new URLSearchParams();
  if (view !== 'overview') query.set('view', view);
  for (const [key, value] of Object.entries(params)) {
    if (key === 'view' || value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `/money?${text}` : '/money';
}

// ---- The old pages' tabs (the finance and refunds link builders and the redirects of the old addresses use these) ----

const FINANCE_TAB_VIEWS: Readonly<Record<string, MoneyViewId>> = {
  ledger: 'ledger',
  payments: 'deposits',
  accounts: 'trial-balance',
  wallets: 'store-balances',
  invoices: 'invoices',
};

const REPORT_VIEWS: Readonly<Record<string, MoneyViewId>> = {
  profit: 'profit',
  exposure: 'exposure',
  vat: 'vat',
  funnel: 'funnel',
};

const REFUND_TAB_VIEWS: Readonly<Record<string, MoneyViewId>> = {
  refunds: 'refunds',
  disputes: 'disputes',
  payments: 'shop-payments',
};

/**
 * The view an old Finance tab became: `tab=payments` is Deposits, `tab=accounts` the trial balance, `tab=wallets` Store balances,
 * `tab=reports` the report its `report` names (Profit when it names none: the page then falls back within Reports as `resolveView`
 * says). No tab, or one that never existed, is the Ledger, the old page's first tab.
 */
export function viewOfFinanceTab(tab: string | null, report: string | null = null): MoneyViewId {
  if (tab === 'reports')
    return report !== null && Object.hasOwn(REPORT_VIEWS, report) ? REPORT_VIEWS[report] : 'profit';
  return tab !== null && Object.hasOwn(FINANCE_TAB_VIEWS, tab) ? FINANCE_TAB_VIEWS[tab] : 'ledger';
}

/** The view an old Refunds tab became: `tab=disputes` is Card disputes, `tab=payments` Shop payments; anything else Refunds. */
export function viewOfRefundTab(tab: string | null): MoneyViewId {
  return tab !== null && Object.hasOwn(REFUND_TAB_VIEWS, tab) ? REFUND_TAB_VIEWS[tab] : 'refunds';
}

// The address of a view followed by every key of an old address except the ones that named the old tab.
function carry(view: MoneyViewId, old: URLSearchParams, drop: readonly string[]): string {
  const params = new URLSearchParams();
  if (view !== 'overview') params.set('view', view);
  for (const [key, value] of old) if (key !== 'view' && !drop.includes(key)) params.append(key, value);
  const text = params.toString();
  return text ? `/money?${text}` : '/money';
}

/**
 * An old `/finance` address on the Money page: the tab (and a report's `report`) become the view; every other key (a filter, the page,
 * the sort, an open deposit, journal entry or invoice) is carried as it was, because each view reads the keys its old tab read.
 */
export function moneyPathOfFinance(search: URLSearchParams): string {
  return carry(viewOfFinanceTab(search.get('tab'), search.get('report')), search, ['tab', 'report']);
}

/** An old `/refunds` address on the Money page: the tab becomes the view, the other keys (status, method, page, sort, order) stay. */
export function moneyPathOfRefunds(search: URLSearchParams): string {
  return carry(viewOfRefundTab(search.get('tab')), search, ['tab']);
}
