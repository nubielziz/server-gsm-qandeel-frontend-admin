// BlockedIpsTab: the "Blocked IPs" tab (the demo's `tabIpBlock`): figures, the blocked addresses with a group filter and
// "Block an IP", and the address tester. Loading, empty and error states come from the list's query.
import { useState } from 'react';
import {
  Button,
  Icon,
  Panel,
  QueryState,
  SegmentedControl,
  SkeletonStat,
  SkeletonTable,
} from '@/components/ui';
import { useNow } from '@/lib/format';
import { useAccessGrants } from '../hooks/useAccessGrants';
import { IP_RULE_CAP, useLiveIpRules } from '../hooks/useIpRules';
import type { IpRule, IpScope } from '../types';
import { BlockedIpTable } from './BlockedIpTable';
import { BlockedStats } from './BlockedStats';
import { BlockIpDialog } from './BlockIpDialog';
import { IpTester } from './IpTester';
import { RemoveIpRuleDialog } from './RemoveIpRuleDialog';

type GroupFilter = 'all' | Exclude<IpScope, 'all'>;

const GROUPS = [
  { value: 'all', label: 'All' },
  { value: 'store', label: 'Customers' },
  { value: 'api', label: 'Merchants' },
  { value: 'admin', label: 'Admins' },
] as const;

type Dialog = { kind: 'block' } | { kind: 'unblock'; rule: IpRule };

/**
 * Loads the live blocks and shows the figures, the table with its group filter, and the tester; owns the
 * block and unblock dialogs.
 */
export function BlockedIpsTab() {
  const grants = useAccessGrants();
  const { rules, truncated, query } = useLiveIpRules('block');
  const now = useNow();
  const [group, setGroup] = useState<GroupFilter>('all');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const addLock = grants.needs('access:create');
  const removeLock = grants.needs('access:delete');
  // A rule that covers everyone applies to every group.
  const rows = rules.filter((rule) => group === 'all' || rule.scope === group || rule.scope === 'all');

  const blockButton = (large?: boolean) => (
    <Button
      variant="primary"
      size={large ? 'md' : 'sm'}
      disabled={addLock.disabled}
      title={addLock.title}
      onClick={() => setDialog({ kind: 'block' })}
    >
      <Icon name="plus" className="ic-sm" />
      Block an IP
    </Button>
  );

  return (
    <>
      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="Could not load the blocked addresses"
        skeleton={
          <>
            <SkeletonStat cells={4} />
            <Panel flush>
              <SkeletonTable cols={6} rows={4} />
            </Panel>
          </>
        }
      >
        <BlockedStats rules={rules} />
        <Panel
          title="Blocked addresses"
          sub="Requests from these addresses get a plain “Access denied”. A block rule always beats the allowed list."
          right={blockButton()}
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <SegmentedControl items={GROUPS} value={group} onChange={setGroup} label="Who is blocked" />
            <span className="flex-1" />
            <span className="text-xs text-ink3">
              {rows.length} {rows.length === 1 ? 'rule' : 'rules'}
            </span>
          </div>
          <BlockedIpTable
            rules={rows}
            now={now}
            filtered={group !== 'all'}
            canRemove={removeLock}
            onUnblock={(rule) => setDialog({ kind: 'unblock', rule })}
            emptyAction={blockButton(true)}
          />
        </Panel>
      </QueryState>
      {truncated && (
        <p className="mt-2 text-xs text-ink3">
          Showing the newest {IP_RULE_CAP} blocks. The figures above count only these.
        </p>
      )}
      <p className="mt-3 text-xs text-ink3">
        Email, card, device and IMEI blocks live under Risk and checks. This page is only for network
        addresses.
      </p>
      <div className="mt-4">
        <IpTester />
      </div>

      {dialog?.kind === 'block' && <BlockIpDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'unblock' && (
        <RemoveIpRuleDialog rule={dialog.rule} allowRules={[]} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
