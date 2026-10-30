// BulkPriceFields: the first step of the bulk price change dialog: what to change (a category or the ticked services), whether to
// raise or lower, by a percentage or a fixed amount, and by how much. The next step asks the server for a preview.
import type { UseFormReturn } from 'react-hook-form';
import { SelectField, TextField } from '@/components/ui';
import { isMoneyText } from '../lib/money';
import type { BulkValues } from '../lib/bulk';
import { servicesText } from '../lib/bulk';
import type { ServiceCategory } from '../types';
import { LookupNote } from './LookupNote';

export interface BulkPriceFieldsProps {
  form: UseFormReturn<BulkValues>;
  categories: readonly ServiceCategory[];
  /** The categories' query, for the loading label and the note when they could not be loaded. */
  categoriesQuery: { isLoading: boolean; isError: boolean; refetch: () => unknown };
  selectedCount: number;
}

/** The form step of the bulk dialog. */
export function BulkPriceFields({ form, categories, categoriesQuery, selectedCount }: BulkPriceFieldsProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const scope = watch('scope');
  const type = watch('type');
  return (
    <div className="space-y-3">
      <SelectField
        label="Change the prices of"
        selectWrapClassName="w-full"
        options={[
          { value: 'category', label: 'All services of a category' },
          {
            value: 'selected',
            label:
              selectedCount > 0
                ? `The ${servicesText(selectedCount)} I ticked`
                : 'The services I ticked (none yet)',
            disabled: selectedCount === 0,
          },
        ]}
        error={errors.scope}
        {...register('scope')}
      />
      {scope === 'category' && (
        <div>
          <SelectField
            label="Category"
            selectWrapClassName="w-full"
            options={[
              { value: '', label: categoriesQuery.isLoading ? 'Loading…' : 'Choose a category' },
              ...categories.map((category) => ({ value: category.id, label: category.name })),
            ]}
            error={errors.categoryId}
            {...register('categoryId')}
          />
          <LookupNote what="the categories" query={categoriesQuery} />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Change"
          selectWrapClassName="w-full"
          options={[
            { value: 'raise', label: 'Raise prices' },
            { value: 'lower', label: 'Lower prices' },
          ]}
          error={errors.direction}
          {...register('direction')}
        />
        <SelectField
          label="By"
          selectWrapClassName="w-full"
          options={[
            { value: 'percent', label: 'A percentage' },
            { value: 'fixed', label: 'A fixed amount (USD)' },
          ]}
          error={errors.type}
          {...register('type')}
        />
      </div>
      <TextField
        label={type === 'percent' ? 'Percentage' : 'Amount (USD)'}
        inputMode="decimal"
        autoComplete="off"
        hint={
          type === 'percent'
            ? 'For example 5 for 5%. You see every new price before anything is saved.'
            : 'For example 0.50. You see every new price before anything is saved.'
        }
        error={errors.amount}
        {...register('amount', {
          validate: (value) =>
            (isMoneyText(value) && Number(value) > 0) || 'Enter an amount greater than zero.',
        })}
      />
    </div>
  );
}
