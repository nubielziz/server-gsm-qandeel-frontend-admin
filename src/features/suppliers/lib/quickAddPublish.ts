// Quick add's "Also put them on the shop" (feature 31): when the tick box is locked and why, what a refusal on `publish` means,
// and the line step 3 shows about the publish run Quick add hands over to. Pure, so the components only show what these
// return. The console computes no price, title or slug: every figure here is the publish run's own count (M92).
import type { PublishRun } from '@/features/storefront';
import { isApiError } from '@/lib/api';
import { num } from '@/lib/format';
import type { QuickAddRun, QuickAddServiceStatus } from '../types';
import { isLive } from './quickAdd';

/** How often step 3 asks for the publish run while it is preparing, queued or running (or not there yet). */
export const PUBLISH_POLL_MS = 5000;

/** How long after the Quick add run ended a missing publish run is still "preparing"; later it was not prepared. */
export const PUBLISH_WAIT_MS = 120_000;

/** The hint under the tick box (the plan's words). */
export const PUBLISH_HINT =
  'Each gets a clean title and a price from the retail pricing rules. The ones that need a look wait in Product / Services, Shop Publish.';

/** Why the tick box is locked for services added switched off: the server's own words for `needs_active`. */
export const PUBLISH_SWITCHED_OFF = 'Services added switched off cannot go on the shop.';

/** Why the tick box is locked for a role that cannot publish (the title style of every other locked control). */
export const PUBLISH_NEEDS_PERMISSION = 'You need the storefront:publish permission';

/**
 * The reason the tick box cannot be used, or `undefined` when it can. "Switched off" is checked first: a disabled service cannot
 * be listed, whoever asks. The server checks the permission and the status again (a hint only here).
 */
export function publishLock(serviceStatus: QuickAddServiceStatus, canPublish: boolean): string | undefined {
  if (serviceStatus === 'disabled') return PUBLISH_SWITCHED_OFF;
  return canPublish ? undefined : PUBLISH_NEEDS_PERMISSION;
}

/**
 * Whether a refused start is the server saying no pricing rule is active (`422`, field `publish`, code `no_rule`). The client
 * keeps the message of a field error, not its code, and the console never sends `publish` for switched off services (the
 * only other refusal of that field, `needs_active`), so any refusal on `publish` is this one.
 */
export function isNoRuleRefusal(failure: unknown): boolean {
  return (
    isApiError(failure) &&
    failure.status === 422 &&
    (failure.code === 'no_rule' || failure.fieldErrors.publish !== undefined)
  );
}

/** Whether step 3 has a publish run to tell about: the Quick add run asked for it, ended, and made something to publish. */
export function wantsPublishLine(run: Pick<QuickAddRun, 'status' | 'publish' | 'created'>): boolean {
  return !isLive(run) && run.publish !== 'none' && run.created > 0;
}

/** When the Quick add run ended, in milliseconds; the hand-over starts from then. */
function endedAt(run: Pick<QuickAddRun, 'createdAt' | 'startedAt' | 'finishedAt'>): number {
  return Date.parse(run.finishedAt ?? run.startedAt ?? run.createdAt);
}

/** What step 3 says about the publish run: still being made, not made, or the run itself with the words about it. */
export type PublishLine =
  { kind: 'preparing' } | { kind: 'missing' } | { kind: 'run'; run: PublishRun; text: string };

/** "12 on the shop, 3 need a look": the left-out part is dropped when nothing waits. */
function shopText(published: number, waiting: number, where: string): string {
  const head = `${num(published)} ${where}`;
  return waiting > 0 ? `${head}, ${num(waiting)} need a look` : head;
}

/**
 * The words of step 3 for the newest publish run of a Quick add run. `readAt` is when the answer was read: no run within two
 * minutes of the end is still "preparing"; later (or a run that failed before its preview was ready) it was not prepared, and the
 * button offers to prepare it. Every count is the run's own.
 */
export function publishLine(
  quick: Pick<QuickAddRun, 'createdAt' | 'startedAt' | 'finishedAt'>,
  run: PublishRun | undefined,
  readAt: number,
): PublishLine {
  if (run === undefined)
    return readAt - endedAt(quick) >= PUBLISH_WAIT_MS ? { kind: 'missing' } : { kind: 'preparing' };
  if (run.status === 'failed' && run.preparedAt === null) return { kind: 'missing' };
  if (run.status === 'preparing') return { kind: 'preparing' };
  const { published } = run.counts;
  const waiting = Math.max(0, run.total - published);
  const where = run.listed ? 'on the shop' : 'created switched off';
  switch (run.status) {
    case 'draft':
      return { kind: 'run', run, text: `nothing went on the shop yet, ${num(run.total)} need a look` };
    case 'queued':
      return { kind: 'run', run, text: 'waiting to start' };
    case 'running':
      return { kind: 'run', run, text: `${num(published)} ${where} so far` };
    case 'succeeded':
      return run.switch.status === 'done' && run.switch.listed === false
        ? { kind: 'run', run, text: shopText(published, waiting, 'switched off the shop') }
        : { kind: 'run', run, text: shopText(published, waiting, where) };
    default:
      return { kind: 'run', run, text: `stopped, ${shopText(published, waiting, where)}` };
  }
}

/**
 * How long the query waits before it asks again: every 5 seconds while the run is preparing, queued or running, or not there yet
 * and the two minutes have not passed; `false` once it is over. The answer's own read time is the clock, so no timer is needed.
 */
export function publishPollDelay(
  quick: Pick<QuickAddRun, 'createdAt' | 'startedAt' | 'finishedAt'>,
  run: PublishRun | undefined,
  readAt: number,
): number | false {
  if (run === undefined) return readAt - endedAt(quick) >= PUBLISH_WAIT_MS ? false : PUBLISH_POLL_MS;
  return run.status === 'preparing' || run.status === 'queued' || run.status === 'running'
    ? PUBLISH_POLL_MS
    : false;
}
