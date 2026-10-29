// Adapter between react-hook-form's handleSubmit and FormDialog (only react-hook-form types are imported).
import type { FormEvent } from 'react';
import type { FieldValues, SubmitHandler, UseFormHandleSubmit } from 'react-hook-form';

/**
 * handleSubmit() resolves normally when validation fails, which FormDialog would read as "done" and close.
 * This wrapper resolves true only when `save` ran to the end, so an invalid form keeps the dialog open
 * (react-hook-form itself focuses the first invalid field). If `save` throws, FormDialog shows the error.
 *
 *   <FormDialog onSubmit={submitUnlessInvalid(handleSubmit, (values) => mutateAsync(values))} …>
 */
export function submitUnlessInvalid<TValues extends FieldValues, TOutput = TValues>(
  handleSubmit: UseFormHandleSubmit<TValues, TOutput>,
  save: SubmitHandler<TOutput>,
): (event: FormEvent<HTMLFormElement>) => Promise<boolean> {
  return async (event) => {
    let saved = false;
    await handleSubmit(async (values, e) => {
      await save(values, e);
      saved = true;
    })(event);
    return saved;
  };
}
