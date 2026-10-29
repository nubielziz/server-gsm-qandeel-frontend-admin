// Connects a react-hook-form form inside a FormDialog to a request that may fail: the server's field messages go under
// their fields, anything else shows in the dialog's error slot (decision 007). Shared by every feature's dialogs.
import type { FormEvent } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import type { FormDialogResult } from './FormDialog';
import { applyServerErrors, isApiError } from '@/lib/api';

export type DialogSubmitOptions<T extends FieldValues> = {
  /** The form's field names, so a message about any other field still shows in the error slot. */
  fields: readonly string[];
  /** Error codes that belong to one field when the problem names none, e.g. `EMAIL_TAKEN` to `email`. */
  codeFields?: Record<string, Path<T>>;
  /** API field names that differ from the form's, e.g. `{ cidr: 'ip' }`. */
  aliases?: Readonly<Record<string, string>>;
};

/**
 * The `onSubmit` of a FormDialog. `save` runs only when the form is valid. It may return a sentence to keep the dialog
 * open with that text (a client hint that stops the request), `false` to keep it open with no text (the problem is
 * already under a field), or throw: a thrown ApiError is placed on its fields and the dialog stays open. A form that
 * fails validation keeps the dialog open too.
 */
export function dialogSubmit<T extends FieldValues>(
  form: Pick<UseFormReturn<T>, 'handleSubmit' | 'setError'>,
  save: (values: T) => Promise<string | boolean | void>,
  options: DialogSubmitOptions<T>,
): (event: FormEvent<HTMLFormElement>) => Promise<FormDialogResult> {
  return async (event) => {
    let outcome: FormDialogResult = false;
    await form.handleSubmit(async (values) => {
      try {
        const stop = await save(values);
        outcome = typeof stop === 'string' ? stop : stop !== false;
      } catch (error) {
        const field = isApiError(error)
          ? codeField(error.code, error.fieldErrors, options.codeFields)
          : undefined;
        if (field && isApiError(error)) {
          form.setError(
            field,
            { type: 'server', message: error.detail ?? error.title },
            { shouldFocus: true },
          );
          outcome = false;
          return;
        }
        const rest = applyServerErrors(error, form.setError, {
          fields: options.fields,
          aliases: options.aliases,
        });
        outcome = rest.length > 0 ? rest.join(' ') : false;
      }
    })(event);
    return outcome;
  };
}

// The field a bare error code points at, when the problem named no field of its own.
function codeField<T extends FieldValues>(
  code: string,
  fieldErrors: Record<string, string[]>,
  codeFields: Record<string, Path<T>> | undefined,
): Path<T> | undefined {
  if (Object.keys(fieldErrors).length > 0) return undefined;
  return codeFields?.[code];
}
