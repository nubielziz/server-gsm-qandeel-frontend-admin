// The counts beside sidebar items (open orders, pending payments, held risk orders…). Ports the `badges` object
// of renderNav() in 90-app.js.

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

/**
 * Nothing is counted yet: the dashboard feature fills this in from `GET /admin/dashboard` (open orders and the ones
 * past SLA, pending payments, held risk orders…), so the numbers come from the server and not from rows the sidebar
 * would have to load itself. The shell already renders whatever this returns.
 */
export function useNavCounts(): NavCounts {
  return NO_COUNTS;
}
