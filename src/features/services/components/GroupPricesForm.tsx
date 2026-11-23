// GroupPricesForm: the dialog frame of "Group prices" (`PUT /admin/services/:id/group-prices`): one price box per merchant group, with the
// saved prices of the groups it does not list sent back and the retail price it loaded (`retailPriceSeen`) sent along, as the server needs.
// The boxes are GroupPricesBody and the request is useGroupPricesForm, both shared with the panel's Prices section.
import { FormDialog } from '@/components/ui';
import { money } from '@/lib/format';
import { useGroupPricesForm } from '../hooks/useGroupPricesForm';
import type { ClientGroup, Service, ServiceGroupPrice } from '../types';
import { GroupPricesBody } from './GroupPricesBody';

export interface GroupPricesFormProps {
  service: Service;
  groups: readonly ClientGroup[];
  saved: readonly ServiceGroupPrice[];
  onClose: () => void;
}

/** The dialog frame around one price box per group; a blank box means no fixed price. */
export function GroupPricesForm({ service, groups, saved, onClose }: GroupPricesFormProps) {
  const { form, submit, listed } = useGroupPricesForm({ service, groups, saved });
  return (
    <FormDialog
      open
      title="Group prices"
      sub={`${service.name}: base price ${money(service.basePrice)}`}
      confirm="Save group prices"
      onClose={onClose}
      onSubmit={submit}
    >
      <GroupPricesBody groups={listed} form={form} autoFocus />
    </FormDialog>
  );
}
