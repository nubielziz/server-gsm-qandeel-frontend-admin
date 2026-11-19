// The Retail pricing tab's reads and actions: the rules (a Refine list, there are few), the price changes (a paged list), the
// waiting count on the tab, the server's preview of a rule change, and the writes. A rule write makes the lists stale; the
// prices it moves arrive within about two minutes, so the tab says so in its toast. A failure is left to the dialog, which shows
// the server's words under the field or in its error slot.
import { toast, type SortState } from '@/components/ui';
import { useApiMutation, useApiQuery } from '@/lib/query';
import {
  createRetailPriceRule,
  deleteRetailPriceRule,
  listRetailPriceChanges,
  previewRetailPriceRule,
  resolveRetailPriceChanges,
  updateRetailPriceRule,
} from '../api';
import { WAITING_SPEC } from '../lib/counts';
import { PAGE_SIZE, toRefineFilters, WHOLE_LIST_CAP } from '../lib/views';
import type { ChangesShow } from '../lib/retailPricing';
import type {
  CreateRetailPriceRuleBody,
  ResolveRetailPriceChangesBody,
  RetailPriceChange,
  RetailPriceRule,
  RetailRuleChange,
  UpdateRetailPriceRuleBody,
} from '../types';
import { RETAIL_RESOURCES, retailPreviewKey, STOREFRONT_STALE_KEYS } from './keys';
import { useCounts } from './useCounts';
import { useStorefrontList } from './useStorefrontList';

const NO_ERROR_TOAST = () => false as const;

/** What a write to a rule makes stale: both lists, the listings (their prices move soon) and the counts. */
const RULE_STALE = [
  { resource: RETAIL_RESOURCES.rules },
  { resource: RETAIL_RESOURCES.changes },
  { resource: 'service-listings' },
];

/** The rules in the server's order (global, then the type rules, then the category rules), loaded whole. Needs `pricing:read`. */
export function useRetailRules(enabled: boolean) {
  return useStorefrontList<RetailPriceRule>(RETAIL_RESOURCES.rules, {
    filters: [],
    page: 1,
    pageSize: WHOLE_LIST_CAP,
    enabled,
  });
}

/** One page of the price changes: the proposals that wait, or every change. Needs `pricing:read`. */
export function useRetailChanges(args: {
  show: ChangesShow;
  page: number;
  sort: SortState;
  enabled: boolean;
}) {
  return useStorefrontList<RetailPriceChange>(RETAIL_RESOURCES.changes, {
    filters: toRefineFilters('', { waiting: args.show === 'waiting' ? true : undefined }),
    page: args.page,
    pageSize: PAGE_SIZE,
    sort: args.sort,
    enabled: args.enabled,
  });
}

/** How many proposals wait for a person (the chip on the tab); undefined until the server has answered. */
export function useWaitingCount(enabled: boolean): number | undefined {
  return useCounts('pricing', listRetailPriceChanges, [WAITING_SPEC], enabled)[WAITING_SPEC.id];
}

/** Asks the server what a rule change would do (nothing is saved): the rule dialog's second step. */
export function usePreviewRetailRule() {
  return useApiMutation({
    mutationFn: (change: RetailRuleChange) => previewRetailPriceRule({ change }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** The same preview as a read, for the dialogs that open on it (delete, turn off, turn on). Never kept: prices move. */
export function useRetailRulePreview(change: RetailRuleChange) {
  return useApiQuery({
    queryKey: retailPreviewKey(change),
    queryFn: ({ signal }) => previewRetailPriceRule({ change }, { signal }),
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
}

/** Makes a rule. Following prices move within about two minutes. */
export function useCreateRetailRule() {
  return useApiMutation({
    mutationFn: (body: CreateRetailPriceRuleBody) => createRetailPriceRule(body),
    invalidates: RULE_STALE,
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (rule) => {
      toast({
        kind: 'success',
        title: 'Rule added',
        body: `${rule.label}. Following prices move within about two minutes.`,
        ttl: 3600,
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed figures of a rule. */
export function useUpdateRetailRule() {
  return useApiMutation({
    mutationFn: ({ rule, body }: { rule: RetailPriceRule; body: UpdateRetailPriceRuleBody }) =>
      updateRetailPriceRule(rule.id, body),
    invalidates: RULE_STALE,
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (updated, { body }) => {
      const switched = Object.keys(body).length === 1 && body.isActive !== undefined;
      toast({
        kind: 'success',
        title: switched ? (updated.isActive ? 'Rule turned on' : 'Rule turned off') : 'Rule saved',
        body: `${updated.label}. Following prices move within about two minutes.`,
        ttl: 3600,
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Deletes a rule: the prices that followed it move to the next rule, or stay as they are. */
export function useDeleteRetailRule() {
  return useApiMutation({
    mutationFn: (rule: RetailPriceRule) => deleteRetailPriceRule(rule.id),
    invalidates: RULE_STALE,
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (_result, rule) => {
      toast({ kind: 'success', title: 'Rule deleted', body: rule.label, ttl: 3000 });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Applies the new price of some proposals, or keeps the current price. The tab lists the ids the server skipped. */
export function useResolveRetailChanges() {
  return useApiMutation({
    mutationFn: (body: ResolveRetailPriceChangesBody) => resolveRetailPriceChanges(body),
    invalidates: [
      { resource: RETAIL_RESOURCES.changes },
      { resource: RETAIL_RESOURCES.rules },
      { resource: 'service-listings' },
    ],
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (result) => {
      const parts = [
        result.applied > 0 ? `${result.applied} applied` : null,
        result.kept > 0 ? `${result.kept} kept` : null,
        result.skipped.length > 0 ? `${result.skipped.length} skipped` : null,
      ].filter(Boolean);
      toast({
        kind: 'success',
        title: 'Price changes resolved',
        body: parts.join(', ') || 'Nothing to change.',
        ttl: 3200,
      });
    },
    // No dialog is open, so a refusal shows as the default error toast with the server's words.
  });
}
