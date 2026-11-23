// The bulk actions on ticked services that have no bulk route: one call per ticked service, one after the other, with one progress line,
// one toast and a summary of the refusals (the shared runner, MISMATCHES M23). Enable, Disable and Move to group change the service;
// Delete removes it (the server refuses a service that has orders); Take off the shop switches the shop page off; "Put on the shop" sends
// the services without a shop page to ONE publish run (a person confirms it) and switches switched-off shop pages back on one by one.
// The All view of the Product / Services page uses it for its "With selected" strip.
import { useCallback, useState } from 'react';
import { toast, type BulkSummary } from '@/components/ui';
import { summarizeOutcome, useSequentialRun, type SequentialOutcome } from '@/lib/bulk';
import { createPublishRun, updateListing } from '@/features/storefront';
import type { Id } from '@/lib/api';
import { deleteService, updateService } from '../api';
import { serverWords } from '../lib/shopSwitch';
import type { Service, ServiceCategory } from '../types';
import { useServicesRefresh } from './useServicesRefresh';

/** At most this many services go into one publish run (the server's limit). */
export const PUBLISH_RUN_CAP = 500;

const NAMING = { keyOf: (service: Service) => service.id, labelOf: (service: Service) => service.name };
const servicesText = (count: number) => `${count} ${count === 1 ? 'service' : 'services'}`;

/**
 * Which ticked services each action would change, from the row facts (the server still decides each one). `putBack` are the services
 * whose shop page is switched off, `publish` the ones that have no shop page; a row without the shop keys (a role that may not read
 * the shop) is in neither.
 */
export function bulkTargets(services: readonly Service[]) {
  return {
    enable: services.filter((service) => service.status === 'disabled'),
    disable: services.filter((service) => service.status === 'active'),
    takeOff: services.filter((service) => service.listingId != null && service.isListed === true),
    putBack: services.filter((service) => service.listingId != null && service.isListed === false),
    publish: services.filter((service) => service.listingId === null),
  };
}

/** What a finished action hands back: the summary when something was refused, and the run to open (Put on the shop). */
export type BulkResult = { summary: BulkSummary | null; runId: Id | null };

/** `progress` is set while a run goes; each action resolves with what the view shows next. */
export function useServicesBulk() {
  const refresh = useServicesRefresh();
  const { run, progress } = useSequentialRun<number>(refresh);
  const [starting, setStarting] = useState(false);

  /** Runs one single call per service and tells how it went: a toast, and the summary when some were refused. */
  const each = useCallback(
    async (
      verbs: { doing: string; done: string },
      targets: readonly Service[],
      step: (service: Service) => Promise<unknown>,
    ): Promise<BulkSummary | null> => {
      if (targets.length === 0) {
        toast({ kind: 'info', title: 'Nothing to change', body: 'None of the ticked services needs it.' });
        return null;
      }
      const byId = new Map(targets.map((service) => [service.id, service]));
      const outcome: SequentialOutcome<number> = await run(
        verbs.doing,
        targets.map((service) => service.id),
        (id) => step(byId.get(id) as Service),
      );
      toast(
        outcome.done > 0
          ? { kind: 'success', title: `${servicesText(outcome.done)} ${verbs.done}` }
          : { kind: 'error', title: `No service was ${verbs.done}`, body: outcome.failed[0]?.reason },
      );
      const summary = summarizeOutcome(verbs.done, targets, outcome, NAMING);
      return summary.failed.length > 0 ? summary : null;
    },
    [run],
  );

  const moveTo = useCallback(
    async (services: readonly Service[], category: ServiceCategory): Promise<BulkResult> => ({
      summary: await each(
        { doing: 'Moving', done: `moved to ${category.name}` },
        services.filter((service) => service.categoryId !== category.id),
        (service) => updateService(service.id, { categoryId: category.id }),
      ),
      runId: null,
    }),
    [each],
  );

  const enable = useCallback(
    async (services: readonly Service[]): Promise<BulkResult> => ({
      summary: await each({ doing: 'Enabling', done: 'enabled' }, bulkTargets(services).enable, (service) =>
        updateService(service.id, { status: 'active' }),
      ),
      runId: null,
    }),
    [each],
  );

  const disable = useCallback(
    async (services: readonly Service[]): Promise<BulkResult> => ({
      summary: await each(
        { doing: 'Disabling', done: 'disabled' },
        bulkTargets(services).disable,
        (service) => updateService(service.id, { status: 'disabled' }),
      ),
      runId: null,
    }),
    [each],
  );

  /** Deletes every ticked service; the server refuses the ones it still needs (for example a service with orders), and they are listed. */
  const remove = useCallback(
    async (services: readonly Service[]): Promise<BulkResult> => ({
      summary: await each({ doing: 'Deleting', done: 'deleted' }, services, (service) =>
        deleteService(service.id),
      ),
      runId: null,
    }),
    [each],
  );

  const takeOff = useCallback(
    async (services: readonly Service[]): Promise<BulkResult> => ({
      summary: await each(
        { doing: 'Taking off the shop', done: 'taken off the shop' },
        bulkTargets(services).takeOff,
        (service) => updateListing(service.listingId as Id, { isListed: false }),
      ),
      runId: null,
    }),
    [each],
  );

  /** Switched-off shop pages first (one by one), then one run for the services that have none; the run opens for a person to confirm. */
  const putOn = useCallback(
    async (services: readonly Service[]): Promise<BulkResult> => {
      const targets = bulkTargets(services);
      // With no switched-off page the publish run below is the only work, so `each` must not say "Nothing to change" beside it.
      const summary =
        targets.putBack.length === 0 && targets.publish.length > 0
          ? null
          : await each({ doing: 'Switching on', done: 'put back on the shop' }, targets.putBack, (service) =>
              updateListing(service.listingId as Id, { isListed: true }),
            );
      if (targets.publish.length === 0) return { summary, runId: null };
      setStarting(true);
      try {
        const ids = targets.publish.slice(0, PUBLISH_RUN_CAP).map((service) => service.id);
        const made = await createPublishRun({ scope: { kind: 'services', serviceIds: ids } });
        return { summary, runId: made.id };
      } catch (error) {
        toast({ kind: 'error', title: 'Could not prepare the preview', body: serverWords(error), ttl: 8000 });
        return { summary, runId: null };
      } finally {
        setStarting(false);
      }
    },
    [each],
  );

  return { moveTo, enable, disable, remove, takeOff, putOn, progress, starting };
}
