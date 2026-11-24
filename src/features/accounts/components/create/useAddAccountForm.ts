// The form of +Add Account with its save: one create call, and a refusal of the server under the field it names. The two conflicts of an
// email have their own words: a login account that holds it (`EMAIL_TAKEN`, under Email) and a guest that bought with it (code `guest`,
// under Email with a link to that guest). What the form cannot place shows beside the Add button.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { applyServerErrors, isApiError } from '@/lib/api';
import { useCreateAccount } from '../../hooks/useAccountMutations';
import type { CreateAccountResult, Rank } from '../../types';
import {
  ADD_ACCOUNT_ALIASES,
  ADD_ACCOUNT_FIELDS,
  addAccountBody,
  addAccountDefaults,
  chosenRank,
  GUEST_EMAIL_WORDS,
  type AddAccountValues,
} from './addAccountForm';

const TAKEN_WORDS = 'Another account with a login uses this email.';

export interface UseAddAccountFormOptions {
  /** The ranks the menu offers; a merchant rank is looked up here. */
  ranks: readonly Rank[];
  /** The staff member may set a credit limit (`wallet:credit_limit`). */
  creditAllowed: boolean;
  /** The account was added. A temporary password, when the server made one, is in `temporaryPassword` (shown once, never kept). */
  onAdded: (created: CreateAccountResult) => void;
}

/**
 * The form, its `submit` (the form's `onSubmit`), whether the save is running, what the form could not place (`problem`) and `reset`,
 * which lets go of the answer of the save (it may hold a temporary password).
 *
 * Side effects: `POST /admin/clients`; the lists, the ranks' counts and the strip's counts are read again; a toast.
 */
export function useAddAccountForm({ ranks, creditAllowed, onAdded }: UseAddAccountFormOptions) {
  const create = useCreateAccount();
  const form = useForm<AddAccountValues>({ defaultValues: addAccountDefaults() });
  const [problem, setProblem] = useState<string | null>(null);

  const submit = form.handleSubmit(async (values) => {
    setProblem(null);
    try {
      onAdded(
        await create.mutateAsync(addAccountBody(values, chosenRank(ranks, values.rank), creditAllowed)),
      );
    } catch (error) {
      if (isApiError(error) && error.fieldCodes.email?.includes('guest')) {
        form.setError('email', { type: 'guest', message: GUEST_EMAIL_WORDS }, { shouldFocus: true });
        return;
      }
      // A taken email names no field when the server answers with the code alone: it belongs under Email.
      if (isApiError(error) && error.code === 'EMAIL_TAKEN' && Object.keys(error.fieldErrors).length === 0) {
        form.setError(
          'email',
          { type: 'server', message: error.detail ?? TAKEN_WORDS },
          { shouldFocus: true },
        );
        return;
      }
      const rest = applyServerErrors(error, form.setError, {
        fields: ADD_ACCOUNT_FIELDS,
        aliases: ADD_ACCOUNT_ALIASES,
      });
      setProblem(rest.length > 0 ? rest.join(' ') : null);
    }
  });

  return { form, submit, pending: create.isPending, problem, reset: create.reset };
}
