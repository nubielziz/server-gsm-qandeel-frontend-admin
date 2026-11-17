// RetailCategoryField: the category of a retail pricing rule, chosen by searching. The staff member types part of a name, the
// server answers the matches (20 at a time) and a menu under the box holds them. A search is used because a menu of every
// category would stop at 200 names. An edited rule shows its category and cannot change it.
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { SearchInput, SelectField } from '@/components/ui';
import { useCategorySearch } from '../../hooks/useCategorySearch';
import { CATEGORY_SEARCH_ROWS } from '../../hooks/keys';
import type { RuleValues } from '../../lib/retailRuleForm';
import type { RetailPriceRule } from '../../types';

export interface RetailCategoryFieldProps {
  form: UseFormReturn<RuleValues>;
  /** The rule being edited: its category is shown as it is and cannot change. */
  rule?: RetailPriceRule;
}

/** A search box and the menu of what it found. */
export function RetailCategoryField({ form, rule }: RetailCategoryFieldProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const [text, setText] = useState('');
  // A category picked from an earlier search stays in the menu while the search moves on, so the choice never vanishes.
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const search = useCategorySearch(text, !rule);
  const value = watch('categoryId');
  const found = (search.query.data?.data ?? []).map((category) => ({
    value: String(category.id),
    label: category.name,
  }));
  const total = search.query.data?.total ?? 0;

  if (rule) {
    return (
      <SelectField
        label="Category"
        selectWrapClassName="w-full"
        disabled
        options={[{ value: value, label: rule.categoryName ?? `Category ${value}` }]}
        value={value}
        onChange={() => undefined}
      />
    );
  }

  const options = [
    { value: '', label: search.query.isLoading || search.settling ? 'Searching…' : 'Choose a category' },
    ...(picked && !found.some((option) => option.value === picked.id)
      ? [{ value: picked.id, label: picked.name }]
      : []),
    ...found,
  ];
  const { onChange, ...field } = register('categoryId');
  return (
    <div className="space-y-1.5">
      <SearchInput
        value={text}
        onChange={setText}
        placeholder="Search categories"
        className="sm:max-w-none"
        // Enter must not send the whole form from the search box.
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
      />
      <SelectField
        label="Category"
        selectWrapClassName="w-full"
        options={options}
        error={errors.categoryId}
        hint={
          total > CATEGORY_SEARCH_ROWS
            ? `Showing the first ${CATEGORY_SEARCH_ROWS} of ${total} categories: type to narrow the list.`
            : undefined
        }
        {...field}
        onChange={(event) => {
          const chosen = found.find((option) => option.value === event.target.value);
          if (chosen) setPicked({ id: chosen.value, name: chosen.label });
          void onChange(event);
        }}
      />
      {search.query.isError && (
        <p className="text-xs text-crit-fg" role="status">
          Could not search the categories.{' '}
          <button type="button" className="link" onClick={() => void search.query.refetch()}>
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
