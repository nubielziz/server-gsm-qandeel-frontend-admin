// The forms behind the one visible "Custom Fields" section of the edit view's Field part (decision 032): the order fields and the quantity
// rule are two form objects (useCustomFieldsForm, useQuantityForm) under one Save. The routes stay two: `PUT /admin/services/:id/fields`
// and `PATCH /admin/services/:id`.
import type { FormEvent } from 'react';
import { outcomeOf, toast, type FormDialogResult } from '@/components/ui';
import type { ServiceDetail } from '../types';
import { useCustomFieldsForm } from './useCustomFieldsForm';
import { QUANTITY_UNCHANGED, useQuantityForm } from './useQuantityForm';

/** What one part's save came to: it saved, it had nothing to send (the quantity only), or it failed. */
type PartResult = 'saved' | 'unchanged' | { failed: string | null };

function readResult(result: FormDialogResult | typeof QUANTITY_UNCHANGED): PartResult {
  if (result === QUANTITY_UNCHANGED) return 'unchanged';
  const outcome = outcomeOf(result);
  return outcome.saved ? 'saved' : { failed: outcome.message };
}

/**
 * Both forms, the row list, the main input setter and the Label column's tick box (`labels`) of the fields, whether the section holds unsaved changes (`dirty`: either part does),
 * and the one `submit` (plug it into a SectionForm). It sends only what changed: the fields when the fields are dirty, then the quantity
 * when the quantity is dirty. The parts are judged alone: a part that fails (the browser's checks or the server) does not stop the other,
 * the part that saved is reset and clean, the failed part stays dirty with its messages under its own inputs, and the section's
 * `dirty` stays true so Save stays on. A message that belongs to no input goes to the section's failure line. When the only dirty part
 * turns out to be the saved rule, nothing is sent and an info toast says "Nothing changed".
 */
export function useFieldsSectionForm(service: ServiceDetail) {
  const custom = useCustomFieldsForm(service);
  const quantity = useQuantityForm(service);
  const fieldsDirty = custom.dirty;
  const quantityDirty = quantity.form.formState.isDirty;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<FormDialogResult> => {
    const results: PartResult[] = [];
    if (fieldsDirty) results.push(readResult(await custom.submit(event)));
    if (quantityDirty) results.push(readResult(await quantity.submit(event)));

    const failures = results.filter((result) => typeof result === 'object');
    if (failures.length > 0) {
      const messages = failures.flatMap((failure) => (failure.failed === null ? [] : [failure.failed]));
      return messages.length > 0 ? [...new Set(messages)].join(' ') : false;
    }
    if (results.includes('saved')) return true;
    toast({ kind: 'info', title: 'Nothing changed' });
    return false;
  };

  return {
    form: custom.form,
    list: custom.list,
    setMainInput: custom.setMainInput,
    labels: custom.labels,
    quantityForm: quantity.form,
    dirty: fieldsDirty || quantityDirty,
    submit,
  };
}
