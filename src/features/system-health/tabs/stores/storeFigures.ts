// Pure helpers of the Data stores tab (Postgres and Redis): what the meters, figures and lists print from the server's
// answer. Nothing here compares a value with a limit or decides a status: the server's states are only mapped to words,
// a meter tone and an order. No demo screen (docs/system-health-design.md, "Tabs").
import type { ReactNode } from 'react';
import type { MeterTone } from '@/components/ui';
import { compareStatus, formatBytes, sortProblemsFirst, type HealthStatus } from '../../lib';
import type { CheckStatus, Measure, MetricState } from '../../types';

/**
 * One small fact of a store card. `state` is what the card sorts and folds it by: the server's state of the number
 * (`unknown` when there is no number, see `figureState`), or null for a plain fact the server sends no state for (a
 * count, the size). `note` is a second muted line under the value.
 */
export interface Figure {
  key: string;
  label: string;
  state: MetricState | null;
  value: ReactNode;
  note?: ReactNode;
}

/**
 * The state a figure is sorted and folded by: the server's state, except that a measure with no number is `unknown`.
 * The contract allows `{ value: null, state: 'ok' }`; such a figure prints "No data", so it must not sort as fine or be
 * counted in "N figures OK". No data is never OK, whatever state came with it.
 */
export function figureState(measure: Pick<Measure, 'value' | 'state'>): MetricState {
  return measure.value === null ? 'unknown' : measure.state;
}

/**
 * The colour of a usage meter is the server's state of the usage, never a guess from the numbers: a healthy and a
 * missing reading are both neutral grey (no data is never green), a warning is amber, a critical reading is red.
 * The kit's meter would otherwise colour itself from the ratio, so callers always pass this tone.
 */
export function meterTone(state: MetricState): MeterTone {
  if (state === 'warn') return 'warn';
  if (state === 'crit') return 'crit';
  return 'neutral';
}

/** How full the bar is drawn: used out of the limit. No limit (or a limit of zero) draws an empty bar, never a full one. */
export function usageRatio(used: number, limit: number | null): number {
  if (limit === null || !Number.isFinite(limit) || limit <= 0 || !Number.isFinite(used)) return 0;
  return used / limit;
}

/**
 * Figures with a problem come first (critical, warning, no data), in the order the server's states give; the rest keep
 * the order they were written in, so a fine card always reads the same way. A plain fact counts as fine.
 */
export function problemsFirst<T extends Pick<Figure, 'state'>>(figures: readonly T[]): T[] {
  return sortProblemsFirst(figures, (figure) => figure.state ?? 'ok');
}

/**
 * Splits the figures of a card for its quiet line. While every figure is fine, nothing folds: the figures are what the card
 * is for. Once any measure is off (warning, critical or no data), the measures the server calls OK fold away so the eye
 * stays on the problem. A plain fact (a count, the size) has no server state, so it is never called fine and never folds.
 */
export function foldHealthy<T extends Pick<Figure, 'state'>>(
  figures: readonly T[],
): { shown: T[]; folded: T[] } {
  const problem = figures.some((figure) => figure.state !== null && figure.state !== 'ok');
  if (!problem) return { shown: [...figures], folded: [] };
  return {
    shown: figures.filter((figure) => figure.state !== 'ok'),
    folded: figures.filter((figure) => figure.state === 'ok'),
  };
}

/** The two store cards. */
export type StoreId = 'database' | 'cache';

/**
 * Which store card goes first. The worse status comes first (problems first); on a tie, or while either status is not
 * known yet (`null`), Postgres stays first so the cards do not jump about while the answers arrive.
 */
export function storeOrder(database: HealthStatus | null, cache: HealthStatus | null): StoreId[] {
  if (database !== null && cache !== null && compareStatus(cache, database) < 0) return ['cache', 'database'];
  return ['database', 'cache'];
}

/**
 * The status that decides a card's place: the server's status once the read answered, `unknown` when the read failed
 * without any answer (a card with a problem), and null while the first answer is still on its way.
 */
export function settledStatus(query: {
  data: { status: CheckStatus } | undefined;
  isError: boolean;
}): HealthStatus | null {
  if (query.data) return query.data.status;
  return query.isError ? 'unknown' : null;
}

/** True when the store itself says it cannot be read: an empty list from it is then no answer, and no all-clear. */
export function isUnreadable(status: CheckStatus): boolean {
  return status === 'down' || status === 'unknown';
}

/**
 * True for a bare count that says nothing: a zero from a store that is down or unknown. A server that cannot read the store
 * may fill in zeros, and a zero beside "No data" would read as a real zero. A count above zero is data and prints as sent.
 */
export function isUnreadZero(count: number, status: CheckStatus): boolean {
  return count === 0 && isUnreadable(status);
}

/**
 * The one quiet line for a list with nothing in it. A store that is up and sent no rows has none to show; a store that is
 * down or unknown could not be asked, so the line says that instead of looking like good news.
 */
export function emptyListNote(status: CheckStatus, noun: string): string {
  if (status === 'down') return `Postgres is down, so ${noun} cannot be read.`;
  if (status === 'unknown') return `The status of Postgres is unknown, so ${noun} cannot be read.`;
  return `No ${noun}.`;
}

/** Growth of the database per day: "+310 MB/day". Null (not measured yet) prints "No growth data", never zero. */
export function growthText(bytesPerDay: number | null): string {
  if (bytesPerDay === null || !Number.isFinite(bytesPerDay)) return 'No growth data';
  return `${bytesPerDay > 0 ? '+' : ''}${formatBytes(bytesPerDay)}/day`;
}

/** The transactions open longest first. The server's order is not promised, and the longest one is the one to look at. */
export function longestFirst<T extends { durationSeconds: number }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => b.durationSeconds - a.durationSeconds);
}

/** "idle in transaction" -> "Idle in transaction": Postgres sends its states in lower case, the console writes sentences. */
export function sentenceCase(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
