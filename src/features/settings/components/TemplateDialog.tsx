// TemplateDialog: "New template" and "Edit <event>" (`POST` and `PATCH /admin/notification-templates`): event, channel, audience and
// language (fixed after the first save), the subject and the message, and whether it is sent. The demo only had a canned preview; the map
// lets staff edit the texts. Only what changed is sent on an edit.
import { useForm } from 'react-hook-form';
import {
  CheckboxField,
  dialogSubmit,
  FormDialog,
  SelectField,
  TextareaField,
  TextField,
  toast,
} from '@/components/ui';
import { useCreateTemplate, useUpdateTemplate } from '../hooks/useTemplates';
import { AUDIENCE_OPTIONS, CHANNEL_OPTIONS, eventLabel } from '../lib/templates';
import type { CreateTemplateBody, NotificationTemplate, UpdateTemplateBody } from '../types';

type Values = CreateTemplateBody;

/** Creates a template, or edits the one it is given. */
export function TemplateDialog({
  template,
  onClose,
}: {
  template?: NotificationTemplate;
  onClose: () => void;
}) {
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const form = useForm<Values>({
    defaultValues: {
      event: template?.event ?? '',
      channel: template?.channel ?? 'email',
      audience: template?.audience ?? 'customer',
      locale: template?.locale ?? 'en',
      subject: template?.subject ?? '',
      body: template?.body ?? '',
      isActive: template?.isActive ?? true,
    },
  });
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const channel = watch('channel');
  const fixed = template !== undefined;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const next: CreateTemplateBody = {
        ...values,
        event: values.event.trim(),
        locale: values.locale.trim(),
        subject: values.channel === 'email' ? values.subject.trim() : '',
      };
      if (!template) {
        await create.mutateAsync(next);
        return;
      }
      const body: UpdateTemplateBody = {};
      if (next.subject !== template.subject) body.subject = next.subject;
      if (next.body !== template.body) body.body = next.body;
      if (next.isActive !== template.isActive) body.isActive = next.isActive;
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ template, body });
    },
    { fields: ['event', 'channel', 'audience', 'locale', 'subject', 'body', 'isActive'] },
  );

  return (
    <FormDialog
      open
      title={template ? `Edit ${eventLabel(template.event)}` : 'New template'}
      sub="The server fills marks such as {{orderId}} with the order's details when it sends the message. Use Preview to see a sample."
      confirm={template ? 'Save changes' : 'Create template'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Event"
            autoComplete="off"
            readOnly={fixed}
            autoFocus={!fixed}
            hint={fixed ? undefined : 'The event key, such as order.completed.'}
            error={errors.event}
            {...register('event', { validate: (v) => v.trim() !== '' || 'Enter the event.' })}
          />
          <TextField
            label="Language"
            autoComplete="off"
            readOnly={fixed}
            hint={fixed ? undefined : 'For example en.'}
            error={errors.locale}
            {...register('locale', { validate: (v) => v.trim() !== '' || 'Enter a language.' })}
          />
          <SelectField
            label="Channel"
            selectWrapClassName="w-full"
            disabled={fixed}
            options={CHANNEL_OPTIONS}
            error={errors.channel}
            {...register('channel')}
          />
          <SelectField
            label="Sent to"
            selectWrapClassName="w-full"
            disabled={fixed}
            options={AUDIENCE_OPTIONS}
            error={errors.audience}
            {...register('audience')}
          />
        </div>
        {channel === 'email' && (
          <TextField
            label="Subject"
            autoComplete="off"
            autoFocus={fixed}
            error={errors.subject}
            {...register('subject', {
              validate: (v) => channel !== 'email' || v.trim() !== '' || 'An email needs a subject.',
            })}
          />
        )}
        <TextareaField
          label="Message"
          rows={7}
          error={errors.body}
          {...register('body', { validate: (v) => v.trim() !== '' || 'Write the message.' })}
        />
        <CheckboxField label="Send this message" error={errors.isActive} {...register('isActive')} />
      </div>
    </FormDialog>
  );
}
