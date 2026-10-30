// FieldsForm: the form of the Fields dialog: the service's custom fields as a list of rows to add, reorder and remove. Saving
// replaces the whole list in this order (`PUT /admin/services/:id/fields`).
import { useFieldArray, useForm } from 'react-hook-form';
import { Button, dialogSubmit, FormDialog, Icon } from '@/components/ui';
import { useReplaceFields } from '../hooks/useServicePartMutations';
import {
  blankField,
  fieldDraft,
  fieldErrorTargets,
  repeatedKeyIndex,
  toServiceField,
  type FieldsFormValues,
} from '../lib/fields';
import type { Service, ServiceField } from '../types';
import { FieldRow } from './FieldRow';

export interface FieldsFormProps {
  service: Service;
  saved: readonly ServiceField[];
  onClose: () => void;
}

/** The list of field rows with Add, Move and Remove. */
export function FieldsForm({ service, saved, onClose }: FieldsFormProps) {
  const replace = useReplaceFields();
  const form = useForm<FieldsFormValues>({ defaultValues: { fields: saved.map(fieldDraft) } });
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: 'fields' });

  const targets = fieldErrorTargets(form.getValues('fields'));

  const submit = dialogSubmit(
    form,
    async ({ fields: drafts }) => {
      const repeated = repeatedKeyIndex(drafts);
      if (repeated >= 0) {
        form.setError(
          `fields.${repeated}.key`,
          { type: 'validate', message: 'This key is used by an earlier field.' },
          { shouldFocus: true },
        );
        return false;
      }
      await replace.mutateAsync({ service, body: { fields: drafts.map(toServiceField) } });
    },
    // Only the inputs that show an error are listed; any other message from the server falls to the dialog's error slot.
    { fields: targets.names, aliases: targets.aliases },
  );

  return (
    <FormDialog
      open
      size="lg"
      title="Fields"
      sub={`${service.name}: what the buyer fills in when ordering`}
      confirm="Save fields"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        {fields.length === 0 ? (
          <p className="rounded-md border border-dashed border-line2 p-4 text-sm text-ink3">
            No custom fields. The buyer only gives the main input (an IMEI, an account, a serial number).
          </p>
        ) : (
          <ul className="m-0 list-none space-y-3 p-0">
            {fields.map((field, index) => (
              <FieldRow
                key={field.id}
                index={index}
                count={fields.length}
                form={form}
                onMove={move}
                onRemove={remove}
              />
            ))}
          </ul>
        )}
        <Button size="sm" onClick={() => append(blankField())}>
          <Icon name="plus" className="ic-sm" />
          Add a field
        </Button>
      </div>
    </FormDialog>
  );
}
