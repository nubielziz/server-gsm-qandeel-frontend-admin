// RulesTable: the alert rules as a table from `md` up and as cards below (ResponsiveTable). The switch and Unmute act at
// once; Mute, Edit and Delete open their dialogs. "Muted" only says whether and until when; its buttons are in the last
// column.
import type { ReactNode } from 'react';
import type { DataTableColumn } from '@/components/ui';
import { useNow } from '@/lib/format';
import { ActionButton, MetaBadge, ResponsiveTable } from '../../components';
import { PAGE_SIZE } from '../../hooks';
import { alertSeverityMeta } from '../../lib';
import type { AlertRule, UpdateAlertRuleBody } from '../../types';
import { channelsText } from './condition';
import { ActiveCell, MuteAction, MutedCell, RuleConditionCell, RuleNameCell } from './RuleCells';
import { RowActions } from './RowActions';

export interface RulesTableProps {
  rows: readonly AlertRule[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  empty: ReactNode;
  /** The change being saved right now, if any, so its switch or Unmute shows the new value or a spinner. */
  saving: { id: number; body: UpdateAlertRuleBody } | undefined;
  onToggle: (rule: AlertRule, active: boolean) => void;
  onUnmute: (rule: AlertRule) => void;
  onMute: (rule: AlertRule) => void;
  onEdit: (rule: AlertRule) => void;
  onDelete: (rule: AlertRule) => void;
}

/**
 * Rules in the order given (the view puts the ones with an open alert first). The switch and Unmute change the rule at once,
 * Mute, Edit and Delete open a dialog; all of it through the callbacks, so this component holds no data of its own. The
 * buttons are one set for every rule (Mute or Unmute, Edit, Delete), so Edit and Delete stay in the same place.
 */
export function RulesTable({
  rows,
  total,
  page,
  onPageChange,
  empty,
  saving,
  onToggle,
  onUnmute,
  onMute,
  onEdit,
  onDelete,
}: RulesTableProps) {
  const now = useNow();
  const savingOf = (rule: AlertRule) => (saving?.id === rule.id ? saving.body : undefined);

  const columns: DataTableColumn<AlertRule>[] = [
    { key: 'rule', label: 'Rule', render: (rule) => <RuleNameCell rule={rule} now={now} /> },
    { key: 'condition', label: 'Condition', render: (rule) => <RuleConditionCell rule={rule} /> },
    {
      key: 'severity',
      label: 'Severity',
      render: (rule) => <MetaBadge meta={alertSeverityMeta(rule.severity)} />,
    },
    {
      key: 'channels',
      label: 'Channels',
      hide: 'xl',
      render: (rule) => <span className="whitespace-nowrap">{channelsText(rule.channels)}</span>,
    },
    {
      key: 'active',
      label: 'Active',
      render: (rule) => (
        <ActiveCell
          rule={rule}
          pending={savingOf(rule)?.isActive}
          busy={saving !== undefined}
          onChange={(next) => onToggle(rule, next)}
        />
      ),
    },
    // Channels and Muted give way below xl, so the row's buttons stay in view on a small laptop.
    { key: 'muted', label: 'Muted', hide: 'xl', render: (rule) => <MutedCell rule={rule} now={now} /> },
    {
      key: 'actions',
      label: '',
      render: (rule) => (
        <RowActions>
          <MuteAction
            rule={rule}
            now={now}
            unmuting={savingOf(rule)?.mutedUntil === null}
            busy={saving !== undefined}
            onMute={() => onMute(rule)}
            onUnmute={() => onUnmute(rule)}
          />
          <ActionButton permission="alerts:update" size="sm" onClick={() => onEdit(rule)}>
            Edit
          </ActionButton>
          <ActionButton permission="alerts:delete" size="sm" variant="danger" onClick={() => onDelete(rule)}>
            Delete
          </ActionButton>
        </RowActions>
      ),
    },
  ];

  return (
    <ResponsiveTable
      caption="Alert rules"
      columns={columns}
      rows={rows}
      rowKey={(rule) => rule.id}
      empty={empty}
      pagination={{ page, pageSize: PAGE_SIZE, total }}
      onPageChange={onPageChange}
    />
  );
}
