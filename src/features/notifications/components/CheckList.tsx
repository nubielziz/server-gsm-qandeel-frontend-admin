// CheckList: a labelled list of checkboxes for the audience filters (roles, merchant ranks). When the list cannot be read (the role lacks the
// permission, or the request failed) it says so instead of showing an empty box.
import { CheckboxField } from '@/components/ui';

export type CheckOption<V extends string | number> = { value: V; label: string };

export interface CheckListProps<V extends string | number> {
  legend: string;
  options: readonly CheckOption<V>[];
  selected: readonly V[];
  onChange: (selected: V[]) => void;
  /** What to show instead of the list, for example "You need the roles:read permission to pick roles." */
  unavailable?: string;
  /** Said under the legend when nothing is ticked ("Every role"). */
  emptyMeans?: string;
}

export function CheckList<V extends string | number>({
  legend,
  options,
  selected,
  onChange,
  unavailable,
  emptyMeans,
}: CheckListProps<V>) {
  const toggle = (value: V, on: boolean) =>
    onChange(on ? [...selected, value] : selected.filter((candidate) => candidate !== value));
  return (
    <fieldset className="min-w-0">
      <legend className="label">{legend}</legend>
      {unavailable ? (
        <p className="text-xs text-ink3">{unavailable}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {options.map((option) => (
              <CheckboxField
                key={option.value}
                label={option.label}
                checked={selected.includes(option.value)}
                onChange={(event) => toggle(option.value, event.target.checked)}
              />
            ))}
          </div>
          {emptyMeans && selected.length === 0 && <p className="hint">{emptyMeans}</p>}
        </>
      )}
    </fieldset>
  );
}
