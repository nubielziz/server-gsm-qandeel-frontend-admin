// Words for the page kinds and statuses, and the rows' small display helpers. Ports `LP_KINDS` and `LP_STATUS` of
// 50-p-storefront.js. The server owns the values; these only name them.
import type { BadgeTone, IconName } from '@/components/ui';
import { LANDING_KINDS, type PageKind, type PageStatus } from '../types';

/** The page type names (the demo's `LP_KINDS`), plus the two content kinds. */
export const KIND_LABEL: Record<PageKind, string> = {
  carrier: 'Carrier',
  model: 'Phone model',
  tool: 'Free tool',
  brand: 'Brand',
  country: 'Country',
  static: 'Page',
  blog: 'Blog post',
};

/** The type filter above the landing pages: "All" first, then the five kinds (`sf-kind`). */
export const KIND_FILTER_ITEMS: readonly { value: string; label: string }[] = [
  { value: '', label: 'All' },
  ...LANDING_KINDS.map((kind) => ({ value: kind, label: KIND_LABEL[kind] })),
];

/** The name of a kind, or the raw text when the server sends one this console does not know. */
export function kindLabel(kind: string): string {
  return Object.hasOwn(KIND_LABEL, kind) ? KIND_LABEL[kind as PageKind] : kind;
}

/** The status badge of a page: tone, icon and word (the demo's `LP_STATUS`). */
export const PAGE_STATUS: Record<PageStatus, { tone: BadgeTone; icon: IconName; label: string }> = {
  published: { tone: 'good', icon: 'checkCircle', label: 'Published' },
  draft: { tone: 'neutral', icon: 'file', label: 'Draft' },
  noindex: { tone: 'warn', icon: 'ban', label: 'Hidden from Google' },
};

/** The status of a page, falling back to a draft for a word this console does not know. */
export function pageStatus(status: string) {
  return Object.hasOwn(PAGE_STATUS, status) ? PAGE_STATUS[status as PageStatus] : PAGE_STATUS.draft;
}

/** The public path the demo shows under a page's title; the slug is the one the server sent. */
export function pagePath(kind: string, slug: string): string {
  if (kind === 'blog') return `/blog/${slug}`;
  if (kind === 'static') return `/${slug}`;
  return `/unlock/${slug}`;
}

/** Languages of the storefront the console offers in its forms (the demo's `EN, AR`). */
export const LOCALE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
] as const;

/** A language code for a table cell: `en` is `EN`. */
export function localeLabel(locale: string): string {
  return locale.toUpperCase();
}
