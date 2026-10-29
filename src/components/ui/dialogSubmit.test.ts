// Tests for dialogSubmit: what a dialog does with the outcome of its save (done, stopped, or failed on the server).
import type { FormEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { dialogSubmit } from './dialogSubmit';

type Values = { email: string; name: string };

/** A form whose handleSubmit runs the callback when `valid`, like react-hook-form does after validation. */
function fakeForm(valid = true) {
  const setError = vi.fn();
  const form = {
    setError,
    handleSubmit: (callback: (values: Values) => Promise<void>) => async () => {
      if (valid) await callback({ email: 'a@b.example', name: 'A' });
    },
  } as unknown as Pick<UseFormReturn<Values>, 'handleSubmit' | 'setError'>;
  return { form, setError };
}

const event = {} as FormEvent<HTMLFormElement>;
const options = { fields: ['email', 'name'], codeFields: { EMAIL_TAKEN: 'email' } } as const;

function problem(init: ConstructorParameters<typeof ApiError>[0]) {
  return new ApiError(init);
}

describe('dialogSubmit', () => {
  it('gives the save the form values and closes the dialog when it finishes', async () => {
    const { form } = fakeForm();
    const save = vi.fn(async () => undefined);
    await expect(dialogSubmit(form, save, options)(event)).resolves.toBe(true);
    expect(save).toHaveBeenCalledWith({ email: 'a@b.example', name: 'A' });
  });

  it('keeps the dialog open with a sentence when the save returns one, and with no text for false', async () => {
    const { form } = fakeForm();
    await expect(dialogSubmit(form, async () => 'Not allowed.', options)(event)).resolves.toBe(
      'Not allowed.',
    );
    await expect(dialogSubmit(form, async () => false, options)(event)).resolves.toBe(false);
  });

  it('keeps the dialog open, without calling the save, when the form is not valid', async () => {
    const { form } = fakeForm(false);
    const save = vi.fn(async () => undefined);
    await expect(dialogSubmit(form, save, options)(event)).resolves.toBe(false);
    expect(save).not.toHaveBeenCalled();
  });

  it('puts the server’s field messages under their fields and shows nothing else', async () => {
    const { form, setError } = fakeForm();
    const failure = problem({
      status: 422,
      title: 'Check the form',
      fieldErrors: { email: ['Not an address we know.'] },
    });
    await expect(dialogSubmit(form, async () => Promise.reject(failure), options)(event)).resolves.toBe(
      false,
    );
    expect(setError).toHaveBeenCalledWith(
      'email',
      { type: 'server', message: 'Not an address we know.' },
      { shouldFocus: true },
    );
  });

  it('shows what no field can take in the dialog', async () => {
    const { form } = fakeForm();
    const failure = problem({
      status: 422,
      title: 'Check the form',
      formErrors: ['Something general.'],
      fieldErrors: { elsewhere: ['Unknown field.'] },
    });
    await expect(dialogSubmit(form, async () => Promise.reject(failure), options)(event)).resolves.toBe(
      'Something general. elsewhere: Unknown field.',
    );
  });

  it('puts a bare error code on the field it belongs to', async () => {
    const { form, setError } = fakeForm();
    const failure = problem({
      status: 409,
      code: 'EMAIL_TAKEN',
      title: 'Email already in use',
      detail: 'An admin with this email already exists.',
    });
    await expect(dialogSubmit(form, async () => Promise.reject(failure), options)(event)).resolves.toBe(
      false,
    );
    expect(setError).toHaveBeenCalledWith(
      'email',
      { type: 'server', message: 'An admin with this email already exists.' },
      { shouldFocus: true },
    );
  });

  it('shows the message of any other failure in the dialog', async () => {
    const { form } = fakeForm();
    await expect(
      dialogSubmit(form, async () => Promise.reject(new Error('Network down.')), options)(event),
    ).resolves.toBe('Network down.');
    await expect(
      dialogSubmit(
        form,
        async () => Promise.reject(problem({ status: 500, title: 'Server error', detail: 'Oops.' })),
        options,
      )(event),
    ).resolves.toBe('Oops.');
  });
});
