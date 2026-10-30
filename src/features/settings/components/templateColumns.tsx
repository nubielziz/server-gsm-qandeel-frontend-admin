// templateColumns: the columns of the Customer emails table (email, sent in 30 days, row actions, the Send switch). Ports `cols` of
// tabNotifs in 55-p-settings.js; Edit and Delete come from the map.
import { Button, Switch, type DataTableColumn } from '@/components/ui';
import { num } from '@/lib/format';
import { eventLabel, templateMeta } from '../lib/templates';
import type { NotificationTemplate } from '../types';

export type TemplateColumnsArgs = {
  /** Props for the controls by permission (`disabled` and the reason). */
  locks: { update: { disabled: boolean; title?: string }; remove: { disabled: boolean; title?: string } };
  /** The id of the row whose switch is being saved. */
  savingId: number | undefined;
  onSend: (template: NotificationTemplate, on: boolean) => void;
  onPreview: (template: NotificationTemplate) => void;
  onEdit: (template: NotificationTemplate) => void;
  onDelete: (template: NotificationTemplate) => void;
};

/** The columns. */
export function templateColumns({
  locks,
  savingId,
  onSend,
  onPreview,
  onEdit,
  onDelete,
}: TemplateColumnsArgs): DataTableColumn<NotificationTemplate>[] {
  return [
    {
      key: 'event',
      label: 'Message',
      render: (template) => (
        <>
          <p className="font-medium">{eventLabel(template.event)}</p>
          <p className="text-2xs text-ink3">{templateMeta(template)}</p>
        </>
      ),
    },
    {
      key: 'sent',
      label: 'Sent, 30 days',
      num: true,
      hide: 'sm',
      render: (template) =>
        template.sentLast30Days ? num(template.sentLast30Days) : <span className="text-ink3">0</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (template) => (
        <span className="flex justify-end gap-1.5">
          <Button
            size="sm"
            aria-label={`Preview ${eventLabel(template.event)}`}
            onClick={() => onPreview(template)}
          >
            Preview
          </Button>
          <Button
            size="sm"
            aria-label={`Edit ${eventLabel(template.event)}`}
            disabled={locks.update.disabled}
            title={locks.update.title}
            onClick={() => onEdit(template)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            aria-label={`Delete ${eventLabel(template.event)}`}
            disabled={locks.remove.disabled}
            title={locks.remove.title}
            onClick={() => onDelete(template)}
          >
            Delete
          </Button>
        </span>
      ),
    },
    {
      key: 'on',
      label: 'Send',
      render: (template) => (
        <Switch
          checked={template.isActive}
          label={`${template.isActive ? 'Turn off' : 'Turn on'}: ${eventLabel(template.event)}`}
          disabled={locks.update.disabled || savingId === template.id}
          title={locks.update.title}
          onChange={(on) => onSend(template, on)}
        />
      ),
    },
  ];
}
