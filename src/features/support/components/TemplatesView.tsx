// TemplatesView: the Templates view of the Support page (`?view=templates`): the reply templates, a New template button, and the add,
// edit and delete dialogs. New in the console; the demo's macros were fixed in the seed data. Creating needs `support:create`,
// editing `support:update` and deleting `support:delete`.
import { useState } from 'react';
import { Button, ConfirmDialog, EmptyState, Icon, Panel } from '@/components/ui';
import { num } from '@/lib/format';
import type { SupportGrants } from '../hooks/useSupportGrants';
import { TEMPLATE_CAP, useDeleteTemplate, useTemplates } from '../hooks/useTemplates';
import type { ReplyTemplate } from '../types';
import { TemplateDialog } from './TemplateDialog';
import { TemplatesTable } from './TemplatesTable';

type Dialog =
  { kind: 'new' } | { kind: 'edit'; template: ReplyTemplate } | { kind: 'delete'; template: ReplyTemplate };

export function TemplatesView({ grants }: { grants: SupportGrants }) {
  const list = useTemplates({ enabled: grants.ready });
  const remove = useDeleteTemplate();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const createLock = grants.needs('support:create');
  const close = () => setDialog(null);
  const capped = list.total !== undefined && list.total > TEMPLATE_CAP;

  return (
    <>
      <Panel
        flush
        title="Reply templates"
        sub={
          list.query.isSuccess
            ? `${num(list.total ?? list.templates.length)} ${list.templates.length === 1 ? 'template' : 'templates'}`
            : undefined
        }
        right={
          <Button
            variant="primary"
            disabled={createLock.disabled}
            title={createLock.title}
            onClick={() => setDialog({ kind: 'new' })}
          >
            <Icon name="plus" className="ic-sm" />
            New template
          </Button>
        }
      >
        <TemplatesTable
          rows={list.templates}
          state={list.query.isLoading || !grants.ready ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          onRetry={() => void list.query.refetch()}
          grants={grants}
          onEdit={(template) => setDialog({ kind: 'edit', template })}
          onDelete={(template) => setDialog({ kind: 'delete', template })}
          empty={
            <EmptyState icon="mail" title="No reply templates">
              Write the answers you send again and again once, then insert them from the reply box.
            </EmptyState>
          }
        />
        {capped && (
          <p className="border-t border-line px-3.5 py-2 text-xs text-ink3">
            Showing the first {num(TEMPLATE_CAP)} of {num(list.total ?? 0)} templates.
          </p>
        )}
      </Panel>
      {dialog?.kind === 'new' && <TemplateDialog onClose={close} />}
      {dialog?.kind === 'edit' && <TemplateDialog template={dialog.template} onClose={close} />}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          open
          kind="danger"
          title={`Delete ${dialog.template.title}?`}
          body={<p>Replies already sent keep their text. The template just leaves the reply box.</p>}
          confirm="Delete template"
          onClose={close}
          onConfirm={() => remove.mutateAsync(dialog.template).then(() => undefined)}
        />
      )}
    </>
  );
}
