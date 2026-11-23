// QuantitySection: "Quantity Field", the first section of the edit view's Field part: how the service sells (one per order, a range, or fixed
// packs) in label-left rows, with its own Save. The inputs and their checks are lib/quantity.ts; the save is useQuantityForm.
import { useWatch } from 'react-hook-form';
import {
  SectionHeading,
  SelectField,
  TextField,
  type SelectOption,
  SectionForm,
  useReportDirty,
} from '@/components/ui';
import { useQuantityForm } from '../../../../../hooks/useQuantityForm';
import { maxProblem, minProblem, packsProblem, type QuantityMode } from '../../../../../lib/quantity';
import type { FieldsSectionProps } from './sectionProps';

const MODE_OPTIONS: readonly SelectOption[] = [
  { value: 'single', label: 'One per order' },
  { value: 'range', label: 'A range' },
  { value: 'packs', label: 'Fixed packs' },
];

// What each way means to the buyer, under the menu.
const MODE_WORDS: Record<QuantityMode, string> = {
  single: 'Every order is for 1 unit.',
  range: 'The buyer chooses any whole quantity from the smallest to the largest.',
  packs: 'The buyer chooses one of the pack sizes you list.',
};

/** The section: a menu for the way the service sells, and the boxes that way needs. */
export function QuantitySection({ service, lock, onDirtyChange }: FieldsSectionProps) {
  const { form, submit } = useQuantityForm(service);
  const {
    register,
    control,
    formState: { errors, isDirty },
  } = form;
  const mode = useWatch({ control, name: 'quantityMode' });
  useReportDirty(isDirty, onDirtyChange);

  return (
    <>
      <SectionHeading as="h3">Quantity Field</SectionHeading>
      <SectionForm label="Quantity Field" onSubmit={submit} dirty={isDirty} lock={lock}>
        <SelectField
          layout="row"
          label="Quantity"
          options={MODE_OPTIONS}
          selectWrapClassName="w-full max-w-md"
          disabled={lock.disabled}
          title={lock.title}
          hint={`${MODE_WORDS[mode]} The price is for one unit. An order costs the price times its quantity.`}
          {...register('quantityMode')}
        />
        {mode === 'range' && (
          <>
            <TextField
              layout="row"
              label="Smallest"
              inputMode="numeric"
              autoComplete="off"
              disabled={lock.disabled}
              title={lock.title}
              error={errors.minQty}
              {...register('minQty', { validate: (_value, all) => minProblem(all), deps: 'maxQty' })}
            />
            <TextField
              layout="row"
              label="Largest"
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
            layout="row"
            label="Pack sizes"
            autoComplete="off"
            spellCheck={false}
            disabled={lock.disabled}
            title={lock.title}
            hint="Whole numbers separated by commas, for example 5, 10, 25."
            error={errors.qtyOptions}
            {...register('qtyOptions', { validate: (_value, all) => packsProblem(all) })}
          />
        )}
      </SectionForm>
    </>
  );
}
