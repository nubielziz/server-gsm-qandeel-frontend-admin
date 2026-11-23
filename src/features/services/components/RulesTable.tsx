// RulesTable: the pricing rules: what each covers, its kind, what it does to the price, its dates and whether it is on, with Edit,
// Turn off / Turn on and Delete. Ports the category-rules table of rulesTab in 43-p-services.js (whose "Turn off" button deleted the
// rule); a rule can now also be edited, switched off without losing it, or deleted.
import type { ReactNode } from 'react';
import { Button, DataTable, type DataTableColumn } from '@/components/ui';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import { adjustmentText, appliesToText, datesText, KIND_LABEL, ruleDetails } from '../lib/rules';
import type { PricingRule } from '../types';
import { RuleStatus } from './RuleStatus';

export interface RulesTableProps {
  rules: readonly PricingRule[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry: () => void;
  grants: ServiceGrants;
  empty: ReactNode;
  /** The rule whose switch is saving, so only its button waits. */
  busyId?: number;
  onEdit: (rule: PricingRule) => void;
  onToggle: (rule: PricingRule) => void;
  onDelete: (rule: PricingRule) => void;
}

/** Draws the pricing rules with their row actions. */
export function RulesTable({
  rules,
  state,
  error,
  onRetry,
  grants,
  empty,
  busyId,
  onEdit,
  onToggle,
  onDelete,
}: RulesTableProps) {
  const update = grants.needs('pricing:update');
  const remove = grants.needs('pricing:delete');
  const columns: DataTableColumn<PricingRule>[] = [
    {
      key: 'applies',
      label: 'Applies to',
      render: (rule) => (
        <>
          <span className="font-medium">{appliesToText(rule)}</span>
          {rule.group && <span className="cell-sub">{rule.group.name} group only</span>}
        </>
      ),
    },
    { key: 'kind', label: 'Type', hide: 'sm', render: (rule) => KIND_LABEL[rule.kind] },
    {
      key: 'adjustment',
      label: 'Adjustment',
      num: true,
      render: (rule) => (
        <>
          <span className="font-medium">{adjustmentText(rule)}</span>
          <span className="cell-sub">{ruleDetails(rule)}</span>
        </>
      ),
    },
    { key: 'dates', label: 'Dates', hide: 'md', render: (rule) => datesText(rule) || '–' },
    { key: 'status', label: 'Status', render: (rule) => <RuleStatus on={rule.isActive} /> },
    {
      key: 'actions',
      label: '',
      render: (rule) => (
        <span className="flex justify-end gap-1.5">
          <Button
            size="sm"
            aria-label={`Edit rule ${rule.id}`}
            disabled={update.disabled}
            title={update.title}
            onClick={() => onEdit(rule)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            aria-label={`${rule.isActive ? 'Turn off' : 'Turn on'} rule ${rule.id}`}
            disabled={update.disabled || busyId === rule.id}
            title={update.title}
            onClick={() => onToggle(rule)}
          >
            {rule.isActive ? 'Turn off' : 'Turn on'}
          </Button>
          <Button
            size="sm"
            variant="danger"
            aria-label={`Delete rule ${rule.id}`}
            disabled={remove.disabled}
            title={remove.title}
            onClick={() => onDelete(rule)}
          >
            Delete
          </Button>
        </span>
      ),
    },
  ];
  return (
    <DataTable
      skin="list"
      footer={false}
      caption="Pricing rules"
      columns={columns}
      rows={rules}
      rowKey={(rule) => rule.id}
      state={state}
      error={error}
      errorTitle="Could not load the pricing rules"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
