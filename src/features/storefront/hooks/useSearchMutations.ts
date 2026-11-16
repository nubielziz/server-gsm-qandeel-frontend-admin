// The actions of the Search tab: synonym rules, pinned results, hidden popular terms and the index rebuild. Each one toasts the
// way the other storefront actions do and makes stale the reads it changes. A dialog shows a refusal under the field it
// names, so the dialog actions turn the default error toast off; the table's own switches keep it.
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui';
import { useApiMutation } from '@/lib/query';
import {
  createHiddenTerm,
  createSearchPin,
  createSearchSynonym,
  deleteHiddenTerm,
  deleteSearchPin,
  deleteSearchSynonym,
  rebuildSearchIndex,
  updateSearchPin,
  updateSearchSynonym,
} from '../api';
import { synonymText } from '../lib/search';
import type {
  CreateHiddenTermBody,
  CreatePinBody,
  CreateSynonymBody,
  HiddenTerm,
  SearchPin,
  SearchSynonym,
  UpdatePinBody,
  UpdateSynonymBody,
} from '../types';
import {
  SEARCH_INDEX_KEY,
  SEARCH_INDEX_STALE_KEYS,
  SEARCH_RESOURCES,
  SEARCH_RULE_STALE_KEYS,
  staleResource,
} from './keys';

const NO_ERROR_TOAST = () => false as const;

/** Adds a synonym rule. */
export function useCreateSynonym() {
  return useApiMutation({
    mutationFn: (body: CreateSynonymBody) => createSearchSynonym(body),
    invalidates: staleResource(SEARCH_RESOURCES.synonyms),
    invalidateKeys: SEARCH_RULE_STALE_KEYS,
    onSuccess: (created) => {
      toast({ kind: 'success', title: 'Synonym added', body: synonymText(created), ttl: 2600 });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of a synonym rule. */
export function useUpdateSynonym() {
  return useApiMutation({
    mutationFn: ({ synonym, body }: { synonym: SearchSynonym; body: UpdateSynonymBody }) =>
      updateSearchSynonym(synonym.id, body),
    invalidates: staleResource(SEARCH_RESOURCES.synonyms),
    invalidateKeys: SEARCH_RULE_STALE_KEYS,
    onSuccess: (updated) => {
      toast({ kind: 'success', title: 'Synonym saved', body: synonymText(updated), ttl: 2600 });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** The On switch of a synonym rule. */
export function useSetSynonymEnabled() {
  return useApiMutation({
    mutationFn: ({ synonym, enabled }: { synonym: SearchSynonym; enabled: boolean }) =>
      updateSearchSynonym(synonym.id, { isEnabled: enabled }),
    invalidates: staleResource(SEARCH_RESOURCES.synonyms),
    invalidateKeys: SEARCH_RULE_STALE_KEYS,
    onSuccess: (updated) => {
      toast({
        kind: 'success',
        title: updated.isEnabled ? 'Synonym switched on' : 'Synonym switched off',
        body: synonymText(updated),
        ttl: 2400,
      });
    },
  });
}

/** Deletes a synonym rule. */
export function useDeleteSynonym() {
  return useApiMutation({
    mutationFn: (synonym: SearchSynonym) => deleteSearchSynonym(synonym.id),
    invalidates: staleResource(SEARCH_RESOURCES.synonyms),
    invalidateKeys: SEARCH_RULE_STALE_KEYS,
    onSuccess: (_none, synonym) => {
      toast({ kind: 'success', title: 'Synonym deleted', body: synonymText(synonym), ttl: 2600 });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Adds a pinned-results rule. */
export function useCreatePin() {
  return useApiMutation({
    mutationFn: (body: CreatePinBody) => createSearchPin(body),
    invalidates: staleResource(SEARCH_RESOURCES.pins),
    invalidateKeys: SEARCH_RULE_STALE_KEYS,
    onSuccess: (created) => {
      toast({ kind: 'success', title: 'Pinned results saved', body: created.query, ttl: 2600 });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of a pinned-results rule. */
export function useUpdatePin() {
  return useApiMutation({
    mutationFn: ({ pin, body }: { pin: SearchPin; body: UpdatePinBody }) => updateSearchPin(pin.id, body),
    invalidates: staleResource(SEARCH_RESOURCES.pins),
    invalidateKeys: SEARCH_RULE_STALE_KEYS,
    onSuccess: (updated) => {
      toast({ kind: 'success', title: 'Pinned results saved', body: updated.query, ttl: 2600 });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** The On switch of a pinned-results rule. */
export function useSetPinEnabled() {
  return useApiMutation({
    mutationFn: ({ pin, enabled }: { pin: SearchPin; enabled: boolean }) =>
      updateSearchPin(pin.id, { isEnabled: enabled }),
    invalidates: staleResource(SEARCH_RESOURCES.pins),
    invalidateKeys: SEARCH_RULE_STALE_KEYS,
    onSuccess: (updated) => {
      toast({
        kind: 'success',
        title: updated.isEnabled ? 'Pinned results switched on' : 'Pinned results switched off',
        body: updated.query,
        ttl: 2400,
      });
    },
  });
}

/** Deletes a pinned-results rule. */
export function useDeletePin() {
  return useApiMutation({
    mutationFn: (pin: SearchPin) => deleteSearchPin(pin.id),
    invalidates: staleResource(SEARCH_RESOURCES.pins),
    invalidateKeys: SEARCH_RULE_STALE_KEYS,
    onSuccess: (_none, pin) => {
      toast({ kind: 'success', title: 'Pinned results deleted', body: pin.query, ttl: 2600 });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Keeps a term out of the popular searches. */
export function useHideTerm() {
  return useApiMutation({
    mutationFn: (body: CreateHiddenTermBody) => createHiddenTerm(body),
    invalidates: staleResource(SEARCH_RESOURCES.hiddenTerms),
    onSuccess: (created) => {
      toast({ kind: 'success', title: 'Hidden from popular searches', body: created.term, ttl: 2600 });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Shows a hidden term in the popular searches again. */
export function useShowTermAgain() {
  return useApiMutation({
    mutationFn: (entry: HiddenTerm) => deleteHiddenTerm(entry.id),
    invalidates: staleResource(SEARCH_RESOURCES.hiddenTerms),
    onSuccess: (_none, entry) => {
      toast({ kind: 'success', title: 'Shown in popular searches again', body: entry.term, ttl: 2600 });
    },
  });
}

/**
 * Starts the rebuild. The confirm dialog shows a refusal. After a refusal because a rebuild already runs the status is read
 * again, so the page shows the run that is going.
 */
export function useRebuildIndex() {
  const queryClient = useQueryClient();
  return useApiMutation({
    mutationFn: () => rebuildSearchIndex(),
    invalidateKeys: SEARCH_INDEX_STALE_KEYS,
    onSuccess: () => {
      toast({
        kind: 'success',
        title: 'Rebuild started',
        body: 'Search keeps working while the new index is built.',
        ttl: 3200,
      });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: [...SEARCH_INDEX_KEY] });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}
