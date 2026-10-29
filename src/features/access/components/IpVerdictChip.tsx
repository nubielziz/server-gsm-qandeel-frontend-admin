// IpVerdictChip: a small badge beside an address when the server would refuse it ("Blocked", "Not on the allowlist"),
// nothing otherwise. Ports ipVerdictChip of 56-p-access.js; the demo worked it out in the browser, the console asks the
// server (`POST /admin/ip-rules/check`).
import { Badge } from '@/components/ui';
import { useAccessGrants } from '../hooks/useAccessGrants';
import { useIpVerdict } from '../hooks/useIpCheck';
import { readVerdict } from '../lib/ipVerdict';
import type { IpScope } from '../types';

export function IpVerdictChip({ ip, scope }: { ip: string; scope: IpScope }) {
  const { can } = useAccessGrants();
  const { data } = useIpVerdict(ip, scope, can('access:read'));
  const why = data ? readVerdict(data).why : undefined;
  if (why === 'blocked') {
    return (
      <Badge tone="crit" icon="ban">
        Blocked
      </Badge>
    );
  }
  if (why === 'not_listed') {
    return (
      <Badge tone="warn" icon="alert">
        Not on the allowlist
      </Badge>
    );
  }
  return null;
}
