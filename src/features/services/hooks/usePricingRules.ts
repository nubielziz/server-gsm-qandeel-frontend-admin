// The pricing rules (a Refine list) and the actions on them: create, change, turn off and on, delete. Ports `cat-on` and
// `cat-off` of 43-p-services.js with the demo's toasts. A rule change makes the price resolutions stale. The dialogs show a refusal.
import { useList } from '@refinedev/core';
import { toast } from '@/components/ui';
import { useApiMutation } from '@/lib/query';
import { createPricingRule, deletePricingRule, updatePricingRule } from '../api';
import type { CreatePricingRuleBody, PricingRule, UpdatePricingRuleBody } from '../types';
import { PICKER_CAP, RESOLVE_KEY } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** The rules in priority order, loaded whole (there are few). Needs `pricing:read`. */
export function usePricingRules(enabled = true) {
  const { result, query } = useList<PricingRule>({
    resource: 'pricing-rules',
    pagination: { currentPage: 1, pageSize: PICKER_CAP },
    sorters: [{ field: 'priority', order: 'asc' }],
    queryOptions: { enabled },
    errorNotification: false,
  });
  return { rules: result.data, total: result.total, query };
}

/** Creates a rule (the demo's "Add promo"). */
export function useCreateRule() {
  return useApiMutation({
    mutationFn: (body: CreatePricingRuleBody) => createPricingRule(body),
    invalidates: [{ resource: 'pricing-rules' }],
    invalidateKeys: [RESOLVE_KEY],
    successNotification: () => ({ message: 'Rule added', description: 'New orders use it.' }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of a rule. */
export function useUpdateRule() {
  return useApiMutation({
    mutationFn: ({ rule, body }: { rule: PricingRule; body: UpdatePricingRuleBody }) =>
      updatePricingRule(rule.id, body),
    invalidates: (_result, { rule }) => [{ resource: 'pricing-rules', id: rule.id }],
    invalidateKeys: [RESOLVE_KEY],
    successNotification: () => ({ message: 'Rule saved', description: 'New orders use it.' }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Turns a rule off or on without deleting it. A failure shows as the default error toast, as the button has no dialog. */
export function useToggleRule() {
  return useApiMutation({
    mutationFn: ({ rule, isActive }: { rule: PricingRule; isActive: boolean }) =>
      updatePricingRule(rule.id, { isActive }),
    invalidates: (_result, { rule }) => [{ resource: 'pricing-rules', id: rule.id }],
    invalidateKeys: [RESOLVE_KEY],
    onSuccess: (_result, { isActive }) => {
      toast({
        kind: 'success',
        title: isActive ? 'Rule turned on' : 'Rule turned off',
        body: isActive ? 'New orders use it.' : 'New orders use the base price.',
      });
    },
  });
}

/** Deletes a rule (the demo's "Turn off" on a category rule). */
export function useDeleteRule() {
  return useApiMutation({
    mutationFn: (rule: PricingRule) => deletePricingRule(rule.id),
    invalidates: (_result, rule) => [{ resource: 'pricing-rules', id: rule.id }],
    invalidateKeys: [RESOLVE_KEY],
    successNotification: () => ({ message: 'Rule removed', description: 'New orders use the base price.' }),
    errorNotification: NO_ERROR_TOAST,
  });
}
