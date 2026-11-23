// The import of the Add flow's single-services path: the picked list goes 500 at a time, and, when asked, each batch that created
// services starts one shop preview (a publish run) for exactly those services. Every batch's answer is kept, also when a later
// batch fails, and after the person went Back from a stopped run. A shop preview that could not be started can be asked for again.
// A failed call shows in the dialog, so nothing here toasts an error.
import { useMemo, useRef, useState } from 'react';
import { createPublishRun } from '@/features/storefront';
import { isApiError, type Id } from '@/lib/api';
import { errorText } from '@/components/ui';
import { importServices } from '../api';
import { importToast } from '../lib/importPlan';
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
} from '../lib/singlesFlow';
import { NO_ERROR_TOAST, useImportRefresh } from './useImportServices';
import { useBatchedMutation } from './useBatchedMutation';

/**
 * Asks the server for the shop preview of the services a batch created. The publish run is a draft: nothing goes on the shop until
 * a person reviews it and confirms. A refusal is not thrown: the import of the batch is done, so the answer keeps it as a line, with
 * the ids so the preview can be asked for again.
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

/** Imports one batch, then (with the switch on) starts the shop preview of what it created. */
async function importBatch(supplierId: Id, batch: Id[], wantShop: boolean): Promise<BatchOutcome> {
  const result = await importServices(supplierId, { supplierServiceIds: batch });
  const plan = shopPlan(wantShop, result);
  const shop: ShopLine = plan.kind === 'prepare' ? await prepareForShop(plan.ids) : plan;
  return { sent: batch.length, result, shop };
}

/**
 * Imports the services, 500 at a time, for the Add flow. `wantShop` is read when a batch goes out (the dialog locks the switch once
 * the run has begun). `answers` holds the outcome of every batch the server answered, so a failed batch loses nothing of the
 * ones before it. `keep()` moves them to `earlier` (the dialog goes Back to the picks after a stop) and starts the run over; `earlier`
 * stays for the whole life of the dialog. `retryShop(line)` asks again for the shop preview of a failed line, in answers and in
 * earlier alike. One toast counts what the server did over all calls; the Catalog table and this supplier's lists are made stale
 * after the last call, or after a call that failed once some had gone through.
 */
export function useSinglesImport(supplierId: Id, wantShop: boolean) {
  const refresh = useImportRefresh(supplierId);
  const batched = useBatchedMutation<Id, BatchOutcome, readonly BatchOutcome[]>({
    send: (batch) => importBatch(supplierId, batch, wantShop),
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
    /** Keeps the answers of the run that stopped as `earlier` and forgets the run (the list is to be made again). */
    keep() {
      setKept((before) => [...before, ...raw]);
      reset();
    },
  };
}
