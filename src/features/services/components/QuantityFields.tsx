// QuantityFields: the "Quantity" block of the service form (feature 25), in the New/Edit dialog and the panel's Details section.
// Staff choose how the service sells (one per order, a range, or fixed packs); the server checks the rule again.
import { useFormContext, useWatch } from 'react-hook-form';
import { RadioGroup, TextField, type RadioOption } from '@/components/ui';
import { maxProblem, minProblem, packsProblem, type QuantityValues } from '../lib/quantity';

const MODES: readonly RadioOption[] = [
  { value: 'single', label: 'One per order', description: 'Every order is for 1 unit.' },
  {
    value: 'range',
    label: 'A range',
    description: 'The buyer chooses any whole quantity from the smallest to the largest.',
  },
  {
    value: 'packs',
    label: 'Fixed packs',
    description: 'The buyer chooses one of the pack sizes you list.',
  },
];

/**
 * The quantity inputs. It reads the form from the nearest `FormProvider`. `stacked` puts the smallest and largest on their own
 * lines, for the narrow side panel.
 */
export function QuantityFields({ stacked = false }: { stacked?: boolean }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<QuantityValues>();
  const mode = useWatch({ control, name: 'quantityMode' });
  return (
    <div className="space-y-3">
      <RadioGroup legend="Quantity" options={MODES} {...register('quantityMode')} />
      {mode === 'range' && (
        <div className={stacked ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-2'}>
          <TextField
            label="Smallest"
            inputMode="numeric"
            autoComplete="off"
            error={errors.minQty}
            {...register('minQty', { validate: (_value, all) => minProblem(all), deps: 'maxQty' })}
          />
          <TextField
            label="Largest"
            inputMode="numeric"
            autoComplete="off"
            error={errors.maxQty}
            {...register('maxQty', { validate: (_value, all) => maxProblem(all) })}
          />
        </div>
      )}
      {mode === 'packs' && (
        <TextField
          label="Pack sizes"
          autoComplete="off"
          spellCheck={false}
          hint="Whole numbers separated by commas, for example 5, 10, 25."
          error={errors.qtyOptions}
          {...register('qtyOptions', { validate: (_value, all) => packsProblem(all) })}
        />
      )}
      <p className="text-xs text-ink3">
        The price is for one unit. An order costs the price times its quantity.
      </p>
    </div>
  );
}
