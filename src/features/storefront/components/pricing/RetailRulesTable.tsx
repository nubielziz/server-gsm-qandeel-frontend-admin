// RetailRulesTable: the retail pricing rules: what each covers, the price it makes (the server's words), how far a cost may move
// before a change waits, how many prices follow it and whether it is on, with Edit, Turn off / Turn on and Delete. Ports the look of
// the pricing rules table of the services page; every word about a price is the server's `label`.
import type { ReactNode } from 'react';
import { Button, DataTable, type DataTableColumn } from '@/components/ui';
import { TYPE_LABEL } from '@/lib/serviceTypes';
import { num } from '@/lib/format';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { ruleTargetName } from '../../lib/retailPricing';
import type { RetailPriceRule } from '../../types';
import { StatusMark } from '../StatusMark';

export interface RetailRulesTableProps {
  rules: readonly RetailPriceRule[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry: () => void;
  grants: StorefrontGrants;
  empty: ReactNode;
  onEdit: (rule: RetailPriceRule) => void;
  onToggle: (rule: RetailPriceRule) => void;
  onDelete: (rule: RetailPriceRule) => void;
}

/** "Every service", the type's name or the category's name. */
function Applies({ rule }: { rule: RetailPriceRule }) {
  if (rule.scope === 'global') return <span className="font-medium">Every service</span>;
  if (rule.scope === 'type' && rule.serviceType)
    return <span className="font-medium">{TYPE_LABEL[rule.serviceType]}</span>;
  return <span className="font-medium">{rule.categoryName ?? `Category ${rule.categoryId ?? '?'}`}</span>;
}

/** Draws the rules with their row actions. */
export function RetailRulesTable({
  rules,
  state,
  error,
  onRetry,
  grants,
  empty,
  onEdit,
  onToggle,
  onDelete,
}: RetailRulesTableProps) {
  const update = grants.needs('pricing:update');
  const remove = grants.needs('pricing:delete');
  const columns: DataTableColumn<RetailPriceRule>[] = [
    { key: 'applies', label: 'Applies to', render: (rule) => <Applies rule={rule} /> },
    { key: 'price', label: 'Price', render: (rule) => <span className="font-medium">{rule.label}</span> },
    {
      key: 'follow',
      label: 'Follows cost changes up to',
      num: true,
      hide: 'md',
      render: (rule) => `${rule.autoFollowPercent}%`,
    },
    {
      key: 'following',
      label: 'Prices following',
      num: true,
      hide: 'sm',
      render: (rule) => num(rule.following),
    },
    {
      key: 'status',
      label: 'Status',
      render: (rule) => (
        <StatusMark tone={rule.isActive ? 'good' : 'neutral'}>{rule.isActive ? 'On' : 'Off'}</StatusMark>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (rule) => {
        const target = ruleTargetName(rule);
        return (
          <span className="flex justify-end gap-1.5">
            <Button
              size="sm"
              aria-label={`Edit the rule for ${target}`}
              disabled={update.disabled}
              title={update.title}
              onClick={() => onEdit(rule)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              aria-label={`${rule.isActive ? 'Turn off' : 'Turn on'} the rule for ${target}`}
              disabled={update.disabled}
              title={update.title}
              onClick={() => onToggle(rule)}
            >
              {rule.isActive ? 'Turn off' : 'Turn on'}
            </Button>
            <Button
              size="sm"
              variant="danger"
              aria-label={`Delete the rule for ${target}`}
              disabled={remove.disabled}
              title={remove.title}
              onClick={() => onDelete(rule)}
            >
              Delete
            </Button>
          </span>
        );
      },
    },
  ];
  return (
    <DataTable
      skin="list"
      footer={false}
      caption="Retail pricing rules"
      columns={columns}
      rows={rules}
      rowKey={(rule) => rule.id}
      state={state}
      error={error}
      errorTitle="Could not load the retail pricing rules"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
