// BlockedIpTable: the blocked addresses with the demo's columns (address and reason, applies to, how, added, lasts,
// refused) and an Unblock button. Ports the `cols` of tabIpBlock in 56-p-access.js.
import type { ReactNode } from 'react';
import { Button, DataTable, EmptyState, TypeTag, type DataTableColumn } from '@/components/ui';
import { ago, num } from '@/lib/format';
import { useSortedRows } from '../hooks/useSortedRows';
import { IP_RULE_SORT, IP_SCOPE_TAG, isRange } from '../lib/ipRules';
import type { IpRule } from '../types';
import { LastsCell } from './LastsCell';

export interface BlockedIpTableProps {
  rules: readonly IpRule[];
  now: number;
  /** True when a group filter is on, which changes what the empty state says. */
  filtered: boolean;
  canRemove: { disabled: boolean; title?: string };
  onUnblock: (rule: IpRule) => void;
  /** Shown when there are no rules: the "Block an IP" button. */
  emptyAction: ReactNode;
}

/**
 * The blocked addresses, sorted in the browser.
 */
export function BlockedIpTable({
  rules,
  now,
  filtered,
  canRemove,
  onUnblock,
  emptyAction,
}: BlockedIpTableProps) {
  const { rows, sort, setSort } = useSortedRows(rules, IP_RULE_SORT, { field: 'added', order: 'desc' });

  const columns: DataTableColumn<IpRule>[] = [
    {
      key: 'cidr',
      label: 'Address',
      sortField: 'cidr',
      render: (rule) => (
        <>
          <span className="mono">{rule.cidr}</span>
          {isRange(rule.cidr) && <TypeTag className="ms-1">Range</TypeTag>}
          <p className="max-w-[22rem] text-2xs text-ink3">{rule.reason}</p>
        </>
      ),
    },
    {
      key: 'scope',
      label: 'Applies to',
      sortField: 'scope',
      render: (rule) => <TypeTag>{IP_SCOPE_TAG[rule.scope]}</TypeTag>,
    },
    {
      key: 'how',
      label: 'How',
      sortField: 'how',
      hide: 'lg',
      render: (rule) => (
        <>
          <span className="text-ink2">{rule.source === 'auto' ? 'Risk engine' : 'Manual'}</span>
          <p className="text-2xs text-ink3">
            {rule.source === 'auto' ? 'Automatic' : (rule.createdBy?.name ?? '')}
          </p>
        </>
      ),
    },
    {
      key: 'added',
      label: 'Added',
      sortField: 'added',
      hide: 'md',
      render: (rule) => <span className="text-ink2">{ago(rule.createdAt, now)}</span>,
    },
    {
      key: 'lasts',
      label: 'Lasts',
      sortField: 'lasts',
      hide: 'sm',
      render: (rule) => <LastsCell rule={rule} now={now} />,
    },
    {
      key: 'hits',
      label: 'Refused',
      sortField: 'hits',
      num: true,
      hide: 'sm',
      render: (rule) => num(rule.hitCount),
    },
    {
      key: 'actions',
      label: '',
      render: (rule) => (
        <Button
          size="sm"
          disabled={canRemove.disabled}
          title={canRemove.title}
          onClick={() => onUnblock(rule)}
        >
          Unblock
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      caption="Blocked IP addresses"
      columns={columns}
      rows={rows}
      rowKey={(rule) => rule.id}
      sort={sort}
      onSortChange={setSort}
      empty={
        <EmptyState icon="ban" title="No blocks here" cta={emptyAction}>
          {filtered
            ? 'Nothing is blocked for this group.'
            : 'Nothing is blocked. Block an address if you see abuse, or let the risk engine add one.'}
        </EmptyState>
      }
    />
  );
}
