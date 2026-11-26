// The fields form of the "Custom Fields" section of the edit view's Field part: the order fields of a service as a list of rows to add,
// reorder and remove. Saving replaces the whole list in this order (`PUT /admin/services/:id/fields`, through useReplaceFields), so the
// rows start from the saved list and a save resets them to the list the server answered.
import { useFieldArray, useForm } from 'react-hook-form';
import { dialogSubmit } from '@/components/ui';
import {
  fieldDraft,
  fieldErrorTargets,
  repeatedNameIndex,
  toServiceField,
  withMainInput,
  type FieldsFormValues,
} from '../lib/fields';
import type { ServiceDetail } from '../types';
import { useReplaceFields } from './useServicePartMutations';

/**
 * The form, its row list (`list`: append, move, remove), its `submit` (the section calls it when the fields are dirty, see
 * useFieldsSectionForm) and `setMainInput` (ticks or unticks the main input of a row; a service has at most one, so ticking one unticks the others). A name used by two rows, without regard
 * to letter case, is refused here with the row's message; any other refusal of the server lands under the input it names (the server
 * calls the choices `options`; a message about the hidden key or the hidden pattern lands under the row's name, one about the main-input flag on its tick box) and the rest in the
 * section's failure line. A saved field's pattern has no input and goes back in the body as it was saved.
 */
export function useCustomFieldsForm(service: ServiceDetail) {
  const replace = useReplaceFields();
  const form = useForm<FieldsFormValues>({ defaultValues: { fields: service.fields.map(fieldDraft) } });
  const list = useFieldArray({ control: form.control, name: 'fields' });
  const targets = fieldErrorTargets(form.getValues('fields'));

  const setMainInput = (index: number, on: boolean) => {
    const current = form.getValues('fields');
    withMainInput(current, index, on).forEach((draft, row) => {
      if (draft.isMainInput !== current[row]?.isMainInput) {
        form.setValue(`fields.${row}.isMainInput`, draft.isMainInput, { shouldDirty: true });
      }
    });
  };

  const submit = dialogSubmit(
    form,
    async ({ fields: drafts }) => {
      const repeated = repeatedNameIndex(drafts);
      if (repeated >= 0) {
        form.setError(
          `fields.${repeated}.name`,
          { type: 'validate', message: 'This name is used by an earlier field.' },
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

  return { form, list, submit, setMainInput };
}
