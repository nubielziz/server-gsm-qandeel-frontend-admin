// TemplateDialogs: the dialog the Customer emails tab has open: new or edit, preview, delete, or the check before turning off a receipt or
// result email (the demo's confirmDlg for `st-nt`). Each shows the server's refusal in its own error slot.
import { ConfirmDialog } from '@/components/ui';
import { useDeleteTemplate, useToggleTemplate } from '../hooks/useTemplates';
import { eventLabel } from '../lib/templates';
import type { NotificationTemplate } from '../types';
import { TemplateDialog } from './TemplateDialog';
import { TemplatePreviewDialog } from './TemplatePreviewDialog';

/** Which dialog is open. */
export type TemplateDialogState =
  { kind: 'create' } | { kind: 'edit' | 'preview' | 'delete' | 'off'; template: NotificationTemplate };

/** The open dialog, or nothing. */
export function TemplateDialogs({
  dialog,
  onClose,
}: {
  dialog: TemplateDialogState | null;
  onClose: () => void;
}) {
  const toggle = useToggleTemplate();
  const remove = useDeleteTemplate();
  if (!dialog) return null;
  if (dialog.kind === 'create') return <TemplateDialog onClose={onClose} />;
  const { template } = dialog;
  if (dialog.kind === 'edit') return <TemplateDialog template={template} onClose={onClose} />;
  if (dialog.kind === 'preview') return <TemplatePreviewDialog template={template} onClose={onClose} />;
  if (dialog.kind === 'off') {
    return (
      <ConfirmDialog
        open
        title={`Turn off “${eventLabel(template.event)}”?`}
        body={
          <p>
            Customers will not get this email. Without a receipt or a delivery email you have no proof to send
            when a customer disputes a charge.
          </p>
        }
        confirm="Turn off"
        kind="danger"
        onClose={onClose}
        onConfirm={() => toggle.mutateAsync({ template, on: false }).then(() => undefined)}
      />
    );
  }
  return (
    <ConfirmDialog
      open
      title={`Delete “${eventLabel(template.event)}”?`}
      body={
        <p>The template is removed for good. The event then sends nothing in this language and channel.</p>
      }
      confirm="Delete template"
      kind="danger"
      onClose={onClose}
      onConfirm={() => remove.mutateAsync(template).then(() => undefined)}
    />
  );
}
