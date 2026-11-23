// The form of a service's details (name, code, category, type, SLA, quantity) with its save. One hook for the New/Edit service
// dialog and the panel's Details section, so both send the same body through the same mutation and show server errors alike.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { dialogSubmit, toast } from '@/components/ui';
import {
  createServiceBody,
  serviceDetailsDefaults,
  serviceDetailsFields,
  updateServiceBody,
  type ServiceDetailsValues,
} from '../lib/serviceDetails';
import type { Service } from '../types';
import { useCreateService, useUpdateService } from './useServiceMutations';

export interface ServiceDetailsFormOptions {
  /**
   * True for a form that stays open after a save (the panel). When nothing changed the save then says so and does not read as a
   * save ("Saved" is not shown); the dialog closes either way.
   */
  stay?: boolean;
}

/**
 * Creates the form for one service (or a blank one when `service` is left out) and its `submit`, a FormDialog or FormSection
 * `onSubmit`. A create sends every field; an edit sends only what differs from the last saved service and says "Nothing
 * changed" when nothing does. A refusal from the server lands under the field it names (`dialogSubmit`), the rest in the
 * error slot. After an edit the form is reset to the values the server returned, so a form that stays open (the panel) is
 * clean again and the next save compares with what was just saved. `onSaved` gets the service the server answered with.
 */
export function useServiceDetailsForm(
  service?: Service,
  onSaved?: (saved: Service) => void,
  { stay = false }: ServiceDetailsFormOptions = {},
) {
  const create = useCreateService();
  const update = useUpdateService();
  // The service the next save compares with: the one the form opened on, then the one the server last returned.
  const [base, setBase] = useState(service);
  const form = useForm<ServiceDetailsValues>({ defaultValues: serviceDetailsDefaults(service) });

  const submit = dialogSubmit(
    form,
    async (values) => {
      if (!base) {
        const created = await create.mutateAsync(createServiceBody(values));
        onSaved?.(created);
        return;
      }
      const body = updateServiceBody(values, base);
      if (Object.keys(body).length === 0) {
        // Show the form as it was saved, so a stray space typed and removed does not keep it looking changed.
        form.reset(serviceDetailsDefaults(base));
        toast({ kind: 'info', title: 'Nothing changed' });
        // A form that stays open must not show "Saved" for a request that was never made; a dialog closes as it always did.
        return stay ? false : undefined;
      }
      const updated = await update.mutateAsync({ service: base, body });
      setBase(updated);
      form.reset(serviceDetailsDefaults(updated));
      onSaved?.(updated);
    },
    // Every name here has an error line under its input; the price input exists only when creating.
    { fields: serviceDetailsFields(!base) },
  );

  return { form, submit };
}
