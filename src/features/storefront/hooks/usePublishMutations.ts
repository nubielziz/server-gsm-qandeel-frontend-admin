// The Publish tab's writes: start a run, change one row or many rows of a draft, publish, stop and the run switch. Each answer that
// is a run is put in the run's cache entry at once, so the page paints the new state before the next read. A refusal is left to the
// screen that asked, which shows the server's words in its error slot (a field under its field, a 409 in the slot), never a toast.
import { useQueryClient } from '@tanstack/react-query';
import type { Id } from '@/lib/api';
import { useApiMutation } from '@/lib/query';
import {
  applyPublishRun,
  bulkUpdatePublishItems,
  cancelPublishRun,
  createPublishRun,
  setPublishRunListed,
  updatePublishItem,
} from '../api';
import type {
  ApplyPublishRunBody,
  BulkPublishItemsBody,
  CreatePublishRunBody,
  PublishRun,
  SetPublishRunListedBody,
  UpdatePublishItemBody,
} from '../types';
import { PUBLISH_ITEMS_KEY, PUBLISH_RUNS_KEY, publishRunKey } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** Puts a run the server just answered into its cache entry and makes the history stale. */
function useRunCache() {
  const queryClient = useQueryClient();
  return (run: PublishRun) => {
    queryClient.setQueryData(publishRunKey(run.id), run);
    void queryClient.invalidateQueries({ queryKey: PUBLISH_RUNS_KEY });
    void queryClient.invalidateQueries({ queryKey: PUBLISH_ITEMS_KEY });
  };
}

/** Makes the page read a run again (after a 409 that says the run is not what the page thought). */
export function useRereadPublishRun() {
  const queryClient = useQueryClient();
  return (id: Id) => void queryClient.invalidateQueries({ queryKey: publishRunKey(id) });
}

/** Starts a run (a preview). The answer is the run, `preparing`; the server prepares the rows in the background. */
export function useCreatePublishRun() {
  const put = useRunCache();
  return useApiMutation({
    mutationFn: (body: CreatePublishRunBody) => createPublishRun(body),
    onSuccess: put,
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Changes one row of a draft; the answer is the row worked out again. The run's counts change with it, so the run is read again. */
export function useUpdatePublishItem(runId: Id) {
  return useApiMutation({
    mutationFn: ({ itemId, body }: { itemId: Id; body: UpdatePublishItemBody }) =>
      updatePublishItem(runId, itemId, body),
    invalidateKeys: [PUBLISH_ITEMS_KEY, publishRunKey(runId)],
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Changes many rows of a draft: the rows by id or by filter, and what to set. The run is read again for its counts. */
export function useBulkPublishItems(runId: Id) {
  return useApiMutation({
    mutationFn: (body: BulkPublishItemsBody) => bulkUpdatePublishItems(runId, body),
    invalidateKeys: [PUBLISH_ITEMS_KEY, publishRunKey(runId)],
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Publishes a draft's included rows, or continues a run that stopped. The answer is the run, `queued`. */
export function useApplyPublishRun() {
  const put = useRunCache();
  return useApiMutation({
    mutationFn: ({ id, body }: { id: Id; body: ApplyPublishRunBody }) => applyPublishRun(id, body),
    onSuccess: put,
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Discards a draft, or stops a run that is preparing, queued or running. The answer is the run, `cancelled`. */
export function useCancelPublishRun() {
  const put = useRunCache();
  return useApiMutation({
    mutationFn: (id: Id) => cancelPublishRun(id),
    onSuccess: put,
    errorNotification: NO_ERROR_TOAST,
  });
}

/** The run switch: takes what the run published off the shop, or puts it back. The answer is the run with its switch `queued`. */
export function useSetPublishRunListed() {
  const put = useRunCache();
  return useApiMutation({
    mutationFn: ({ id, body }: { id: Id; body: SetPublishRunListedBody }) => setPublishRunListed(id, body),
    onSuccess: put,
    errorNotification: NO_ERROR_TOAST,
  });
}
