// Words and deadlines of the data requests: what a request asks for, how each status looks (a square and a word), how close the legal
// deadline is, and the one line a request takes in an account's Privacy and risk part. The number itself ("DSR-12") is the data layer's.
import type { SquareTone } from '@/components/ui';
import { ago } from '@/lib/format';
import { PENDING_REQUEST_STATUSES } from '../../hooks/useDataRequests';
import { rawLabel } from '../../lib/status';
import type { DataRequest, DataRequestKind, DataRequestStatus } from '../../types';

export { requestNumber } from '../../lib/requests';

/** What each kind asks for. */
export const REQUEST_KIND_LABEL: Readonly<Record<DataRequestKind, string>> = {
  export: 'Export',
  erasure: 'Erasure',
};

/** What a kind is called; a kind this console does not know shows as written ("Unknown" when it is empty). */
export function requestKindLabel(kind: string): string {
  return Object.hasOwn(REQUEST_KIND_LABEL, kind)
    ? REQUEST_KIND_LABEL[kind as DataRequestKind]
    : rawLabel(kind);
}

/** The word of a status and the tone of its square. */
export type RequestStatusLook = { word: string; tone: SquareTone };

/**
 * The look of each status. Open and in progress are both still to do, so both are warm; a fulfilled request is "Done" and a refused one
 * is "Rejected" with a hollow square (it is over).
 */
export const REQUEST_STATUS_LOOK: Readonly<Record<DataRequestStatus, RequestStatusLook>> = {
  open: { word: 'Open', tone: 'warn' },
  in_progress: { word: 'In progress', tone: 'warn' },
  completed: { word: 'Done', tone: 'ok' },
  rejected: { word: 'Rejected', tone: 'off' },
};

/** The look of a status; a status this console does not know gets a hollow square with its raw value as the word. */
export function requestStatusLook(status: string): RequestStatusLook {
  return Object.hasOwn(REQUEST_STATUS_LOOK, status)
    ? REQUEST_STATUS_LOOK[status as DataRequestStatus]
    : { word: rawLabel(status), tone: 'off' };
}

/** A request that still has to be fulfilled: waiting or being worked on. The Data requests link counts the same two statuses. */
export function isPending(request: Pick<DataRequest, 'status'>): boolean {
  return PENDING_REQUEST_STATUSES.includes(request.status);
}

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/**
 * A length of time in its biggest whole unit: "12d", "5h", "30m". It is rounded to the minute first, so a deadline set exactly 27 days out
 * reads "27d" a second later instead of "26d".
 */
export function spanText(ms: number): string {
  const minutes = Math.round(Math.abs(ms) / MINUTE_MS);
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

/** How close a deadline is. `late` is past due; `soon` is under three days away. */
export type Due = { span: string; late: boolean; soon: boolean };

/**
 * The deadline in words, or null when the request has none (or its date cannot be read).
 *
 * @param dueAt the legal deadline, as the server sends it.
 * @param now the moment to count from (from `useNow`, so a screen stays consistent and a test can fix it).
 */
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

/**
 * Where a request is, in the few words of a line ("done 2d ago", "due in 3d", "3d overdue", "rejected"). `urgent` is true for a request still to
 * do whose deadline is under three days away or past: the line is then drawn in the critical colour.
 */
export function requestState(
  request: Pick<DataRequest, 'status' | 'dueAt' | 'completedAt'>,
  now: number = Date.now(),
): { text: string; urgent: boolean } {
  if (request.status === 'completed') {
    return { text: request.completedAt ? `done ${ago(request.completedAt, now)}` : 'done', urgent: false };
  }
  if (request.status === 'rejected') return { text: 'rejected', urgent: false };
  if (!isPending(request)) return { text: rawLabel(request.status), urgent: false };
  const due = dueOf(request.dueAt, now);
  if (!due) return { text: requestStatusLook(request.status).word.toLowerCase(), urgent: false };
  return { text: due.late ? dueText(due) : `due ${dueText(due)}`, urgent: due.late || due.soon };
}
