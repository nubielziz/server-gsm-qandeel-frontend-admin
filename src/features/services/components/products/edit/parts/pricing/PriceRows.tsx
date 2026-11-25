// PriceRows: the label-left rows of the Set Pricing part: the credit (the base price), the minimum profit and "Your cost" as boxes, then the
// cost used, the floor and the margin the server worked out as read-only rows. The figures are the server's, as the service or the last save gave them; nothing is computed here
// (the console does no pricing maths, MISMATCHES M92), and a refused price shows under its box.
import { useId, type ReactNode } from 'react';
import type { UseFormRegisterReturn, UseFormReturn } from 'react-hook-form';
import { FormRow, Icon, ReadValue } from '@/components/ui';
import { money, pct } from '@/lib/format';
import { isMoneyText } from '../../../../../lib/money';
import type { PriceValues } from '../../../../../lib/priceForms';
import type { Service } from '../../../../../types';
import type { PermissionLock } from '@/components/ui';

interface MoneyRowProps {
  label: string;
  hint: string;
  error?: string;
  lock: PermissionLock;
  field: UseFormRegisterReturn;
}

// One row with a money box and its unit after it, as the reference draws the credit ("0  USD").
function MoneyRow({ label, hint, error, lock, field }: MoneyRowProps) {
  const id = useId();
  const described = [`${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
  return (
    <FormRow label={label} htmlFor={id} hint={hint} error={error}>
      <span className="flex items-center gap-2">
        <input
          id={id}
          className="input w-40 aria-[invalid=true]:border-crit-dot"
          inputMode="decimal"
          autoComplete="off"
          disabled={lock.disabled}
          title={lock.title}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          {...field}
        />
        <span className="text-sm italic text-ink3">USD</span>
      </span>
    </FormRow>
  );
}

// One read-only figure of a row.
function Figure({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return <ReadValue className={strong ? 'font-medium tabular-nums' : 'tabular-nums'}>{children}</ReadValue>;
}

export interface PriceRowsProps {
  /** The service as the server last sent it: the cost, the floor and the margin shown, and what the boxes compare with. */
  saved: Service;
  form: UseFormReturn<PriceValues>;
  /** Off, with the missing permissions in its title, for a role that may not change prices. */
  lock: PermissionLock;
}

/** The credit, the minimum profit and your cost, then the cost used, the floor and the margin. The form (its defaults and its save) belongs to the part. */
export function PriceRows({ saved, form, lock }: PriceRowsProps) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <>
      <MoneyRow
        label="Credit"
        hint="The base price of one unit. A rank with no fixed price pays this less its discount."
        error={errors.basePrice?.message}
        lock={lock}
        field={register('basePrice', {
          validate: (value) =>
            (isMoneyText(value) && Number(value) > 0) || 'Enter a price greater than zero.',
        })}
      />
      <MoneyRow
        label="Minimum profit"
        hint="The floor is the cost used plus this amount. The server works it out when you save."
        error={errors.minProfit?.message}
        lock={lock}
        field={register('minProfit', {
          validate: (value) => isMoneyText(value) || 'Enter an amount, 0 or more.',
        })}
      />
      <MoneyRow
        label="Your cost"
        hint="What one unit costs you. The cost used is the larger of this and the supplier's."
        error={errors.ownCost?.message}
        lock={lock}
        field={register('ownCost', {
          validate: (value) => value.trim() === '' || isMoneyText(value) || 'Enter an amount, 0 or more.',
        })}
      />
      <FormRow
        label="Cost used"
        hint="The larger of your cost and the supplier's cost. Shop price rules and the floor start from it."
      >
        <Figure>
          {money(saved.cost)}
          {saved.costChangedFrom && (
            <span className="ms-1 text-warn-fg">(was {money(saved.costChangedFrom)})</span>
          )}
        </Figure>
      </FormRow>
      <FormRow label="Floor">
        <Figure strong>{money(saved.floorPrice)}</Figure>
      </FormRow>
      <FormRow label="Margin">
        <Figure>{pct(saved.marginPct, 1)}</Figure>
      </FormRow>
      {saved.belowFloor && (
        <FormRow label={null}>
          <p className="flex items-center gap-1.5 text-xs text-crit-fg">
            <Icon name="alert" className="ic-xs" />
            Under the floor: orders are charged the floor price.
          </p>
        </FormRow>
      )}
    </>
  );
}
