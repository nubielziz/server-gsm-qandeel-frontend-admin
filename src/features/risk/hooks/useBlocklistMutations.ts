// Adding to and removing from the blocklist, with the toasts the demo showed. The dialogs show a failed call themselves
// (under the field the server named, or in the error slot), so neither of these toasts an error.
import { toast } from '@/components/ui';
import { useApiMutation } from '@/lib/query';
import { createBlocklistEntry, deleteBlocklistEntry } from '../api';
import { BLOCK_KIND_LABEL, labelOf } from '../lib/labels';
import type { BlocklistEntry, CreateBlocklistBody } from '../types';
import { BLOCK_COUNT_KEY } from './keys';

/** Adds an email, domain, IMEI or card. */
export function useCreateBlock() {
  return useApiMutation({
    mutationFn: (body: CreateBlocklistBody) => createBlocklistEntry(body),
    invalidates: [{ resource: 'blocklist' }],
    invalidateKeys: [BLOCK_COUNT_KEY],
    successNotification: (entry) => ({
      message: 'Added to the blocklist',
      description: `${labelOf(BLOCK_KIND_LABEL, entry.kind)} ${entry.display}`,
    }),
    errorNotification: () => false,
  });
}

/** Removes an entry: what it blocked can order again. */
export function useDeleteBlock() {
  return useApiMutation({
    mutationFn: (entry: BlocklistEntry) => deleteBlocklistEntry(entry.id),
    invalidates: [{ resource: 'blocklist' }],
    invalidateKeys: [BLOCK_COUNT_KEY],
    // The demo told this with a quiet "info" toast, which the success notifications cannot draw.
    onSuccess: () => {
      toast({ kind: 'info', title: 'Removed', ttl: 2200 });
    },
    errorNotification: () => false,
  });
}
