// What waits for a person on the Money Overview, as rows: deposits to review, refund requests to decide or retry, and card disputes that
// need evidence. Pure, so each rule is a test row; the panel only draws what `waitingFor` works out.
import { moneyPath, type MoneyViewId, type MoneyViewSpec } from '../../lib/moneyViews';
import type { MoneyCounts } from '../frame/moneyNav';

/** One queue with something in it: what it is, how many, and where it is worked. */
export type WaitingRow = {
  view: MoneyViewId;
  count: number;
  /** What the number counts ("deposits to review"). */
  text: string;
  /** The link text ("Open Deposits"). */
  link: string;
  to: string;
};

/**
 * What the panel shows: `none` when the role may use no queue (the panel is left out), `loading` while no count is known yet, `empty` when
 * the known counts are all zero, and `rows` with the queues that have something in them.
 */
export type Waiting = { state: 'none' | 'loading' | 'empty' } | { state: 'rows'; rows: WaitingRow[] };

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// The queues in the order they are shown, each with the view that works it and the words for its count.
const QUEUES: readonly {
  view: MoneyViewId;
  link: string;
  count: (counts: MoneyCounts) => number | undefined;
  text: (n: number) => string;
}[] = [
  {
    view: 'deposits',
    link: 'Open Deposits',
    count: (counts) => counts.deposits,
    text: (n) => plural(n, 'deposit to review', 'deposits to review'),
  },
  {
    view: 'refunds',
    link: 'Open Refunds',
    count: (counts) => counts.refunds,
    text: (n) => plural(n, 'refund to decide or retry', 'refunds to decide or retry'),
  },
  {
    view: 'disputes',
    link: 'Open Card disputes',
    count: (counts) => counts.disputes,
    text: (n) => plural(n, 'card dispute needs evidence', 'card disputes need evidence'),
  },
];

/** The queues the role may use, with what each holds. A count that is zero or unknown draws no row. */
export function waitingFor(usable: readonly MoneyViewSpec[], counts: MoneyCounts): Waiting {
  const mine = QUEUES.filter((queue) => usable.some((spec) => spec.id === queue.view));
  if (mine.length === 0) return { state: 'none' };
  const rows = mine.flatMap((queue) => {
    const count = queue.count(counts);
    return count
      ? [{ view: queue.view, count, text: queue.text(count), link: queue.link, to: moneyPath(queue.view) }]
      : [];
  });
  if (rows.length > 0) return { state: 'rows', rows };
  return mine.some((queue) => queue.count(counts) !== undefined) ? { state: 'empty' } : { state: 'loading' };
}
