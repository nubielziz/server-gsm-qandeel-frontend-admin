// Adding and removing IP rules, with the toasts the demo showed. `useCreateIpRule` is public: the customers page uses it
// (through BlockIpDialog) to block the last address of a customer.
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui';
import { SETTINGS_KEY, type Settings } from '@/features/settings';
import { useApiMutation } from '@/lib/query';
import { createIpRule, deleteIpRule } from '../api';
import { durText, IP_SCOPE } from '../lib/ipRules';
import type { CreateIpRuleBody, IpRule } from '../types';
import { IP_CHECK_KEY } from './keys';

/** The rule to add, and for how many hours it lasts (0 for until removed; only used for the toast's wording). */
export type CreateIpRuleInput = { body: CreateIpRuleBody; hours: number };

/** Adds an allowed address or a block. A failed call is shown by the dialog that sent it. */
export function useCreateIpRule() {
  const queryClient = useQueryClient();
  return useApiMutation({
    mutationFn: ({ body }: CreateIpRuleInput) => createIpRule(body),
    invalidates: [{ resource: 'ip-rules' }],
    invalidateKeys: [IP_CHECK_KEY],
    successNotification: (rule, { hours }) => {
      if (rule.kind === 'allow') {
        // Whether the restriction is on decides what "allowed" means right now; the page has read it into the cache.
        const restricted = queryClient.getQueryData<Settings>(SETTINGS_KEY)?.adminAllowlistOnly;
        return {
          message: `${rule.cidr} allowed`,
          description:
            restricted === false
              ? 'The restriction is off, so it only takes effect once you turn it on.'
              : 'It can open the admin console now.',
        };
      }
      return {
        message: `${rule.cidr} blocked`,
        description: `${IP_SCOPE[rule.scope]}${hours > 0 ? `, for ${durText(hours)}` : ', until you unblock it'}.`,
      };
    },
    errorNotification: () => false,
  });
}

/** Removes an allowed address, or lifts a block ("Unblocked"). The confirm dialog shows a refusal. */
export function useDeleteIpRule() {
  return useApiMutation({
    mutationFn: (rule: IpRule) => deleteIpRule(rule.id),
    invalidates: [{ resource: 'ip-rules' }],
    invalidateKeys: [IP_CHECK_KEY],
    // The demo told this with a quiet "info" toast, which the success notifications cannot draw.
    onSuccess: (_result, rule) => {
      toast({ kind: 'info', title: rule.kind === 'allow' ? 'Removed' : 'Unblocked', body: rule.cidr });
    },
    errorNotification: () => false,
  });
}
