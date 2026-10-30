// Query keys of the commissions reads that are not Refine resources (decision 005: they start with `['api', <feature>]`), and what
// an approval or a plan change makes stale. React Query matches the keys as prefixes.
import type { QueryKey } from '@tanstack/react-query';
import { DASHBOARD_KEY, type InvalidateTarget, MERCHANT_WALLET_KEY } from '@/lib/query';

/** The status counts on the sub-filter and the Accruals tab. */
export const COUNTS_KEY = ['api', 'commissions', 'counts'] as const;

/** The header strip's count of approved accruals over 30 days. */
export const FIGURES_KEY = ['api', 'commissions', 'figures'] as const;

/** The merchant menu of the assign dialog. */
export const MERCHANT_CHOICES_KEY = ['api', 'commissions', 'merchants'] as const;

/**
 * The reads an approval makes stale besides Refine's own: the counts, the strip, and the dashboard's "ready to approve" alert.
 * Approving credits the agents' wallets, so the merchants' wallet figures are refreshed too.
 */
export const APPROVAL_STALE_KEYS: QueryKey[] = [COUNTS_KEY, FIGURES_KEY, DASHBOARD_KEY, MERCHANT_WALLET_KEY];

/** The Refine target of changed accruals: every list and each record. */
export const STALE_ACCRUALS: InvalidateTarget[] = [{ resource: 'commission-accruals' }];

/** The most plans or assignments one list loads. Both lists are short (the demo showed them whole, with no pager). */
export const LIST_CAP = 200;

/** How many names the merchant menu loads. A longer list would need a search box; the demo's menus were plain selects. */
export const MERCHANT_CAP = 200;

/** The five minutes the merchant menu is kept: the list changes rarely and a dialog should not wait for it each time. */
export const LOOKUP_STALE_MS = 5 * 60_000;

/** The most accruals "Select all" reads at once; a longer list is cut and the staff member is told. */
export const SELECT_ALL_CAP = 1000;
