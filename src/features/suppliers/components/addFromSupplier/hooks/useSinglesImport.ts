// The import of the single-services path: the picked list goes 500 at a time with the status and group the person chose, and, when asked,
// each batch that created services starts one shop preview (a publish run) for exactly those services. Every batch's answer is kept, also when
// a later batch fails, and the run goes on where it stopped when the same list is sent again. A shop preview that could not be started can be
// asked for again. A failed call shows in the form, so nothing here toasts an error.
import { useMemo, useRef, useState } from 'react';
import { errorText } from '@/components/ui';
import { createPublishRun } from '@/features/storefront';
import { isApiError, type Id } from '@/lib/api';
import { importServices } from '../../../api';
import { useBatchedMutation } from '../../../hooks/useBatchedMutation';
import { NO_ERROR_TOAST, useImportRefresh } from '../../../hooks/useImportServices';
import { importToast } from '../../../lib/importPlan';
import {
  previewScope,
  retryKey,
  shopPlan,
  totalOf,
  withRetries,
  type BatchOutcome,
  type FailedShopLine,
  type RetriedLines,
  type ShopLine,
} from '../../../lib/singlesFlow';
import { importBody, type ImportChoice } from '../lib/addRules';

/**
 * Asks the server for the shop preview of the services a batch created. The publish run is a draft: nothing goes on the shop until a
 * person reviews it and confirms. A refusal is not thrown: the import of the batch is done, so the answer keeps it as a line, with the ids
 * so the preview can be asked for again.
 */
async function prepareForShop(ids: Id[]): Promise<ShopLine> {
  try {
    const run = await createPublishRun({ scope: previewScope(ids) });
    return { kind: 'started', runId: run.id, services: ids.length };
  } catch (failure) {
    return {
      kind: 'failed',
      services: ids.length,
      message: errorText(failure),
      serviceIds: ids,
      forbidden: isApiError(failure) && failure.status === 403,
    };
  }
}

/** Imports one batch, then (with the choice on) starts the shop preview of what it created. */
async function importBatch(
  supplierId: Id,
  batch: Id[],
  choice: ImportChoice,
  wantShop: boolean,
): Promise<BatchOutcome> {
  const result = await importServices(supplierId, importBody(batch, choice));
  const plan = shopPlan(wantShop, result);
  const shop: ShopLine = plan.kind === 'prepare' ? await prepareForShop(plan.ids) : plan;
  return { sent: batch.length, result, shop };
}

/**
 * Imports the services, 500 at a time. `choice` and `wantShop` are read when a batch goes out; the form keeps them fixed while a run waits
 * to be continued. `answers` holds the outcome of every batch the server answered for the current list, so a failed batch loses nothing of
 * the ones before it; `keep()` moves them to `earlier` (another list is about to be sent) and `earlier` stays for the life of the form.
 * `retryShop(line)` asks again for the shop preview of a failed line, in `answers` and `earlier` alike. One toast counts what the server did
 * over all calls; the services lists and this supplier's lists are made stale after the last call, or after a call that failed once some
 * had gone through.
 */
export function useSinglesImport(supplierId: Id, choice: ImportChoice, wantShop: boolean) {
  const refresh = useImportRefresh(supplierId);
  const batched = useBatchedMutation<Id, BatchOutcome, readonly BatchOutcome[]>({
    send: (batch) => importBatch(supplierId, batch, choice, wantShop),
    merge: (answers) => answers,
    ...refresh,
    successNotification: (outcomes) => importToast(totalOf(outcomes)),
    errorNotification: NO_ERROR_TOAST,
  });
  const [kept, setKept] = useState<readonly BatchOutcome[]>([]);
  const [retried, setRetried] = useState<RetriedLines>({});
  const [retrying, setRetrying] = useState<string | null>(null);
  // A second press before the first answer must not make a second publish run.
  const asking = useRef(false);
  const { answers: raw, reset } = batched;
  const answers = useMemo(() => withRetries(raw, retried), [raw, retried]);
  const earlier = useMemo(() => withRetries(kept, retried), [kept, retried]);

  return {
    ...batched,
    answers,
    earlier,
    /** The key of the failed line whose preview is being asked for now, or null. */
    retrying,
    /** Asks the server again for the shop preview of a failed line; the line becomes the new answer (a run or a new refusal). */
    async retryShop(line: FailedShopLine): Promise<void> {
      if (asking.current) return;
      asking.current = true;
      const key = retryKey(line);
      setRetrying(key);
      try {
        const again = await prepareForShop(line.serviceIds);
        setRetried((before) => ({ ...before, [key]: again }));
      } finally {
        asking.current = false;
        setRetrying(null);
      }
    },
    /** Keeps the answers of the run that is on screen as `earlier` and forgets the run (another list is to be sent). */
    keep() {
      setKept((before) => [...before, ...raw]);
      reset();
    },
    /** Forgets the run and everything kept (another supplier was chosen): the result area is empty again. */
    forget() {
      setKept([]);
      setRetried({});
      reset();
    },
  };
}
