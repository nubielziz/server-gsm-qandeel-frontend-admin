// TemplateDialog: "New template" and "Edit template": title, category, language, shortcut and text, with a live preview of the
// variables. New in the console (the demo only had the list of macros). Edit sends only the fields that changed; a failed save
// shows under the field the server names, or in the dialog.
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextareaField, TextField, dialogSubmit, toast } from '@/components/ui';
import { useCreateTemplate, useUpdateTemplate } from '../hooks/useTemplates';
import { CATEGORY_OPTIONS, LOCALE_OPTIONS } from '../lib/status';
import { changedTemplateFields, cleanTemplate, type TemplateFormValues } from '../lib/templateForm';
import type { ReplyTemplate } from '../types';
import { TemplatePreview } from './TemplatePreview';

const FIELDS = ['title', 'category', 'locale', 'shortcut', 'body'] as const;

export interface TemplateDialogProps {
  /** The template being edited; leave out for a new one. */
  template?: ReplyTemplate;
  onClose: () => void;
}

export function TemplateDialog({ template, onClose }: TemplateDialogProps) {
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const form = useForm<TemplateFormValues>({
    defaultValues: {
      title: template?.title ?? '',
      category: template?.category ?? 'other',
      locale: template?.locale ?? 'en',
      shortcut: template?.shortcut ?? '',
      body: template?.body ?? '',
    },
  });
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      if (!template) {
        await create.mutateAsync(cleanTemplate(values));
        return;
      }
      const body = changedTemplateFields(template, values);
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ id: template.id, body });
    },
    { fields: FIELDS, codeFields: { SHORTCUT_TAKEN: 'shortcut' } },
  );

  return (
    <FormDialog
      open
      size="lg"
      title={template ? `Edit ${template.title}` : 'New template'}
      sub="Staff pick a template in the reply box; it fills the draft and they can change it before sending."
      confirm={template ? 'Save changes' : 'Add template'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Title"
          wrapperClassName="sm:col-span-2"
          autoComplete="off"
          error={errors.title}
          {...register('title', {
            validate: (value) => value.trim().length > 0 || 'Give the template a title.',
          })}
        />
        <SelectField
          label="Category"
          selectWrapClassName="w-full"
          options={CATEGORY_OPTIONS}
          hint="Tickets of this category (and how-to tickets) are offered the template."
          error={errors.category}
          {...register('category')}
        />
        <SelectField
          label="Language"
          selectWrapClassName="w-full"
          options={LOCALE_OPTIONS}
          error={errors.locale}
          {...register('locale')}
        />
        <TextField
          label="Shortcut"
          wrapperClassName="sm:col-span-2"
          autoComplete="off"
          spellCheck={false}
          placeholder="/refund (optional)"
          error={errors.shortcut}
          {...register('shortcut')}
        />
        <TextareaField
          label="Text"
          wrapperClassName="sm:col-span-2"
          rows={6}
          hint="Use {{name}}, {{order}} and {{eta}} where the ticket’s details belong."
          error={errors.body}
          {...register('body', { validate: (value) => value.trim().length > 0 || 'Write the reply text.' })}
        />
        <div className="sm:col-span-2">
          <TemplatePreview body={watch('body')} />
        </div>
      </div>
    </FormDialog>
  );
}
