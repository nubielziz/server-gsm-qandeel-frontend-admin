// SeenFrom: the address a guest was seen from (the address of the latest consent record, the checkout), with the server's verdict and a way
// to block it. An address the server would refuse gets the "Blocked" chip and a link to the rule; any other gets a "Block IP…" button.
// The verdict comes from `POST /admin/ip-rules/check`; the chip and the button are the access feature's.
import { Link } from 'react-router';
import { Button, Icon } from '@/components/ui';
import { IpVerdictChip, useAccessGrants, useIpVerdict } from '@/features/access';
import type { GrantLock } from '../frame/useAccountGrants';

export interface SeenFromProps {
  /** The address, or null when no order left one. */
  ip: string | null;
  /** The Block IP button's lock: disabled, with the reason as its title, when the staff member may not add rules. */
  lock: GrantLock;
  onBlock: () => void;
}

/** The address with its verdict chip and the rule link or the Block IP button; "Unknown" without an address. */
export function SeenFrom({ ip, lock, onBlock }: SeenFromProps) {
  const { can } = useAccessGrants();
  // The chip asks the same question, so React Query asks the server once.
  const verdict = useIpVerdict(ip, 'store', can('access:read'));
  if (!ip) return <span className="text-sm text-ink3">Unknown</span>;
  const refused = verdict.data?.decision === 'refused';
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-sm md:min-h-8">
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
