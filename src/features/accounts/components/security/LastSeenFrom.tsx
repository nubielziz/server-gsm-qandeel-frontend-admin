// LastSeenFrom: the address an account last signed in from, with the server's verdict and a way to block it. An address the server would
// refuse gets the "Blocked" chip (or "Not on the allowlist") and a link to the rule; any other gets a "Block IP…" button. The verdict comes
// from `POST /admin/ip-rules/check`; blocking an address never touches the account.
import { Link } from 'react-router';
import { Button, Icon } from '@/components/ui';
import { IpVerdictChip, useIpVerdict, type IpScope } from '@/features/access';
import type { GrantLock } from '../frame/useAccountGrants';

export interface LastSeenFromProps {
  ip: string | null;
  /** The audience the address is checked and blocked for. */
  scope: IpScope;
  /** Whether the staff member may read the verdict (`access:read`). */
  canCheck: boolean;
  /** The lock of the Block IP button (`access:create`). */
  lock: GrantLock;
  onBlock: () => void;
}

/** The address in mono type, the chip, and the link to the rule or the button. An unknown address says so. */
export function LastSeenFrom({ ip, scope, canCheck, lock, onBlock }: LastSeenFromProps) {
  // Same query as the chip's, so the server is asked once.
  const verdict = useIpVerdict(ip, scope, canCheck);
  if (!ip) return <span className="text-ink3">Unknown</span>;
  const refused = verdict.data?.decision === 'refused';
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="mono">{ip}</span>
      <IpVerdictChip ip={ip} scope={scope} />
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
