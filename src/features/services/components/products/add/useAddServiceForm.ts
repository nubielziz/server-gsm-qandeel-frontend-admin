// The form of +Add Service (a service made by hand) with its save: one create call, then (only when the form asks for an Inactive or
// Manual service) one update, because the create route takes neither. One hook for the form, so a refusal lands under its field.
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast, errorText } from '@/components/ui';
import { applyServerErrors } from '@/lib/api';
import { useApiMutation } from '@/lib/query';
import { createService, updateService } from '../../../api';
import { SERVICE_STALE_KEYS, staleServicesAndCategories } from '../../../hooks/keys';
import type { Service, ServiceType } from '../../../types';
import {
  ADD_SERVICE_ALIASES,
  ADD_SERVICE_FIELDS,
  addServiceDefaults,
  createBody,
  followUpBody,
  followUpWords,
  type AddServiceValues,
} from './addServiceForm';
import { clearAddDraft, readAddDraft } from './groupHandoff';

/** What the save did: the service the server made, and the refusal of the second call (`null` when there was none; the service exists either way). */
type AddResult = { created: Service; followUpRefusal: unknown };

/**
 * Creates the form and its `submit` (the form's `onSubmit`). A refusal of the create lands under the field it names, the rest in `problem`;
 * nothing is created then. When the create worked and the update after it was refused, the service exists: a toast says so (and what was not
 * saved) and `onAdded` still gets the service, so the form can open its editor. `onAdded` is also called after a clean save.
 * The form starts from the draft the person left when they went to add a group (see groupHandoff.ts); the draft is used once, so it is
 * cleared as soon as the form has taken it.
 */
export function useAddServiceForm(type: ServiceType, onAdded: (service: Service) => void) {
  const [draft] = useState(() => readAddDraft(type));
  const form = useForm<AddServiceValues>({ defaultValues: draft ?? addServiceDefaults() });
  useEffect(() => {
    clearAddDraft(type);
  }, [type]);
  const [problem, setProblem] = useState<string | null>(null);

  const add = useApiMutation<AddResult, AddServiceValues>({
    mutationFn: async (values) => {
      const created = await createService(createBody(values, type));
      const next = followUpBody(values);
      if (!next) return { created, followUpRefusal: null };
      try {
        await updateService(created.id, next);
        return { created, followUpRefusal: null };
      } catch (refusal) {
        return { created, followUpRefusal: refusal };
      }
    },
    invalidates: ({ created }) => staleServicesAndCategories(created.id),
    invalidateKeys: SERVICE_STALE_KEYS,
    successNotification: ({ created, followUpRefusal }) =>
      followUpRefusal
        ? false
        : {
            message: `${created.name} added`,
            description: 'Finish its fields, supplier connection and prices here.',
          },
    // The form shows the refusal under its field.
    errorNotification: () => false,
  });

  const submit = form.handleSubmit(async (values) => {
    setProblem(null);
    let result: AddResult;
    try {
      result = await add.mutateAsync(values);
    } catch (error) {
      const rest = applyServerErrors(error, form.setError, {
        fields: ADD_SERVICE_FIELDS,
        aliases: ADD_SERVICE_ALIASES,
      });
      setProblem(rest.length > 0 ? rest.join(' ') : null);
      return;
    }
    const { created, followUpRefusal } = result;
    const next = followUpBody(values);
    if (followUpRefusal && next) {
      toast({
        kind: 'error',
        title: `${created.name} was added, but its ${followUpWords(next)} was not saved`,
        body: `${errorText(followUpRefusal)} Set it in the editor.`,
        ttl: 9000,
      });
    }
    onAdded(created);
  });

  return { form, submit, pending: add.isPending, problem };
}
