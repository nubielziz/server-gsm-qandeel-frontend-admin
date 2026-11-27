// The one "On the shop" switch of a service row. A shop page is switched on or off. A service without one goes on the shop through a run of
// that one service, read until its preview is ready and applied ONLY when the server says its row is ready, then read until it ends; any
// other answer discards the draft and tells the server's reason with the next step. A run whose apply was sent is never cancelled, and one
// that is still working after the wait is told as news, not as a refusal. The console decides nothing.
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast, type ToastAction } from '@/components/ui';
import {
  applyPublishRun,
  cancelPublishRun,
  createPublishRun,
  getPublishRun,
  listPublishItems,
  storefrontPricingPath,
  storefrontPublishPath,
  updateListing,
  type PublishRun,
} from '@/features/storefront';
import { isApiError, type Id } from '@/lib/api';
import { outcomeOf, readinessOf, refusalSentence, serverWords, type ShopRefusal } from '../lib/shopSwitch';
import type { Service } from '../types';
import { useServicesRefresh } from './useServicesRefresh';

/**
 * How the run is read while the server works on it: `pollMs` apart, `maxReads` times (about a minute). A run still working after
 * that is not a refusal: the switch says so and keeps reading `slowPollMs` apart, `slowMaxReads` times (about ten minutes), so a
 * busy worker does not leave the row stale. One object so a test can shorten the waits.
 */
export const SHOP_SWITCH_WAIT = { pollMs: 1000, maxReads: 60, slowPollMs: 5000, slowMaxReads: 120 };

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Reads the run until `done` holds or the reads run out; answers the last run read. `slowly` is the pace after the first wait. */
async function readUntil(id: Id, done: (run: PublishRun) => boolean, slowly = false): Promise<PublishRun> {
  const pollMs = slowly ? SHOP_SWITCH_WAIT.slowPollMs : SHOP_SWITCH_WAIT.pollMs;
  const maxReads = slowly ? SHOP_SWITCH_WAIT.slowMaxReads : SHOP_SWITCH_WAIT.maxReads;
  let run = await getPublishRun(id);
  for (let reads = 1; !done(run) && reads < maxReads; reads += 1) {
    await sleep(pollMs);
    run = await getPublishRun(id);
  }
  return run;
}

/** True when the server refused the call (a 4xx): nothing was done. Any other failure (no answer, a 5xx) may have been done. */
const wasRefused = (error: unknown) => isApiError(error) && error.status >= 400 && error.status < 500;

/** Discards a draft the switch made; a failure here changes nothing the staff member needs to know (the draft stays in history). */
async function discard(id: Id): Promise<void> {
  try {
    await cancelPublishRun(id);
  } catch {
    // Left as a draft: the run history shows it with Discard.
  }
}

const isLive = (run: PublishRun) => run.status === 'queued' || run.status === 'running';

/**
 * `toggle(service, on)` runs the switch of one row; `isBusy(id)` says that row is working (its switch must wait). A second press on a
 * busy row does nothing. Every end (published, not ready, refused, failed) is told in a toast with the server's words, and the table
 * and the record of that service (an open edit view reads it) are refreshed once.
 */
export function usePutOnShop() {
  const navigate = useNavigate();
  const refresh = useServicesRefresh();
  // The ref answers a double press at once; the state draws the busy rows.
  const working = useRef(new Set<Id>());
  const [busy, setBusy] = useState<ReadonlySet<Id>>(() => new Set());

  const mark = useCallback((id: Id, on: boolean) => {
    if (on) working.current.add(id);
    else working.current.delete(id);
    setBusy(new Set(working.current));
  }, []);

  const openRun = useCallback(
    (runId: Id): ToastAction => ({
      label: 'Open the run',
      run: () => void navigate(storefrontPublishPath(runId)),
    }),
    [navigate],
  );

  /**
   * A draft the switch discarded is no place to go (it only says "This preview was discarded"). Its step starts a new draft from the
   * same rows ("Review the rest" of that run) and opens that one, where the price or the name can be changed.
   */
  const reviewRun = useCallback(
    (discardedId: Id): ToastAction => ({
      label: 'Open the run',
      run: () => {
        createPublishRun({ scope: { kind: 'run', runId: discardedId } }).then(
          (made) => void navigate(storefrontPublishPath(made.id)),
          (error: unknown) =>
            toast({
              kind: 'error',
              title: 'Could not prepare the preview',
              body: serverWords(error),
              ttl: 8000,
            }),
        );
      },
    }),
    [navigate],
  );

  /** `discarded`: the run is the draft the switch cancelled, so a step into "the run" opens a new draft instead. */
  const stepOf = useCallback(
    (refusal: ShopRefusal, runId: Id, discarded = false): ToastAction | undefined => {
      if (refusal.next === 'rules') {
        return { label: 'Make a shop price rule', run: () => void navigate(storefrontPricingPath()) };
      }
      if (refusal.next === 'run') return discarded ? reviewRun(runId) : openRun(runId);
      return undefined;
    },
    [navigate, openRun, reviewRun],
  );

  const refused = useCallback(
    (service: Service, refusal: ShopRefusal, runId: Id, discarded = false) =>
      toast({
        kind: 'error',
        title: `${service.name} was not put on the shop`,
        body: refusalSentence(refusal),
        action: stepOf(refusal, runId, discarded),
        ttl: 12_000,
      }),
    [stepOf],
  );

  /** A service with a shop page: switch the page on or off (`PATCH /admin/service-listings/:id`). */
  const setListed = useCallback(async (service: Service, listingId: Id, on: boolean) => {
    try {
      await updateListing(listingId, { isListed: on });
      toast({
        kind: 'success',
        title: on ? `${service.name} is on the shop` : `${service.name} is off the shop`,
        ttl: 3200,
      });
    } catch (error) {
      toast({
        kind: 'error',
        title: on
          ? `Could not put ${service.name} on the shop`
          : `Could not take ${service.name} off the shop`,
        body: serverWords(error),
      });
    }
  }, []);

  /** A service without a shop page: one run of that service, applied only when its row is ready. */
  const publish = useCallback(
    async (service: Service) => {
      let run: PublishRun | null = null;
      // True from the moment the apply is sent: the run is then the server's to finish and the switch never cancels it.
      let applied = false;
      try {
        run = await createPublishRun({ scope: { kind: 'services', serviceIds: [service.id] } });
        run = await readUntil(run.id, (read) => read.status !== 'preparing');
        if (run.status === 'preparing') {
          await discard(run.id);
          refused(service, { why: 'the preview took too long', fix: 'Try again later.', next: null }, run.id);
          return;
        }
        if (run.status !== 'draft') {
          const why = run.error ?? 'the preview could not be prepared';
          refused(service, { why, fix: 'Open the run to see it.', next: 'run' }, run.id);
          return;
        }
        const [item] = (await listPublishItems(run.id, { start: 0, end: 1 })).data;
        const readiness = readinessOf(item);
        if (readiness !== 'ready') {
          await discard(run.id);
          refused(service, readiness, run.id, true);
          return;
        }
        applied = true;
        try {
          run = await applyPublishRun(run.id, {});
        } catch (error) {
          if (wasRefused(error)) {
            applied = false; // the server did nothing: the draft is discarded below
            throw error;
          }
          // The answer was lost (no reply, a 502): the apply may have reached the server. Read the run to learn what happened; a run
          // that is still a draft was not applied, and a person decides from its page.
          const read = await getPublishRun(run.id);
          if (read.status === 'draft') throw error;
          run = read;
        }
        run = await readUntil(run.id, (read) => !isLive(read));
        if (isLive(run)) {
          // A busy worker, not a refusal: tell it, keep reading at a slower pace, and let the row follow the run.
          toast({
            kind: 'info',
            title: `${service.name} is still being published`,
            body: 'The server is busy. The shop switch updates when the run ends.',
            action: openRun(run.id),
            ttl: 10_000,
          });
          run = await readUntil(run.id, (read) => !isLive(read), true);
          if (isLive(run)) return; // the run page follows it from here
        }
        const [done] = (await listPublishItems(run.id, { start: 0, end: 1 })).data;
        const outcome = outcomeOf(run, done);
        if (outcome === 'published') {
          toast({
            kind: 'success',
            title: `${service.name} is on the shop`,
            body: 'Its shop page was made with the server’s defaults.',
            ttl: 4000,
          });
        } else refused(service, outcome, run.id);
      } catch (error) {
        // A draft the switch made is not left behind; a run that was applied is the server's to finish.
        if (run && !applied && (run.status === 'preparing' || run.status === 'draft')) await discard(run.id);
        toast({
          kind: 'error',
          title: `Could not put ${service.name} on the shop`,
          body: serverWords(error),
          action: run && applied ? stepOf({ why: '', fix: '', next: 'run' }, run.id) : undefined,
          ttl: 8000,
        });
      }
    },
    [refused, stepOf, openRun],
  );

  const toggle = useCallback(
    (service: Service, on: boolean) => {
      if (working.current.has(service.id)) return;
      const listingId = service.listingId ?? null;
      if (listingId === null && !on) return;
      mark(service.id, true);
      const work = listingId === null ? publish(service) : setListed(service, listingId, on);
      void work.finally(() => {
        mark(service.id, false);
        // The record of this service is made stale too: the edit view that holds it open shows the new state of the switch.
        void refresh([service.id]);
      });
    },
    [mark, publish, setListed, refresh],
  );

  const isBusy = useCallback((id: Id) => busy.has(id), [busy]);
  return { toggle, isBusy };
}
