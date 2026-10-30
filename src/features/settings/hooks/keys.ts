// Query keys of the settings reads that are not Refine resources (decision 005: they start with `['api', <feature>]`), and what a
// change makes stale. React Query matches the keys as prefixes. `SETTINGS_KEY` (the flat settings) lives in `useSettings.ts`.
import type { QueryKey } from '@tanstack/react-query';
import { DASHBOARD_KEY } from '@/lib/query';

/** The merchant group names the gateway cards and dialog use. */
export const GROUP_NAMES_KEY = ['api', 'settings', 'groups'] as const;

/** The preview of each template. */
export const PREVIEW_KEY = ['api', 'settings', 'preview'] as const;

/** The reads a currency change makes stale besides Refine's own: the dashboard's "exchange rate is out of date" alert. */
export const CURRENCY_STALE_KEYS: QueryKey[] = [DASHBOARD_KEY];

/** How long the group names are kept: they change rarely, and a dialog should not wait for a request each time. */
export const LOOKUP_STALE_MS = 5 * 60_000;

/** Rows one list call asks for when the tab shows a whole short table (gateways, tax, currencies, templates). */
export const WHOLE_LIST = 200;

/** Rows per page of the two logs. */
export const LOG_PAGE_SIZE = 25;
