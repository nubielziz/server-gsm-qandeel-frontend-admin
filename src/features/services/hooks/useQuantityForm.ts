// The form behind the "Quantity Field" section of the edit view's Field part: how the service sells (one per order, a range, or fixed packs)
// and the save that sends only the quantity keys that changed. The inputs and their checks are lib/quantity.ts, the same ones the
// New service form used; the server checks the rule again.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { dialogSubmit, toast } from '@/components/ui';
import { quantityText } from '@/lib/format';
import { useApiMutation } from '@/lib/query';
import { updateService } from '../api';
import { quantityBody, quantityDefaults, type QuantityValues } from '../lib/quantity';
import type { Service, UpdateServiceBody } from '../types';
import { SERVICE_STALE_KEYS, staleServices } from './keys';

/** The inputs that have an error line under them, so any other message from the server falls to the section's failure line. */
const QUANTITY_FIELDS = ['minQty', 'maxQty', 'qtyOptions'] as const;

/**
 * Saves the quantity rule of one service. The toast says how the service sells now, as the server answered.
 * Side effects: `PATCH /admin/services/:id` (through updateService) and the refresh of the services reads.
 */
function useSaveQuantity() {
  return useApiMutation({
    mutationFn: ({ service, body }: { service: Service; body: UpdateServiceBody }) =>
      updateService(service.id, body),
    invalidates: (_result, { service }) => staleServices(service.id),
    invalidateKeys: SERVICE_STALE_KEYS,
    successNotification: (updated) => ({
      message: 'Quantity saved',
      description: `${updated.name}: quantity ${quantityText(updated)}. New orders use it.`,
    }),
    errorNotification: () => false as const,
  });
}

/**
 * The form and its `submit` (plug it into a SectionForm). The save compares with the service as the server last sent it: the one the form
 * opened on, then the answer of each save, so a rule typed back to what is stored says "Nothing changed" instead of sending a request. A
 * refusal lands under the box it names. After a save the boxes are reset to the answer, which clears the form's dirty state.
 */
export function useQuantityForm(service: Service) {
  const save = useSaveQuantity();
  const [base, setBase] = useState<Service>(service);
  const form = useForm<QuantityValues>({ defaultValues: quantityDefaults(service) });

  const submit = dialogSubmit(
    form,
    async (values) => {
      const body = quantityBody(values, base);
      if (Object.keys(body).length === 0) {
        // Show the boxes as saved, so a stray space typed and removed does not keep the section looking changed.
        form.reset(quantityDefaults(base));
        toast({ kind: 'info', title: 'Nothing changed' });
        return false;
      }
      const updated = await save.mutateAsync({ service: base, body });
      setBase(updated);
      form.reset(quantityDefaults(updated));
    },
    { fields: QUANTITY_FIELDS },
  );

  return { form, submit };
}
