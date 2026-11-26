// QuantityControls: the quantity block of the Custom Fields section (decision 032): under a thin rule, a small "Quantity" heading and ONE row
// of stacked controls (label above each): how the service sells, then the boxes that way needs. The hints sit under the row. The inputs and
// their checks are the quantity form's (useQuantityForm, lib/quantity.ts); this file only draws them.
import { useId } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { SelectField, TextField } from '@/components/ui';
import type { PermissionLock, SelectOption } from '@/components/ui';
import {
  maxProblem,
  minProblem,
  packsProblem,
  type QuantityMode,
  type QuantityValues,
} from '../../../../../lib/quantity';

const MODE_OPTIONS: readonly SelectOption[] = [
  { value: 'single', label: 'One per order' },
  { value: 'range', label: 'A range' },
  { value: 'packs', label: 'Fixed packs' },
];

// What each way means to the buyer, in the hint under the row.
const MODE_WORDS: Record<QuantityMode, string> = {
  single: 'Every order is for 1 unit.',
  range: 'The buyer chooses any whole quantity from the smallest to the largest.',
  packs: 'The buyer chooses one of the pack sizes you list.',
};
const PACKS_WORDS = 'Whole numbers separated by commas, for example 5, 10, 25.';
const PRICE_WORDS = 'The price is for one unit. An order costs the price times its quantity.';

export interface QuantityControlsProps {
  /** The quantity form of the section. */
  form: UseFormReturn<QuantityValues>;
  lock: PermissionLock;
}

/**
 * The menu (One per order, A range, Fixed packs) and, only for a range, Smallest and Largest, or only for fixed packs, Pack sizes, side by
 * side and wrapping on a narrow window, then the hint of the chosen way. The menu and Pack sizes point at that hint (aria-describedby);
 * each box keeps its own error line under it.
 */
export function QuantityControls({ form, lock }: QuantityControlsProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const mode = useWatch({ control, name: 'quantityMode' });
  const headingId = useId();
  const hintId = useId();
  const packsId = useId();
  const hint = [MODE_WORDS[mode], mode === 'packs' && PACKS_WORDS, PRICE_WORDS].filter(Boolean).join(' ');

  return (
    <div role="group" aria-labelledby={headingId} className="mt-5 border-t border-line pt-4">
      <h4 id={headingId} className="mb-2 text-xs font-semibold text-ink">
        Quantity
      </h4>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <SelectField
          label="Sold as"
          options={MODE_OPTIONS}
          wrapperClassName="w-64 max-w-full"
          selectWrapClassName="w-full"
          disabled={lock.disabled}
          title={lock.title}
          aria-describedby={hintId}
          {...register('quantityMode')}
        />
        {mode === 'range' && (
          <>
            <TextField
              label="Smallest"
              wrapperClassName="w-32 max-w-full"
              inputMode="numeric"
              autoComplete="off"
              disabled={lock.disabled}
              title={lock.title}
              error={errors.minQty}
              {...register('minQty', { validate: (_value, all) => minProblem(all), deps: 'maxQty' })}
            />
            <TextField
              label="Largest"
              wrapperClassName="w-32 max-w-full"
              inputMode="numeric"
              autoComplete="off"
              disabled={lock.disabled}
              title={lock.title}
              error={errors.maxQty}
              {...register('maxQty', { validate: (_value, all) => maxProblem(all) })}
            />
          </>
        )}
        {mode === 'packs' && (
          <TextField
            id={packsId}
            label="Pack sizes"
            wrapperClassName="w-80 max-w-full"
            autoComplete="off"
            spellCheck={false}
            disabled={lock.disabled}
            title={lock.title}
            // The kit names its error line `<id>-error`; the hint is the shared one under the row.
            aria-describedby={errors.qtyOptions ? `${hintId} ${packsId}-error` : hintId}
            error={errors.qtyOptions}
            {...register('qtyOptions', { validate: (_value, all) => packsProblem(all) })}
          />
        )}
      </div>
      <p id={hintId} className="mt-2 max-w-2xl text-xs text-ink3">
        {hint}
      </p>
    </div>
  );
}
