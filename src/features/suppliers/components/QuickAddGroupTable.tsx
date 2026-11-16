// QuickAddGroupTable: the table of step 1 of "Quick add…": one row per supplier group with what it can add, a tick box per row (off
// for a group with nothing to add) and a header box for the rows shown. Built in the demo's table style.
import { IndeterminateCheckbox, TypeTag, type RowSelection } from '@/components/ui';
import { num } from '@/lib/format';
import { groupKey, groupName, pickable } from '../lib/quickAdd';
import type { ServiceGroup } from '../types';

export interface QuickAddGroupTableProps {
  /** The groups shown (the search may have left some out). */
  rows: readonly ServiceGroup[];
  /** The picks, by `groupKey`. They belong to the dialog, so they stay while the search changes. */
  selection: RowSelection<string>;
}

/** The "Cannot add" cell: services the supplier no longer lists plus those of a type the console cannot sell. */
function CannotAdd({ group }: { group: ServiceGroup }) {
  const count = group.unavailable + group.unsupported;
  if (count === 0) return <span className="text-ink3">–</span>;
  return (
    <span
      title={`${num(group.unavailable)} no longer listed by the supplier, ${num(group.unsupported)} of a type the console cannot sell`}
    >
      {num(count)}
    </span>
  );
}

/** The groups table. The header box ticks every shown row that has something to add, and shows a dash when only some are ticked. */
export function QuickAddGroupTable({ rows, selection }: QuickAddGroupTableProps) {
  const shownKeys = pickable(rows).map(groupKey);
  const pickedShown = shownKeys.filter((key) => selection.has(key)).length;
  const allShownPicked = shownKeys.length > 0 && pickedShown === shownKeys.length;

  return (
    <div className="tbl-wrap max-h-[360px] rounded-md border border-line">
      <table className="tbl" aria-label="Supplier groups">
        <thead>
          <tr>
            <th className="w-9 !ps-3.5 !pe-0" scope="col">
              <IndeterminateCheckbox
                aria-label="Select the groups shown"
                checked={allShownPicked}
                indeterminate={pickedShown > 0 && !allShownPicked}
                disabled={shownKeys.length === 0}
                onChange={(event) => selection.setMany(shownKeys, event.target.checked)}
              />
            </th>
            <th scope="col">Group</th>
            <th scope="col" className="num">
              To add
            </th>
            <th scope="col" className="num">
              In console
            </th>
            <th scope="col" className="num">
              Cannot add
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((group) => {
            const key = groupKey(group);
            const type = group.type.toUpperCase();
            return (
              <tr key={key}>
                <td className="!pe-0">
                  <input
                    type="checkbox"
                    className="check"
                    aria-label={`Select ${groupName(group)} (${type})`}
                    checked={group.addable > 0 && selection.has(key)}
                    disabled={group.addable === 0}
                    onChange={(event) => selection.toggle(key, event.target.checked)}
                  />
                </td>
                <td>
                  <span className={group.remoteGroup === '' ? 'font-medium text-ink3' : 'font-medium'}>
                    {groupName(group)}
                  </span>{' '}
                  <TypeTag>{type}</TypeTag>
                </td>
                <td className="num">{num(group.addable)}</td>
                <td className="num">{num(group.imported)}</td>
                <td className="num">
                  <CannotAdd group={group} />
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center text-ink3">
                No group matches the search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
