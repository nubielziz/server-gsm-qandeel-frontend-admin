// Words for the page kinds and statuses, and the rows' small display helpers. Ports `LP_STATUS` of 50-p-storefront.js. The server owns
// the values; these only name them. The landing kinds of `LP_KINDS` were retired (decision 025).
import type { BadgeTone, IconName } from '@/components/ui';
import type { PageKind, PageStatus } from '../types';

/** The page type names: the two content kinds. */
export const KIND_LABEL: Record<PageKind, string> = {
  static: 'Page',
  blog: 'Blog post',
};

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
  return kind === 'blog' ? `/blog/${slug}` : `/${slug}`;
}
