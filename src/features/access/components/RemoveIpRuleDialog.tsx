// RemoveIpRuleDialog: "Remove <address>?" for an allowed address and "Unblock <address>?" for a block (the demo's
// `ip-remove` action). Removing the one rule that lets you in is stopped here with the reason; the server answers too.
import { ConfirmDialog } from '@/components/ui';
import { useAccessGrants } from '../hooks/useAccessGrants';
import { useDeleteIpRule } from '../hooks/useIpRuleMutations';
import { useRestriction } from '../hooks/useRestriction';
import { removeRuleGuard } from '../lib/ipGuards';
import { IP_SCOPE } from '../lib/ipRules';
import type { IpRule } from '../types';

export interface RemoveIpRuleDialogProps {
  rule: IpRule;
  /** The live allowed rules, to see whether another one still covers the caller. */
  allowRules: readonly IpRule[];
  onClose: () => void;
}

/**
 * The review step before removing an allowed address or lifting a block. It says so when the removal would
 * lock the caller out, and does not send the request then.
 */
export function RemoveIpRuleDialog({ rule, allowRules, onClose }: RemoveIpRuleDialogProps) {
  const grants = useAccessGrants();
  const { restricted } = useRestriction({ enabled: grants.can('settings:read') });
  const remove = useDeleteIpRule();
  const allow = rule.kind === 'allow';
  const guard = removeRuleGuard({ rule, allowRules, restricted: restricted === true, myIp: grants.myIp });

  return (
    <ConfirmDialog
      open
      title={`${allow ? 'Remove' : 'Unblock'} ${rule.cidr}?`}
      body={
        <>
          {allow ? (
            <p>
              This address can no longer open the admin console
              {restricted === false ? ' once the restriction is on' : ''}.
            </p>
          ) : (
            <p>
              Requests from <span className="mono">{rule.cidr}</span> are accepted again for{' '}
              {IP_SCOPE[rule.scope].toLowerCase()}.
            </p>
          )}
          {!guard.ok && <p className="mt-2 font-medium text-crit-fg">{guard.reason}</p>}
        </>
      }
      confirm={allow ? 'Remove' : 'Unblock'}
      kind={allow ? 'danger' : 'primary'}
      onClose={onClose}
      onConfirm={async () => {
        if (!guard.ok) return guard.reason;
        await remove.mutateAsync(rule);
      }}
    />
  );
}
