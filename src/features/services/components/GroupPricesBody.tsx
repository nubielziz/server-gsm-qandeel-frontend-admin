// GroupPricesBody: the fields of "Group prices": a short explanation and one price box per merchant group. The Group prices dialog and
// the panel's Prices section both show it. The "pays the base price less X%" words come from the group's discount as the server sent it.
import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { TextField } from '@/components/ui';
import { percentText } from '../lib/money';
import { groupFieldOf, type GroupValues } from '../lib/priceForms';
import type { ClientGroup } from '../types';

export interface GroupPricesBodyProps {
  /** The groups that get a box, in the order to show them. */
  groups: readonly ClientGroup[];
  form: UseFormReturn<GroupValues>;
  /** On in a dialog (focus lands on the first box), off in the panel. */
  autoFocus?: boolean;
  /** Props for a role that may not change prices: the boxes are disabled and the title says which permission is missing. */
  lock?: { disabled: boolean; title?: string };
  /** One more line under the explanation. */
  note?: ReactNode;
}

/** The explanation and the boxes. The form (its defaults, its save) belongs to the host. */
export function GroupPricesBody({ groups, form, autoFocus = false, lock, note }: GroupPricesBodyProps) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink2">
        A fixed price skips the category rules and the group discount. Leave a group blank to use the base
        price less its discount.
      </p>
      {note && <p className="text-xs text-ink3">{note}</p>}
      {groups.map((group, index) => (
        <TextField
          key={group.id}
          label={group.name}
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus && index === 0}
          disabled={lock?.disabled}
          title={lock?.title}
          placeholder="No fixed price"
          hint={
            Number(group.discountPercent) === 0
              ? 'Pays the base price.'
              : `Pays the base price less ${percentText(group.discountPercent)}.`
          }
          error={errors[groupFieldOf(group)]}
          {...register(groupFieldOf(group))}
        />
      ))}
    </div>
  );
}
