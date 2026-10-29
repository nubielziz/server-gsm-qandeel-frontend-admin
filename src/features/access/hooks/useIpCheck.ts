// Asking the server what would happen to an address: the interactive tester, and the quiet checks behind the
// "Blocked" chip and the "Your address" line. Ports the ipVerdict calls of 56-p-access.js.
import { useApiMutation, useApiQuery } from '@/lib/query';
import { checkIp } from '../api';
import type { CheckIpBody, IpScope } from '../types';
import { IP_CHECK_KEY } from './keys';

/** The tester's Check button. The tester shows a failure itself. */
export function useCheckIp() {
  return useApiMutation({
    mutationFn: (body: CheckIpBody) => checkIp(body),
    errorNotification: () => false,
  });
}

/** A check that runs by itself for an address and an audience (and again after any rule changes). */
export function useIpVerdict(ip: string | null | undefined, scope: IpScope, enabled = true) {
  return useApiQuery({
    queryKey: [...IP_CHECK_KEY, ip ?? '', scope],
    queryFn: ({ signal }) => checkIp({ ip: ip ?? '', scope }, { signal }),
    enabled: enabled && Boolean(ip),
  });
}
