// What the Publish tab says about a run: whether it is working, the words of its status, its progress line, the headline of a
// finished run and what each scope means. Pure, so the components only show what these return. Every figure is the server's
// (`counts`, `switch`); nothing here works out a price.
import { errorText, type BadgeTone, type IconName } from '@/components/ui';
import type { ServiceType } from '@/features/orders';
import { isApiError } from '@/lib/api';
import { num } from '@/lib/format';
import type { PublishRun, PublishScope } from '../types';

/** How often the page asks for a run while it is preparing, queued or running (or its switch is). */
export const RUN_POLL_MS = 1500;

/** Above this many included services the confirm dialog asks for a tick box first (Quick add's rule). */
export const CONFIRM_ABOVE = 500;

/** A margin under this many percent is drawn in amber: the rule of the listings table (the figure itself is the server's). */
export const THIN_MARGIN_PCT = 15;

/**
 * The service types that can be on the shop: a `file` service cannot be ordered online (it is refused at checkout), so the Add
 * listing dialog's search does not offer it. IMEI, server and remote services can be published (backend plan 3.1, owner question 2).
 */
export const SHOP_SERVICE_TYPES: readonly ServiceType[] = ['imei', 'server', 'remote'];

/** What the Add listing dialog's Service field says about which services are offered. */
export const SHOP_TYPES_HINT = 'Only active IMEI, server and remote services are sold to the public.';

/** "1 service", "12 services". */
export function servicesText(count: number): string {
  return `${num(count)} ${count === 1 ? 'service' : 'services'}`;
}

/** Whether the server is still working on the run itself: preparing the preview, or publishing. */
export function isRunLive(run: Pick<PublishRun, 'status'> | undefined): boolean {
  return run?.status === 'preparing' || run?.status === 'queued' || run?.status === 'running';
}

/** Whether a run switch (taking the run off the shop, or putting it back) is queued or running. */
export function isSwitchLive(run: Pick<PublishRun, 'switch'> | undefined): boolean {
  return run?.switch.status === 'queued' || run?.switch.status === 'running';
}

/** Whether the page must read the run again soon: the run or its switch is working. */
export function isWorking(run: PublishRun | undefined): boolean {
  return isRunLive(run) || isSwitchLive(run);
}

/** Whether a run is over: it has a result page (succeeded, failed or cancelled). */
export function isFinished(run: Pick<PublishRun, 'status'>): boolean {
  return run.status === 'succeeded' || run.status === 'failed' || run.status === 'cancelled';
}

/** The words and mark of a status, for the history table and the run's header. */
export type StatusWords = { tone: BadgeTone; icon: IconName; label: string };

/**
 * A succeeded run reads "Done"; one created switched off says so, as its headline does. While a switch is queued, running or
 * failed the server already holds its target in `listed`, so the words stay plain "Done" until the switch has finished.
 */
export function statusWords(run: Pick<PublishRun, 'status' | 'listed' | 'switch'>): StatusWords {
  switch (run.status) {
    case 'preparing':
      return { tone: 'neutral', icon: 'loader', label: 'Preparing' };
    case 'draft':
      return { tone: 'accent', icon: 'edit', label: 'Draft' };
    case 'queued':
      return { tone: 'neutral', icon: 'clock', label: 'Waiting to start' };
    case 'running':
      return { tone: 'neutral', icon: 'loader', label: 'Publishing' };
    case 'succeeded':
      return run.listed ||
        run.switch.listed === true ||
        (run.switch.status !== null && run.switch.status !== 'done')
        ? { tone: 'good', icon: 'checkCircle', label: 'Done' }
        : { tone: 'good', icon: 'checkCircle', label: 'Done, switched off' };
    case 'failed':
      return { tone: 'crit', icon: 'xCircle', label: 'Failed' };
    case 'cancelled':
      return { tone: 'neutral', icon: 'ban', label: 'Cancelled' };
  }
}

/** The services of the scope in words, for the history table. A category or a supplier is named by its number: a run keeps no names. */
export function scopeText(scope: PublishScope): string {
  switch (scope.kind) {
    case 'all':
      return 'Everything not on the shop yet';
    case 'category':
      return `Category ${scope.categoryId}`;
    case 'supplier':
      return `Supplier ${scope.supplierId}`;
    case 'services':
      return `${servicesText(scope.serviceIds.length)} picked`;
    case 'quickAddRun':
      return `What Quick add ${scope.runId} made`;
    case 'run':
      return `Run ${scope.runId} again`;
  }
}

/** How many services of the run are done, of the ones it is publishing (the left-out rows are not counted). */
export function publishedProgress(run: Pick<PublishRun, 'counts'>): { done: number; of: number } {
  const of = run.counts.included;
  return { done: Math.min(of, Math.max(0, of - run.counts.pending)), of };
}

/** The meter's fill, 0 to 1. */
export function progressRatio(run: Pick<PublishRun, 'counts'>): number {
  const { done, of } = publishedProgress(run);
  return of > 0 ? done / of : 0;
}

/** "12 of 40 services, 10 on the shop". */
export function progressLine(run: Pick<PublishRun, 'counts' | 'listed'>): string {
  const { done, of } = publishedProgress(run);
  const where = run.listed ? 'on the shop' : 'created';
  return `${num(done)} of ${servicesText(of)}, ${num(run.counts.published)} ${where}`;
}

/**
 * The headline of a finished (or stopped) run. A run applied switched off never says "on the shop": it says the services were
 * created switched off, and a run that was taken off the shop says it was. While a switch is queued, running or failed the
 * listings are part way (the server already holds the switch's target in `listed`), so the headline only says what the run
 * published; the switch's own line says how far it is.
 */
export function headline(run: Pick<PublishRun, 'listed' | 'switch' | 'counts'>): string {
  const count = servicesText(run.counts.published);
  const one = run.counts.published === 1;
  if (run.counts.published === 0) return 'Nothing was published';
  if (run.switch.status !== null && run.switch.status !== 'done')
    return `${count} ${one ? 'was' : 'were'} published`;
  if (run.switch.status === 'done' && run.switch.listed === false) {
    return `${count} ${one ? 'was' : 'were'} switched off the shop`;
  }
  if (!run.listed) return `${count} ${one ? 'was' : 'were'} created switched off`;
  return `${count} ${one ? 'is' : 'are'} on the shop`;
}

/** How many rows of a finished run have no `published` result: what "Review the rest" would take. */
export function leftOutCount(run: Pick<PublishRun, 'total' | 'counts'>): number {
  return Math.max(0, run.total - run.counts.published);
}

/** The line under the headline: "3 left out, 1 refused". Nothing for a run with neither. */
export function countsLine(run: Pick<PublishRun, 'counts'>): string {
  const { published, skipped, refused } = run.counts;
  return [`${num(published)} published`, `${num(skipped)} left out`, `${num(refused)} refused`].join(', ');
}

/** What a refused request says: the first field message the server gave (the `scope` one for nothing to publish), else its text. */
export function refusalText(failure: unknown): string {
  if (isApiError(failure)) {
    const message = Object.values(failure.fieldErrors).flat()[0];
    if (message) return message;
  }
  return errorText(failure);
}

/** Whether a failure is the server saying the run is already being worked on (409 `JOB_ALREADY_RUNNING`). */
export function isAlreadyRunning(failure: unknown): boolean {
  return isApiError(failure) && failure.code === 'JOB_ALREADY_RUNNING';
}

/** Whether a failure is a 409: the run is not in the state the call needs (no longer a draft, still working), so the page reads it again. */
export function isConflict(failure: unknown): boolean {
  return isApiError(failure) && failure.status === 409;
}

/** The server's stalled-run error ends with this hint already; the page does not repeat it. */
export const CONTINUE_HINT = 'Start it again: it continues with what is left.';
