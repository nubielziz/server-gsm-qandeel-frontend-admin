// EmailsTab: the "Customer emails" tab: the templates for each event and channel with a Send switch, Preview, Edit and Delete. Ports
// tabNotifs and `st-nt` of 55-p-settings.js. The menus above the table (who receives it, which channel) live in the address.
import { useState } from 'react';
import { Button, DataTable, EmptyState, Icon, Panel, SelectField, TableToolbar } from '@/components/ui';
import { num } from '@/lib/format';
import { useListView } from '../hooks/useListView';
import { useSettingsGrants } from '../hooks/useSettingsGrants';
import { useTemplateList, useToggleTemplate } from '../hooks/useTemplates';
import {
  AUDIENCE_FILTER_OPTIONS,
  CHANNEL_FILTER_OPTIONS,
  DEFAULT_AUDIENCE,
  isProofEmail,
} from '../lib/templates';
import { TemplateDialogs, type TemplateDialogState } from './TemplateDialogs';
import { templateColumns } from './templateColumns';

const CUSTOMER_SUB =
  'What customers receive after they pay. Receipts and delivery emails should stay on: they are the proof that the service was delivered.';

/** The toolbar, the table and the dialogs. */
export function EmailsTab() {
  const grants = useSettingsGrants();
  const view = useListView(['audience', 'channel']);
  // An absent `audience` means the customer emails; `all` asks for every audience.
  const picked = view.filters.audience || DEFAULT_AUDIENCE;
  const { templates, query } = useTemplateList(
    { audience: picked === 'all' ? '' : picked, channel: view.filters.channel },
    grants.ready && grants.can('notifications:read'),
  );
  const toggle = useToggleTemplate();
  const [dialog, setDialog] = useState<TemplateDialogState | null>(null);
  const createLock = grants.needs('notifications:create');
  const updateLock = grants.needs('notifications:update');
  const deleteLock = grants.needs('notifications:delete');

  const newButton = (
    <Button
      variant="primary"
      size="sm"
      disabled={createLock.disabled}
      title={createLock.title}
      onClick={() => setDialog({ kind: 'create' })}
    >
      <Icon name="plus" className="ic-sm" />
      New template
    </Button>
  );

  return (
    <>
      <Panel
        title={AUDIENCE_FILTER_OPTIONS.find((option) => option.value === picked)?.label ?? 'Customer emails'}
        sub={picked === DEFAULT_AUDIENCE ? CUSTOMER_SUB : 'The text of each message, per event and channel.'}
        flush
        right={newButton}
      >
        <TableToolbar
          count={
            query.isSuccess
              ? `${num(templates.length)} ${templates.length === 1 ? 'template' : 'templates'}`
              : undefined
          }
        >
          <SelectField
            aria-label="Who receives it"
            value={picked}
            options={AUDIENCE_FILTER_OPTIONS}
            onChange={(event) =>
              view.setFilters({ audience: event.target.value === DEFAULT_AUDIENCE ? '' : event.target.value })
            }
          />
          <SelectField
            aria-label="Channel"
            value={view.filters.channel}
            options={CHANNEL_FILTER_OPTIONS}
            onChange={(event) => view.setFilters({ channel: event.target.value })}
          />
        </TableToolbar>
        <div className="border-t border-line">
          <DataTable
            caption="Message templates"
            columns={templateColumns({
              locks: { update: updateLock, remove: deleteLock },
              savingId: toggle.isPending ? toggle.variables?.template.id : undefined,
              // Turning off a receipt or result email asks first, as the demo does.
              onSend: (template, on) =>
                !on && isProofEmail(template)
                  ? setDialog({ kind: 'off', template })
                  : toggle.mutate({ template, on }),
              onPreview: (template) => setDialog({ kind: 'preview', template }),
              onEdit: (template) => setDialog({ kind: 'edit', template }),
              onDelete: (template) => setDialog({ kind: 'delete', template }),
            })}
            rows={templates}
            rowKey={(template) => template.id}
            state={query.isLoading ? 'loading' : query.isError ? 'error' : 'ready'}
            error={query.error}
            errorTitle="Could not load the templates"
            onRetry={() => void query.refetch()}
            empty={
              <EmptyState icon="mail" title="No messages" cta={newButton}>
                Messages to customers are configured here.
              </EmptyState>
            }
          />
        </div>
      </Panel>
      <TemplateDialogs dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}
