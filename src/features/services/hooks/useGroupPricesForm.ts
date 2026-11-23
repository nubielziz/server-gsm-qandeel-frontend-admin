// The form behind the rank prices of the edit view's Set Pricing part: one box per merchant group, filled from the service's saved prices,
// and the save that replaces the whole list and always sends `retailPriceSeen`.
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { dialogSubmit } from '@/components/ui';
import { loadedRetailPrice } from '../lib/groupPrices';
import {
  groupDefaults,
  groupFieldOf,
  listedGroups,
  readGroupPrices,
  type GroupValues,
} from '../lib/priceForms';
import type { ClientGroup, Service, ServiceGroupPrice } from '../types';
import { useReplaceGroupPrices } from './useServicePartMutations';

export interface GroupPricesFormArgs {
  service: Service;
  /** Every merchant group, the retail group included: it tells which saved row is the retail price. */
  groups: readonly ClientGroup[];
  /** The service's saved prices when the form opened. */
  saved: readonly ServiceGroupPrice[];
  /** True in the edit view's Set Pricing part: the retail group gets no box (its price lives in Retail Purchase), but its saved row is still sent back. */
  hideRetail?: boolean;
}

/**
 * The form, its `submit` (plug it into a form's onSubmit) and the groups that have a box. The saved list and the retail
 * price it loaded are taken once, with the boxes: a later refetch of the service must not change what this form says it loaded,
 * or a retail price that moved since would be sent as if staff had typed it. The edit view makes sure that "once" is on a fresh
 * record: it does not draw the part from a record that is being read again, and starts a clean part again when the record changes
 * (usePartStart), so the saved list taken here is never an old copy that a whole-list save would send back. A save sends `retailPriceSeen` always, so the
 * server keeps a retail price that moved after the form opened. After a save the answer becomes the new loaded list and the
 * boxes are reset to it, which clears the form's dirty state.
 * Side effects: `PUT /admin/services/:id/group-prices`, the toast and the refresh of the services reads.
 */
export function useGroupPricesForm({
  service,
  groups,
  saved: loaded,
  hideRetail = false,
}: GroupPricesFormArgs) {
  const replace = useReplaceGroupPrices();
  const [snapshot, setSnapshot] = useState(() => ({
    saved: loaded,
    retailPriceSeen: loadedRetailPrice(groups, loaded),
  }));
  const listed = useMemo(() => listedGroups(groups, hideRetail), [groups, hideRetail]);
  const form = useForm<GroupValues>({ defaultValues: groupDefaults(listed, loaded) });

  const submit = dialogSubmit(
    form,
    async (values) => {
      const read = readGroupPrices(values, listed, snapshot.saved);
      if ('badField' in read) {
        form.setError(
          read.badField,
          { type: 'validate', message: 'Enter a price greater than zero.' },
          { shouldFocus: true },
        );
        return false;
      }
      const answer = await replace.mutateAsync({
        service,
        body: { prices: read.prices, retailPriceSeen: snapshot.retailPriceSeen },
      });
      setSnapshot({ saved: answer, retailPriceSeen: loadedRetailPrice(groups, answer) });
      form.reset(groupDefaults(listed, answer));
    },
    { fields: listed.map(groupFieldOf) },
  );

  return { form, submit, listed };
}
