// The Risk page's tab, filters, page, sort and open IMEI check as URL search parameters (`?tab=checks&kind=icloud&page=2`),
// so a link or a reload shows the same screen (ARCHITECTURE §5.2). Ports the `ui.risk`, `ui.rkI` and `ui.rkB` state of
// 54-p-risk.js, which lived in memory. Nothing here decides which rows match: it only writes and reads the question.
import type { CrudFilters } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import type { FilterValue } from '@/lib/api';
import type { BlocklistFilters, BlockKind, CheckKind, CheckResult, ImeiCheckFilters } from '../types';
import { BLOCK_KINDS, CHECK_KINDS, CHECK_RESULTS } from './labels';

export type RiskTab = 'queue' | 'checks' | 'block' | 'rules';

/** The tabs in the demo's order. */
export const RISK_TABS: readonly { id: RiskTab; label: string }[] = [
  { id: 'queue', label: 'Review queue' },
  { id: 'checks', label: 'IMEI checks' },
  { id: 'block', label: 'Blocklist' },
  { id: 'rules', label: 'Rules' },
];

/** The page opens on the review queue; it is also what `/risk?tab=queue` links to. */
export const DEFAULT_TAB: RiskTab = 'queue';

/** Rows per page: the demo pages the checks table by 15 and every other table by 25 (its `PAGE`). */
export const CHECK_PAGE_SIZE = 15;
export const BLOCK_PAGE_SIZE = 25;

/** The columns the server can sort the two lists by (plain fields of the rows). */
export const CHECK_SORT_FIELDS = ['model', 'checkType', 'status', 'createdAt'] as const;
export const BLOCK_SORT_FIELDS = ['kind', 'display', 'createdAt'] as const;

/** Newest first: the demo's default (`sort: 'ts', dir: -1`) for both lists. */
export const NEWEST_FIRST: SortState = { field: 'createdAt', order: 'desc' };

export function isRiskTab(value: string | null): value is RiskTab {
  return RISK_TABS.some((tab) => tab.id === value);
}

export function parseTab(params: URLSearchParams): RiskTab {
  const tab = params.get('tab');
  return isRiskTab(tab) ? tab : DEFAULT_TAB;
}

/** The address of a tab: only the tab. Every other parameter belongs to the tab being left, so it is dropped. */
export function writeTab(tab: RiskTab): URLSearchParams {
  return tab === DEFAULT_TAB ? new URLSearchParams() : new URLSearchParams({ tab });
}

// ---- IMEI checks ----

/** The checks toolbar: the search text, the kind of check and the result. */
export type ChecksView = { q: string; kind: CheckKind | ''; result: CheckResult | '' };

export function parseChecksView(params: URLSearchParams): ChecksView {
  const kind = params.get('kind');
  const result = params.get('result');
  return {
    q: params.get('q') ?? '',
    kind: CHECK_KINDS.find((candidate) => candidate === kind) ?? '',
    result: CHECK_RESULTS.find((candidate) => candidate === result) ?? '',
  };
}

export function hasChecksFilters(view: ChecksView): boolean {
  return Boolean(view.q.trim() || view.kind || view.result);
}

/**
 * An IMEI is pasted with or without the spaces the screen puts in it ("35 389011 884201 4"). Text made only of digits and
 * spaces is searched without the spaces; anything else (a brand, a model) is searched as typed, trimmed.
 */
export function normalizeSearch(text: string): string {
  const trimmed = text.trim();
  return /^[\d\s]+$/.test(trimmed) ? trimmed.replace(/\s/g, '') : trimmed;
}

/** The API filters for the toolbar. */
export function toCheckFilters(view: ChecksView): ImeiCheckFilters {
  const q = normalizeSearch(view.q);
  return {
    ...(q ? { q } : {}),
    ...(view.kind ? { checkType: view.kind } : {}),
    ...(view.result ? { status: view.result } : {}),
  };
}

// ---- Blocklist ----

/** The blocklist toolbar: the kind of entry. */
export type BlockView = { kind: BlockKind | '' };

export function parseBlockView(params: URLSearchParams): BlockView {
  const kind = params.get('kind');
  return { kind: BLOCK_KINDS.find((candidate) => candidate === kind) ?? '' };
}

export function toBlockFilters(view: BlockView): BlocklistFilters {
  return view.kind ? { kind: view.kind } : {};
}

/** The same filters as Refine's list filters, which the data provider turns into the query string (`q` becomes the search text). */
export function toRefineFilters(filters: Readonly<Record<string, FilterValue | undefined>>): CrudFilters {
  return Object.entries(filters).flatMap(([field, value]) =>
    value === undefined || value === '' ? [] : [{ field, operator: 'eq' as const, value }],
  );
}

// ---- Writing the address ----

const put = (next: URLSearchParams, key: string, value: string) =>
  value ? next.set(key, value) : next.delete(key);

/** The address with some checks filters changed. A filter change goes back to page 1; the sort is kept. */
export function writeChecksView(base: URLSearchParams, patch: Partial<ChecksView>): URLSearchParams {
  const merged = { ...parseChecksView(base), ...patch };
  const next = new URLSearchParams(base);
  put(next, 'q', merged.q);
  put(next, 'kind', merged.kind);
  put(next, 'result', merged.result);
  next.delete('page');
  return next;
}

export function writeBlockView(base: URLSearchParams, patch: Partial<BlockView>): URLSearchParams {
  const merged = { ...parseBlockView(base), ...patch };
  const next = new URLSearchParams(base);
  put(next, 'kind', merged.kind);
  next.delete('page');
  return next;
}

// ---- Page and sort ----

export function parsePage(params: URLSearchParams): number {
  const raw = params.get('page');
  const page = raw && /^\d+$/.test(raw) ? Number(raw) : 1;
  return page >= 1 ? page : 1;
}

/** The sort in the address when it names one of `allowed`, else newest first. */
export function parseSort(params: URLSearchParams, allowed: readonly string[]): SortState {
  const field = allowed.find((candidate) => candidate === params.get('sort'));
  if (!field) return NEWEST_FIRST;
  return { field, order: params.get('dir') === 'asc' ? 'asc' : 'desc' };
}

/** The address with a page; page 1 is left out. */
export function writePage(base: URLSearchParams, page: number): URLSearchParams {
  const next = new URLSearchParams(base);
  if (page > 1) next.set('page', String(page));
  else next.delete('page');
  return next;
}

/** The address with a sort (and back to page 1); the default sort is left out. */
export function writeSort(base: URLSearchParams, sort: SortState): URLSearchParams {
  const next = new URLSearchParams(base);
  if (sort.field === NEWEST_FIRST.field && sort.order === NEWEST_FIRST.order) {
    next.delete('sort');
    next.delete('dir');
  } else {
    next.set('sort', sort.field);
    next.set('dir', sort.order);
  }
  next.delete('page');
  return next;
}

// ---- The open IMEI check ----

/** The check whose details are open, kept in the address as `?check=<id>` (like the order drawer's `?order=<id>`). */
export function parseCheckId(params: URLSearchParams): number | null {
  const raw = params.get('check');
  return raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
}

export function writeCheckId(base: URLSearchParams, id: number | null): URLSearchParams {
  const next = new URLSearchParams(base);
  if (id === null) next.delete('check');
  else next.set('check', String(id));
  return next;
}
