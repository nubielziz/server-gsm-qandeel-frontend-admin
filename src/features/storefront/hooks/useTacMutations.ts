// The actions on the TAC catalogue. The demo's table was read-only seed data; the map gives create and edit. The dialog shows
// a refusal (for example a prefix that is already there) under the field it names.
import { toast } from '@/components/ui';
import { useApiMutation } from '@/lib/query';
import { createTacEntry, updateTacEntry } from '../api';
import type { CreateTacBody, TacEntry, UpdateTacBody } from '../types';
import { STOREFRONT_STALE_KEYS, staleResource } from './keys';

const NO_ERROR_TOAST = () => false as const;
const RESOURCE = 'tac-catalog';

/** Adds a TAC with its phone. */
export function useCreateTac() {
  return useApiMutation({
    mutationFn: (body: CreateTacBody) => createTacEntry(body),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (created) => {
      toast({
        kind: 'success',
        title: 'TAC added',
        body: `${created.tac}: ${created.brand} ${created.model}`,
        ttl: 2600,
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of an entry. */
export function useUpdateTac() {
  return useApiMutation({
    mutationFn: ({ entry, body }: { entry: TacEntry; body: UpdateTacBody }) => updateTacEntry(entry.id, body),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (updated) => {
      toast({
        kind: 'success',
        title: 'TAC saved',
        body: `${updated.tac}: ${updated.brand} ${updated.model}`,
        ttl: 2600,
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}
