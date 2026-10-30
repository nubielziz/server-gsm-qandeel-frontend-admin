// RulesTable: the pricing rules: what each covers, its kind, what it does to the price, its dates and whether it is on, with Edit,
// Turn off / Turn on and Delete. Ports the category-rules table of rulesTab in 43-p-services.js (whose "Turn off" button deleted the
// rule); a rule can now also be edited, switched off without losing it, or deleted.
import type { ReactNode } from 'react';
import { Badge, Button, DataTable, TypeTag, type DataTableColumn } from '@/components/ui';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import { adjustmentText, appliesToText, datesText, KIND_LABEL, ruleDetails } from '../lib/rules';
import type { PricingRule } from '../types';

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
          {rule.group && <p className="text-xs text-ink3">{rule.group.name} group only</p>}
        </>
      ),
    },
    { key: 'kind', label: 'Type', hide: 'sm', render: (rule) => <TypeTag>{KIND_LABEL[rule.kind]}</TypeTag> },
    {
      key: 'adjustment',
      label: 'Adjustment',
      num: true,
      render: (rule) => (
        <>
          <span className="font-medium">{adjustmentText(rule)}</span>
          <p className="text-xs text-ink3">{ruleDetails(rule)}</p>
        </>
      ),
    },
    { key: 'dates', label: 'Dates', hide: 'md', render: (rule) => datesText(rule) || '–' },
    {
      key: 'status',
      label: 'Status',
      render: (rule) =>
        rule.isActive ? (
          <Badge tone="good" icon="checkCircle">
            On
          </Badge>
        ) : (
          <Badge tone="neutral" icon="ban">
            Off
          </Badge>
        ),
    },
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
