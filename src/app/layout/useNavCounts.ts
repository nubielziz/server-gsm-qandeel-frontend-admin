// The counts beside sidebar items (open orders, pending payments, held risk orders…). Ports the `badges` object
// of renderNav() in 90-app.js.
import { featureManifests } from '../features';

/** `count` is the neutral number chip; `late` adds the red dot when some of those items are past their deadline. */
export type NavCount = {
  count: number;
  late?: number;
  /** What the dot means, read by screen readers after the number ("past the reply target"). Default: "past SLA". */
  lateLabel?: string;
};

/** Counts by page id (`orders`, `finance`, `merchants`, `support`, `refunds`, `risk`). */
export type NavCounts = Partial<Record<string, NavCount>>;

const NO_COUNTS: NavCounts = {};
const noCounts = (): NavCounts => NO_COUNTS;

// The one feature that provides the counts (the dashboard, from `GET /admin/dashboard`), picked once at start-up so
// the hook below always calls the same hook.
const countsHook = featureManifests.find((manifest) => manifest.useNavCounts)?.useNavCounts ?? noCounts;

/**
 * The counts come from the server, not from rows the sidebar would have to load itself: the feature manifest that
 * declares `useNavCounts` answers them (open orders and the ones past SLA, pending payments, held risk orders…).
 * Without one, nothing is counted. The shell renders whatever this returns.
 */
export function useNavCounts(): NavCounts {
  return countsHook();
}
