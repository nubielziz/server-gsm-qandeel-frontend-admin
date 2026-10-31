// The status filter of the Alerts view: its five choices, how a choice becomes the server's filter, and how the two reads
// behind "Open" (firing and acknowledged) become one list, most severe first. Pure functions, no demo page.
import type { SegmentItem } from '@/components/ui';
import type { ListResult } from '@/lib/api';
import type { AlertEvent, AlertFilters } from '../../types';

/** `open` is firing plus acknowledged: what the verdict counts as open. The server filters by one status at a time. */
export type AlertChoice = 'open' | 'firing' | 'acknowledged' | 'resolved' | 'all';

/** The choice shown when the address names none; it leaves no `?status=`. */
export const DEFAULT_ALERT_CHOICE: AlertChoice = 'open';

/** The segments of the filter. The brief's four, with "Open" first because it is the default. */
export const ALERT_CHOICES: readonly SegmentItem<AlertChoice>[] = [
  { value: 'open', label: 'Open' },
  { value: 'firing', label: 'Firing' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
];

/** `?status=` as a choice. Missing or unknown text is the default. */
export function parseAlertChoice(raw: string | null): AlertChoice {
  return ALERT_CHOICES.find((choice) => choice.value === raw)?.value ?? DEFAULT_ALERT_CHOICE;
}

/** The server filter of a choice that is one read. `open` is two reads (see `mergeOpenAlerts`) and filters nothing here. */
export function singleFilter(choice: AlertChoice): AlertFilters {
  return choice === 'open' || choice === 'all' ? {} : { status: choice };
}

/** One page of alerts as the view shows it. `capped` is true when the server holds more rows than were read. */
export type AlertPage = ListResult<AlertEvent> & { capped: boolean };

// 0 is the worst. A severity the console does not know ranks between warning and info: a reason to look, not a pass.
const SEVERITY_RANK: Record<string, number> = { critical: 0, warning: 1, info: 3 };
const UNKNOWN_SEVERITY_RANK = 2;

/**
 * A copy of the alerts with the most severe first (problems first). It orders by the severity the server sent and decides
 * nothing; the sort is stable, so the server's newest-first order holds within a severity.
 */
function mostSevereFirst(alerts: readonly AlertEvent[]): AlertEvent[] {
  const rank = (alert: AlertEvent) =>
    Object.hasOwn(SEVERITY_RANK, alert.severity) ? SEVERITY_RANK[alert.severity] : UNKNOWN_SEVERITY_RANK;
  return [...alerts].sort((a, b) => rank(a) - rank(b));
}

/**
 * "Open" as one list: the firing alerts first (they still need someone), then the acknowledged ones. Within each group the
 * most severe come first (a critical alert is never below a warning), and within a severity the order is the server's,
 * newest first. `capped` says the first page of either read did not hold every row, so the view can point to the Firing and
 * Acknowledged filters, which page.
 */
export function mergeOpenAlerts(
  firing: ListResult<AlertEvent>,
  acknowledged: ListResult<AlertEvent>,
): AlertPage {
  return {
    data: [...mostSevereFirst(firing.data), ...mostSevereFirst(acknowledged.data)],
    total: firing.total + acknowledged.total,
    capped: firing.total > firing.data.length || acknowledged.total > acknowledged.data.length,
  };
}

/** True for the choices that list what is open now: with monitoring down, an empty one proves nothing. */
const reportsNow = (choice: AlertChoice) => choice === 'open' || choice === 'firing';

/**
 * The title of the empty state for a choice ("No open alerts"). While the rules cannot be checked (`blind`) an empty list of
 * what is open says "No alerts listed" instead: it must not read as an all clear.
 */
export function emptyTitle(choice: AlertChoice, blind = false): string {
  if (blind && reportsNow(choice)) return 'No alerts listed';
  return choice === 'all' ? 'No alerts yet' : `No ${choice} alerts`;
}

/** What the empty state says a list is for (or, while the rules cannot be checked, why it proves nothing). */
export function emptyText(choice: AlertChoice, blind = false): string {
  if (blind && reportsNow(choice)) {
    return 'Rules may not be checked while monitoring is down, so this is not a sign that all is well.';
  }
  switch (choice) {
    case 'open':
      return 'Alerts appear here when a rule fires, and stay until the value is back in range.';
    case 'firing':
      return 'Alerts that nobody has acknowledged yet appear here.';
    case 'acknowledged':
      return 'Alerts that someone is looking at appear here until they resolve.';
    case 'resolved':
      return 'Alerts close on their own when the value is back in range; they are listed here.';
    default:
      return 'Every alert a rule fires is listed here.';
  }
}
