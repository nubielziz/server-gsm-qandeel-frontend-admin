// RulesView: the "Rules" view of the Alerts & incidents tab, the alert rules (`/admin/alert-rules`): condition, severity,
// channels, the on/off switch and the mute, with New rule, Edit and Delete. Rules with an open alert come first.
import { useState } from 'react';
import { EmptyState, Icon, SkeletonTable, usePageClamp } from '@/components/ui';
import { ActionButton, HealthCard } from '../../components';
import { PAGE_SIZE, POLL, useAlertRules, useUpdateAlertRule } from '../../hooks';
import type { AlertRule } from '../../types';
import { pageRange } from './alertsView';
import { DeleteRuleDialog } from './DeleteRuleDialog';
import { MuteRuleDialog } from './MuteRuleDialog';
import { RuleFormDialog } from './RuleFormDialog';
import { RulesTable } from './RulesTable';
import { problemsFirst } from './rules';
import { usePageParam } from './useListParams';

type DialogState = { kind: 'new' } | { kind: 'edit' | 'mute' | 'delete'; rule: AlertRule } | null;

/**
 * One card around the rules read. The switch and Unmute have no dialog, so they pass `toastErrors: true`: a refusal is a
 * toast. Every other change goes through a dialog that shows the server's answer itself.
 */
export function RulesView() {
  const [page, setPage] = usePageParam();
  const query = useAlertRules(pageRange(page, PAGE_SIZE));
  const update = useUpdateAlertRule({ toastErrors: true });
  const [dialog, setDialog] = useState<DialogState>(null);
  usePageClamp({
    page,
    pageSize: PAGE_SIZE,
    total: query.data?.total,
    settled: !query.isPlaceholderData,
    setPage,
  });
  const saving = update.isPending ? update.variables : undefined;

  return (
    <>
      <HealthCard
        title="Alert rules"
        sub="What raises an alert. The server checks the rules; this page only changes them."
        right={
          <ActionButton
            permission="alerts:create"
            variant="primary"
            onClick={() => setDialog({ kind: 'new' })}
          >
            <Icon name="plus" className="ic-sm" />
            New rule
          </ActionButton>
        }
        query={query}
        interval={POLL.normal}
        skeleton={<SkeletonTable cols={6} rows={4} />}
        errorTitle="Could not load the alert rules"
        permission="alerts:read"
        flush
      >
        {(data) => (
          <RulesTable
            rows={problemsFirst(data.data)}
            total={data.total}
            page={page}
            onPageChange={setPage}
            empty={
              <EmptyState icon="bell" title="No alert rules yet">
                Create a rule to be told when a metric crosses a limit.
              </EmptyState>
            }
            saving={saving}
            onToggle={(rule, isActive) => update.mutate({ id: rule.id, body: { isActive } })}
            onUnmute={(rule) => update.mutate({ id: rule.id, body: { mutedUntil: null } })}
            onMute={(rule) => setDialog({ kind: 'mute', rule })}
            onEdit={(rule) => setDialog({ kind: 'edit', rule })}
            onDelete={(rule) => setDialog({ kind: 'delete', rule })}
          />
        )}
      </HealthCard>
      {dialog?.kind === 'new' && <RuleFormDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && <RuleFormDialog rule={dialog.rule} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'mute' && <MuteRuleDialog rule={dialog.rule} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeleteRuleDialog rule={dialog.rule} onClose={() => setDialog(null)} />}
    </>
  );
}
