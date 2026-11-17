// PublishCategoryField: "A category" of the Publish tab's start: the category is found by searching. The staff member types part
// of a name, the server answers the matches (20 at a time) and a menu under the box holds them. A search is used because a menu
// of every category would stop at 200 names, and a supplier's Quick add makes one category for each of its groups.
import { useState } from 'react';
import { SearchInput, SelectField } from '@/components/ui';
import { CATEGORY_SEARCH_ROWS } from '../../hooks/keys';
import { useCategorySearch } from '../../hooks/useCategorySearch';

export interface PublishCategoryFieldProps {
  /** The chosen category's id as text, or '' while none is. */
  value: string;
  onChange: (id: string) => void;
  /** The refusal under the field (nothing chosen, or the server's words). */
  error?: string;
}

/** A search box and the menu of what it found. A category picked from an earlier search stays in the menu. */
export function PublishCategoryField({ value, onChange, error }: PublishCategoryFieldProps) {
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const search = useCategorySearch(text, true);
  const found = (search.query.data?.data ?? []).map((category) => ({
    value: String(category.id),
    label: category.name,
  }));
  const total = search.query.data?.total ?? 0;
  const options = [
    { value: '', label: search.query.isLoading || search.settling ? 'Searching…' : 'Choose a category' },
    ...(picked && !found.some((option) => option.value === picked.id)
      ? [{ value: picked.id, label: picked.name }]
      : []),
    ...found,
  ];

  return (
    <div className="space-y-1.5">
      <SearchInput
        value={text}
        onChange={setText}
        placeholder="Search categories"
        className="sm:max-w-none"
        // Enter must not send the start form from the search box.
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
      />
      <SelectField
        label="Category"
        selectWrapClassName="w-full"
        options={options}
        value={value}
        error={error}
        hint={
          total > CATEGORY_SEARCH_ROWS
            ? `Showing the first ${CATEGORY_SEARCH_ROWS} of ${total} categories: type to narrow the list.`
            : undefined
        }
        onChange={(event) => {
          const chosen = found.find((option) => option.value === event.target.value);
          if (chosen) setPicked({ id: chosen.value, name: chosen.label });
          onChange(event.target.value);
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
