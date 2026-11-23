// The form behind the "Custom Fields" section of the edit view's Field part: the order fields of a service as a list of rows to add,
// reorder and remove. Saving replaces the whole list in this order (`PUT /admin/services/:id/fields`, through useReplaceFields), so the
// rows start from the saved list and a save resets them to the list the server answered.
import { useFieldArray, useForm } from 'react-hook-form';
import { dialogSubmit } from '@/components/ui';
import {
  fieldDraft,
  fieldErrorTargets,
  repeatedKeyIndex,
  toServiceField,
  type FieldsFormValues,
} from '../lib/fields';
import type { ServiceDetail } from '../types';
import { useReplaceFields } from './useServicePartMutations';

/**
 * The form, its row list (`list`: append, move, remove) and its `submit` (plug it into a SectionForm). A key used by two rows is refused
 * here with the row's message; any other refusal of the server lands under the input it names (the server calls the choices `options`)
 * and the rest in the section's failure line.
 */
export function useCustomFieldsForm(service: ServiceDetail) {
  const replace = useReplaceFields();
  const form = useForm<FieldsFormValues>({ defaultValues: { fields: service.fields.map(fieldDraft) } });
  const list = useFieldArray({ control: form.control, name: 'fields' });
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
      const saved = await replace.mutateAsync({ service, body: { fields: drafts.map(toServiceField) } });
      form.reset({ fields: saved.map(fieldDraft) });
    },
    // Only the inputs that show an error are listed; any other message from the server falls to the section's failure line.
    { fields: targets.names, aliases: targets.aliases },
  );

  return { form, list, submit };
}
