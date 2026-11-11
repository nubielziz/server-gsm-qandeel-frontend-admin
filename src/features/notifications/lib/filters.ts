// The campaign list's status, purpose, search, page and sort as URL search parameters, and how they become the API query. The server filters,
// sorts and counts; nothing here decides what a campaign is.
import type { ListQuery } from '@/lib/api';
import { CAMPAIGN_PURPOSES, CAMPAIGN_STATUSES, type CampaignPurpose, type CampaignStatus } from '../types';

/** Campaigns per page. */
export const PAGE_SIZE = 25;

/** The filters and the search text of the toolbar; an empty text means "no filter". */
export type CampaignFilters = { status: '' | CampaignStatus; purpose: '' | CampaignPurpose; q: string };

/** Newest first, like the server's default. */
export const DEFAULT_SORT = { field: 'createdAt', order: 'desc' } as const;

/** The columns the server can sort by. */
export const SORT_FIELDS = ['createdAt', 'scheduledAt'] as const;

export function parseFilters(params: URLSearchParams): CampaignFilters {
  const status = CAMPAIGN_STATUSES.find((candidate) => candidate === params.get('status'));
  const purpose = CAMPAIGN_PURPOSES.find((candidate) => candidate === params.get('purpose'));
  return { status: status ?? '', purpose: purpose ?? '', q: params.get('q') ?? '' };
}

export function parsePage(params: URLSearchParams): number {
  const text = params.get('page');
  const page = text && /^\d+$/.test(text) ? Number(text) : 1;
  return page >= 1 ? page : 1;
}

/** The address with some filters changed and back on page 1. Empty values leave the address; everything else in it is kept. */
export function writeFilters(base: URLSearchParams, patch: Partial<CampaignFilters>): URLSearchParams {
  const merged = { ...parseFilters(base), ...patch };
  const next = new URLSearchParams(base);
  for (const key of ['status', 'purpose', 'q'] as const) {
    if (merged[key]) next.set(key, merged[key]);
    else next.delete(key);
  }
  next.delete('page');
  return next;
}

/** The address with every filter and the search removed, and back on page 1. */
export function clearFilterParams(base: URLSearchParams): URLSearchParams {
  return writeFilters(base, { status: '', purpose: '', q: '' });
}

export function writePage(base: URLSearchParams, page: number): URLSearchParams {
  const next = new URLSearchParams(base);
  if (page > 1) next.set('page', String(page));
  else next.delete('page');
  return next;
}

/** True when any filter or the search is on, which is what "Clear filters" removes. */
export function hasFilters(filters: CampaignFilters): boolean {
  return Boolean(filters.status || filters.purpose || filters.q.trim());
}

/** What the list asks the server for: the filters, one page, newest first. */
export function toListQuery(filters: CampaignFilters, page: number): ListQuery {
  const q = filters.q.trim();
  return {
    start: (page - 1) * PAGE_SIZE,
    end: page * PAGE_SIZE,
    sort: [DEFAULT_SORT.field],
    order: [DEFAULT_SORT.order],
    ...(q ? { q } : {}),
    filters: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.purpose ? { purpose: filters.purpose } : {}),
    },
  };
}

/** The address of the Notifications page, for links from other pages. */
export const notificationsListPath = () => '/notifications';

/** The address of one campaign. */
export const campaignPath = (id: number) => `/notifications/${id}`;

/** The address of the notification log narrowed to one campaign's messages (a tab of Settings). */
export const campaignLogPath = (id: number) => `/settings?tab=log&campaignId=${id}`;
