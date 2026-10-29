// The "only allowed IPs can open the admin console" switch: its state comes from the settings, and the change goes
// through its own route.
import { useInvalidate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui';
import { SETTINGS_KEY, useSettings, type Settings } from '@/features/settings';
import { useApiMutation } from '@/lib/query';
import { createIpRule, setAdminRestriction } from '../api';
import type { RestrictionResult } from '../types';
import { IP_CHECK_KEY } from './keys';

/**
 * `restricted` is undefined until the settings have loaded (or when they could not be read, which `query` shows).
 * Assumption: the settings key is `adminAllowlistOnly`.
 */
export function useRestriction(options: { enabled?: boolean } = {}) {
  const query = useSettings(options);
  return { restricted: query.data ? query.data.adminAllowlistOnly === true : undefined, query };
}

// Shared by both mutations below: show the new state at once (the refetch behind it confirms it) and say what changed.
function useShowRestriction() {
  const queryClient = useQueryClient();
  return ({ enabled }: RestrictionResult) => {
    queryClient.setQueryData<Settings>(SETTINGS_KEY, (old) => ({ ...old, adminAllowlistOnly: enabled }));
    if (!enabled) toast({ kind: 'info', title: 'IP restriction is off' });
  };
}

/**
 * Turns the restriction on or off. The caller shows a refusal (for example when the caller's own address is not on the
 * allowed list), either inside a dialog or as a toast.
 */
export function useSetRestriction() {
  const show = useShowRestriction();
  return useApiMutation({
    mutationFn: (enabled: boolean) => setAdminRestriction({ enabled }),
    invalidateKeys: [SETTINGS_KEY, IP_CHECK_KEY],
    // Read the state from what was asked, not from the answer: the answer's body is an assumed contract and may be
    // empty (204), which must not turn a successful toggle into an error.
    successNotification: (_answer, enabled) =>
      enabled ? { message: 'Only allowed IPs can open the console' } : false,
    onSuccess: (_answer, enabled) => show({ enabled }),
    errorNotification: () => false,
  });
}

/**
 * "Add my IP and turn on": allows the caller's address, then turns the restriction on. Two requests, so if the second
 * fails the new rule is still shown. The dialog shows a failure.
 */
export function useAllowMyIpAndRestrict() {
  const invalidate = useInvalidate();
  const show = useShowRestriction();
  return useApiMutation({
    mutationFn: async ({ cidr, label }: { cidr: string; label: string }) => {
      await createIpRule({ kind: 'allow', scope: 'admin', cidr, label });
      try {
        return await setAdminRestriction({ enabled: true });
      } catch (error) {
        await invalidate({ resource: 'ip-rules', invalidates: ['list'] });
        throw error;
      }
    },
    invalidates: [{ resource: 'ip-rules' }],
    invalidateKeys: [SETTINGS_KEY, IP_CHECK_KEY],
    successNotification: () => ({ message: 'Only allowed IPs can open the console' }),
    onSuccess: () => show({ enabled: true }),
    errorNotification: () => false,
  });
}
