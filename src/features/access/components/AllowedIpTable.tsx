// AllowedIpTable: the allowed addresses with the demo's columns (address, added, used, lasts) and a Remove button.
// Ports the `cols` of tabIpAllow in 56-p-access.js.
import type { ReactNode } from 'react';
import { Button, DataTable, EmptyState, TypeTag, type DataTableColumn } from '@/components/ui';
import { ago, num } from '@/lib/format';
import { useSortedRows } from '../hooks/useSortedRows';
import { IP_RULE_SORT, isRange } from '../lib/ipRules';
import type { IpRule } from '../types';
import { LastsCell } from './LastsCell';

export interface AllowedIpTableProps {
  rules: readonly IpRule[];
  now: number;
  canRemove: { disabled: boolean; title?: string };
  onRemove: (rule: IpRule) => void;
  /** Shown when there are no rules: the "Add IP" button. */
  emptyAction: ReactNode;
}

/**
 * The allowed addresses, sorted in the browser.
 */
export function AllowedIpTable({ rules, now, canRemove, onRemove, emptyAction }: AllowedIpTableProps) {
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
          <p className="text-2xs text-ink3">{rule.label || 'No label'}</p>
        </>
      ),
    },
    {
      key: 'added',
      label: 'Added',
      sortField: 'added',
      hide: 'md',
      render: (rule) => (
        <>
          <span className="text-ink2">{ago(rule.createdAt, now)}</span>
          {rule.createdBy && <p className="text-2xs text-ink3">by {rule.createdBy.name}</p>}
        </>
      ),
    },
    {
      key: 'hits',
      label: 'Used, 7 days',
      sortField: 'hits',
      num: true,
      hide: 'sm',
      render: (rule) =>
        rule.hitCount ? (
          <>
            {num(rule.hitCount)}
            {rule.lastHitAt && <p className="text-2xs text-ink3">last {ago(rule.lastHitAt, now)}</p>}
          </>
        ) : (
          <span className="text-ink3">Not yet</span>
        ),
    },
    {
      key: 'lasts',
      label: 'Lasts',
      sortField: 'lasts',
      render: (rule) => <LastsCell rule={rule} now={now} />,
    },
    {
      key: 'actions',
      label: '',
      render: (rule) => (
        <Button
          size="sm"
          disabled={canRemove.disabled}
          title={canRemove.title}
          onClick={() => onRemove(rule)}
        >
          Remove
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      caption="Allowed IP addresses"
      columns={columns}
      rows={rows}
      rowKey={(rule) => rule.id}
      sort={sort}
      onSortChange={setSort}
      empty={
        <EmptyState icon="globe" title="No addresses on the list" cta={emptyAction}>
          Add the office or home addresses your team signs in from, then turn the restriction on.
        </EmptyState>
      }
    />
  );
}
