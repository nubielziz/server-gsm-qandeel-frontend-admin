// LastSeenFrom: the last address a customer was seen from, with the server's verdict and a way to block it. Ports `custIpCell`
// of 56-p-access.js: an address the server would refuse gets the "Blocked" chip and a link to the rule; any other gets a
// "Block IP…" button. The verdict comes from `POST /admin/ip-rules/check` (MISMATCHES M13).
import { Link } from 'react-router';
import { Button, Icon } from '@/components/ui';
import { IpVerdictChip, useAccessGrants, useIpVerdict } from '@/features/access';

export interface LastSeenFromProps {
  ip: string | null;
  /** Props of the Block IP button when the staff member may not add rules (`disabled`, with the reason as its `title`). */
  lock: { disabled: boolean; title?: string };
  onBlock: () => void;
}

export function LastSeenFrom({ ip, lock, onBlock }: LastSeenFromProps) {
  const { can } = useAccessGrants();
  // Same query as the chip's, so React Query asks the server once.
  const verdict = useIpVerdict(ip, 'store', can('access:read'));
  if (!ip) return <span className="text-ink3">Unknown</span>;
  const refused = verdict.data?.decision === 'refused';
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="mono">{ip}</span>
      <IpVerdictChip ip={ip} scope="store" />
      {refused ? (
        <Link className="link text-xs" to="/access?tab=block">
          See the rule
        </Link>
      ) : (
        <Button size="sm" disabled={lock.disabled} title={lock.title} onClick={onBlock}>
          <Icon name="ban" className="ic-xs" />
          Block IP…
        </Button>
      )}
    </span>
  );
}
