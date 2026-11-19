// The list state of a storefront tab as URL search parameters (`?tab=help&q=refund&page=2&sort=question&dir=desc`), and how it
// becomes the API's question. Ports `ui.sfL`, `ui.sfP`, `ui.sfC`, `ui.sfH` of 50-p-storefront.js: the demo sorted and paged an
// in-memory array, the console asks the server (MISMATCHES M22 has the same reasoning for orders).
import type { CrudFilters } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import { LANDING_KINDS, PUBLISH_FLAGS } from '../types';

/** Rows per page (the demo's PAGE, as on the Orders page). */
export const PAGE_SIZE = 25;

/** The most rows a tab without a pager loads (pages and legal documents are few). */
export const WHOLE_LIST_CAP = 200;

/** What one tab's address may hold: the columns it sorts by, its default sort, and the filters with the values they accept. */
export type ViewSpec = {
  sortFields: readonly string[];
  defaultSort: SortState;
  filters: Readonly<Record<string, readonly string[]>>;
};

/** The listings tab: sorted by the public title, as a catalogue is easiest to scan. */
export const LISTING_VIEW: ViewSpec = {
  sortFields: ['publicTitle', 'isListed'],
  defaultSort: { field: 'publicTitle', order: 'asc' },
  filters: {},
};

/** The price changes of the Retail pricing tab: newest first; the proposals that wait are shown until `show=all`. */
export const CHANGES_VIEW: ViewSpec = {
  sortFields: ['id', 'createdAt'],
  defaultSort: { field: 'id', order: 'desc' },
  filters: { show: ['all'] },
};

/** Rows per page of a run's rows (the preview and the result): a run holds up to 5000. */
export const PUBLISH_ITEMS_PAGE = 50;

/** The earlier runs on the Publish tab's start: newest first. */
export const PUBLISH_RUNS_VIEW: ViewSpec = {
  sortFields: ['id', 'createdAt'],
  defaultSort: { field: 'id', order: 'desc' },
  filters: {},
};

/**
 * The rows of one run, for the result of a finished run and for the preview of a draft: in the server's order of rows, or by
 * title or cost. `result` is the chips Published, Left out and Refused (`skipped` is "Left out"). The preview adds its own filters:
 * `state` (the chips Ready, Needs a look, Cannot publish), `included=false` (the chip Left out), `flag` and `brandKind`.
 */
export const PUBLISH_ITEMS_VIEW: ViewSpec = {
  sortFields: ['id', 'title', 'cost'],
  defaultSort: { field: 'id', order: 'asc' },
  filters: {
    result: ['published', 'skipped', 'refused'],
    state: ['ready', 'review', 'blocked'],
    included: ['false'],
    flag: PUBLISH_FLAGS,
    brandKind: ['device', 'tool', 'app'],
  },
};

/** The landing pages tab: the most recently changed first, filtered by page type (`sf-kind`). */
export const LANDING_VIEW: ViewSpec = {
  sortFields: ['title', 'status', 'updatedAt'],
  defaultSort: { field: 'updatedAt', order: 'desc' },
  filters: { kind: LANDING_KINDS },
};

/** The help centre tab: in the order the articles show on the site. */
export const HELP_VIEW: ViewSpec = {
  sortFields: ['sort', 'question', 'category', 'isPublished'],
  defaultSort: { field: 'sort', order: 'asc' },
  filters: {},
};

/** The TAC catalogue tab: by prefix. */
export const TAC_VIEW: ViewSpec = {
  sortFields: ['tac', 'brand', 'model', 'releaseYear'],
  defaultSort: { field: 'tac', order: 'asc' },
  filters: {},
};

/** The search tab's synonyms: the most recently changed first, filtered by on or off (`state`). */
export const SYNONYM_VIEW: ViewSpec = {
  sortFields: ['updatedAt'],
  defaultSort: { field: 'updatedAt', order: 'desc' },
  filters: { state: ['on', 'off'] },
};

/** The search tab's pinned results: the most recently changed first, or by query, filtered by on or off (`state`). */
export const PIN_VIEW: ViewSpec = {
  sortFields: ['updatedAt', 'query'],
  defaultSort: { field: 'updatedAt', order: 'desc' },
  filters: { state: ['on', 'off'] },
};

/** A tab's search text, filters, page and sort, as read from the address. */
export type ListView = {
  q: string;
  page: number;
  sort: SortState;
  /** Filter name to value; a filter that is off is the empty string. */
  filters: Record<string, string>;
};

/** Reads a tab's state from the address; anything unknown or malformed is dropped. */
export function parseView(params: URLSearchParams, spec: ViewSpec): ListView {
  const pageText = params.get('page');
  const page = pageText && /^\d+$/.test(pageText) ? Number(pageText) : 1;
  const field = spec.sortFields.find((candidate) => candidate === params.get('sort'));
  const sort: SortState = field
    ? { field, order: params.get('dir') === 'desc' ? 'desc' : 'asc' }
    : spec.defaultSort;
  const filters: Record<string, string> = {};
  for (const [name, allowed] of Object.entries(spec.filters)) {
    const value = params.get(name);
    filters[name] = allowed.find((candidate) => candidate === value) ?? '';
  }
  return { q: params.get('q') ?? '', page: page >= 1 ? page : 1, sort, filters };
}

/**
 * The address with some of the state changed. Defaults are left out (page 1, the default sort, an empty filter) and
 * everything else in the address (the tab) is kept.
 */
export function writeView(
  base: URLSearchParams,
  patch: Partial<Pick<ListView, 'q' | 'page' | 'sort'>> & { filters?: Record<string, string> },
  spec: ViewSpec,
): URLSearchParams {
  const next = new URLSearchParams(base);
  const put = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key));
  if (patch.q !== undefined) put('q', patch.q);
  for (const [name, value] of Object.entries(patch.filters ?? {})) put(name, value);
  if (patch.page !== undefined) put('page', patch.page > 1 ? String(patch.page) : '');
  if (patch.sort) {
    const isDefault =
      patch.sort.field === spec.defaultSort.field && patch.sort.order === spec.defaultSort.order;
    put('sort', isDefault ? '' : patch.sort.field);
    put('dir', isDefault ? '' : patch.sort.order);
  }
  return next;
}

/** Whether any search text or filter is on: what "Clear filters" and the filtered empty state look at. */
export function hasActiveFilters(view: Pick<ListView, 'q' | 'filters'>): boolean {
  return Boolean(view.q.trim() || Object.values(view.filters).some(Boolean));
}

/** The same address with the search text, the filters and the page removed (the sort is kept). */
export function clearView(base: URLSearchParams, spec: ViewSpec): URLSearchParams {
  const cleared = Object.fromEntries(Object.keys(spec.filters).map((name) => [name, '']));
  return writeView(base, { q: '', page: 1, filters: cleared }, spec);
}

/** The same address with the search text, the filters, the page and the sort all back to their defaults (only the tab stays). */
export function resetView(base: URLSearchParams, spec: ViewSpec): URLSearchParams {
  return writeView(clearView(base, spec), { sort: spec.defaultSort }, spec);
}

/**
 * Refine's list filters for a tab: the search text as `q`, then the tab's own field filters. A value that is empty or
 * undefined is left out; an array is one filter with several values (the key repeats in the query string).
 */
export function toRefineFilters(
  q: string,
  fields: Record<string, string | boolean | readonly string[] | undefined> = {},
): CrudFilters {
  const out: CrudFilters = [];
  const text = q.trim();
  if (text) out.push({ field: 'q', operator: 'eq', value: text });
  for (const [field, value] of Object.entries(fields)) {
    if (value === undefined || value === '') continue;
    out.push({ field, operator: Array.isArray(value) ? 'in' : 'eq', value });
  }
  return out;
}
