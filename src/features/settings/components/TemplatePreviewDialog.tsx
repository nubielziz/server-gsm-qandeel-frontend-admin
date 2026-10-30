// TemplatePreviewDialog: "Preview" of a template (`POST /admin/notification-templates/:id/preview`): the subject and body the server renders
// with sample data, in a mail-like frame. Ports `st-nt-view` of 55-p-settings.js, which printed a canned sample; the server does the rendering now.
import { Button, ErrorState, Modal, Skeleton } from '@/components/ui';
import { useTemplatePreview } from '../hooks/useTemplates';
import { eventLabel, templateMeta } from '../lib/templates';
import type { NotificationTemplate } from '../types';
import { PreviewFrame } from './PreviewFrame';

/** The preview of one template, asked for when the dialog opens. */
export function TemplatePreviewDialog({
  template,
  onClose,
}: {
  template: NotificationTemplate;
  onClose: () => void;
}) {
  const preview = useTemplatePreview(template.id);
  const data = preview.data;
  return (
    <Modal
      open
      title={eventLabel(template.event)}
      sub={templateMeta(template)}
      size="lg"
      onClose={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {preview.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : preview.isError ? (
        <ErrorState
          title="Could not preview this template"
          error={preview.error}
          onRetry={() => void preview.refetch()}
        />
      ) : data ? (
        <>
          <div className="rounded-lg border border-line">
            <div className="border-b border-line bg-sunken px-3.5 py-2 text-xs text-ink3">
              {data.from && (
                <>
                  From {data.from}
                  <br />
                </>
              )}
              {template.channel === 'email' ? 'Subject: ' : 'Message: '}
              <span className="text-ink">{data.subject || eventLabel(template.event)}</span>
            </div>
            <PreviewFrame preview={data} />
          </div>
          <p className="mt-2 text-xs text-ink3">
            {data.note ?? 'A sample with made-up details, made by the server.'}
          </p>
        </>
      ) : null}
    </Modal>
  );
}
