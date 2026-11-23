// ServiceDetailsBody: the fields of a service's details (name, code, category, type, SLA, first price, quantity) and their checks.
// The New/Edit service dialog and the panel's Details section both mount it; each wraps it in its own frame and submit.
import { useState } from 'react';
import { FormProvider, type UseFormReturn } from 'react-hook-form';
import { SelectField, TextField } from '@/components/ui';
import { useCategories } from '../hooks/useChoices';
import { isMoneyText } from '../lib/money';
import type { ServiceDetailsValues } from '../lib/serviceDetails';
import { withChosen } from '../lib/select';
import { TYPE_OPTIONS } from '../lib/status';
import type { Service, ServiceCategory } from '../types';
import { LookupNote } from './LookupNote';
import { NewCategoryField } from './NewCategoryField';
import { QuantityFields } from './QuantityFields';

export interface ServiceDetailsBodyProps {
  /** The form from `useServiceDetailsForm`; the frame around the body submits it. */
  form: UseFormReturn<ServiceDetailsValues>;
  /** The service being edited; leave out for a new one, which also gets a box for its first price. */
  service?: Service;
  /** Puts the cursor in the name box on mount. A dialog does; the side panel does not. */
  autoFocus?: boolean;
  /** Every field on its own line, whatever the screen: for the narrow side panel. */
  stacked?: boolean;
  /** Locks every input (a missing permission); the frame says why. */
  disabled?: boolean;
}

/**
 * The inputs of the service form, with the checks that run before the server is called and the "New category…" step under the
 * category menu. It owns no request of its own: the category names are read here, and the save belongs to the frame.
 */
export function ServiceDetailsBody({
  form,
  service,
  autoFocus = false,
  stacked = false,
  disabled = false,
}: ServiceDetailsBodyProps) {
  const categories = useCategories();
  // A category made here, until the menu has reloaded and holds it.
  const [made, setMade] = useState<ServiceCategory | null>(null);
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const chosen = watch('categoryId');
  const pair = stacked ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-2';

  // The select is controlled, so the service's own category stays chosen while the category names are still loading.
  const categoryOptions = withChosen(
    [
      { value: '', label: categories.query.isLoading ? 'Loading…' : 'Choose a category' },
      ...categories.categories.map((category) => ({ value: category.id, label: category.name })),
    ],
    chosen,
    labelOfChosen(chosen, made, service),
  );

  function choose(category: ServiceCategory) {
    setMade(category);
    setValue('categoryId', String(category.id), { shouldDirty: true, shouldValidate: true });
  }

  return (
    <FormProvider {...form}>
      <fieldset disabled={disabled} className="min-w-0 space-y-3">
        <TextField
          label="Name"
          autoComplete="off"
          maxLength={120}
          autoFocus={autoFocus}
          error={errors.name}
          {...register('name', { validate: (value) => value.trim() !== '' || 'Enter a name.' })}
        />
        <TextField
          label="Code"
          className="mono"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          hint="A short unique code, such as IMEI-ATT-USA."
          error={errors.code}
          {...register('code', { validate: (value) => value.trim() !== '' || 'Enter a code.' })}
        />
        <div className={pair}>
          <div>
            <SelectField
              label="Category"
              selectWrapClassName="w-full"
              options={categoryOptions}
              error={errors.categoryId}
              {...register('categoryId', {
                validate: (value) => /^\d+$/.test(value) || 'Choose a category.',
              })}
              value={chosen}
            />
            <NewCategoryField type={watch('type')} categories={categories.categories} onCreated={choose} />
          </div>
          <SelectField
            label="Type"
            selectWrapClassName="w-full"
            options={TYPE_OPTIONS}
            error={errors.type}
            {...register('type')}
          />
        </div>
        <LookupNote what="the categories" query={categories.query} />
        <div className={pair}>
          <TextField
            label="SLA (minutes)"
            inputMode="numeric"
            autoComplete="off"
            hint="The target time to deliver an order."
            error={errors.slaMinutes}
            {...register('slaMinutes', {
              validate: (value) =>
                (/^\d+$/.test(value.trim()) && Number(value) >= 1) || 'Enter minutes, 1 or more.',
            })}
          />
          {!service && (
            <TextField
              label="Base price (USD)"
              inputMode="decimal"
              autoComplete="off"
              error={errors.basePrice}
              {...register('basePrice', {
                validate: (value) =>
                  (isMoneyText(value) && Number(value) > 0) || 'Enter a price greater than zero.',
              })}
            />
          )}
        </div>
        <QuantityFields stacked={stacked} />
      </fieldset>
    </FormProvider>
  );
}

/** The name to show for the chosen category while the menu does not hold it: the one just made, the service's own, or its number. */
function labelOfChosen(chosen: string, made: ServiceCategory | null, service?: Service): string {
  if (made && String(made.id) === chosen) return made.name;
  if (service?.category && String(service.category.id) === chosen) return service.category.name;
  return `Category ${chosen}`;
}
