// Words and deadlines for data-subject requests: their number as the demo shows it (`DSR-31`), what they ask for, the badge of
// each status and how close the legal deadline is. New in the console (the demo only listed a customer's requests as text).
import type { BadgeTone, IconName } from '@/components/ui';
import type { DataRequest, DataRequestKind, DataRequestStatus } from '../types';
import { rawLabel } from './status';

/** The number as shown: the API id with the demo's prefix (CUSTOMERS-9). */
export function requestNumber(id: number): string {
  return `DSR-${id}`;
}

export const REQUEST_KIND_LABEL: Readonly<Record<DataRequestKind, string>> = {
  export: 'Data export',
  erasure: 'Erasure',
};

/** The badge of each status. The demo said "Done" for a fulfilled request, so `completed` keeps that word. */
export const REQUEST_STATUS_BADGE: Readonly<
  Record<DataRequestStatus, { label: string; tone: BadgeTone; icon: IconName }>
> = {
  open: { label: 'Open', tone: 'warn', icon: 'clock' },
  in_progress: { label: 'In progress', tone: 'neutral', icon: 'refresh' },
  completed: { label: 'Done', tone: 'good', icon: 'checkCircle' },
  rejected: { label: 'Rejected', tone: 'neutral', icon: 'xCircle' },
};

/** What a kind is called; a kind this console does not know shows its raw value. */
export function requestKindLabel(kind: string): string {
  return Object.hasOwn(REQUEST_KIND_LABEL, kind)
    ? REQUEST_KIND_LABEL[kind as DataRequestKind]
    : rawLabel(kind);
}

/** The badge of a status; a status this console does not know gets a neutral badge with its raw value as the word. */
export function requestStatusBadge(status: string): { label: string; tone: BadgeTone; icon: IconName } {
  return Object.hasOwn(REQUEST_STATUS_BADGE, status)
    ? REQUEST_STATUS_BADGE[status as DataRequestStatus]
    : { label: rawLabel(status), tone: 'neutral', icon: 'info' };
}

/** A request that still has to be fulfilled: waiting or being worked on. */
export function isPending(request: Pick<DataRequest, 'status'>): boolean {
  return request.status === 'open' || request.status === 'in_progress';
}

/** The statuses the tab count and the "needs action" reading use. */
export const PENDING_STATUSES: DataRequestStatus[] = ['open', 'in_progress'];

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/**
 * A length of time in its biggest whole unit: "12d", "5h", "30m". It is rounded to the minute first (as the demo's ageText
 * does), so a deadline set exactly 27 days out reads "27d" a second later instead of "26d".
 */
export function spanText(ms: number): string {
  const minutes = Math.round(Math.abs(ms) / MINUTE_MS);
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

/** How close a deadline is. `late` is past due; `soon` is under three days away (the demo's dueText threshold). */
export type Due = { span: string; late: boolean; soon: boolean };

/** The deadline in words, or null when the request has none. */
export function dueOf(dueAt: string | null, now: number = Date.now()): Due | null {
  const at = dueAt ? Date.parse(dueAt) : Number.NaN;
  if (Number.isNaN(at)) return null;
  const left = at - now;
  return { span: spanText(left), late: left < 0, soon: left >= 0 && left < 3 * DAY_MS };
}

/** The deadline as the table says it: "in 12d" or "3d overdue". */
export function dueText(due: Due): string {
  return due.late ? `${due.span} overdue` : `in ${due.span}`;
}
