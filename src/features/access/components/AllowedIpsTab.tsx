// AllowedIpsTab: the "Allowed IPs" tab (the demo's `tabIpAllow`): the restriction switch, the allowed addresses with "Add
// my IP" and "Add IP", and the address tester. Loading, empty and error states come from the list's query.
import { useState } from 'react';
import { Button, Icon, Panel, QueryState, SkeletonTable } from '@/components/ui';
import { useNow } from '@/lib/format';
import { useAccessGrants } from '../hooks/useAccessGrants';
import { IP_RULE_CAP, useLiveIpRules } from '../hooks/useIpRules';
import { isAllowed } from '../lib/ipGuards';
import type { IpRule } from '../types';
import { AllowedIpTable } from './AllowedIpTable';
import { AllowIpDialog } from './AllowIpDialog';
import { IpTester } from './IpTester';
import { RemoveIpRuleDialog } from './RemoveIpRuleDialog';
import { RestrictionPanel } from './RestrictionPanel';

type Dialog = { kind: 'add'; prefill?: string } | { kind: 'remove'; rule: IpRule };

/**
 * Loads the live allowed rules and shows the restriction switch, the table and the tester; owns the add
 * and remove dialogs.
 */
export function AllowedIpsTab() {
  const grants = useAccessGrants();
  const { rules, truncated, query } = useLiveIpRules('allow');
  const now = useNow();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const addLock = grants.needs('access:create');
  const removeLock = grants.needs('access:delete');
  // "Add my IP" is offered while no live rule covers the caller's address.
  const showAddMine = query.isSuccess && grants.myIp !== null && !isAllowed(rules, grants.myIp, now);

  // The "Add IP" buttons: the small primary one in the panel header, the full-size one in the empty state, and the
  // small "Add my IP" that starts the dialog with the caller's address.
  const addButton = (options: { label?: string; prefill?: string; primary?: boolean; large?: boolean }) => (
    <Button
      variant={options.primary ? 'primary' : 'default'}
      size={options.large ? 'md' : 'sm'}
      disabled={addLock.disabled}
      title={addLock.title}
      onClick={() => setDialog({ kind: 'add', prefill: options.prefill })}
    >
      <Icon name="plus" className="ic-sm" />
      {options.label ?? 'Add IP'}
    </Button>
  );

  return (
    <>
      <RestrictionPanel allowRules={rules} rulesReady={query.isSuccess} />
      <Panel
        title="Allowed addresses"
        sub="Use a single address like 203.0.113.24 or a range like 203.0.113.0/24. A temporary entry removes itself."
        right={
          <>
            {showAddMine && addButton({ label: 'Add my IP', prefill: grants.myIp ?? undefined })}
            {addButton({ primary: true })}
          </>
        }
      >
        <QueryState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={() => void query.refetch()}
          errorTitle="Could not load the allowed addresses"
          skeleton={<SkeletonTable cols={5} rows={4} />}
        >
          <AllowedIpTable
            rules={rules}
            now={now}
            canRemove={removeLock}
            onRemove={(rule) => setDialog({ kind: 'remove', rule })}
            emptyAction={addButton({ primary: true, large: true })}
          />
        </QueryState>
      </Panel>
      {truncated && (
        <p className="mt-2 text-xs text-ink3">
          Showing the newest {IP_RULE_CAP} rules. Older ones are not listed here.
        </p>
      )}
      <div className="mt-4">
        <IpTester />
      </div>

      {dialog?.kind === 'add' && <AllowIpDialog prefill={dialog.prefill} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'remove' && (
        <RemoveIpRuleDialog rule={dialog.rule} allowRules={rules} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
