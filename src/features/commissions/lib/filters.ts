// The Accruals tab's status, agent, page and sort as URL search parameters, and how they become API filters. Ports
// `ui.commissions` (11-state.js) and accrualRows of 46-p-commissions.js: the demo filtered an in-memory array, the console asks the
// server (MISMATCHES M22 has the same reasoning for orders). Nothing here decides which accruals match.
import type { CrudFilters } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import type { FilterValue } from '@/lib/api';
import type { AccrualListFilters, AccrualStatus } from '../types';
import type { CommissionsTab } from './tabs';

/** Accruals per page (the demo's PAGE, as on the Orders page). */
export const PAGE_SIZE = 25;

/** The status sub-filter: ready to approve, approved, or every accrual. */
export type StatusFilter = AccrualStatus | 'all';

/** The sub-filter the tab opens on: the accruals waiting for approval (the demo's `status: 'accrued'`). */
export const DEFAULT_STATUS: StatusFilter = 'accrued';

/** The sub-filter's buttons, in the demo's order and words. */
export const STATUS_ITEMS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'accrued', label: 'Ready' },
  { value: 'approved', label: 'Approved' },
  { value: 'all', label: 'All' },
];

/** The Accruals tab's filters: the status sub-filter and the agent (the agent's merchant id, or null for every agent). */
export type AccrualView = { status: StatusFilter; agent: number | null };

const digits = (value: string | null): string => (value && /^\d+$/.test(value) ? value : '');

/** Reads the filters from the address; anything unknown or malformed is dropped. */
export function parseAccrualView(params: URLSearchParams): AccrualView {
  const status = STATUS_ITEMS.find((item) => item.value === params.get('status'))?.value;
  const agent = Number(digits(params.get('agent')));
  return { status: status ?? DEFAULT_STATUS, agent: agent >= 1 ? agent : null };
}

/** The address with some filters changed. Defaults are left out; everything else in the address is kept. */
export function writeAccrualView(base: URLSearchParams, patch: Partial<AccrualView>): URLSearchParams {
  const merged = { ...parseAccrualView(base), ...patch };
  const next = new URLSearchParams(base);
  if (merged.status === DEFAULT_STATUS) next.delete('status');
  else next.set('status', merged.status);
  if (merged.agent === null) next.delete('agent');
  else next.set('agent', String(merged.agent));
  return next;
}

// ---- Page and sort ----

/** The columns the server can sort by (plain accrual columns); the joined agent and merchant names are not offered. */
export const SORT_FIELDS = ['createdAt', 'basisAmount', 'percent', 'amount', 'status'] as const;

/** The newest accrual first, as the demo's `sort: 'created', dir: -1`. */
export const DEFAULT_SORT: SortState = { field: 'createdAt', order: 'desc' };

/** The page in the address, 1 when it is missing or not a number. */
export function parsePage(params: URLSearchParams): number {
  const page = Number(digits(params.get('page')));
  return page >= 1 ? page : 1;
}

/** The sort in the address, or the default when the address names none. */
export function parseSort(params: URLSearchParams): SortState {
  const field = SORT_FIELDS.find((candidate) => candidate === params.get('sort'));
  if (!field) return DEFAULT_SORT;
  return { field, order: params.get('dir') === 'asc' ? 'asc' : 'desc' };
}

/** The address with a page and sort; the first page and the default sort are left out. */
export function writeView(base: URLSearchParams, view: { page?: number; sort?: SortState }): URLSearchParams {
  const next = new URLSearchParams(base);
  if (view.page !== undefined) {
    if (view.page > 1) next.set('page', String(view.page));
    else next.delete('page');
  }
  if (view.sort) {
    if (view.sort.field === DEFAULT_SORT.field && view.sort.order === DEFAULT_SORT.order) {
      next.delete('sort');
      next.delete('dir');
    } else {
      next.set('sort', view.sort.field);
      next.set('dir', view.sort.order);
    }
  }
  return next;
}

// ---- To the API ----

/** The API filters for the status sub-filter and the agent. */
export function toListFilters(view: AccrualView): AccrualListFilters {
  return {
    ...(view.status === 'all' ? {} : { status: view.status }),
    ...(view.agent === null ? {} : { beneficiaryId: view.agent }),
  };
}

/** The same filters as Refine's list filters, which the data provider turns into the query string. */
export function toRefineFilters(list: AccrualListFilters): CrudFilters {
  const out: CrudFilters = [];
  for (const [field, value] of Object.entries(list) as [string, FilterValue | undefined][]) {
    if (value === undefined) continue;
    out.push({ field, operator: 'eq', value });
  }
  return out;
}

// ---- Links ----

/**
 * The address of the Commissions page, for links from other pages and between its tabs (ARCHITECTURE §5.2):
 * `commissionsPath({ agent: 5 })` is one agent's ready accruals. Defaults are left out, as on the page itself.
 */
export function commissionsPath(
  patch: { tab?: CommissionsTab; status?: StatusFilter; agent?: number } = {},
): string {
  const params = new URLSearchParams();
  if (patch.tab && patch.tab !== 'accruals') params.set('tab', patch.tab);
  if (patch.status && patch.status !== DEFAULT_STATUS) params.set('status', patch.status);
  if (patch.agent) params.set('agent', String(patch.agent));
  const query = params.toString();
  return query ? `/commissions?${query}` : '/commissions';
}
