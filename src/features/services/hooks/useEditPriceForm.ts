// The form behind the credit and the minimum profit of the edit view's Set Pricing part: the two boxes, the save, and what the server last said
// about the service. A price under the floor is refused by the server and shows under its box.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { dialogSubmit, toast } from '@/components/ui';
import { PRICE_FIELDS, priceChanges, priceDefaults, type PriceValues } from '../lib/priceForms';
import type { Service } from '../types';
import { useUpdatePrice } from './useServiceMutations';

export interface EditPriceFormOptions {
  /**
   * True for a form that stays open after a save (a part of the edit view). When nothing changed the save then says so and stays, instead
   * of reading as a save.
   */
  stay?: boolean;
}

/**
 * The form and its `submit` (plug it into a form's onSubmit). `saved` is the service as the server last sent it:
 * the one the form started from, then the answer of each save, so the floor, the margin and the "only what changed" check follow
 * the saved price. After a save the boxes are reset to the saved values, which also clears the form's dirty state.
 * Side effects: `PATCH /admin/services/:id` with the changed price and/or minimum profit, the toast with the server's figures, and
 * the refresh of the services reads.
 */
export function useEditPriceForm(service: Service, { stay = false }: EditPriceFormOptions = {}) {
  const update = useUpdatePrice();
  const [saved, setSaved] = useState<Service>(service);
  const form = useForm<PriceValues>({ defaultValues: priceDefaults(service) });

  const submit = dialogSubmit(
    form,
    async (values) => {
      const body = priceChanges(values, saved);
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        if (!stay) return;
        // A box typed as 13.5 over a saved 13.50 is the same price: show the saved text again.
        form.reset(priceDefaults(saved));
        return false;
      }
      const updated = await update.mutateAsync({ service, body });
      setSaved(updated);
      form.reset(priceDefaults(updated));
    },
    { fields: PRICE_FIELDS },
  );

  return { form, submit, saved };
}
