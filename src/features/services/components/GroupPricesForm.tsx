// GroupPricesForm: the form of the group prices dialog: one price box per merchant group, filled from the service's saved prices.
// Saving replaces the whole list, so a saved price for a group the menu does not list is sent back unchanged instead of being lost.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, TextField } from '@/components/ui';
import { money } from '@/lib/format';
import { useReplaceGroupPrices } from '../hooks/useServicePartMutations';
import { isMoneyText, moneyInput, percentText, toMoneyText } from '../lib/money';
import type { ClientGroup, Service, ServiceGroupPrice } from '../types';

type Values = Record<string, string>;

const fieldOf = (group: ClientGroup) => `group_${group.id}`;

export interface GroupPricesFormProps {
  service: Service;
  groups: readonly ClientGroup[];
  saved: readonly ServiceGroupPrice[];
  onClose: () => void;
}

/** One price box per group; a blank box means no fixed price. */
export function GroupPricesForm({ service, groups, saved, onClose }: GroupPricesFormProps) {
  const replace = useReplaceGroupPrices();
  const form = useForm<Values>({
    defaultValues: Object.fromEntries(
      groups.map((group) => {
        const price = saved.find((entry) => entry.groupId === group.id)?.price;
        return [fieldOf(group), price ? moneyInput(price) : ''];
      }),
    ),
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const prices: ServiceGroupPrice[] = [];
      for (const group of groups) {
        const text = (values[fieldOf(group)] ?? '').trim();
        if (text === '') continue;
        if (!isMoneyText(text) || Number(text) <= 0) {
          form.setError(
            fieldOf(group),
            { type: 'validate', message: 'Enter a price greater than zero.' },
            { shouldFocus: true },
          );
          return false;
        }
        prices.push({ groupId: group.id, price: toMoneyText(text) });
      }
      // Prices of groups this menu does not list are kept as they are: the save replaces the whole list.
      const listed = new Set(groups.map((group) => group.id));
      prices.push(...saved.filter((entry) => !listed.has(entry.groupId)));
      await replace.mutateAsync({ service, body: { prices } });
    },
    { fields: groups.map(fieldOf) },
  );

  return (
    <FormDialog
      open
      title="Group prices"
      sub={`${service.name}: base price ${money(service.basePrice)}`}
      confirm="Save group prices"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <p className="text-sm text-ink2">
          A fixed price skips the category rules and the group discount. Leave a group blank to use the base
          price less its discount.
        </p>
        {groups.map((group) => (
          <TextField
            key={group.id}
            label={group.name}
            inputMode="decimal"
            autoComplete="off"
            placeholder="No fixed price"
            hint={
              Number(group.discountPercent) === 0
                ? 'Pays the base price.'
                : `Pays the base price less ${percentText(group.discountPercent)}.`
            }
            error={errors[fieldOf(group)]}
            {...register(fieldOf(group))}
          />
        ))}
      </div>
    </FormDialog>
  );
}
